import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { logAdminAction } from "@/lib/audit";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("toggle") }),
  z.object({
    action: z.literal("rotate"),
    newCode: z
      .string()
      .min(4)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/, "Doar litere, cifre, _ și -"),
  }),
]);

export async function POST(req: Request) {
  const user = getSessionUser(await auth());
  if (!user?.isAdmin) {
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

  if (parsed.data.action === "toggle") {
    const current = await prisma.inviteCode.findFirst({ orderBy: { createdAt: "desc" } });
    if (!current) {
      return NextResponse.json({ error: "Niciun cod existent" }, { status: 404 });
    }
    await prisma.inviteCode.update({
      where: { id: current.id },
      data: { isActive: !current.isActive },
    });
    await logAdminAction(prisma, user.name ?? "<unknown>", "invite.toggle", {
      code: current.code,
      activeAfter: !current.isActive,
    });
    return NextResponse.json({ ok: true, active: !current.isActive });
  }

  // rotate
  try {
    await prisma.$transaction([
      prisma.inviteCode.updateMany({ where: { isActive: true }, data: { isActive: false } }),
      prisma.inviteCode.create({
        data: { code: parsed.data.newCode, isActive: true },
      }),
    ]);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Codul există deja" }, { status: 409 });
    }
    throw err;
  }
  await logAdminAction(prisma, user.name ?? "<unknown>", "invite.rotate", {
    newCode: parsed.data.newCode,
  });

  return NextResponse.json({ ok: true });
}
