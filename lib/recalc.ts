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

// Which team progressed from a finished knockout match. A decisive scoreline
// names the winner directly; a draw was settled on penalties, so we defer to the
// recorded shootout winner (homeAdvanced). Returns null if it can't be resolved
// (incomplete data, or a draw with no shootout winner recorded yet).
function knockoutWinnerId(match: {
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeAdvanced: boolean | null;
}): number | null {
  if (match.homeTeamId === null || match.awayTeamId === null) return null;
  if (match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore > match.awayScore) return match.homeTeamId;
  if (match.awayScore > match.homeScore) return match.awayTeamId;
  if (match.homeAdvanced === true) return match.homeTeamId;
  if (match.homeAdvanced === false) return match.awayTeamId;
  return null;
}

export function computePointsForPrediction(
  match: {
    round: Round;
    homeScore: number;
    awayScore: number;
    homeAdvanced: boolean | null;
  },
  pred: {
    homeScore: number;
    awayScore: number;
    homeAdvances: boolean | null;
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
      homeAdvances: pred.homeAdvances,
    },
    {
      ah: match.homeScore,
      aa: match.awayScore,
      homeAdvances: match.homeAdvanced,
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

  // Bucket prediction ids by their computed point value, then issue one
  // updateMany per distinct value (≤4: group 0/2/4/7, KO 0/4/8/10). One
  // update-per-row would be N network round-trips inside a single
  // $transaction — which blows Prisma's 5s interactive-transaction timeout
  // once participation grows (P2028).
  const idsByPoints = new Map<number, number[]>();
  for (const p of preds) {
    const pts = computePointsForPrediction(
      {
        round: match.round,
        homeScore: match.homeScore!,
        awayScore: match.awayScore!,
        homeAdvanced: match.homeAdvanced,
      },
      {
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        homeAdvances: p.homeAdvances,
      }
    );
    const bucket = idsByPoints.get(pts);
    if (bucket) bucket.push(p.id);
    else idsByPoints.set(pts, [p.id]);
  }

  await prisma.$transaction(
    [...idsByPoints.entries()].map(([pts, ids]) =>
      prisma.matchPrediction.updateMany({
        where: { id: { in: ids } },
        data: { pointsAwarded: pts },
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

  // Bucket prediction ids by correct (3 pts) vs wrong (0) and issue exactly
  // two updateMany statements — not one per (user, position) — to stay well
  // under the interactive-transaction timeout (see recalcPointsForMatch).
  const correctIds: number[] = [];
  const wrongIds: number[] = [];
  for (const p of preds) {
    (p.teamId === actualByPosition[p.position] ? correctIds : wrongIds).push(p.id);
  }

  await prisma.$transaction([
    prisma.groupStandingPrediction.updateMany({
      where: { id: { in: correctIds } },
      data: { pointsAwarded: 3 },
    }),
    prisma.groupStandingPrediction.updateMany({
      where: { id: { in: wrongIds } },
      data: { pointsAwarded: 0 },
    }),
  ]);
}

// Re-evaluate dark-horse buckets every time a KO match flips to FINISHED.
// A team's best-round-reached determines the bucket. The advancer comes from
// knockoutWinnerId, which reads the shootout winner for draws decided on pens.
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

    const winnerId = knockoutWinnerId(m);
    if (!winnerId) continue;

    advancedFromRound[m.round]?.add(winnerId);
    if (m.round === "FINAL") championId = winnerId;
  }

  const bonusPreds = await prisma.bonusPrediction.findMany();
  if (bonusPreds.length === 0) return;

  // Bucket bonus ids by dark-horse point value and issue one updateMany per
  // distinct value (the round→points table has a handful of levels), rather
  // than one update per user — see recalcPointsForMatch for the why.
  const idsByPts = new Map<number, number[]>();
  for (const b of bonusPreds) {
    const teamId = b.darkHorseTeamId;
    let round: DarkHorseRound = "GROUP_EXIT";
    if (playedInRound.R32.has(teamId)) round = "R32";
    if (advancedFromRound.R32.has(teamId)) round = "R16";
    if (advancedFromRound.R16.has(teamId)) round = "QF";
    if (advancedFromRound.QF.has(teamId)) round = "SF";
    if (advancedFromRound.SF.has(teamId)) round = "FINAL";
    if (championId === teamId) round = "WINNER";

    const pts = darkHorsePoints(round);
    const bucket = idsByPts.get(pts);
    if (bucket) bucket.push(b.id);
    else idsByPts.set(pts, [b.id]);
  }

  await prisma.$transaction(
    [...idsByPts.entries()].map(([pts, ids]) =>
      prisma.bonusPrediction.updateMany({
        where: { id: { in: ids } },
        data: { darkHorsePts: pts },
      })
    )
  );
}

export async function recalcChampionAndRunnerUp(prisma: PrismaClient): Promise<void> {
  const final = await prisma.match.findFirst({
    where: { round: "FINAL", status: "FINISHED" },
  });
  if (!final || final.homeScore === null || final.awayScore === null) return;
  if (final.homeTeamId === null || final.awayTeamId === null) return;

  const winnerId = knockoutWinnerId(final);
  if (!winnerId) return;
  const runnerUpId = winnerId === final.homeTeamId ? final.awayTeamId : final.homeTeamId;

  const bonusPreds = await prisma.bonusPrediction.findMany();
  if (bonusPreds.length === 0) return;

  // Champion (20/0) and runner-up (10/0) are independent, so bucket ids for
  // each field and issue four updateMany statements total — not one update per
  // user (see recalcPointsForMatch for the timeout rationale).
  const championRight: number[] = [];
  const championWrong: number[] = [];
  const runnerRight: number[] = [];
  const runnerWrong: number[] = [];
  for (const b of bonusPreds) {
    (b.championTeamId === winnerId ? championRight : championWrong).push(b.id);
    (b.runnerUpTeamId === runnerUpId ? runnerRight : runnerWrong).push(b.id);
  }

  await prisma.$transaction([
    prisma.bonusPrediction.updateMany({ where: { id: { in: championRight } }, data: { championPts: 20 } }),
    prisma.bonusPrediction.updateMany({ where: { id: { in: championWrong } }, data: { championPts: 0 } }),
    prisma.bonusPrediction.updateMany({ where: { id: { in: runnerRight } }, data: { runnerUpPts: 10 } }),
    prisma.bonusPrediction.updateMany({ where: { id: { in: runnerWrong } }, data: { runnerUpPts: 0 } }),
  ]);
}

// Reverse of calculateAndStorePoints — resets a match to SCHEDULED and clears
// all derived points that depended on it.
export async function clearMatchResult(
  prisma: PrismaClient,
  matchId: number
): Promise<void> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return;

  // 1. Reset the match row.
  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore: null,
      awayScore: null,
      wentToPens: null,
      homeAdvanced: null,
      status: "SCHEDULED",
    },
  });

  // 2. Null out match prediction points for this match.
  await prisma.matchPrediction.updateMany({
    where: { matchId },
    data: { pointsAwarded: null },
  });

  // 3. If a group match: the group standings are now incomplete — clear those too
  //    so users don't keep ghost points from an incomplete group.
  if (match.groupId && isGroupRound(match.round)) {
    await prisma.groupStandingPrediction.updateMany({
      where: { groupId: match.groupId },
      data: { pointsAwarded: null },
    });
  }

  // 4. If a KO round that affects dark horse: re-derive from remaining finished
  //    matches (recalcDarkHorse is idempotent — it rebuilds from scratch).
  if ((KO_ROUNDS_FOR_DARK_HORSE as readonly Round[]).includes(match.round)) {
    await recalcDarkHorse(prisma);
  }

  // 5. If the final was cleared: null champion/runner-up bonus points explicitly
  //    (recalcChampionAndRunnerUp bails early when no FINISHED final exists, so
  //    it won't zero them out on its own).
  if (match.round === "FINAL") {
    await prisma.bonusPrediction.updateMany({
      data: { championPts: null, runnerUpPts: null },
    });
  }
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
