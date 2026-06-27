import { computePointsForPrediction } from "@/lib/recalc";

describe("computePointsForPrediction", () => {
  it("scores a group match by exact-score rule", () => {
    expect(
      computePointsForPrediction(
        { round: "GROUP_1", homeScore: 2, awayScore: 1, homeAdvanced: null },
        { homeScore: 2, awayScore: 1, homeAdvances: null }
      )
    ).toBe(7);
  });

  it("scores a group match by correct-result + one-side rule", () => {
    expect(
      computePointsForPrediction(
        { round: "GROUP_2", homeScore: 3, awayScore: 0, homeAdvanced: null },
        { homeScore: 1, awayScore: 0, homeAdvances: null }
      )
    ).toBe(4);
  });

  it("scores a group match with correct result but no side exact (2 pts)", () => {
    expect(
      computePointsForPrediction(
        { round: "GROUP_1", homeScore: 3, awayScore: 1, homeAdvanced: null },
        { homeScore: 2, awayScore: 0, homeAdvances: null }
      )
    ).toBe(2);
  });

  it("returns 0 for a wrong group result", () => {
    expect(
      computePointsForPrediction(
        { round: "GROUP_3", homeScore: 2, awayScore: 1, homeAdvanced: null },
        { homeScore: 0, awayScore: 1, homeAdvances: null }
      )
    ).toBe(0);
  });

  it("awards 10 for a KO draw with the exact score and right shootout winner", () => {
    expect(
      computePointsForPrediction(
        { round: "R16", homeScore: 1, awayScore: 1, homeAdvanced: true },
        { homeScore: 1, awayScore: 1, homeAdvances: true }
      )
    ).toBe(10);
  });

  it("awards 10 for an exact decisive KO score", () => {
    expect(
      computePointsForPrediction(
        { round: "QF", homeScore: 2, awayScore: 1, homeAdvanced: null },
        { homeScore: 2, awayScore: 1, homeAdvances: null }
      )
    ).toBe(10);
  });

  it("awards 4 for a KO right-advancer-only (decisive, inexact... wrong manner)", () => {
    // Predicted a decisive home win; it actually went to penalties (home won).
    expect(
      computePointsForPrediction(
        { round: "SF", homeScore: 3, awayScore: 0, homeAdvanced: null },
        { homeScore: 1, awayScore: 1, homeAdvances: true }
      )
    ).toBe(4);
  });

  it("awards 7 for the right decisive advancer with an inexact score", () => {
    expect(
      computePointsForPrediction(
        { round: "FINAL", homeScore: 1, awayScore: 0, homeAdvanced: null },
        { homeScore: 2, awayScore: 0, homeAdvances: null }
      )
    ).toBe(7);
  });

  it("handles THIRD_PLACE as a knockout round", () => {
    expect(
      computePointsForPrediction(
        { round: "THIRD_PLACE", homeScore: 2, awayScore: 1, homeAdvanced: null },
        { homeScore: 2, awayScore: 1, homeAdvances: null }
      )
    ).toBe(10);
  });
});
