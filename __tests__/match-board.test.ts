import { predictionBucket, koDrawBadge } from "@/lib/match-board";

describe("predictionBucket", () => {
  it("returns 'home' when home outscores away", () => {
    expect(predictionBucket(2, 1)).toBe("home");
  });
  it("returns 'away' when away outscores home", () => {
    expect(predictionBucket(0, 3)).toBe("away");
  });
  it("returns 'draw' on equal scores", () => {
    expect(predictionBucket(1, 1)).toBe("draw");
    expect(predictionBucket(0, 0)).toBe("draw");
  });
});

describe("koDrawBadge", () => {
  it("returns 'pen' when penalties predicted (takes precedence)", () => {
    expect(koDrawBadge({ predictsEt: true, predictsPens: true })).toBe("pen");
    expect(koDrawBadge({ predictsEt: false, predictsPens: true })).toBe("pen");
  });
  it("returns 'prel' when only extra time predicted", () => {
    expect(koDrawBadge({ predictsEt: true, predictsPens: false })).toBe("prel");
  });
  it("returns null when neither", () => {
    expect(koDrawBadge({ predictsEt: false, predictsPens: false })).toBeNull();
    expect(koDrawBadge({ predictsEt: null, predictsPens: null })).toBeNull();
  });
});
