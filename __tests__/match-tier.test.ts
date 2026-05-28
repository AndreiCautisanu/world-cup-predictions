import { matchPredictionTier, MATCH_TIER_LABEL } from "@/lib/match-tier";

describe("matchPredictionTier", () => {
  it("returns 'none' when the prediction has not been scored yet", () => {
    expect(matchPredictionTier(null)).toBe("none");
    expect(matchPredictionTier(undefined)).toBe("none");
  });

  it("returns 'miss' for an explicit zero score", () => {
    expect(matchPredictionTier(0, "GROUP_1")).toBe("miss");
    expect(matchPredictionTier(0, "R16")).toBe("miss");
  });

  it("returns 'partial' for the winner-only group tier (2 points)", () => {
    expect(matchPredictionTier(2, "GROUP_1")).toBe("partial");
  });

  it("returns 'close' for the group winner + one-side-exact tier (4 points)", () => {
    expect(matchPredictionTier(4, "GROUP_2")).toBe("close");
  });

  it("returns 'partial' for the winner-only knockout tier (4 points)", () => {
    expect(matchPredictionTier(4, "R32")).toBe("partial");
    expect(matchPredictionTier(4, "FINAL")).toBe("partial");
  });

  it("returns 'exact' for the group exact-score tier (7 points)", () => {
    expect(matchPredictionTier(7, "GROUP_3")).toBe("exact");
  });

  it("returns 'exact' for the KO regulation exact-score tier (8 points)", () => {
    expect(matchPredictionTier(8, "QF")).toBe("exact");
  });

  it("returns 'perfect' for the KO exact + ET/pens called tier (10 points)", () => {
    expect(matchPredictionTier(10, "SF")).toBe("perfect");
  });

  it("falls back conservatively when round is omitted (assumes KO mapping)", () => {
    expect(matchPredictionTier(4)).toBe("partial");
    expect(matchPredictionTier(10)).toBe("perfect");
  });

  it("has a Romanian label for every tier", () => {
    expect(MATCH_TIER_LABEL.none).toBeTruthy();
    expect(MATCH_TIER_LABEL.miss).toBeTruthy();
    expect(MATCH_TIER_LABEL.partial).toBeTruthy();
    expect(MATCH_TIER_LABEL.close).toBeTruthy();
    expect(MATCH_TIER_LABEL.exact).toBeTruthy();
    expect(MATCH_TIER_LABEL.perfect).toBeTruthy();
  });
});
