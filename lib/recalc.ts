import type { PrismaClient, Round } from "@prisma/client";
import {
  DarkHorseRound,
  darkHorsePoints,
  groupMatchPoints,
  knockoutMatchPoints,
} from "@/lib/scoring";

const GROUP_ROUNDS = ["GROUP_1", "GROUP_2", "GROUP_3"] as const satisfies readonly Round[];
const KO_ROUNDS_FOR_DARK_HORSE = ["R32", "R16", "QF", "SF", "FINAL"] as const satisfies readonly Round[];

function isGroupRound(round: Round): boolean {
  return (GROUP_ROUNDS as readonly Round[]).includes(round);
}

export function computePointsForPrediction(
  match: {
    round: Round;
    homeScore: number;
    awayScore: number;
    wentToEt: boolean | null;
    wentToPens: boolean | null;
  },
  pred: {
    homeScore: number;
    awayScore: number;
    predictsEt: boolean | null;
    predictsPens: boolean | null;
  }
): number {
  if (isGroupRound(match.round)) {
    return groupMatchPoints(
      { ph: pred.homeScore, pa: pred.awayScore },
      { ah: match.homeScore, aa: match.awayScore }
    );
  }
  return knockoutMatchPoints(
    {
      ph: pred.homeScore,
      pa: pred.awayScore,
      predictsEt: pred.predictsEt ?? false,
      predictsPens: pred.predictsPens ?? false,
    },
    {
      ah: match.homeScore,
      aa: match.awayScore,
      wentToEt: match.wentToEt ?? false,
      wentToPens: match.wentToPens ?? false,
    }
  );
}

export async function recalcPointsForMatch(
  prisma: PrismaClient,
  matchId: number
): Promise<void> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.homeScore === null || match.awayScore === null) return;

  const preds = await prisma.matchPrediction.findMany({ where: { matchId } });
  if (preds.length === 0) return;

  await prisma.$transaction(
    preds.map((p) =>
      prisma.matchPrediction.update({
        where: { id: p.id },
        data: {
          pointsAwarded: computePointsForPrediction(
            {
              round: match.round,
              homeScore: match.homeScore!,
              awayScore: match.awayScore!,
              wentToEt: match.wentToEt,
              wentToPens: match.wentToPens,
            },
            {
              homeScore: p.homeScore,
              awayScore: p.awayScore,
              predictsEt: p.predictsEt,
              predictsPens: p.predictsPens,
            }
          ),
        },
      })
    )
  );
}

// Tiebreakers: points → goal difference → goals for → team id (stable
// fallback). Admin can override scores manually if real-world tiebreakers
// (head-to-head, fair-play, drawing of lots) come into play.
export async function recalcGroupStandings(
  prisma: PrismaClient,
  groupId: number
): Promise<void> {
  const matches = await prisma.match.findMany({
    where: { groupId, round: { in: GROUP_ROUNDS as unknown as Round[] } },
  });
  if (matches.length === 0) return;

  if (
    matches.some(
      (m) =>
        m.status !== "FINISHED" ||
        m.homeScore === null ||
        m.awayScore === null ||
        m.homeTeamId === null ||
        m.awayTeamId === null
    )
  ) {
    return;
  }

  const teams = await prisma.team.findMany({ where: { groupId } });
  const stats = new Map<number, { pts: number; gf: number; ga: number }>();
  for (const t of teams) stats.set(t.id, { pts: 0, gf: 0, ga: 0 });

  for (const m of matches) {
    const h = stats.get(m.homeTeamId!)!;
    const a = stats.get(m.awayTeamId!)!;
    h.gf += m.homeScore!;
    h.ga += m.awayScore!;
    a.gf += m.awayScore!;
    a.ga += m.homeScore!;
    if (m.homeScore! > m.awayScore!) h.pts += 3;
    else if (m.homeScore! < m.awayScore!) a.pts += 3;
    else {
      h.pts += 1;
      a.pts += 1;
    }
  }

  const sortedTeamIds = [...stats.entries()]
    .sort(([idA, A], [idB, B]) => {
      const gdA = A.gf - A.ga;
      const gdB = B.gf - B.ga;
      return B.pts - A.pts || gdB - gdA || B.gf - A.gf || idA - idB;
    })
    .map(([teamId]) => teamId);

  const actualByPosition: Record<number, number> = {
    1: sortedTeamIds[0],
    2: sortedTeamIds[1],
    3: sortedTeamIds[2],
    4: sortedTeamIds[3],
  };

  const preds = await prisma.groupStandingPrediction.findMany({ where: { groupId } });
  if (preds.length === 0) return;

  const byUser = new Map<number, Record<number, number>>();
  for (const p of preds) {
    if (!byUser.has(p.userId)) byUser.set(p.userId, {});
    byUser.get(p.userId)![p.position] = p.teamId;
  }

  const updates = [...byUser.entries()].flatMap(([userId, predicted]) =>
    [1, 2, 3, 4].map((pos) =>
      prisma.groupStandingPrediction.updateMany({
        where: { userId, groupId, position: pos },
        data: { pointsAwarded: predicted[pos] === actualByPosition[pos] ? 3 : 0 },
      })
    )
  );

  await prisma.$transaction(updates);
}

