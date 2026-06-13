import {
  recalcPointsForMatch,
  recalcGroupStandings,
  recalcDarkHorse,
  recalcChampionAndRunnerUp,
} from "@/lib/recalc";

// ── Minimal in-memory Prisma fake ────────────────────────────────────────────
// Each recalc fn batches writes by computed value, so the number of write
// statements must stay bounded (≤ a few) regardless of row count. Real Prisma
// runs each statement in `$transaction([...])` as its own network round-trip;
// one-write-per-row blows the 5s interactive-transaction timeout in prod. These
// tests pin both correctness AND that the write count does not scale with N.

type Row = Record<string, unknown>;

function matches(row: Row, where: Record<string, unknown> | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => {
    if (v !== null && typeof v === "object" && "in" in (v as object)) {
      return (v as { in: unknown[] }).in.includes(row[k]);
    }
    return row[k] === v;
  });
}

function makeTable(rows: Row[], counters: { writes: number }) {
  return {
    _rows: rows,
    findUnique: async ({ where }: { where: Record<string, unknown> }) =>
      rows.find((r) => matches(r, where)) ?? null,
    findFirst: async ({ where }: { where?: Record<string, unknown> }) =>
      rows.find((r) => matches(r, where)) ?? null,
    findMany: async ({ where }: { where?: Record<string, unknown> } = {}) =>
      rows.filter((r) => matches(r, where)),
    update: async ({ where, data }: { where: Record<string, unknown>; data: Row }) => {
      counters.writes++;
      const r = rows.find((x) => matches(x, where));
      if (r) Object.assign(r, data);
      return r;
    },
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Row }) => {
      counters.writes++;
      let count = 0;
      for (const r of rows.filter((x) => matches(x, where))) {
        Object.assign(r, data);
        count++;
      }
      return { count };
    },
  };
}

function makePrisma(tables: {
  match?: Row[];
  matchPrediction?: Row[];
  team?: Row[];
  groupStandingPrediction?: Row[];
  bonusPrediction?: Row[];
}) {
  const counters = { writes: 0 };
  const p = {
    match: makeTable(tables.match ?? [], counters),
    matchPrediction: makeTable(tables.matchPrediction ?? [], counters),
    team: makeTable(tables.team ?? [], counters),
    groupStandingPrediction: makeTable(tables.groupStandingPrediction ?? [], counters),
    bonusPrediction: makeTable(tables.bonusPrediction ?? [], counters),
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
    _counters: counters,
  };
  return p;
}

describe("recalcPointsForMatch — batched writes", () => {
  it("scores every prediction correctly with a bounded write count", async () => {
    // 40 predictions across the 4 possible group outcomes for a 4-1 result.
    const preds: Row[] = [];
    let id = 1;
    const mk = (homeScore: number, awayScore: number, expected: number) => {
      preds.push({ id: id++, matchId: 108, homeScore, awayScore, predictsEt: null, predictsPens: null, _expected: expected });
    };
    for (let i = 0; i < 10; i++) {
      mk(4, 1, 7); // exact
      mk(4, 0, 4); // one side exact (home), right result
      mk(2, 0, 2); // right result, neither side exact
      mk(0, 2, 0); // wrong result
    }
    const prisma = makePrisma({
      match: [{ id: 108, round: "GROUP_1", homeScore: 4, awayScore: 1, wentToEt: null, wentToPens: null, groupId: 4 }],
      matchPrediction: preds,
    });

    await recalcPointsForMatch(prisma as never, 108);

    for (const p of preds) {
      expect(p.pointsAwarded).toBe(p._expected);
    }
    // 4 distinct point buckets → at most 4 write statements, never 40.
    expect(prisma._counters.writes).toBeLessThanOrEqual(4);
  });
});

