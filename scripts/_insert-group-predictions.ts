/**
 * Insert group-standing predictions for a user. Admin use only.
 * Run: railway run --service Postgres npx tsx scripts/_insert-group-predictions.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const url = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_PUBLIC_URL / DATABASE_URL not set");

const pool = new pg.Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

const USERNAME = "Alexandru_ad";

// Each array is ordered 1st → 4th within the group, by FIFA code.
const PREDICTIONS: Record<string, [string, string, string, string]> = {
  A: ["KOR", "MEX", "CZE", "RSA"],
  B: ["SUI", "BIH", "CAN", "QAT"],
  C: ["BRA", "MAR", "SCO", "HAI"],
  D: ["TUR", "USA", "AUS", "PAR"],
  E: ["GER", "CIV", "ECU", "CUW"],
  F: ["NED", "SWE", "JPN", "TUN"],
  G: ["BEL", "EGY", "IRN", "NZL"],
  H: ["ESP", "URY", "KSA", "CPV"],
  I: ["FRA", "NOR", "SEN", "IRQ"],
  J: ["ARG", "ALG", "AUT", "JOR"],
  K: ["POR", "COL", "UZB", "COD"],
  L: ["ENG", "CRO", "GHA", "PAN"],
};

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: USERNAME },
    select: { id: true },
  });
  if (!user) throw new Error(`User ${USERNAME} not found`);
  console.log(`User ${USERNAME} → id=${user.id}`);

  for (const [groupName, codes] of Object.entries(PREDICTIONS)) {
    // Resolve group via the first team in the list.
    const anchorTeam = await prisma.team.findUnique({
      where: { fifaCode: codes[0] },
      select: { id: true, groupId: true, group: { select: { name: true } } },
    });
    if (!anchorTeam) throw new Error(`Team ${codes[0]} not found`);

    const groupId = anchorTeam.groupId;
    console.log(`\nGroup ${groupName} (db id=${groupId}, name="${anchorTeam.group.name}"):`);

    for (let pos = 0; pos < 4; pos++) {
      const code = codes[pos];
      const team = await prisma.team.findUnique({
        where: { fifaCode: code },
        select: { id: true, name: true },
      });
      if (!team) throw new Error(`Team ${code} not found`);

      const pred = await prisma.groupStandingPrediction.upsert({
        where: { userId_groupId_position: { userId: user.id, groupId, position: pos + 1 } },
        create: { userId: user.id, groupId, position: pos + 1, teamId: team.id },
        update: { teamId: team.id },
      });
      console.log(`  pos ${pos + 1}: ${code} (${team.name}) → id=${pred.id}`);
    }
  }

  console.log("\n✅ Done.");
}

main().finally(() => pool.end());
