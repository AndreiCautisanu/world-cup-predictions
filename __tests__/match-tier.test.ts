import { matchPredictionTier, matchTierLabel, MATCH_TIER_LABEL } from "@/lib/match-tier";

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

  it("returns 'partial' for the advancer-only knockout tier (3 points)", () => {
    expect(matchPredictionTier(3, "R32")).toBe("partial");
    expect(matchPredictionTier(3, "FINAL")).toBe("partial");
  });

  it("returns 'close' for the KO advancer + manner tier (5 points)", () => {
    expect(matchPredictionTier(5, "QF")).toBe("close");
  });

  it("returns 'exact' for the group exact-score tier (7 points)", () => {
    expect(matchPredictionTier(7, "GROUP_3")).toBe("exact");
  });

  it("returns 'exact' for the KO one-team-goals tier (7 points)", () => {
    expect(matchPredictionTier(7, "QF")).toBe("exact");
  });

  it("returns 'perfect' for the KO exact-score tier (10 points)", () => {
    expect(matchPredictionTier(10, "SF")).toBe("perfect");
  });

  it("falls back conservatively when round is omitted (assumes KO mapping)", () => {
    expect(matchPredictionTier(3)).toBe("partial");
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

describe("matchTierLabel", () => {
  it("labels the exact tier as a full exact score in a group match", () => {
    expect(matchTierLabel("exact", "GROUP_1")).toBe("Scor exact");
  });

  it("relabels the exact tier in a knockout match (the 7-band is not a full exact score)", () => {
    expect(matchTierLabel("exact", "R16")).toBe("Foarte aproape");
    expect(matchTierLabel("exact", "R16")).not.toBe("Scor exact");
  });

  it("shares the other tier labels across group and knockout", () => {
    expect(matchTierLabel("perfect", "R16")).toBe(MATCH_TIER_LABEL.perfect);
    expect(matchTierLabel("partial", "QF")).toBe(MATCH_TIER_LABEL.partial);
    expect(matchTierLabel("close", "SF")).toBe(MATCH_TIER_LABEL.close);
  });
});
