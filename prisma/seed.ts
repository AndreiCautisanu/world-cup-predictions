import { PrismaClient, Round } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { TEAMS } from "./data/teams";
import { GROUP_FIXTURE_TEMPLATE, MATCHDAY_DATES, KNOCKOUT_SLOTS } from "./data/fixtures";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Groups A–L
  const groupNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  for (const name of groupNames) {
    await prisma.group.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 2. Teams (fifaCode is @unique — upsert is safe)
  const groupMap = new Map<string, number>();
  for (const g of await prisma.group.findMany()) groupMap.set(g.name, g.id);

  for (const t of TEAMS) {
    await prisma.team.upsert({
      where: { fifaCode: t.fifaCode },
      update: {},
      create: {
        name: t.name,
        fifaCode: t.fifaCode,
        flagEmoji: t.flagEmoji,
        pot: t.pot,
        groupId: groupMap.get(t.group)!,
      },
    });
  }

  // 3. Group-stage matches (idempotent: skip if group already has matches)
  for (const groupName of groupNames) {
    const groupId = groupMap.get(groupName)!;
    const existing = await prisma.match.count({ where: { groupId } });
    if (existing > 0) {
      console.log(`Skipping group ${groupName} — matches already seeded`);
      continue;
    }
    const teamsInGroup = await prisma.team.findMany({
      where: { groupId },
      orderBy: { pot: "asc" },
    });
    const teamByPot = new Map(teamsInGroup.map((t) => [t.pot, t.id]));
    for (const fixture of GROUP_FIXTURE_TEMPLATE) {
      const homeId = teamByPot.get(fixture.homePot)!;
      const awayId = teamByPot.get(fixture.awayPot)!;
      await prisma.match.create({
        data: {
          homeTeamId: homeId,
          awayTeamId: awayId,
          groupId,
          round: fixture.round as Round,
          kickoffTime: new Date(MATCHDAY_DATES[fixture.round]),
          status: "SCHEDULED",
        },
      });
    }
  }

  // 4. Knockout slot placeholders (idempotent per round)
  const existingRounds = new Set(
    (await prisma.match.findMany({ where: { groupId: null }, select: { round: true } })).map(
      (m) => m.round,
    ),
  );
  for (const slot of KNOCKOUT_SLOTS) {
    if (existingRounds.has(slot.round as Round)) {
      continue; // round already has slots
    }
    existingRounds.add(slot.round as Round); // mark so we don't re-check within this run
    const slotsForRound = KNOCKOUT_SLOTS.filter((s) => s.round === slot.round);
    for (const s of slotsForRound) {
      await prisma.match.create({
        data: {
          round: s.round as Round,
          kickoffTime: new Date(s.kickoffTime),
          slotDescription: s.slotDescription,
          status: "SCHEDULED",
        },
      });
    }
    console.log(`Seeded ${slotsForRound.length} slots for round ${slot.round}`);
  }

  // 5. Initial invite code
  const code = process.env.SEED_INVITE_CODE ?? "cupa2026";
  await prisma.inviteCode.upsert({
    where: { code },
    update: { isActive: true },
    create: { code, isActive: true },
  });

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
