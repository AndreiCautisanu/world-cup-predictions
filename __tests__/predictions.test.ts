import {
  isKnockoutRound,
  buildMatchPredictionUpsertData,
} from "@/lib/predictions";

describe("isKnockoutRound", () => {
  it("returns false for group rounds", () => {
    expect(isKnockoutRound("GROUP_1")).toBe(false);
    expect(isKnockoutRound("GROUP_2")).toBe(false);
    expect(isKnockoutRound("GROUP_3")).toBe(false);
  });

  it("returns true for knockout rounds", () => {
    expect(isKnockoutRound("R32")).toBe(true);
    expect(isKnockoutRound("R16")).toBe(true);
    expect(isKnockoutRound("QF")).toBe(true);
    expect(isKnockoutRound("SF")).toBe(true);
    expect(isKnockoutRound("THIRD_PLACE")).toBe(true);
    expect(isKnockoutRound("FINAL")).toBe(true);
  });
});

describe("buildMatchPredictionUpsertData", () => {
  it("nulls homeAdvances for group matches even if a draw is sent", () => {
    const data = buildMatchPredictionUpsertData("GROUP_1", {
      homeScore: 1,
      awayScore: 1,
      homeAdvances: true,
    });
    expect(data).toEqual({ homeScore: 1, awayScore: 1, homeAdvances: null });
  });

  it("nulls homeAdvances for a decisive knockout pick", () => {
    const data = buildMatchPredictionUpsertData("QF", {
      homeScore: 2,
      awayScore: 1,
      homeAdvances: true,
    });
    expect(data).toEqual({ homeScore: 2, awayScore: 1, homeAdvances: null });
  });

  it("keeps homeAdvances for a knockout draw pick", () => {
    const data = buildMatchPredictionUpsertData("FINAL", {
      homeScore: 0,
      awayScore: 0,
      homeAdvances: false,
    });
    expect(data).toEqual({ homeScore: 0, awayScore: 0, homeAdvances: false });
  });

  it("defaults a knockout draw's homeAdvances to null when omitted", () => {
    const data = buildMatchPredictionUpsertData("R32", {
      homeScore: 1,
      awayScore: 1,
    });
    expect(data).toEqual({ homeScore: 1, awayScore: 1, homeAdvances: null });
  });
});
