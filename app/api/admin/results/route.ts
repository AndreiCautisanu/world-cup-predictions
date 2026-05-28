import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
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

  // Resolve the team IDs that will be persisted (override > existing) and
  // verify they're distinct and that any supplied override actually points
  // at a real team. Prisma's FK would catch a bogus id eventually, but a
  // clean 400 is friendlier than a generic 500.
  const effectiveHomeId = homeTeamId ?? existing.homeTeamId;
  const effectiveAwayId = awayTeamId ?? existing.awayTeamId;
  if (
    effectiveHomeId !== null &&
    effectiveAwayId !== null &&
    effectiveHomeId === effectiveAwayId
  ) {
    return NextResponse.json(
      { error: "Echipa de acasă nu poate fi aceeași cu echipa oaspete" },
      { status: 400 }
    );
  }
  const overrideIds = [homeTeamId, awayTeamId].filter(
    (id): id is number => typeof id === "number"
  );
  if (overrideIds.length > 0) {
    const teams = await prisma.team.findMany({
      where: { id: { in: overrideIds } },
      select: { id: true },
    });
    if (teams.length !== new Set(overrideIds).size) {
      return NextResponse.json(
        { error: "Echipă invalidă în override" },
        { status: 400 }
      );
    }
  }

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
