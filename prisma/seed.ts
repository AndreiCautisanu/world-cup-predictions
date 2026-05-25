import { PrismaClient, Round } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { TEAMS } from "./data/teams";
import {
  GROUP_FIXTURE_TEMPLATE,
  KNOCKOUT_SLOTS,
  kickoffForGroupMatch,
  kickoffForKnockout,
} from "./data/fixtures";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

type GroupRound = "GROUP_1" | "GROUP_2" | "GROUP_3";
type KORound = "R32" | "R16" | "QF" | "SF" | "THIRD_PLACE" | "FINAL";
const GROUP_ROUNDS: GroupRound[] = ["GROUP_1", "GROUP_2", "GROUP_3"];
const KO_ROUNDS: KORound[] = ["R32", "R16", "QF", "SF", "THIRD_PLACE", "FINAL"];

async function main() {
  // 1. Groups A–L
  const groupNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  for (const name of groupNames) {
    await prisma.group.upsert({ where: { name }, update: {}, create: { name } });
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

  // 3. Group-stage matches (idempotent: skip per-group if already seeded)
  for (const groupName of groupNames) {
    const groupId = groupMap.get(groupName)!;
    const existing = await prisma.match.count({ where: { groupId } });
    if (existing > 0) continue;
    const teamsInGroup = await prisma.team.findMany({
      where: { groupId },
      orderBy: { pot: "asc" },
    });
    const teamByPot = new Map(teamsInGroup.map((t) => [t.pot, t.id]));
    // Track per-(group, round) index so we can compute kickoff
    const indexByRound: Record<GroupRound, number> = { GROUP_1: 0, GROUP_2: 0, GROUP_3: 0 };
    for (const fixture of GROUP_FIXTURE_TEMPLATE) {
      const homeId = teamByPot.get(fixture.homePot)!;
      const awayId = teamByPot.get(fixture.awayPot)!;
      const idx = indexByRound[fixture.round]++;
      await prisma.match.create({
        data: {
          homeTeamId: homeId,
          awayTeamId: awayId,
          groupId,
          round: fixture.round as Round,
          kickoffTime: kickoffForGroupMatch(groupName, fixture.round, idx),
          status: "SCHEDULED",
        },
      });
    }
  }

  // 4. Knockout slot placeholders (idempotent per round)
  const existingRounds = new Set(
    (
      await prisma.match.findMany({ where: { groupId: null }, select: { round: true } })
    ).map((m) => m.round),
  );
  for (const round of KO_ROUNDS) {
    if (existingRounds.has(round as Round)) continue;
    existingRounds.add(round as Round);
    const slotsForRound = KNOCKOUT_SLOTS.filter((s) => s.round === round);
    for (let i = 0; i < slotsForRound.length; i++) {
      const s = slotsForRound[i];
      await prisma.match.create({
        data: {
          round: s.round as Round,
          kickoffTime: kickoffForKnockout(round, i),
          slotDescription: s.slotDescription,
          status: "SCHEDULED",
        },
      });
    }
  }

  // 5. Re-sync kickoff times on already-seeded matches.
  //    Idempotent: only writes when the stored value differs from the computed one.
  let groupUpdates = 0;
  for (const groupName of groupNames) {
    const groupId = groupMap.get(groupName)!;
    for (const round of GROUP_ROUNDS) {
      const ms = await prisma.match.findMany({
        where: { groupId, round },
        orderBy: { id: "asc" },
        select: { id: true, kickoffTime: true },
      });
      for (let i = 0; i < ms.length; i++) {
        const expected = kickoffForGroupMatch(groupName, round, i);
        if (ms[i].kickoffTime.getTime() !== expected.getTime()) {
          await prisma.match.update({
            where: { id: ms[i].id },
            data: { kickoffTime: expected },
          });
          groupUpdates++;
        }
      }
    }
  }
  let koUpdates = 0;
  for (const round of KO_ROUNDS) {
    const ms = await prisma.match.findMany({
      where: { round, groupId: null },
      orderBy: { id: "asc" },
      select: { id: true, kickoffTime: true },
    });
    for (let i = 0; i < ms.length; i++) {
      const expected = kickoffForKnockout(round, i);
      if (ms[i].kickoffTime.getTime() !== expected.getTime()) {
        await prisma.match.update({
          where: { id: ms[i].id },
          data: { kickoffTime: expected },
        });
        koUpdates++;
      }
    }
  }
  if (groupUpdates || koUpdates) {
    console.log(`🔄 Kickoff resync: ${groupUpdates} group + ${koUpdates} KO matches updated`);
  }

  // 6. Initial invite code
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
