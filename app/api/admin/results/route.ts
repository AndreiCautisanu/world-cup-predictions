import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateAndStorePoints, clearMatchResult } from "@/lib/recalc";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    matchId: z.number().int(),
    homeScore: z.number().int().min(0).max(20),
    awayScore: z.number().int().min(0).max(20),
    wentToEt: z.boolean().optional(),
    wentToPens: z.boolean().optional(),
    homeTeamId: z.number().int().optional(),
    awayTeamId: z.number().int().optional(),
  }),
  z.object({
    action: z.literal("clear"),
    matchId: z.number().int(),
  }),
]);

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

  const { action, matchId } = parsed.data;

  const existing = await prisma.match.findUnique({ where: { id: matchId } });
  if (!existing) {
    return NextResponse.json({ error: "Meci inexistent" }, { status: 404 });
  }

  if (action === "clear") {
    await clearMatchResult(prisma, matchId);
    return NextResponse.json({ ok: true, cleared: true });
  }

  // action === "save"
  const { homeScore, awayScore, wentToEt, wentToPens, homeTeamId, awayTeamId } = parsed.data;
  const isKnockout = !["GROUP_1", "GROUP_2", "GROUP_3"].includes(existing.round);

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
