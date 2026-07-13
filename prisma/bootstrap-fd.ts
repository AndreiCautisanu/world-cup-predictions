/**
 * One-shot rebuild of WC2026 teams + fixtures from football-data.org.
 *
 *   FOOTBALL_DATA_API_KEY=… npm run db:bootstrap
 *
 * Group-stage matches and their predictions are wiped and recreated with the
 * real draw, real kickoff times, and the API's external match IDs (so the
 * eventual Section 5 sync endpoint can map fixtures to results without
 * fallbacks). Knockout placeholder slots stay in place and only get their
 * kickoff time + externalId updated (teams TBD until brackets fill).
 */
import { PrismaClient, Round } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fetchWorldCupMatches, type FdStage, type FdMatch } from "../lib/football-api";
import { TEAM_LOCALE } from "./data/team-locale";

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

const KO_SLOT_LABEL: Record<Exclude<Round, "GROUP_1" | "GROUP_2" | "GROUP_3">, string> = {
  R32: "Șaisprezecimi",
  R16: "Optimi",
  QF: "Sferturi",
  SF: "Semifinale",
  THIRD_PLACE: "Finala mică (locul 3)",
  FINAL: "Finala",
};

async function main() {
  console.log("📡 Fetching WC2026 fixtures from football-data.org…");
  const fdMatches = await fetchWorldCupMatches();
  console.log(`   ${fdMatches.length} matches received.`);

  const groupMatches = fdMatches.filter((m) => m.stage === "GROUP_STAGE");
  if (groupMatches.length !== 72) {
    throw new Error(`Expected 72 group-stage matches, got ${groupMatches.length}`);
  }

  // 1. Ensure groups A–L exist.
  const groupNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  for (const name of groupNames) {
    await prisma.group.upsert({ where: { name }, update: {}, create: { name } });
  }
  const groupByName = new Map(
    (await prisma.group.findMany()).map((g) => [g.name, g.id]),
  );

  // 2. Derive the real team roster from the group-stage matches.
  const teamsByTla = new Map<string, { fdName: string; group: string }>();
  for (const m of groupMatches) {
    for (const side of [m.homeTeam, m.awayTeam]) {
      if (!side.tla || !m.group) continue;
      teamsByTla.set(side.tla, {
        fdName: side.name ?? side.tla,
        group: m.group.slice(-1), // GROUP_A → A
      });
    }
  }
  if (teamsByTla.size !== 48) {
    throw new Error(`Expected 48 distinct teams, found ${teamsByTla.size}`);
  }
  for (const tla of teamsByTla.keys()) {
    if (!TEAM_LOCALE[tla]) {
      throw new Error(`No Romanian locale entry for ${tla} (${teamsByTla.get(tla)?.fdName})`);
    }
  }

  // 3. Wipe prediction tables that reference team IDs / group-stage match IDs.
  //    Keep KO MatchPredictions intact (their matchIds stay stable).
  console.log("🧹 Wiping group-stage predictions + team-tied predictions…");
  await prisma.matchPrediction.deleteMany({
    where: { match: { groupId: { not: null } } },
  });
  await prisma.groupStandingPrediction.deleteMany({});
  await prisma.bonusPrediction.deleteMany({});

  // 4. Wipe group-stage matches; they'll be rebuilt with real team assignments.
  await prisma.match.deleteMany({ where: { groupId: { not: null } } });

  // 5. Prune obsolete teams (placeholders not in the real draw).
  const realTlas = new Set(teamsByTla.keys());
  const existingTeams = await prisma.team.findMany({ select: { id: true, fifaCode: true } });
  const obsoleteIds = existingTeams.filter((t) => !realTlas.has(t.fifaCode)).map((t) => t.id);
  if (obsoleteIds.length) {
    await prisma.team.deleteMany({ where: { id: { in: obsoleteIds } } });
    console.log(`   Pruned ${obsoleteIds.length} placeholder teams.`);
  }

  // 6. Upsert the real teams.
  console.log("👥 Upserting 48 real teams…");
  for (const [tla, info] of teamsByTla) {
    const locale = TEAM_LOCALE[tla];
    await prisma.team.upsert({
      where: { fifaCode: tla },
      update: {
        name: locale.roName,
        flagEmoji: locale.flagEmoji,
        groupId: groupByName.get(info.group)!,
      },
      create: {
        name: locale.roName,
        fifaCode: tla,
        flagEmoji: locale.flagEmoji,
        // `pot` is no longer used for fixture generation (the API gives us
        // real fixtures); kept as a placeholder so the schema column is satisfied.
        pot: 1,
        groupId: groupByName.get(info.group)!,
      },
    });
  }
  const teamByTla = new Map(
    (await prisma.team.findMany()).map((t) => [t.fifaCode, t]),
  );

  // 7. Create real group-stage matches.
  console.log("⚽ Creating 72 real group-stage matches…");
  for (const m of groupMatches) {
    const home = m.homeTeam.tla ? teamByTla.get(m.homeTeam.tla) : null;
    const away = m.awayTeam.tla ? teamByTla.get(m.awayTeam.tla) : null;
    if (!home || !away || !m.group || m.matchday == null) {
      throw new Error(`Incomplete group-stage match ${m.id}`);
    }
    const round: Round =
      m.matchday === 1 ? "GROUP_1" : m.matchday === 2 ? "GROUP_2" : "GROUP_3";
    await prisma.match.create({
      data: {
        homeTeamId: home.id,
        awayTeamId: away.id,
        groupId: groupByName.get(m.group.slice(-1))!,
        round,
        kickoffTime: new Date(m.utcDate),
        status: "SCHEDULED",
        externalId: String(m.id),
      },
    });
  }

  // 8. Update knockout matches: real kickoff + externalId, by sorted index.
  console.log("🏟️  Updating KO match kickoffs + externalIds…");
  const koByRound = new Map<Round, FdMatch[]>();
  for (const m of fdMatches) {
    const round = KO_ROUND_FROM_FD[m.stage];
    if (!round) continue;
    const arr = koByRound.get(round) ?? [];
    arr.push(m);
    koByRound.set(round, arr);
  }
  for (const [round, fdList] of koByRound) {
    fdList.sort((a, b) => a.utcDate.localeCompare(b.utcDate) || a.id - b.id);
    const dbList = await prisma.match.findMany({
      where: { round, groupId: null },
      orderBy: { id: "asc" },
    });
    const label = KO_SLOT_LABEL[round as Exclude<Round, "GROUP_1" | "GROUP_2" | "GROUP_3">];
    // Fill any existing rows in order, then top up with creates if the API has more
    // than we previously seeded.
    for (let i = 0; i < fdList.length; i++) {
      const fd = fdList[i];
      if (i < dbList.length) {
        await prisma.match.update({
          where: { id: dbList[i].id },
          data: {
            kickoffTime: new Date(fd.utcDate),
            externalId: String(fd.id),
          },
        });
      } else {
        await prisma.match.create({
          data: {
            round,
            kickoffTime: new Date(fd.utcDate),
            externalId: String(fd.id),
            slotDescription: `${label} · meciul ${i + 1}`,
            status: "SCHEDULED",
          },
        });
      }
    }
  }

  console.log("✅ Bootstrap complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
