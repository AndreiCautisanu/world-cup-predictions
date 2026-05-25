export type FixturePair = {
  round: "GROUP_1" | "GROUP_2" | "GROUP_3";
  homePot: 1 | 2 | 3 | 4;
  awayPot: 1 | 2 | 3 | 4;
};

export const GROUP_FIXTURE_TEMPLATE: FixturePair[] = [
  { round: "GROUP_1", homePot: 1, awayPot: 2 },
  { round: "GROUP_1", homePot: 3, awayPot: 4 },
  { round: "GROUP_2", homePot: 1, awayPot: 3 },
  { round: "GROUP_2", homePot: 2, awayPot: 4 },
  { round: "GROUP_3", homePot: 1, awayPot: 4 },
  { round: "GROUP_3", homePot: 2, awayPot: 3 },
];

const GROUP_ORDER = "ABCDEFGHIJKL";
const GROUP_MATCHDAY_START: Record<"GROUP_1" | "GROUP_2" | "GROUP_3", string> = {
  GROUP_1: "2026-06-11",
  GROUP_2: "2026-06-17",
  GROUP_3: "2026-06-23",
};
const GROUP_DAILY_SLOTS = [15, 18, 21, 24]; // UTC hours; 24 → 00:00 next day

/**
 * Deterministic kickoff for a group-stage match.
 *
 * Layout: each matchday spans 6 days (2 groups per day), with 4 daily kickoff
 * slots at 15/18/21/24 UTC. Within a day, the first group gets slots [0,1],
 * the second group gets slots [2,3]. `indexInGroup` (0 or 1) picks between
 * the group's two same-matchday matches.
 */
export function kickoffForGroupMatch(
  groupName: string,
  round: "GROUP_1" | "GROUP_2" | "GROUP_3",
  indexInGroup: number
): Date {
  const groupIdx = GROUP_ORDER.indexOf(groupName);
  if (groupIdx < 0) throw new Error(`Unknown group ${groupName}`);
  const dayOffset = Math.floor(groupIdx / 2);
  const pairPosition = groupIdx % 2; // 0 = first group of the pair, 1 = second
  const slotIdx = pairPosition * 2 + indexInGroup;
  const hour = GROUP_DAILY_SLOTS[slotIdx];
  const d = new Date(`${GROUP_MATCHDAY_START[round]}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour);
  return d;
}

export type KnockoutSlot = {
  round: "R32" | "R16" | "QF" | "SF" | "THIRD_PLACE" | "FINAL";
  slotDescription: string;
};

export const KNOCKOUT_SLOTS: KnockoutSlot[] = [
  ...Array.from({ length: 16 }, (_, i) => ({
    round: "R32" as const,
    slotDescription: `R32 Meciul ${i + 1}`,
  })),
  ...Array.from({ length: 8 }, (_, i) => ({
    round: "R16" as const,
    slotDescription: `R16 Meciul ${i + 1}`,
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    round: "QF" as const,
    slotDescription: `Sferturi Meciul ${i + 1}`,
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    round: "SF" as const,
    slotDescription: `Semifinale Meciul ${i + 1}`,
  })),
  { round: "THIRD_PLACE" as const, slotDescription: "Finala mică (locul 3)" },
  { round: "FINAL" as const, slotDescription: "Finala" },
];

type KORound = KnockoutSlot["round"];

const KO_LAYOUT: Record<
  KORound,
  { start: string; slotsPerDay: number[]; daysCount: number }
> = {
  // 16 matches: 4 days × 4 slots/day
  R32: { start: "2026-06-28", slotsPerDay: [15, 18, 21, 24], daysCount: 4 },
  // 8 matches: 4 days × 2 slots/day
  R16: { start: "2026-07-03", slotsPerDay: [18, 22], daysCount: 4 },
  // 4 matches: 2 days × 2 slots/day
  QF: { start: "2026-07-09", slotsPerDay: [18, 22], daysCount: 2 },
  // 2 matches: 2 days × 1 slot/day
  SF: { start: "2026-07-14", slotsPerDay: [22], daysCount: 2 },
  THIRD_PLACE: { start: "2026-07-18", slotsPerDay: [18], daysCount: 1 },
  FINAL: { start: "2026-07-19", slotsPerDay: [18], daysCount: 1 },
};

export function kickoffForKnockout(round: KORound, indexInRound: number): Date {
  const layout = KO_LAYOUT[round];
  const slotsPerDay = layout.slotsPerDay.length;
  const dayOffset = Math.floor(indexInRound / slotsPerDay);
  const slotIdx = indexInRound % slotsPerDay;
  const hour = layout.slotsPerDay[slotIdx];
  const d = new Date(`${layout.start}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour);
  return d;
}
