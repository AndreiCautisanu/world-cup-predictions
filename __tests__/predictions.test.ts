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
  it("strips predictsEt/predictsPens for group matches", () => {
    const data = buildMatchPredictionUpsertData("GROUP_1", {
      homeScore: 2,
      awayScore: 1,
      predictsEt: true,
      predictsPens: true,
    });
    expect(data).toEqual({
      homeScore: 2,
      awayScore: 1,
      predictsEt: null,
      predictsPens: null,
    });
  });

  it("defaults predictsEt/predictsPens to false for knockout matches when omitted", () => {
    const data = buildMatchPredictionUpsertData("QF", {
      homeScore: 1,
      awayScore: 1,
    });
    expect(data).toEqual({
      homeScore: 1,
      awayScore: 1,
      predictsEt: false,
      predictsPens: false,
    });
  });

  it("passes predictsEt/predictsPens through for knockout matches", () => {
    const data = buildMatchPredictionUpsertData("FINAL", {
      homeScore: 0,
      awayScore: 0,
      predictsEt: true,
      predictsPens: true,
    });
    expect(data).toEqual({
      homeScore: 0,
      awayScore: 0,
      predictsEt: true,
      predictsPens: true,
    });
  });
});
