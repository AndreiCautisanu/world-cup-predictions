import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Password-change attempts are throttled per (user, IP) to make brute-forcing
// the current-password gate impractical even with a stolen session cookie.
const PASSWORD_LIMIT = 5;
const PASSWORD_WINDOW_MS = 10 * 60 * 1000;

const nameField = z
  .string()
  .trim()
  .min(1, "Numele e obligatoriu")
  .max(50, "Maxim 50 de caractere");

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("name"),
    firstName: nameField,
    lastName: nameField,
  }),
  z.object({
    action: z.literal("password"),
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "Minim 8 caractere").max(200),
  }),
]);

export async function POST(req: Request) {
  const userId = getSessionUser(await auth())?.id;
  if (!userId) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Date invalide" },
      { status: 400 }
    );
  }

  if (parsed.data.action === "name") {
    await prisma.user.update({
      where: { id: userId },
      data: { firstName: parsed.data.firstName, lastName: parsed.data.lastName },
    });
    return NextResponse.json({ ok: true });
  }

  // action === "password"
  const ip = clientIp(req);
  const limit = rateLimit(
    `profile-password:${userId}:${ip}`,
    PASSWORD_LIMIT,
    PASSWORD_WINDOW_MS
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Prea multe încercări. Revino mai târziu." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilizator inexistent" }, { status: 404 });
  }
  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Parola actuală e incorectă" },
      { status: 403 }
    );
  }
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return NextResponse.json({ ok: true });
}
