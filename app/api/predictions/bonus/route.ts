import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { isTournamentLocked, tournamentLockTime } from "@/lib/locking";
import { normalizeTopScorerName, validateBonusSelection } from "@/lib/bonus";

const schema = z.object({
  championTeamId: z.number().int(),
  runnerUpTeamId: z.number().int(),
  topScorerName: z.string().min(2).max(100),
  darkHorseTeamId: z.number().int(),
});

export async function POST(req: Request) {
  const userId = getSessionUser(await auth())?.id;
  if (!userId) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Date invalide" },
      { status: 400 }
    );
  }

  const lockAt = await tournamentLockTime(prisma);
  if (isTournamentLocked(lockAt)) {
    return NextResponse.json(
      { error: "Pronosticurile sunt blocate" },
      { status: 403 }
    );
  }

  const ids = Array.from(
    new Set([
      parsed.data.championTeamId,
      parsed.data.runnerUpTeamId,
      parsed.data.darkHorseTeamId,
    ])
  );
  const teams = await prisma.team.findMany({
    where: { id: { in: ids } },
    select: { id: true, pot: true },
  });

  const validation = validateBonusSelection(parsed.data, teams);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const topScorerName = normalizeTopScorerName(parsed.data.topScorerName);

  await prisma.bonusPrediction.upsert({
    where: { userId },
    update: {
      championTeamId: parsed.data.championTeamId,
      runnerUpTeamId: parsed.data.runnerUpTeamId,
      darkHorseTeamId: parsed.data.darkHorseTeamId,
      topScorerName,
    },
    create: {
      userId,
      championTeamId: parsed.data.championTeamId,
      runnerUpTeamId: parsed.data.runnerUpTeamId,
      darkHorseTeamId: parsed.data.darkHorseTeamId,
      topScorerName,
    },
  });

  return NextResponse.json({ ok: true });
}
