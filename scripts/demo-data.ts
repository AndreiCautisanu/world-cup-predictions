/**
 * Demo-data injector for the leaderboard preview.
 *
 * Seeds ten fake users (prefixed `demo_`), each with predictions on every
 * group-stage match, every group-standings slot, and a bonus pick. Each user
 * has a distinct "persona" so the leaderboard has visible variety (some lean
 * defensive, some over-call goals, one is a deliberate lucky-guesser, etc).
 *
 * Then spoofs results for the entire GROUP_1 (matchday-1) round — all ~24
 * matches — and BACKDATES their kickoffs so:
 *   - isMatchLocked fires (time-based lock layer)
 *   - status === FINISHED (status-based lock layer)
 *   - isTournamentLocked fires (bonus + standings hidden from late joiners)
 *
 * The original kickoffs are snapshotted to scripts/demo-data-snapshot.json so
 * cleanup can restore them. If the snapshot is missing, cleanup falls back
 * to clearing results and the user can re-run `db:bootstrap` to refetch real
 * fixtures from football-data.org.
 *
 * Usage:
 *   railway run --service Postgres npx tsx scripts/demo-data.ts seed
 *   railway run --service Postgres npx tsx scripts/demo-data.ts cleanup
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { calculateAndStorePoints, clearMatchResult } from "../lib/recalc";

const DEMO_USERNAME_PREFIX = "demo_";
const DEMO_PASSWORD = "demo1234";
const SNAPSHOT_PATH = path.resolve(__dirname, "demo-data-snapshot.json");
// Anchor: first GROUP_1 match should kick off this many days before "now".
// 3 days leaves room for MD2/MD3 to remain in the future relative to the
// real WC schedule (which clusters MD1/2/3 within a week per group).
const DAYS_AGO_FOR_FIRST_MD1 = 3;

// ── Personas ──────────────────────────────────────────────────────────────
// Each persona has a `score()` that produces an [home, away] prediction
// given the actual match (for the lucky-guesser) or just at random.

type ActualScore = { home: number; away: number };
type Predictor = (rng: Rng, actual?: ActualScore) => [number, number];

type Persona = {
  username: string;
  firstName: string;
  lastName: string;
  predict: Predictor;
};

const PERSONAS: Persona[] = [
  {
    username: "demo_mihaela_i",
    firstName: "Mihaela",
    lastName: "Ionescu",
    // Conservative — 1-0, 1-1, 2-1 mostly.
    predict: (r) => r.pick([[1, 0], [1, 1], [2, 1], [0, 0], [0, 1]]),
  },
  {
    username: "demo_vlad_p",
    firstName: "Vlad",
    lastName: "Popescu",
    // Draws-lover.
    predict: (r) => r.pick([[1, 1], [2, 2], [0, 0], [1, 1], [3, 3]]),
  },
  {
    username: "demo_ioana_s",
    firstName: "Ioana",
    lastName: "Stan",
    // Goalfest optimist.
    predict: (r) => r.pick([[3, 2], [2, 3], [3, 1], [4, 2], [2, 4]]),
  },
  {
    username: "demo_razvan_d",
    firstName: "Răzvan",
    lastName: "Dumitrescu",
    // Defensive — 0-0 and 1-0 forever.
    predict: (r) => r.pick([[0, 0], [1, 0], [0, 1], [1, 1], [0, 0]]),
  },
  {
    username: "demo_catalin_m",
    firstName: "Cătălin",
    lastName: "Munteanu",
    // Chaos goblin — anything 0..4.
    predict: (r) => [r.int(0, 4), r.int(0, 4)],
  },
  {
    username: "demo_elena_c",
    firstName: "Elena",
    lastName: "Constantinescu",
    // Slight home-team bias, modest scores.
    predict: (r) => [r.int(1, 3), r.int(0, 2)],
  },
  {
    username: "demo_bogdan_m",
    firstName: "Bogdan",
    lastName: "Marin",
    // Lucky guesser — copies the actual ~60% of the time, otherwise random.
    predict: (r, actual) => {
      if (actual && r.float() < 0.6) return [actual.home, actual.away];
      return [r.int(0, 3), r.int(0, 3)];
    },
  },
  {
    username: "demo_andreea_g",
    firstName: "Andreea",
    lastName: "Georgescu",
    // Slight away-team bias.
    predict: (r) => [r.int(0, 2), r.int(1, 3)],
  },
  {
    username: "demo_dragos_v",
    firstName: "Dragoș",
    lastName: "Vasile",
    // All 2-1's — comically formulaic.
    predict: () => [2, 1],
  },
  {
    username: "demo_cristina_r",
    firstName: "Cristina",
    lastName: "Radu",
    // Half-correct sniper — gets one side close to right.
    predict: (r, actual) => {
      if (!actual) return [r.int(0, 3), r.int(0, 3)];
      const flip = r.float() < 0.5;
      return flip
        ? [actual.home, r.int(0, 3)]
        : [r.int(0, 3), actual.away];
    },
  },
];

const TOP_SCORERS = [
  "Erling Haaland",
  "Kylian Mbappé",
  "Harry Kane",
  "Vinicius Junior",
  "Lautaro Martínez",
  "Lamine Yamal",
  "Jude Bellingham",
  "Florian Wirtz",
];

// ── Deterministic-per-user RNG ────────────────────────────────────────────
class Rng {
  private state: number;
  constructor(seed: number) {
    // Mulberry32 — small, fast, OK for demo-data variety.
    this.state = seed >>> 0;
  }
  float(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number {
    return Math.floor(this.float() * (max - min + 1)) + min;
  }
  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.float() * items.length)];
  }
  shuffle<T>(items: T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.float() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}

// ── Realistic actual scores ────────────────────────────────────────────────
// Weighted: most matches end 0-2 goals per side, occasional blowouts.
function generateActualScores(rng: Rng, count: number): ActualScore[] {
  const distribution: number[] = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 5];
  const out: ActualScore[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      home: rng.pick(distribution),
      away: rng.pick(distribution),
    });
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
    select: { id: true, round: true, homeTeamId: true, awayTeamId: true, kickoffTime: true },
    orderBy: { kickoffTime: "asc" },
  });
  console.log(
    `  ${groups.length} groups · ${allTeams.length} teams · ${groupMatches.length} group matches`
  );

  // ── Backdate GROUP_1 kickoffs ───────────────────────────────────────────
  const md1 = groupMatches.filter((m) => m.round === "GROUP_1");
  if (md1.length === 0) {
    console.log("⚠️  No GROUP_1 matches found — has the bootstrap been run?");
    return;
  }
  const earliestMd1 = md1.reduce((min, m) =>
    m.kickoffTime < min.kickoffTime ? m : min
  );
  const anchor = new Date();
  anchor.setUTCDate(anchor.getUTCDate() - DAYS_AGO_FOR_FIRST_MD1);
  const offsetMs = anchor.getTime() - earliestMd1.kickoffTime.getTime();

  // Snapshot originals before mutating, then shift each kickoff by the same
  // offset so the relative spacing within MD1 is preserved.
  const snapshot: Record<string, string> = {};
  for (const m of md1) {
    snapshot[String(m.id)] = m.kickoffTime.toISOString();
  }
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
  console.log(`  ✓ Snapshot of ${md1.length} original kickoffs → ${path.basename(SNAPSHOT_PATH)}`);

  console.log(`→ Backdating ${md1.length} GROUP_1 kickoffs by ~${Math.round(offsetMs / 86_400_000)} days…`);
  for (const m of md1) {
    await prisma.match.update({
      where: { id: m.id },
      data: { kickoffTime: new Date(m.kickoffTime.getTime() + offsetMs) },
    });
  }

  // ── Spoof MD1 actual scores (deterministic via fixed seed) ──────────────
  const actualRng = new Rng(0xCAFE);
  const playableMd1 = md1.filter(
    (m) => m.homeTeamId !== null && m.awayTeamId !== null
  );
  const actuals = generateActualScores(actualRng, playableMd1.length);
  const actualByMatchId = new Map<number, ActualScore>();
  for (let i = 0; i < playableMd1.length; i++) {
    actualByMatchId.set(playableMd1[i].id, actuals[i]);
  }

  console.log(`→ Spoofing ${playableMd1.length} GROUP_1 results…`);
  for (let i = 0; i < playableMd1.length; i++) {
    const m = playableMd1[i];
    const a = actuals[i];
    await prisma.match.update({
      where: { id: m.id },
      data: {
        homeScore: a.home,
        awayScore: a.away,
        wentToPens: false,
        status: "FINISHED",
      },
    });
  }

  // ── Upsert demo users + their predictions ───────────────────────────────
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log(`\n→ Upserting ${PERSONAS.length} demo users…`);
  for (let pIdx = 0; pIdx < PERSONAS.length; pIdx++) {
    const persona = PERSONAS[pIdx];
    const rng = new Rng(0xBEEF + pIdx);

    const user = await prisma.user.upsert({
      where: { username: persona.username },
      create: {
        username: persona.username,
        firstName: persona.firstName,
        lastName: persona.lastName,
        passwordHash: hash,
        isAdmin: false,
      },
      update: {
        firstName: persona.firstName,
        lastName: persona.lastName,
        passwordHash: hash,
      },
    });
    console.log(`  ✓ ${persona.username}  (${persona.firstName} ${persona.lastName})`);

    // Match predictions across all 72 group matches. Past MD1 matches get
    // the persona's prediction informed by the actual score (lucky guesser);
    // MD2/MD3 are open-ended random per persona.
    for (const m of groupMatches) {
      if (m.homeTeamId === null || m.awayTeamId === null) continue;
      const actual = actualByMatchId.get(m.id);
      const [h, a] = persona.predict(rng, actual);
      const homeScore = Math.max(0, Math.min(20, Math.floor(h)));
      const awayScore = Math.max(0, Math.min(20, Math.floor(a)));
      await prisma.matchPrediction.upsert({
        where: { userId_matchId: { userId: user.id, matchId: m.id } },
        create: { userId: user.id, matchId: m.id, homeScore, awayScore },
        update: { homeScore, awayScore },
      });
    }

    // Group standings — shuffled per persona.
    for (const g of groups) {
      const ranked = rng.shuffle(g.teams);
      for (const position of [1, 2, 3, 4] as const) {
        await prisma.groupStandingPrediction.upsert({
          where: { userId_groupId_position: { userId: user.id, groupId: g.id, position } },
          create: { userId: user.id, groupId: g.id, position, teamId: ranked[position - 1].id },
          update: { teamId: ranked[position - 1].id },
        });
      }
    }

    // Bonus pick.
    const champion = rng.pick(allTeams);
    let runnerUp = rng.pick(allTeams);
    while (runnerUp.id === champion.id) runnerUp = rng.pick(allTeams);
    const darkHorse = rng.pick(pot34Teams);
    const topScorerName = rng.pick(TOP_SCORERS);

    await prisma.bonusPrediction.upsert({
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
  }

  // ── Score everything in one pass (after users + predictions exist) ──────
  console.log(`\n→ Computing points for ${playableMd1.length} GROUP_1 matches…`);
  for (const m of playableMd1) {
    await calculateAndStorePoints(prisma, m.id);
  }

  console.log("\n✅ Demo data seeded.");
  console.log(`   • ${PERSONAS.length} users  • all GROUP_1 (${playableMd1.length}) matches FINISHED + backdated`);
  console.log("   • Visit /clasament to see the leaderboard.");
  console.log("   • Try /pronosticuri — GROUP_1 cards show 'Blocat' (status + time).");
  console.log("   • Try /pronosticuri/bonus — locked (tournament started).");
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
    // With the cascade migration in place, deleting users would also delete
    // predictions automatically — but explicit deletes still work and make
    // the script idempotent across pre/post-migration databases.
    await prisma.$transaction([
      prisma.matchPrediction.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.groupStandingPrediction.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.bonusPrediction.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.user.deleteMany({ where: { id: { in: userIds } } }),
    ]);
    console.log("  ✓ removed.");
  }

  // Clear GROUP_1 results (also nulls pointsAwarded for any real users who
  // had predicted those matches).
  const md1Finished = await prisma.match.findMany({
    where: { round: "GROUP_1", status: "FINISHED" },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffTime: "asc" },
  });
  if (md1Finished.length > 0) {
    console.log(`\n→ Clearing ${md1Finished.length} spoofed GROUP_1 results…`);
    for (const m of md1Finished) {
      await clearMatchResult(prisma, m.id);
    }
  }

  // Restore original kickoffs from snapshot if present.
  if (fs.existsSync(SNAPSHOT_PATH)) {
    const raw = fs.readFileSync(SNAPSHOT_PATH, "utf8");
    const snapshot: Record<string, string> = JSON.parse(raw);
    const entries = Object.entries(snapshot);
    console.log(`\n→ Restoring ${entries.length} original GROUP_1 kickoffs…`);
    for (const [id, iso] of entries) {
      await prisma.match.update({
        where: { id: Number(id) },
        data: { kickoffTime: new Date(iso) },
      });
    }
    fs.unlinkSync(SNAPSHOT_PATH);
    console.log("  ✓ kickoffs restored + snapshot deleted.");
  } else {
    console.log(
      "\n⚠️  No kickoff snapshot found. If GROUP_1 kickoffs were backdated by a previous seed,\n" +
        "    re-run `npm run db:bootstrap` to refetch real fixtures from football-data.org."
    );
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
