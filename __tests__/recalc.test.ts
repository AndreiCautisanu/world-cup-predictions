import { computePointsForPrediction } from "@/lib/recalc";

describe("computePointsForPrediction", () => {
  it("scores a group match by exact-score rule", () => {
    expect(
      computePointsForPrediction(
        { round: "GROUP_1", homeScore: 2, awayScore: 1, wentToEt: null, wentToPens: null },
        { homeScore: 2, awayScore: 1, predictsEt: null, predictsPens: null }
      )
    ).toBe(7);
  });

  it("scores a group match by correct-result + one-side rule", () => {
    expect(
      computePointsForPrediction(
        { round: "GROUP_2", homeScore: 3, awayScore: 0, wentToEt: null, wentToPens: null },
        { homeScore: 1, awayScore: 0, predictsEt: null, predictsPens: null }
      )
    ).toBe(4);
  });

  it("scores a group match with correct result but no side exact (2 pts)", () => {
    expect(
      computePointsForPrediction(
        { round: "GROUP_1", homeScore: 3, awayScore: 1, wentToEt: null, wentToPens: null },
        { homeScore: 2, awayScore: 0, predictsEt: null, predictsPens: null }
      )
    ).toBe(2);
  });

  it("returns 0 for a wrong group result", () => {
    expect(
      computePointsForPrediction(
        { round: "GROUP_3", homeScore: 2, awayScore: 1, wentToEt: null, wentToPens: null },
        { homeScore: 0, awayScore: 1, predictsEt: null, predictsPens: null }
      )
    ).toBe(0);
  });

  it("awards 10 for a KO match with correct ET call", () => {
    expect(
      computePointsForPrediction(
        { round: "R16", homeScore: 1, awayScore: 1, wentToEt: true, wentToPens: false },
        { homeScore: 1, awayScore: 1, predictsEt: true, predictsPens: false }
      )
    ).toBe(10);
  });

  it("awards 8 for an exact KO score predicted as regulation that ended in regulation", () => {
    expect(
      computePointsForPrediction(
        { round: "QF", homeScore: 2, awayScore: 1, wentToEt: false, wentToPens: false },
        { homeScore: 2, awayScore: 1, predictsEt: false, predictsPens: false }
      )
    ).toBe(8);
  });

  it("awards 4 for KO correct-winner-only", () => {
    expect(
      computePointsForPrediction(
        { round: "SF", homeScore: 3, awayScore: 0, wentToEt: false, wentToPens: false },
        { homeScore: 1, awayScore: 0, predictsEt: false, predictsPens: false }
      )
    ).toBe(4);
  });

  it("treats null KO predicts/wentTo flags as false", () => {
    expect(
      computePointsForPrediction(
        { round: "FINAL", homeScore: 1, awayScore: 0, wentToEt: null, wentToPens: null },
        { homeScore: 1, awayScore: 0, predictsEt: null, predictsPens: null }
      )
    ).toBe(8);
  });

  it("handles THIRD_PLACE as a knockout round", () => {
    expect(
      computePointsForPrediction(
        { round: "THIRD_PLACE", homeScore: 2, awayScore: 1, wentToEt: false, wentToPens: false },
        { homeScore: 2, awayScore: 1, predictsEt: false, predictsPens: false }
      )
    ).toBe(8);
  });
});
