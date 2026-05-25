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

export const MATCHDAY_DATES: Record<"GROUP_1" | "GROUP_2" | "GROUP_3", string> = {
  GROUP_1: "2026-06-12T18:00:00Z",
  GROUP_2: "2026-06-17T18:00:00Z",
  GROUP_3: "2026-06-22T18:00:00Z",
};

export type KnockoutSlot = {
  round: "R32" | "R16" | "QF" | "SF" | "THIRD_PLACE" | "FINAL";
  slotDescription: string;
  kickoffTime: string;
};

export const KNOCKOUT_SLOTS: KnockoutSlot[] = [
  // Round of 32 — 16 matches (4 per day: Jun 28, Jun 29, Jun 30, Jul 01)
  ...Array.from({ length: 16 }, (_, i) => {
    const dayOffset = Math.floor(i / 4); // 0–3
    const date = new Date("2026-06-28T18:00:00Z");
    date.setUTCDate(date.getUTCDate() + dayOffset);
    return {
      round: "R32" as const,
      slotDescription: `R32 Meciul ${i + 1}`,
      kickoffTime: date.toISOString().replace(".000Z", "Z"),
    };
  }),
  // Round of 16 — 8 matches
  ...Array.from({ length: 8 }, (_, i) => ({
    round: "R16" as const,
    slotDescription: `R16 Meciul ${i + 1}`,
    kickoffTime: `2026-07-${String(3 + Math.floor(i / 2)).padStart(2, "0")}T18:00:00Z`,
  })),
  // Quarterfinals — 4 matches
  ...Array.from({ length: 4 }, (_, i) => ({
    round: "QF" as const,
    slotDescription: `Sferturi Meciul ${i + 1}`,
    kickoffTime: `2026-07-${String(9 + i).padStart(2, "0")}T18:00:00Z`,
  })),
  // Semifinals — 2 matches
  ...Array.from({ length: 2 }, (_, i) => ({
    round: "SF" as const,
    slotDescription: `Semifinale Meciul ${i + 1}`,
    kickoffTime: `2026-07-${String(14 + i).padStart(2, "0")}T18:00:00Z`,
  })),
  { round: "THIRD_PLACE" as const, slotDescription: "Finala mică (locul 3)", kickoffTime: "2026-07-18T18:00:00Z" },
  { round: "FINAL" as const, slotDescription: "Finala", kickoffTime: "2026-07-19T18:00:00Z" },
];