describe("recalcGroupStandings — batched writes", () => {
  it("awards 3 per correct position with a bounded write count", async () => {
    // Group of 4 teams, all 6 matches finished. Build a deterministic table.
    const team = [
      { id: 1, groupId: 4 },
      { id: 2, groupId: 4 },
      { id: 3, groupId: 4 },
      { id: 4, groupId: 4 },
    ];
    // Results that yield final order 1 > 2 > 3 > 4.
    const match = [
      { id: 1, groupId: 4, round: "GROUP_1", status: "FINISHED", homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 0 },
      { id: 2, groupId: 4, round: "GROUP_1", status: "FINISHED", homeTeamId: 3, awayTeamId: 4, homeScore: 1, awayScore: 0 },
      { id: 3, groupId: 4, round: "GROUP_2", status: "FINISHED", homeTeamId: 1, awayTeamId: 3, homeScore: 1, awayScore: 0 },
      { id: 4, groupId: 4, round: "GROUP_2", status: "FINISHED", homeTeamId: 2, awayTeamId: 4, homeScore: 1, awayScore: 0 },
      { id: 5, groupId: 4, round: "GROUP_3", status: "FINISHED", homeTeamId: 1, awayTeamId: 4, homeScore: 1, awayScore: 0 },
      { id: 6, groupId: 4, round: "GROUP_3", status: "FINISHED", homeTeamId: 2, awayTeamId: 3, homeScore: 1, awayScore: 0 },
    ];
    // 20 users; each predicts positions 1..4. Half perfect, half all-wrong.
    const groupStandingPrediction: Row[] = [];
    let id = 1;
    for (let u = 1; u <= 20; u++) {
      const perfect = u % 2 === 0;
      const order = perfect ? [1, 2, 3, 4] : [4, 3, 2, 1];
      for (let pos = 1; pos <= 4; pos++) {
        groupStandingPrediction.push({ id: id++, userId: u, groupId: 4, position: pos, teamId: order[pos - 1] });
      }
    }
    const prisma = makePrisma({ team, match, groupStandingPrediction });

    await recalcGroupStandings(prisma as never, 4);

    for (const p of groupStandingPrediction) {
      const correct = (p.position as number) === (p.teamId as number); // final order is 1,2,3,4
      expect(p.pointsAwarded).toBe(correct ? 3 : 0);
    }
    // 2 buckets (3 / 0) → ≤2 writes, never 80.
    expect(prisma._counters.writes).toBeLessThanOrEqual(2);
  });
});

describe("recalcDarkHorse / recalcChampionAndRunnerUp — bounded writes", () => {
  it("dark horse: bounded writes for many bonus rows", async () => {
    const match = [
      { id: 1, round: "R32", status: "FINISHED", homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 0 },
    ];
    const bonusPrediction: Row[] = [];
    for (let u = 1; u <= 30; u++) {
      bonusPrediction.push({ id: u, userId: u, darkHorseTeamId: u % 2 === 0 ? 1 : 2, championTeamId: 1, runnerUpTeamId: 2 });
    }
    const prisma = makePrisma({ match, bonusPrediction });
    await recalcDarkHorse(prisma as never);
    // team 1 won the R32 → advanced (R16 bucket = 6); team 2 played the R32 but
    // was eliminated (R32 bucket = 3). Two distinct values → ≤ a few writes.
    expect(prisma._counters.writes).toBeLessThanOrEqual(7);
    for (const b of bonusPrediction) {
      expect(b.darkHorsePts).toBe(b.darkHorseTeamId === 1 ? 6 /* R16 */ : 3 /* R32 */);
    }
  });

  it("champion/runner-up: bounded writes for many bonus rows", async () => {
    const match = [
      { id: 1, round: "FINAL", status: "FINISHED", homeTeamId: 1, awayTeamId: 2, homeScore: 3, awayScore: 1 },
    ];
    const bonusPrediction: Row[] = [];
    for (let u = 1; u <= 30; u++) {
      bonusPrediction.push({ id: u, userId: u, championTeamId: u % 2 === 0 ? 1 : 2, runnerUpTeamId: u % 3 === 0 ? 2 : 1, darkHorseTeamId: 1 });
    }
    const prisma = makePrisma({ match, bonusPrediction });
    await recalcChampionAndRunnerUp(prisma as never);
    expect(prisma._counters.writes).toBeLessThanOrEqual(4);
    for (const b of bonusPrediction) {
      expect(b.championPts).toBe(b.championTeamId === 1 ? 20 : 0);
      expect(b.runnerUpPts).toBe(b.runnerUpTeamId === 2 ? 10 : 0);
    }
  });
});
