import { DEFAULT_MATCH_ROUND } from "@/lib/round-defaults";

describe("round defaults", () => {
  it("defaults match-round tab pages to the round of 32", () => {
    expect(DEFAULT_MATCH_ROUND).toBe("R32");
  });
});
