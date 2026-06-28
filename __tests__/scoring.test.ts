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

  it("returns 4 for correct result + one team's goals", () => {
    expect(groupMatchPoints({ ph: 2, pa: 1 }, { ah: 2, aa: 0 })).toBe(4);
    expect(groupMatchPoints({ ph: 2, pa: 1 }, { ah: 3, aa: 1 })).toBe(4);
  });

  it("returns 2 for correct result only", () => {
    expect(groupMatchPoints({ ph: 2, pa: 1 }, { ah: 3, aa: 0 })).toBe(2);
    expect(groupMatchPoints({ ph: 1, pa: 1 }, { ah: 2, aa: 2 })).toBe(2);
  });
});

describe("knockoutMatchPoints", () => {
  // A decisive win predicted as "home advances", true winner is away.
  it("returns 0 for the wrong advancer (decisive)", () => {
    expect(knockoutMatchPoints({ ph: 2, pa: 1 }, { ah: 0, aa: 1 })).toBe(0);
  });

  // Predicted a decisive draw-buster the wrong way and it actually went to pens
  // the other side — still wrong advancer, and not even a draw call.
  it("returns 0 for wrong advancer with a decisive pick when result is pens", () => {
    expect(
      knockoutMatchPoints({ ph: 2, pa: 1 }, { ah: 1, aa: 1, homeAdvances: false })
    ).toBe(0);
  });

  describe("right advancer", () => {
    it("returns 10 for an exact decisive scoreline", () => {
      expect(knockoutMatchPoints({ ph: 2, pa: 1 }, { ah: 2, aa: 1 })).toBe(10);
    });

    it("returns 7 for the right manner with one team's goals exact", () => {
      // predicted 2-1, actual 2-0: home goals exact, decisive home win both ways
      expect(knockoutMatchPoints({ ph: 2, pa: 1 }, { ah: 2, aa: 0 })).toBe(7);
    });

    it("returns 5 for the right manner with neither side exact", () => {
      expect(knockoutMatchPoints({ ph: 2, pa: 1 }, { ah: 1, aa: 0 })).toBe(5);
    });

    it("returns 10 for an exact draw + correctly backed shootout winner", () => {
      expect(
        knockoutMatchPoints(
          { ph: 1, pa: 1, homeAdvances: true },
          { ah: 1, aa: 1, homeAdvances: true }
        )
      ).toBe(10);
    });

    it("returns 5 for the right pens advancer but inexact draw score (no one-side tier for draws)", () => {
      expect(
        knockoutMatchPoints(
          { ph: 1, pa: 1, homeAdvances: true },
          { ah: 2, aa: 2, homeAdvances: true }
        )
      ).toBe(5);
    });

    it("returns 3 when the advancer is right but the manner is wrong (said decisive, went to pens)", () => {
      expect(
        knockoutMatchPoints({ ph: 2, pa: 1 }, { ah: 1, aa: 1, homeAdvances: true })
      ).toBe(3);
    });

    it("returns 3 when the advancer is right but the manner is wrong (said pens, was decisive)", () => {
      expect(
        knockoutMatchPoints({ ph: 1, pa: 1, homeAdvances: true }, { ah: 2, aa: 1 })
      ).toBe(3);
    });
  });

  describe("wrong advancer consolation", () => {
    it("returns 3 for calling a draw→pens even though the wrong side won the shootout", () => {
      expect(
        knockoutMatchPoints(
          { ph: 1, pa: 1, homeAdvances: false },
          { ah: 1, aa: 1, homeAdvances: true }
        )
      ).toBe(3);
    });

    it("caps the consolation — an exact draw with the wrong pens winner never beats a right advancer", () => {
      const wrongAdvancerExactDraw = knockoutMatchPoints(
        { ph: 1, pa: 1, homeAdvances: false },
        { ah: 1, aa: 1, homeAdvances: true }
      );
      const rightAdvancerWrongManner = knockoutMatchPoints(
        { ph: 2, pa: 1 },
        { ah: 1, aa: 1, homeAdvances: true }
      );
      expect(wrongAdvancerExactDraw).toBe(3);
      expect(wrongAdvancerExactDraw).toBeLessThanOrEqual(rightAdvancerWrongManner);
    });
  });

  it("rewards the exact score at double a right-team-right-manner-wrong-score pick", () => {
    const exact = knockoutMatchPoints({ ph: 1, pa: 0 }, { ah: 1, aa: 0 });
    const looseButRight = knockoutMatchPoints({ ph: 2, pa: 1 }, { ah: 1, aa: 0 });
    expect(exact).toBe(10);
    expect(looseButRight).toBe(5);
  });

  // The scenario from the design discussion: actual is "1–1, home wins on pens".
  it("ranks the pens-caller above the decisive-caller (both backing the right team)", () => {
    const result = { ah: 1, aa: 1, homeAdvances: true };
    const decisiveCaller = knockoutMatchPoints({ ph: 2, pa: 1 }, result); // "home 2-1"
    const pensCaller = knockoutMatchPoints(
      { ph: 1, pa: 1, homeAdvances: true }, // "draw → pens, home advances"
      result
    );
    expect(decisiveCaller).toBe(3);
    expect(pensCaller).toBe(10);
    expect(pensCaller).toBeGreaterThan(decisiveCaller);
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
