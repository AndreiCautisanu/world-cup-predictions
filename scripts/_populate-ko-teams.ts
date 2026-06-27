/**
 * Fill in knockout-match teams from football-data.org as the bracket resolves.
 *
 *   railway run --service Postgres npx tsx scripts/_populate-ko-teams.ts
 *
 * Knockout slots are seeded by `npm run db:bootstrap` with their real kickoff
 * time and the football-data match id (externalId) but no teams ("TBD"). Once a
 * round's pairings are known, football-data fills in homeTeam/awayTeam on those
 * same match ids — this script copies them onto our slots, matched by externalId.
 *
 * Safe to re-run: it only writes when a slot's teams are still unknown (or have
 * changed) and the API has resolved both sides. Slots whose teams aren't known
 * yet are left untouched and reported as still-TBD. It never touches scores.
 *
 * Requires FOOTBALL_DATA_API_KEY + DATABASE_URL (both present under `railway run`).
 */
import { PrismaClient, Round } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fetchWorldCupMatches, type FdStage } from "../lib/football-api";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const KO_ROUND_FROM_FD: Partial<Record<FdStage, Round>> = {
  LAST_32: "R32",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  THIRD_PLACE: "THIRD_PLACE",
  FINAL: "FINAL",
};

async function main() {
  console.log("📡 Fetching WC2026 fixtures from football-data.org…");
  const fdMatches = await fetchWorldCupMatches();

  const teamByTla = new Map(
    (await prisma.team.findMany()).map((t) => [t.fifaCode, t.id])
  );

  let filled = 0;
  let stillTbd = 0;
  let unlinked = 0;

  for (const fd of fdMatches) {
    if (!KO_ROUND_FROM_FD[fd.stage]) continue;

    const match = await prisma.match.findUnique({
      where: { externalId: String(fd.id) },
    });
    if (!match) {
      // No local slot carries this external id — bootstrap hasn't seeded it.
      unlinked++;
      continue;
    }

    const homeId = fd.homeTeam.tla ? teamByTla.get(fd.homeTeam.tla) ?? null : null;
    const awayId = fd.awayTeam.tla ? teamByTla.get(fd.awayTeam.tla) ?? null : null;

    // Both sides must be known before we touch the slot — a half-filled KO
    // match would let people predict against a phantom opponent.
    if (homeId === null || awayId === null) {
      stillTbd++;
      continue;
    }

    if (match.homeTeamId === homeId && match.awayTeamId === awayId) continue;

    await prisma.match.update({
      where: { id: match.id },
      data: { homeTeamId: homeId, awayTeamId: awayId, kickoffTime: new Date(fd.utcDate) },
    });
    console.log(
      `  ✓ ${match.round} (${match.slotDescription ?? `#${match.id}`}): ${fd.homeTeam.tla} vs ${fd.awayTeam.tla}`
    );
    filled++;
  }

  console.log(
    `\n✅ Done. ${filled} slot(s) filled, ${stillTbd} still TBD${
      unlinked ? `, ${unlinked} FD match(es) with no local slot` : ""
    }.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
