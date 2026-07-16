import {
  MATCH_ROUND_TABS,
  matchRoundTabFromParam,
  roundsForMatchRoundTab,
} from "@/lib/match-round-tabs";

describe("match round tabs", () => {
  it("groups the third-place match and grand final into one Finals tab", () => {
    expect(MATCH_ROUND_TABS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "FINALS",
          label: "Finale",
          rounds: ["THIRD_PLACE", "FINAL"],
        }),
      ])
    );
    expect(roundsForMatchRoundTab("FINALS")).toEqual(["THIRD_PLACE", "FINAL"]);
  });

  it("maps legacy final-stage round URLs to the combined Finals tab", () => {
    expect(matchRoundTabFromParam("THIRD_PLACE")).toBe("FINALS");
    expect(matchRoundTabFromParam("FINAL")).toBe("FINALS");
  });
});
