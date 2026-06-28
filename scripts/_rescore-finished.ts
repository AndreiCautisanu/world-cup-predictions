/**
 * Recompute points for every finished match under the current scoring rules.
 *
 *   railway run --service Postgres npx tsx scripts/_rescore-finished.ts
 *
 * Scoring normally runs when an admin saves a result. After a scoring-rule
 * change (e.g. the knockout ladder), already-finished matches keep their stale
 * points until something re-triggers the recompute — that's what this does.
 *
 * calculateAndStorePoints is idempotent and rebuilds the dependent chains
 * (group standings, dark-horse buckets, champion/runner-up), so running it for
 * every finished match brings the whole leaderboard in line. Requires
 * DATABASE_PUBLIC_URL.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { calculateAndStorePoints } from "../lib/recalc";

const connectionString = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_PUBLIC_URL / DATABASE_URL not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const finished = await prisma.match.findMany({
    where: { status: "FINISHED" },
    orderBy: { kickoffTime: "asc" },
    select: { id: true, round: true, slotDescription: true, homeScore: true, awayScore: true },
  });
  console.log(`🔁 Re-scoring ${finished.length} finished match(es)…`);

  for (const m of finished) {
    await calculateAndStorePoints(prisma, m.id);
    console.log(`  ✓ ${m.round} #${m.id} (${m.homeScore}-${m.awayScore})`);
  }

  console.log("✅ Done. All finished matches re-scored under the current rules.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
