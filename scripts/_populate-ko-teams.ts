/**
 * Fill in knockout-match teams as the bracket resolves.
 *
 *   railway run --service Postgres npx tsx scripts/_populate-ko-teams.ts        # fill
 *   railway run --service Postgres npx tsx scripts/_populate-ko-teams.ts list   # inspect
 *
 * Knockout slots are seeded by `npm run db:bootstrap` with their real kickoff
 * time and the football-data match id (externalId) but no teams ("TBD"). This
 * script fills the teams two ways, in order:
 *
 *  1. football-data.org — once a round's pairings are published, FD fills in
 *     homeTeam/awayTeam on those same match ids; we copy them onto our slots
 *     (matched by externalId). The free tier can lag by a day or two.
 *  2. MANUAL_MATCHUPS — a hand-entered fallback keyed by externalId, for when
 *     the bracket is publicly known (official app) before FD publishes it.
 *
 * `list` mode prints the team roster and every KO slot (externalId, kickoff in
 * Bucharest time, current teams) so the manual map can be filled in precisely.
 *
 * Safe to re-run: writes only when both sides are known and differ from what's
 * stored, and manual entries never clobber teams FD already filled. Never
 * touches scores. Requires DATABASE_PUBLIC_URL (+ FOOTBALL_DATA_API_KEY for fill).
 */
import { PrismaClient, Round } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fetchWorldCupMatches, type FdStage } from "../lib/football-api";

// Prefer the public proxy host: under `railway run` DATABASE_URL resolves to the
// internal postgres.railway.internal address, which is only reachable from
// inside Railway — not from a laptop running this script.
const connectionString = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_PUBLIC_URL / DATABASE_URL not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const KO_ROUNDS: Round[] = ["R32", "R16", "QF", "SF", "THIRD_PLACE", "FINAL"];

const KO_ROUND_FROM_FD: Partial<Record<FdStage, Round>> = {
  LAST_32: "R32",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  THIRD_PLACE: "THIRD_PLACE",
  FINAL: "FINAL",
};

// Manual fallback: externalId → [home fifaCode, away fifaCode]. Filled in from
// the official bracket when football-data lags. Left empty when FD is current.
// R32 matchups from the official app (28 Jun – 1 Jul 2026), matched to slots by
// kickoff time; home = left team as shown.
const MANUAL_MATCHUPS: { externalId: string; home: string; away: string }[] = [
  { externalId: "537417", home: "RSA", away: "CAN" }, // Africa de Sud – Canada
  { externalId: "537423", home: "BRA", away: "JPN" }, // Brazilia – Japonia
  { externalId: "537415", home: "GER", away: "PAR" }, // Germania – Paraguay
  { externalId: "537418", home: "NED", away: "MAR" }, // Olanda – Maroc
  { externalId: "537424", home: "CIV", away: "NOR" }, // Coasta de Fildeș – Norvegia
  { externalId: "537416", home: "FRA", away: "SWE" }, // Franța – Suedia
];

const KICKOFF_FMT = new Intl.DateTimeFormat("ro-RO", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Bucharest",
});

async function list() {
  const teams = await prisma.team.findMany({ orderBy: { fifaCode: "asc" } });
  console.log("👥 Teams (fifaCode · name):");
  console.log("   " + teams.map((t) => `${t.fifaCode} ${t.name}`).join("   "));

  const slots = await prisma.match.findMany({
    where: { round: { in: KO_ROUNDS } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: [{ round: "asc" }, { kickoffTime: "asc" }],
  });
  console.log(`\n🏟️  ${slots.length} knockout slots (round · externalId · kickoff · teams):`);
  for (const s of slots) {
    console.log(
      `   ${s.round.padEnd(11)} ext=${(s.externalId ?? "—").padEnd(8)} ${KICKOFF_FMT.format(
        s.kickoffTime
      )}  →  ${s.homeTeam?.name ?? "TBD"} vs ${s.awayTeam?.name ?? "TBD"}`
    );
  }
}

async function fill() {
  console.log("📡 Fetching WC2026 fixtures from football-data.org…");
  const fdMatches = await fetchWorldCupMatches();

  const teamByTla = new Map(
    (await prisma.team.findMany()).map((t) => [t.fifaCode, t.id])
  );

  // Set a slot's teams by fifaCode — but only when the slot is still TBD.
  // Reassigning teams (or flipping home/away) once a slot has teams would
  // corrupt any predictions already made against it, so a populated slot is
  // left untouched no matter the source.
  async function setSlotTeams(
    externalId: string,
    homeTla: string | null,
    awayTla: string | null,
    utcDate: string | null
  ): Promise<"filled" | "tbd" | "missing" | "noop"> {
    const match = await prisma.match.findUnique({ where: { externalId } });
    if (!match) return "missing";
    if (match.homeTeamId !== null && match.awayTeamId !== null) return "noop";

    const homeId = homeTla ? teamByTla.get(homeTla) ?? null : null;
    const awayId = awayTla ? teamByTla.get(awayTla) ?? null : null;
    if (homeId === null || awayId === null) return "tbd";

    await prisma.match.update({
      where: { id: match.id },
      data: {
        homeTeamId: homeId,
        awayTeamId: awayId,
        ...(utcDate ? { kickoffTime: new Date(utcDate) } : {}),
      },
    });
    console.log(`  ✓ ${match.round} (${match.slotDescription ?? `#${match.id}`}): ${homeTla} vs ${awayTla}`);
    return "filled";
  }

  let filled = 0;
  let stillTbd = 0;

  // 1. football-data (authoritative once published).
  for (const fd of fdMatches) {
    if (!KO_ROUND_FROM_FD[fd.stage]) continue;
    const r = await setSlotTeams(String(fd.id), fd.homeTeam.tla, fd.awayTeam.tla, fd.utcDate);
    if (r === "filled") filled++;
    else if (r === "tbd") stillTbd++;
  }

  // 2. Manual fallback for slots FD hasn't published yet.
  for (const m of MANUAL_MATCHUPS) {
    const r = await setSlotTeams(m.externalId, m.home, m.away, null);
    if (r === "filled") {
      filled++;
      stillTbd = Math.max(0, stillTbd - 1);
    } else if (r === "missing") {
      console.warn(`  ⚠ manual entry ext=${m.externalId} matched no slot`);
    } else if (r === "tbd") {
      console.warn(`  ⚠ manual entry ext=${m.externalId}: unknown team code (${m.home}/${m.away})`);
    }
  }

  console.log(`\n✅ Done. ${filled} slot(s) filled, ${stillTbd} still TBD.`);
}

async function main() {
  if (process.argv[2] === "list") {
    await list();
  } else {
    await fill();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
