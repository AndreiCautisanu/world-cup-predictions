import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { logAdminAction } from "@/lib/audit";

export const updateUserSchema = z
  .object({
    userId: z.number().int(),
    isAdmin: z.boolean().optional(),
    resetPassword: z.string().min(8).max(200).optional(),
    firstName: z.string().trim().max(50, "Maxim 50 de caractere").optional(),
    lastName: z.string().trim().max(50, "Maxim 50 de caractere").optional(),
  })
  .refine(
    (d) =>
      d.isAdmin !== undefined ||
      d.resetPassword !== undefined ||
      d.firstName !== undefined ||
      d.lastName !== undefined,
    { message: "Nimic de modificat" }
  );

export async function POST(req: Request) {
  const user = getSessionUser(await auth());
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Date invalide" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) {
    return NextResponse.json({ error: "Utilizator inexistent" }, { status: 404 });
  }

  // Guard: don't let the last admin demote themselves.
  if (parsed.data.isAdmin === false && target.isAdmin) {
    const remainingAdmins = await prisma.user.count({
      where: { isAdmin: true, id: { not: target.id } },
    });
    if (remainingAdmins === 0) {
      return NextResponse.json(
        { error: "Trebuie să rămână cel puțin un admin" },
        { status: 400 }
      );
    }
  }

  const data: {
    isAdmin?: boolean;
    passwordHash?: string;
    firstName?: string | null;
    lastName?: string | null;
  } = {};
  if (parsed.data.isAdmin !== undefined) data.isAdmin = parsed.data.isAdmin;
  if (parsed.data.resetPassword) {
    data.passwordHash = await bcrypt.hash(parsed.data.resetPassword, 10);
  }
  if (parsed.data.firstName !== undefined) {
    data.firstName = parsed.data.firstName === "" ? null : parsed.data.firstName;
  }
  if (parsed.data.lastName !== undefined) {
    data.lastName = parsed.data.lastName === "" ? null : parsed.data.lastName;
  }

  await prisma.user.update({ where: { id: target.id }, data });
  // Redact the new password — only log that a reset happened, not the value.
  await logAdminAction(prisma, user.name ?? "<unknown>", "user.update", {
    targetUserId: target.id,
    targetUsername: target.username,
    setIsAdmin: parsed.data.isAdmin,
    passwordReset: parsed.data.resetPassword !== undefined,
    setFirstName: parsed.data.firstName,
    setLastName: parsed.data.lastName,
  });
  return NextResponse.json({ ok: true });
}
