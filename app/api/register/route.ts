import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const nameField = z
  .string()
  .trim()
  .min(1, "Numele e obligatoriu")
  .max(50, "Maxim 50 de caractere");

const schema = z.object({
  inviteCode: z.string().min(1, "Cod de invitație necesar"),
  firstName: nameField,
  lastName: nameField,
  username: z
    .string()
    .trim()
    .min(3, "Minim 3 caractere")
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, "Doar litere, cifre, _ și -"),
  password: z.string().min(8, "Minim 8 caractere"),
});

// 5 attempts per IP per 10 minutes — invite-only flow doesn't need higher.
const REGISTER_LIMIT = 5;
const REGISTER_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Prea multe încercări. Revino mai târziu." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { inviteCode, firstName, lastName, username, password } = parsed.data;

  const code = await prisma.inviteCode.findUnique({ where: { code: inviteCode } });
  if (!code || !code.isActive) {
    return NextResponse.json({ error: "Cod de invitație invalid" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Numele de utilizator e deja luat" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { username, passwordHash, firstName, lastName, isAdmin: false },
  });

  return NextResponse.json({ ok: true });
}
