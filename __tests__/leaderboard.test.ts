import { summarizeLeaderboardRows, type LeaderboardUserInput } from "@/lib/leaderboard";

function user(overrides: Partial<LeaderboardUserInput> & Pick<LeaderboardUserInput, "id" | "username">): LeaderboardUserInput {
  return {
    matchPredictions: [],
    groupStandingPredictions: [],
    bonusPrediction: null,
    ...overrides,
  };
}

describe("summarizeLeaderboardRows", () => {
  it("returns an empty list when there are no users", () => {
    expect(summarizeLeaderboardRows([])).toEqual([]);
  });

  it("zeros every category for a user with no predictions", () => {
    const rows = summarizeLeaderboardRows([user({ id: 1, username: "andrei" })]);
    expect(rows).toEqual([
      {
        userId: 1,
        username: "andrei",
        firstName: null,
        lastName: null,
        displayName: "andrei",
        groupMatchPts: 0,
        groupStandingPts: 0,
        knockoutPts: 0,
        bonusPts: 0,
        total: 0,
      },
    ]);
  });

  it("buckets group-round match predictions into groupMatchPts", () => {
    const [row] = summarizeLeaderboardRows([
      user({
        id: 1,
        username: "andrei",
        matchPredictions: [
          { pointsAwarded: 7, match: { round: "GROUP_1" } },
          { pointsAwarded: 5, match: { round: "GROUP_2" } },
          { pointsAwarded: 0, match: { round: "GROUP_3" } },
        ],
      }),
    ]);
    expect(row.groupMatchPts).toBe(12);
    expect(row.knockoutPts).toBe(0);
  });

  it("buckets knockout-round match predictions into knockoutPts (including THIRD_PLACE)", () => {
    const [row] = summarizeLeaderboardRows([
      user({
        id: 1,
        username: "andrei",
        matchPredictions: [
          { pointsAwarded: 10, match: { round: "R32" } },
          { pointsAwarded: 8, match: { round: "R16" } },
          { pointsAwarded: 4, match: { round: "QF" } },
          { pointsAwarded: 4, match: { round: "SF" } },
          { pointsAwarded: 8, match: { round: "THIRD_PLACE" } },
          { pointsAwarded: 10, match: { round: "FINAL" } },
        ],
      }),
    ]);
    expect(row.knockoutPts).toBe(44);
    expect(row.groupMatchPts).toBe(0);
  });

  it("treats null pointsAwarded as zero (un-scored predictions don't contribute)", () => {
    const [row] = summarizeLeaderboardRows([
      user({
        id: 1,
        username: "andrei",
        matchPredictions: [
          { pointsAwarded: null, match: { round: "GROUP_1" } },
          { pointsAwarded: 5, match: { round: "GROUP_2" } },
          { pointsAwarded: null, match: { round: "R16" } },
        ],
        groupStandingPredictions: [
          { pointsAwarded: 3 },
          { pointsAwarded: null },
        ],
      }),
    ]);
    expect(row.groupMatchPts).toBe(5);
    expect(row.knockoutPts).toBe(0);
    expect(row.groupStandingPts).toBe(3);
  });

  it("sums all four bonus categories into bonusPts", () => {
    const [row] = summarizeLeaderboardRows([
      user({
        id: 1,
        username: "andrei",
        bonusPrediction: {
          championPts: 20,
          runnerUpPts: 10,
          topScorerPts: 15,
          darkHorsePts: 8,
        },
      }),
    ]);
    expect(row.bonusPts).toBe(53);
  });

  it("treats a missing bonus prediction as zero", () => {
    const [row] = summarizeLeaderboardRows([
      user({ id: 1, username: "andrei", bonusPrediction: null }),
    ]);
    expect(row.bonusPts).toBe(0);
  });

  it("treats null bonus-category fields as zero", () => {
    const [row] = summarizeLeaderboardRows([
      user({
        id: 1,
        username: "andrei",
        bonusPrediction: {
          championPts: null,
          runnerUpPts: null,
          topScorerPts: 5,
          darkHorsePts: null,
        },
      }),
    ]);
    expect(row.bonusPts).toBe(5);
  });

  it("computes total as the sum of all four categories", () => {
    const [row] = summarizeLeaderboardRows([
      user({
        id: 1,
        username: "andrei",
        firstName: "Andrei",
        lastName: "Popescu",
        matchPredictions: [
          { pointsAwarded: 7, match: { round: "GROUP_1" } },
          { pointsAwarded: 10, match: { round: "FINAL" } },
        ],
        groupStandingPredictions: [{ pointsAwarded: 3 }, { pointsAwarded: 3 }],
        bonusPrediction: {
          championPts: 20,
          runnerUpPts: null,
          topScorerPts: 0,
          darkHorsePts: 4,
        },
      }),
    ]);
    expect(row).toEqual({
      userId: 1,
      username: "andrei",
      firstName: "Andrei",
      lastName: "Popescu",
      displayName: "Andrei Popescu",
      groupMatchPts: 7,
      groupStandingPts: 6,
      knockoutPts: 10,
      bonusPts: 24,
      total: 47,
    });
  });

  it("sorts by total descending", () => {
    const rows = summarizeLeaderboardRows([
      user({
        id: 1,
        username: "a",
        matchPredictions: [{ pointsAwarded: 5, match: { round: "GROUP_1" } }],
      }),
      user({
        id: 2,
        username: "b",
        matchPredictions: [{ pointsAwarded: 20, match: { round: "GROUP_1" } }],
      }),
      user({
        id: 3,
        username: "c",
        matchPredictions: [{ pointsAwarded: 12, match: { round: "GROUP_1" } }],
      }),
    ]);
    expect(rows.map((r) => r.userId)).toEqual([2, 3, 1]);
  });

  it("breaks ties by displayName (case-insensitive ascending) so display order is stable", () => {
    const rows = summarizeLeaderboardRows([
      user({ id: 1, username: "zaraz", firstName: "Zara", lastName: "Zamfir" }),
      user({ id: 2, username: "andrei" }),
      user({ id: 3, username: "user3", firstName: "Mihai", lastName: "Stan" }),
    ]);
    expect(rows.map((r) => r.displayName)).toEqual(["andrei", "Mihai Stan", "Zara Zamfir"]);
  });

  it("builds displayName as 'First Last' when both names are present", () => {
    const [row] = summarizeLeaderboardRows([
      user({ id: 1, username: "andrei_p", firstName: "Andrei", lastName: "Popescu" }),
    ]);
    expect(row.displayName).toBe("Andrei Popescu");
    expect(row.firstName).toBe("Andrei");
    expect(row.lastName).toBe("Popescu");
  });

  it("falls back to username when neither name is set", () => {
    const [row] = summarizeLeaderboardRows([
      user({ id: 1, username: "no_name_user" }),
    ]);
    expect(row.displayName).toBe("no_name_user");
    expect(row.firstName).toBeNull();
    expect(row.lastName).toBeNull();
  });

  it("trims whitespace and falls back when only one name field is filled", () => {
    const [onlyFirst] = summarizeLeaderboardRows([
      user({ id: 1, username: "a", firstName: "  Andrei  ", lastName: "" }),
    ]);
    expect(onlyFirst.displayName).toBe("Andrei");

    const [onlyLast] = summarizeLeaderboardRows([
      user({ id: 2, username: "b", firstName: null, lastName: " Popescu " }),
    ]);
    expect(onlyLast.displayName).toBe("Popescu");
  });
});
