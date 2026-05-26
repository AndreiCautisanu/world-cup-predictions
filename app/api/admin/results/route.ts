import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateAndStorePoints } from "@/lib/recalc";

const schema = z.object({
  matchId: z.number().int(),
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
  wentToEt: z.boolean().optional(),
  wentToPens: z.boolean().optional(),
  homeTeamId: z.number().int().optional(),
  awayTeamId: z.number().int().optional(),
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

  const { matchId, homeScore, awayScore, wentToEt, wentToPens, homeTeamId, awayTeamId } =
    parsed.data;

  const existing = await prisma.match.findUnique({ where: { id: matchId } });
  if (!existing) {
    return NextResponse.json({ error: "Meci inexistent" }, { status: 404 });
  }

  const isKnockout = existing.round !== "GROUP_1" && existing.round !== "GROUP_2" && existing.round !== "GROUP_3";

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore,
      awayScore,
      wentToEt: isKnockout ? wentToEt ?? false : false,
      wentToPens: isKnockout ? wentToPens ?? false : false,
      status: "FINISHED",
      ...(homeTeamId ? { homeTeamId } : {}),
      ...(awayTeamId ? { awayTeamId } : {}),
    },
  });

  await calculateAndStorePoints(prisma, matchId);

  return NextResponse.json({ ok: true });
}
