/**
 * Demo data injector for the leaderboard preview.
 *
 * Creates a handful of fake users (prefixed `demo_`) with random predictions
 * on every group-stage match + every group-standings slot + a bonus pick, then
 * spoofs results for the first N GROUP_1 matches and runs the scoring chain so
 * the leaderboard has visible totals.
 *
 * Run from repo root:
 *   railway run --service Postgres npx tsx scripts/demo-data.ts seed
 *   railway run --service Postgres npx tsx scripts/demo-data.ts cleanup
 *
 * Reads DATABASE_PUBLIC_URL injected by `railway run --service Postgres`.
 * Cleanup removes the demo_ users (and cascade-deletes their predictions
 * manually since the schema has no onDelete: Cascade) and clears the spoofed
 * match results — which also nulls pointsAwarded on any real-user predictions
 * for those matches.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { calculateAndStorePoints, clearMatchResult } from "../lib/recalc";

const DEMO_USERNAME_PREFIX = "demo_";
const DEMO_PASSWORD = "demo1234";

const DEMO_USERS = [
  { firstName: "Mihaela", lastName: "Ionescu", username: "demo_mihaela_i" },
  { firstName: "Vlad", lastName: "Popescu", username: "demo_vlad_p" },
  { firstName: "Ioana", lastName: "Stan", username: "demo_ioana_s" },
  { firstName: "Răzvan", lastName: "Dumitrescu", username: "demo_razvan_d" },
  { firstName: "Cătălin", lastName: "Munteanu", username: "demo_catalin_m" },
  { firstName: "Elena", lastName: "Constantinescu", username: "demo_elena_c" },
  { firstName: "Bogdan", lastName: "Marin", username: "demo_bogdan_m" },
  { firstName: "Andreea", lastName: "Georgescu", username: "demo_andreea_g" },
] as const;

const SPOOF_RESULTS: { homeScore: number; awayScore: number }[] = [
  { homeScore: 2, awayScore: 1 },
  { homeScore: 1, awayScore: 0 },
  { homeScore: 0, awayScore: 0 },
  { homeScore: 3, awayScore: 1 },
  { homeScore: 2, awayScore: 2 },
  { homeScore: 1, awayScore: 1 },
];

const TOP_SCORERS = [
  "Erling Haaland",
  "Kylian Mbappé",
  "Harry Kane",
  "Vinicius Junior",
  "Lautaro Martínez",
  "Lamine Yamal",
];

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makePrisma(): PrismaClient {
  const url = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("No DATABASE_PUBLIC_URL or DATABASE_URL in environment");
  const adapter = new PrismaPg({ connectionString: url });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

async function seed(prisma: PrismaClient): Promise<void> {
  console.log("→ Loading reference data…");
  const groups = await prisma.group.findMany({ include: { teams: true } });
  const allTeams = await prisma.team.findMany();
  const pot34Teams = allTeams.filter((t) => t.pot === 3 || t.pot === 4);

  const groupMatches = await prisma.match.findMany({
    where: { round: { in: ["GROUP_1", "GROUP_2", "GROUP_3"] } },
    select: { id: true, homeTeamId: true, awayTeamId: true },
  });
  console.log(`  ${groups.length} groups · ${allTeams.length} teams · ${groupMatches.length} group matches`);

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log(`\n→ Upserting ${DEMO_USERS.length} demo users…`);
  for (const u of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      create: {
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: hash,
        isAdmin: false,
      },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: hash,
      },
    });
    console.log(`  ✓ ${user.username}  (id=${user.id})`);

    // ── random group-match predictions ──────────────────────────────────────
    const matchUpserts = groupMatches
      .filter((m) => m.homeTeamId !== null && m.awayTeamId !== null)
      .map((m) => {
        const homeScore = randInt(0, 3);
        const awayScore = randInt(0, 3);
        return prisma.matchPrediction.upsert({
          where: { userId_matchId: { userId: user.id, matchId: m.id } },
          create: { userId: user.id, matchId: m.id, homeScore, awayScore },
          update: { homeScore, awayScore },
        });
      });

    // ── random group-standings predictions ─────────────────────────────────
    const standingsUpserts = groups.flatMap((g) => {
      const ranked = shuffle(g.teams);
      return [1, 2, 3, 4].map((position) =>
        prisma.groupStandingPrediction.upsert({
          where: { userId_groupId_position: { userId: user.id, groupId: g.id, position } },
          create: { userId: user.id, groupId: g.id, position, teamId: ranked[position - 1].id },
          update: { teamId: ranked[position - 1].id },
        })
      );
    });

    // ── random bonus prediction ────────────────────────────────────────────
    const champion = rand(allTeams);
    let runnerUp = rand(allTeams);
    while (runnerUp.id === champion.id) runnerUp = rand(allTeams);
    const darkHorse = rand(pot34Teams);
    const topScorerName = rand(TOP_SCORERS);

    const bonusUpsert = prisma.bonusPrediction.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        championTeamId: champion.id,
        runnerUpTeamId: runnerUp.id,
        darkHorseTeamId: darkHorse.id,
        topScorerName,
      },
      update: {
        championTeamId: champion.id,
        runnerUpTeamId: runnerUp.id,
        darkHorseTeamId: darkHorse.id,
        topScorerName,
      },
    });

    await prisma.$transaction([...matchUpserts, ...standingsUpserts, bonusUpsert]);
  }

  // ── spoof results on the first N GROUP_1 matches ─────────────────────────
  const targets = await prisma.match.findMany({
    where: {
      round: "GROUP_1",
      homeTeam: { isNot: null },
      awayTeam: { isNot: null },
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffTime: "asc" },
    take: SPOOF_RESULTS.length,
  });

  console.log(`\n→ Spoofing ${targets.length} GROUP_1 results and re-scoring…`);
  for (let i = 0; i < targets.length; i++) {
    const m = targets[i];
    const r = SPOOF_RESULTS[i];
    await prisma.match.update({
      where: { id: m.id },
      data: {
        homeScore: r.homeScore,
        awayScore: r.awayScore,
        wentToEt: false,
        wentToPens: false,
        status: "FINISHED",
      },
    });
    await calculateAndStorePoints(prisma, m.id);
    console.log(
      `  ✓ ${m.homeTeam!.name} ${r.homeScore}-${r.awayScore} ${m.awayTeam!.name}`
    );
  }

  console.log("\n✅ Demo data seeded. Visit /clasament to see the leaderboard.");
}

async function cleanup(prisma: PrismaClient): Promise<void> {
  console.log("→ Finding demo users…");
  const users = await prisma.user.findMany({
    where: { username: { startsWith: DEMO_USERNAME_PREFIX } },
    select: { id: true, username: true },
  });
  console.log(`  ${users.length} demo_* users found.`);

  if (users.length > 0) {
    const userIds = users.map((u) => u.id);
    console.log("\n→ Deleting demo predictions + users…");
    await prisma.$transaction([
      prisma.matchPrediction.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.groupStandingPrediction.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.bonusPrediction.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.user.deleteMany({ where: { id: { in: userIds } } }),
    ]);
    console.log("  ✓ removed.");
  }

  console.log(`\n→ Clearing spoofed GROUP_1 results (the first ${SPOOF_RESULTS.length})…`);
  const targets = await prisma.match.findMany({
    where: {
      round: "GROUP_1",
      homeTeam: { isNot: null },
      awayTeam: { isNot: null },
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffTime: "asc" },
    take: SPOOF_RESULTS.length,
  });
  for (const m of targets) {
    if (m.status === "FINISHED") {
      await clearMatchResult(prisma, m.id);
      console.log(`  ✓ cleared ${m.homeTeam!.name} vs ${m.awayTeam!.name}`);
    }
  }

  console.log("\n✅ Demo data removed.");
}

(async () => {
  const cmd = process.argv[2];
  if (cmd !== "seed" && cmd !== "cleanup") {
    console.error("Usage: tsx scripts/demo-data.ts <seed|cleanup>");
    process.exit(2);
  }
  const prisma = makePrisma();
  try {
    if (cmd === "seed") await seed(prisma);
    else await cleanup(prisma);
  } finally {
    await prisma.$disconnect();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
