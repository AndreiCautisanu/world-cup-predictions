import {
  predictionBucket,
  koDrawBadge,
  shapeParticipants,
  bucketParticipants,
  type PredictionRow,
  type BoardParticipant,
} from "@/lib/match-board";

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

const row = (over: Partial<PredictionRow> = {}): PredictionRow => ({
  userId: 1,
  homeScore: 1,
  awayScore: 0,
  predictsEt: null,
  predictsPens: null,
  pointsAwarded: null,
  user: { username: "u", firstName: null, lastName: null },
  ...over,
});

describe("shapeParticipants", () => {
  it("builds display names and flags the current user", () => {
    const out = shapeParticipants(
      [
        row({ userId: 7, user: { username: "ana", firstName: "Ana", lastName: "Pop" } }),
        row({ userId: 9, user: { username: "bob", firstName: null, lastName: null } }),
      ],
      7
    );
    expect(out[0]).toMatchObject({ displayName: "Ana Pop", isMe: true });
    expect(out[1]).toMatchObject({ displayName: "bob", isMe: false });
  });
});

describe("bucketParticipants", () => {
  const p = (over: Partial<BoardParticipant> = {}): BoardParticipant => ({
    displayName: "x",
    isMe: false,
    homeScore: 0,
    awayScore: 0,
    predictsEt: null,
    predictsPens: null,
    pointsAwarded: null,
    ...over,
  });

  it("buckets by predicted outcome", () => {
    const cols = bucketParticipants(
      [
        p({ displayName: "H", homeScore: 2, awayScore: 0 }),
        p({ displayName: "D", homeScore: 1, awayScore: 1 }),
        p({ displayName: "A", homeScore: 0, awayScore: 2 }),
      ],
      false
    );
    expect(cols.home.map((x) => x.displayName)).toEqual(["H"]);
    expect(cols.draw.map((x) => x.displayName)).toEqual(["D"]);
    expect(cols.away.map((x) => x.displayName)).toEqual(["A"]);
  });

  it("sorts by points desc when final, alphabetically otherwise", () => {
    const list = [
      p({ displayName: "Ana", homeScore: 1, awayScore: 0, pointsAwarded: 2 }),
      p({ displayName: "Zoe", homeScore: 1, awayScore: 0, pointsAwarded: 7 }),
    ];
    expect(bucketParticipants(list, true).home.map((x) => x.displayName)).toEqual(["Zoe", "Ana"]);
    expect(bucketParticipants(list, false).home.map((x) => x.displayName)).toEqual(["Ana", "Zoe"]);
  });

  it("breaks point ties alphabetically", () => {
    const list = [
      p({ displayName: "Zoe", homeScore: 1, awayScore: 0, pointsAwarded: 7 }),
      p({ displayName: "Ana", homeScore: 1, awayScore: 0, pointsAwarded: 7 }),
    ];
    expect(bucketParticipants(list, true).home.map((x) => x.displayName)).toEqual(["Ana", "Zoe"]);
  });
});
