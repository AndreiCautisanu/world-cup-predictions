/**
 * Test helper for the sync-results cron endpoint.
 * Usage:
 *   railway run --service Postgres npx tsx scripts/_test-sync.ts check
 *   railway run --service Postgres npx tsx scripts/_test-sync.ts clear
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

(async () => {
  const url = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("No DATABASE_PUBLIC_URL or DATABASE_URL in environment");

  const adapter = new PrismaPg({ connectionString: url });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma = new PrismaClient({ adapter } as any);

  const cmd = process.argv[2];

  const cze = await prisma.team.findUnique({ where: { fifaCode: "CZE" } });
  const kor = await prisma.team.findUnique({ where: { fifaCode: "KOR" } });

  if (!cze || !kor) {
    console.error("Teams not found", { cze, kor });
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`CZE id=${cze.id}  KOR id=${kor.id}`);

  const match = await prisma.match.findFirst({
    where: {
      OR: [
        { homeTeamId: cze.id, awayTeamId: kor.id },
        { homeTeamId: kor.id, awayTeamId: cze.id },
      ],
    },
    include: { homeTeam: true, awayTeam: true },
  });

  if (!match) {
    console.error("Match not found between CZE and KOR");
    // List all CZE matches for debugging
    const czeMatches = await prisma.match.findMany({
      where: { OR: [{ homeTeamId: cze.id }, { awayTeamId: cze.id }] },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoffTime: "asc" },
    });
    console.log("All CZE matches:");
    for (const m of czeMatches) {
      console.log(`  id=${m.id}  ${m.homeTeam?.fifaCode ?? "?"} vs ${m.awayTeam?.fifaCode ?? "?"}  score=${m.homeScore ?? "null"}-${m.awayScore ?? "null"}  status=${m.status}`);
    }
    await prisma.$disconnect();
    process.exit(1);
  }

  const label = `${match.homeTeam?.name ?? "?"} (${match.homeTeam?.fifaCode}) vs ${match.awayTeam?.name ?? "?"} (${match.awayTeam?.fifaCode})`;

  if (cmd === "clear") {
    await prisma.match.update({
      where: { id: match.id },
      data: { homeScore: null, awayScore: null, status: "SCHEDULED" },
    });
    console.log(`Cleared score for ${label} (id=${match.id}). Status set to SCHEDULED.`);
  } else {
    console.log(`${label}:`);
    console.log(`  id=${match.id}  externalId=${match.externalId ?? "(none)"}`);
    console.log(`  score=${match.homeScore ?? "null"}-${match.awayScore ?? "null"}  status=${match.status}`);
    console.log(`  wentToPens=${match.wentToPens}  homeAdvanced=${match.homeAdvanced}`);
  }

  await prisma.$disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
