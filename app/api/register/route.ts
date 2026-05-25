import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  inviteCode: z.string().min(1, "Cod de invitație necesar"),
  username: z
    .string()
    .min(3, "Minim 3 caractere")
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, "Doar litere, cifre, _ și -"),
  password: z.string().min(8, "Minim 8 caractere"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { inviteCode, username, password } = parsed.data;

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
    data: { username, passwordHash, isAdmin: false },
  });

  return NextResponse.json({ ok: true });
}
