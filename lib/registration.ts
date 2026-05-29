/**
 * Shared registration core, used by both the public `/api/register` JSON
 * route and the `/register` server action. Keeping the Zod schema and the
 * DB write in one place avoids drift between the two surfaces.
 */
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";

const nameField = z
  .string()
  .trim()
  .min(1, "Numele e obligatoriu")
  .max(50, "Maxim 50 de caractere");

export const registerSchema = z.object({
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

export type RegisterInput = z.infer<typeof registerSchema>;

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function registerUser(
  prisma: PrismaClient,
  input: RegisterInput
): Promise<RegisterResult> {
  const code = await prisma.inviteCode.findUnique({
    where: { code: input.inviteCode },
  });
  if (!code || !code.isActive) {
    return { ok: false, error: "Cod de invitație invalid", status: 403 };
  }

  const existing = await prisma.user.findUnique({
    where: { username: input.username },
  });
  if (existing) {
    return { ok: false, error: "Numele de utilizator e deja luat", status: 409 };
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  await prisma.user.create({
    data: {
      username: input.username,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      isAdmin: false,
    },
  });
  return { ok: true };
}