// Re-evaluate dark-horse buckets every time a KO match flips to FINISHED.
// A team's best-round-reached determines the bucket. Admin convention: the
// 90-min score column encodes the eventual winner even when the match went to
// penalty kicks, so winner = whichever side has the higher score.
export async function recalcDarkHorse(prisma: PrismaClient): Promise<void> {
  const allKo = await prisma.match.findMany({
    where: { round: { in: KO_ROUNDS_FOR_DARK_HORSE as unknown as Round[] } },
  });

  const playedInRound: Record<string, Set<number>> = {
    R32: new Set(),
    R16: new Set(),
    QF: new Set(),
    SF: new Set(),
    FINAL: new Set(),
  };
  const advancedFromRound: Record<string, Set<number>> = {
    R32: new Set(),
    R16: new Set(),
    QF: new Set(),
    SF: new Set(),
    FINAL: new Set(),
  };
  let championId: number | null = null;

  for (const m of allKo) {
    if (m.status !== "FINISHED") continue;
    if (m.homeScore === null || m.awayScore === null) continue;
    if (m.homeTeamId === null || m.awayTeamId === null) continue;

    playedInRound[m.round]?.add(m.homeTeamId);
    playedInRound[m.round]?.add(m.awayTeamId);

    const winnerId =
      m.homeScore > m.awayScore
        ? m.homeTeamId
        : m.awayScore > m.homeScore
          ? m.awayTeamId
          : null;
    if (!winnerId) continue;

    advancedFromRound[m.round]?.add(winnerId);
    if (m.round === "FINAL") championId = winnerId;
  }

  const bonusPreds = await prisma.bonusPrediction.findMany();
  if (bonusPreds.length === 0) return;

  await prisma.$transaction(
    bonusPreds.map((b) => {
      const teamId = b.darkHorseTeamId;
      let round: DarkHorseRound = "GROUP_EXIT";
      if (playedInRound.R32.has(teamId)) round = "R32";
      if (advancedFromRound.R32.has(teamId)) round = "R16";
      if (advancedFromRound.R16.has(teamId)) round = "QF";
      if (advancedFromRound.QF.has(teamId)) round = "SF";
      if (advancedFromRound.SF.has(teamId)) round = "FINAL";
      if (championId === teamId) round = "WINNER";

      return prisma.bonusPrediction.update({
        where: { id: b.id },
        data: { darkHorsePts: darkHorsePoints(round) },
      });
    })
  );
}

export async function recalcChampionAndRunnerUp(prisma: PrismaClient): Promise<void> {
  const final = await prisma.match.findFirst({
    where: { round: "FINAL", status: "FINISHED" },
  });
  if (!final || final.homeScore === null || final.awayScore === null) return;
  if (final.homeTeamId === null || final.awayTeamId === null) return;

  const winnerId =
    final.homeScore > final.awayScore
      ? final.homeTeamId
      : final.awayScore > final.homeScore
        ? final.awayTeamId
        : null;
  if (!winnerId) return;
  const runnerUpId = winnerId === final.homeTeamId ? final.awayTeamId : final.homeTeamId;

  const bonusPreds = await prisma.bonusPrediction.findMany();
  if (bonusPreds.length === 0) return;

  await prisma.$transaction(
    bonusPreds.map((b) =>
      prisma.bonusPrediction.update({
        where: { id: b.id },
        data: {
          championPts: b.championTeamId === winnerId ? 20 : 0,
          runnerUpPts: b.runnerUpTeamId === runnerUpId ? 10 : 0,
        },
      })
    )
  );
}

export async function calculateAndStorePoints(
  prisma: PrismaClient,
  matchId: number
): Promise<void> {
  await recalcPointsForMatch(prisma, matchId);

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return;

  if (match.groupId && isGroupRound(match.round)) {
    await recalcGroupStandings(prisma, match.groupId);
  }
  if ((KO_ROUNDS_FOR_DARK_HORSE as readonly Round[]).includes(match.round)) {
    await recalcDarkHorse(prisma);
  }
  if (match.round === "FINAL") {
    await recalcChampionAndRunnerUp(prisma);
  }
}
