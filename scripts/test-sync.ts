/**
 * Manual sync smoke-test.
 * Finds the first GROUP_1 match in the DB, constructs a fake FdMatch for it
 * with score 2-0 HOME_TEAM, runs it through processFdMatches, and prints the
 * before/after state.
 *
 * Run from repo root:
 *   railway run --service Postgres npx tsx scripts/test-sync.ts
 *
 * The script uses DATABASE_PUBLIC_URL (injected by `railway run --service Postgres`)
 * so it can reach the DB from outside Railway's private network.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { FdMatch } from "../lib/football-api";
import { processFdMatches } from "../lib/sync";

const FAKE_FD_ID = 999_001; // arbitrary external id unlikely to clash with real FD ids

(async () => {
  const url = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("No DATABASE_PUBLIC_URL or DATABASE_URL in environment");

  const adapter = new PrismaPg({ connectionString: url });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma = new PrismaClient({ adapter } as any);

  // ── 1. Find the first scheduled GROUP_1 match with both teams ───────────────
  const match = await prisma.match.findFirst({
    where: {
      round: "GROUP_1",
      homeTeam: { isNot: null },
      awayTeam: { isNot: null },
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffTime: "asc" },
  });

  if (!match?.homeTeam || !match.awayTeam) {
    console.error("❌  No GROUP_1 match with both teams found in DB.");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`\n🔍  Target match: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
  console.log(`    id=${match.id}  externalId=${match.externalId ?? "(none)"}  status=${match.status}`);

  // ── 2. Count predictions before ─────────────────────────────────────────────
  const predsBefore = await prisma.matchPrediction.findMany({ where: { matchId: match.id } });
  console.log(`\n📋  Predictions for this match (${predsBefore.length} total):`);
  for (const p of predsBefore) {
    console.log(`    user=${p.userId}  pred=${p.homeScore}-${p.awayScore}  pts=${p.pointsAwarded ?? "null"}`);
  }

  // ── 3. Build fake FdMatch ────────────────────────────────────────────────────
  //    If the match already has an externalId, reuse it so the lookup hits the
  //    externalId index. Otherwise use FAKE_FD_ID + TLA fallback.
  const fdId = match.externalId ? Number(match.externalId) : FAKE_FD_ID;

  const fakeFdMatch: FdMatch = {
    id: fdId,
    utcDate: match.kickoffTime.toISOString(),
    status: "FINISHED",
    matchday: 1,
    stage: "GROUP_STAGE",
    group: "GROUP_A",
    homeTeam: {
      id: 1,
      name: match.homeTeam.name,
      shortName: match.homeTeam.name,
      tla: match.homeTeam.fifaCode,
      crest: null,
    },
    awayTeam: {
      id: 2,
      name: match.awayTeam.name,
      shortName: match.awayTeam.name,
      tla: match.awayTeam.fifaCode,
      crest: null,
    },
    score: {
      winner: "HOME_TEAM",
      duration: "REGULAR",
      fullTime: { home: 2, away: 0 },
      halfTime: { home: 1, away: 0 },
    },
  };

  console.log(
    `\n🚀  Running fake sync: ${match.homeTeam.name} 2-0 ${match.awayTeam.name}  (fd.id=${fdId})`
  );

  // ── 4. Run the sync pipeline ─────────────────────────────────────────────────
  const result = await processFdMatches(prisma, [fakeFdMatch]);
  console.log("\n✅  Sync result:", JSON.stringify(result, null, 2));

  // ── 5. Print after state ─────────────────────────────────────────────────────
  const predsAfter = await prisma.matchPrediction.findMany({ where: { matchId: match.id } });
  console.log("\n📊  Predictions after sync:");
  for (const p of predsAfter) {
    console.log(`    user=${p.userId}  pred=${p.homeScore}-${p.awayScore}  pts=${p.pointsAwarded ?? "null"}`);
  }

  const matchAfter = await prisma.match.findUnique({ where: { id: match.id } });
  console.log(
    `\n🏟️  Match after: score=${matchAfter?.homeScore}-${matchAfter?.awayScore}  status=${matchAfter?.status}`
  );

  await prisma.$disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
