/**
 * Shared registration core, used by both the public `/api/register` JSON
 * route and the `/register` server action. Keeping the Zod schema and the
 * DB write in one place avoids drift between the two surfaces.
 */
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS } from "./password-requirements";

const nameField = z
  .string()
  .trim()
  .min(1, "Numele e obligatoriu")
  .max(50, "Maxim 50 de caractere");

export const registerSchema = z.object({
  firstName: nameField,
  lastName: nameField,
  username: z
    .string()
    .trim()
    .min(3, "Minim 3 caractere")
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, "Doar litere, cifre, _ și -"),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS)
    .regex(/[a-zA-Z]/, PASSWORD_REQUIREMENTS)
    .regex(/[0-9]/, PASSWORD_REQUIREMENTS),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function registerUser(
  prisma: PrismaClient,
  input: RegisterInput
): Promise<RegisterResult> {
  // Open registration: no invite code. This is a private friend group and
  // the owner manually prunes any unrecognized accounts.
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
