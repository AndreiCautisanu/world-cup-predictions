import { DEFAULT_MATCH_TAB } from "@/lib/round-defaults";

describe("round defaults", () => {
  it("defaults match-round tab pages to the combined finals tab", () => {
    expect(DEFAULT_MATCH_TAB).toBe("FINALS");
  });
});
