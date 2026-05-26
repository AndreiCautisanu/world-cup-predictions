import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z
  .object({
    userId: z.number().int(),
    isAdmin: z.boolean().optional(),
    resetPassword: z.string().min(8).max(200).optional(),
  })
  .refine((d) => d.isAdmin !== undefined || d.resetPassword !== undefined, {
    message: "Nimic de modificat",
  });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
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

  const data: { isAdmin?: boolean; passwordHash?: string } = {};
  if (parsed.data.isAdmin !== undefined) data.isAdmin = parsed.data.isAdmin;
  if (parsed.data.resetPassword) {
    data.passwordHash = await bcrypt.hash(parsed.data.resetPassword, 10);
  }

  await prisma.user.update({ where: { id: target.id }, data });
  return NextResponse.json({ ok: true });
}
