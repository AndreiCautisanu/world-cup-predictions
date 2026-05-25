import { kickoffForGroupMatch, kickoffForKnockout } from "../prisma/data/fixtures";

describe("kickoffForGroupMatch", () => {
  it("spreads a group's two same-matchday matches into different kickoff slots", () => {
    const a = kickoffForGroupMatch("A", "GROUP_1", 0);
    const b = kickoffForGroupMatch("A", "GROUP_1", 1);
    expect(a.getTime()).not.toBe(b.getTime());
  });

  it("staggers groups across the matchday window — 2 groups per day", () => {
    // A and B share day 0; C and D share day 1
    const aDay = kickoffForGroupMatch("A", "GROUP_1", 0).getUTCDate();
    const bDay = kickoffForGroupMatch("B", "GROUP_1", 0).getUTCDate();
    const cDay = kickoffForGroupMatch("C", "GROUP_1", 0).getUTCDate();
    expect(aDay).toBe(bDay);
    expect(cDay).toBe(aDay + 1);
  });

  it("uses the right base date per matchday", () => {
    expect(kickoffForGroupMatch("A", "GROUP_1", 0).toISOString().slice(0, 10)).toBe("2026-06-11");
    expect(kickoffForGroupMatch("A", "GROUP_2", 0).toISOString().slice(0, 10)).toBe("2026-06-17");
    expect(kickoffForGroupMatch("A", "GROUP_3", 0).toISOString().slice(0, 10)).toBe("2026-06-23");
  });
});

describe("kickoffForKnockout", () => {
  it("spreads R32 matches across 4 days with 4 daily slots", () => {
    const first = kickoffForKnockout("R32", 0);
    const fifth = kickoffForKnockout("R32", 4); // first match of day 2
    expect(fifth.getUTCDate()).toBe(first.getUTCDate() + 1);
    expect(fifth.getUTCHours()).toBe(first.getUTCHours());
  });

  it("produces unique kickoffs for all 16 R32 matches", () => {
    const stamps = new Set(
      Array.from({ length: 16 }, (_, i) => kickoffForKnockout("R32", i).getTime())
    );
    expect(stamps.size).toBe(16);
  });

  it("schedules FINAL and THIRD_PLACE on the canonical dates", () => {
    expect(kickoffForKnockout("THIRD_PLACE", 0).toISOString()).toBe("2026-07-18T18:00:00.000Z");
    expect(kickoffForKnockout("FINAL", 0).toISOString()).toBe("2026-07-19T18:00:00.000Z");
  });
});
