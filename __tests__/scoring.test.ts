import { groupMatchPoints, knockoutMatchPoints, groupStandingPoints, darkHorsePoints } from "@/lib/scoring";

describe("groupMatchPoints", () => {
  it("returns 0 for wrong result", () => {
    expect(groupMatchPoints({ ph: 2, pa: 1 }, { ah: 0, aa: 1 })).toBe(0);
    expect(groupMatchPoints({ ph: 1, pa: 1 }, { ah: 2, aa: 0 })).toBe(0);
  });

  it("returns 7 for exact score", () => {
    expect(groupMatchPoints({ ph: 2, pa: 1 }, { ah: 2, aa: 1 })).toBe(7);
    expect(groupMatchPoints({ ph: 0, pa: 0 }, { ah: 0, aa: 0 })).toBe(7);
  });

  it("returns 5 for correct result + one team's goals", () => {
    expect(groupMatchPoints({ ph: 2, pa: 1 }, { ah: 2, aa: 0 })).toBe(5);
    expect(groupMatchPoints({ ph: 2, pa: 1 }, { ah: 3, aa: 1 })).toBe(5);
  });

  it("returns 2 for correct result only", () => {
    expect(groupMatchPoints({ ph: 2, pa: 1 }, { ah: 3, aa: 0 })).toBe(2);
    expect(groupMatchPoints({ ph: 1, pa: 1 }, { ah: 2, aa: 2 })).toBe(2);
  });
});

describe("knockoutMatchPoints", () => {
  it("returns 0 when wrong winner", () => {
    expect(knockoutMatchPoints(
      { ph: 2, pa: 1, predictsEt: false, predictsPens: false },
      { ah: 0, aa: 1, wentToEt: false, wentToPens: false }
    )).toBe(0);
  });

  it("returns 4 for correct winner only", () => {
    expect(knockoutMatchPoints(
      { ph: 2, pa: 1, predictsEt: false, predictsPens: false },
      { ah: 3, aa: 0, wentToEt: false, wentToPens: false }
    )).toBe(4);
  });

  it("returns 8 for correct winner + exact 90-min score", () => {
    expect(knockoutMatchPoints(
      { ph: 2, pa: 1, predictsEt: false, predictsPens: false },
      { ah: 2, aa: 1, wentToEt: false, wentToPens: false }
    )).toBe(8);
  });

  it("returns 10 for correct winner + exact + correctly called ET/pens", () => {
    expect(knockoutMatchPoints(
      { ph: 1, pa: 1, predictsEt: true, predictsPens: true },
      { ah: 1, aa: 1, wentToEt: true, wentToPens: true }
    )).toBe(10);
  });

  it("handles a draw at 90 that goes to ET only (not pens)", () => {
    expect(knockoutMatchPoints(
      { ph: 1, pa: 1, predictsEt: true, predictsPens: false },
      { ah: 1, aa: 1, wentToEt: true, wentToPens: false }
    )).toBe(10);
  });
});

describe("groupStandingPoints", () => {
  it("awards 3 pts per correctly placed team", () => {
    const predicted = { 1: 100, 2: 101, 3: 102, 4: 103 };
    const actual = { 1: 100, 2: 101, 3: 102, 4: 103 };
    expect(groupStandingPoints(predicted, actual)).toBe(12);
  });

  it("awards 3 pts for each position match only", () => {
    const predicted = { 1: 100, 2: 101, 3: 102, 4: 103 };
    const actual = { 1: 100, 2: 999, 3: 102, 4: 998 };
    expect(groupStandingPoints(predicted, actual)).toBe(6);
  });

  it("returns 0 when no positions correct", () => {
    expect(groupStandingPoints(
      { 1: 100, 2: 101, 3: 102, 4: 103 },
      { 1: 200, 2: 201, 3: 202, 4: 203 }
    )).toBe(0);
  });
});

describe("darkHorsePoints", () => {
  it("returns 0 for group stage exit", () => {
    expect(darkHorsePoints("GROUP_EXIT")).toBe(0);
  });

  it("returns cumulative points by round reached", () => {
    expect(darkHorsePoints("R32")).toBe(3);
    expect(darkHorsePoints("R16")).toBe(6);
    expect(darkHorsePoints("QF")).toBe(10);
    expect(darkHorsePoints("SF")).toBe(15);
    expect(darkHorsePoints("FINAL")).toBe(22);
    expect(darkHorsePoints("WINNER")).toBe(30);
  });
});
