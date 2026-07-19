import {
  buildLeaderboardRaceTimeline,
  getLeaderboardRaceTimeline,
  type LeaderboardRaceInput,
  type RaceSnapshot,
} from "@/lib/leaderboard-race";
import { summarizeLeaderboardRows } from "@/lib/leaderboard";

type MatchInput = LeaderboardRaceInput["matches"][number];

function match(overrides: Partial<MatchInput> & Pick<MatchInput, "id" | "kickoffTime">): MatchInput {
  return {
    round: "GROUP_1",
    groupId: 1,
    homeScore: 1,
    awayScore: 0,
    homeAdvanced: null,
    homeTeam: { id: 10, name: "Argentina" },
    awayTeam: { id: 11, name: "Franța" },
    predictions: [],
    ...overrides,
  };
}

function input(overrides: Partial<LeaderboardRaceInput> = {}): LeaderboardRaceInput {
  return {
    users: [
      { id: 1, username: "ana", firstName: "Ana", lastName: null },
      { id: 2, username: "mihai", firstName: "Mihai", lastName: null },
    ],
    matches: [
      match({
        id: 1,
        kickoffTime: "2026-06-11T18:00:00.000Z",
        predictions: [
          { userId: 1, pointsAwarded: 7 },
          { userId: 2, pointsAwarded: 4 },
        ],
      }),
      match({
        id: 2,
        kickoffTime: "2026-06-12T18:00:00.000Z",
        predictions: [
          { userId: 1, pointsAwarded: 4 },
          { userId: 2, pointsAwarded: 2 },
        ],
      }),
    ],
    groupStandingPredictions: [],
    bonusPredictions: [],
    ...overrides,
  };
}

function snapshot(timeline: ReturnType<typeof buildLeaderboardRaceTimeline>, key: string): RaceSnapshot {
  const found = timeline.snapshots.find((item) => item.key === key);
  if (!found) throw new Error(`Missing snapshot ${key}`);
  return found;
}

function playerTotal(frame: RaceSnapshot, username: string): number | undefined {
  return frame.players.find((player) => player.username === username)?.total;
}

describe("buildLeaderboardRaceTimeline", () => {
  it("builds an initial frame and chronological cumulative match totals", () => {
    const timeline = buildLeaderboardRaceTimeline(input());

    expect(timeline.snapshots.map((frame) => frame.key)).toEqual([
      "start",
      "match-1",
      "match-2",
    ]);
    expect(timeline.snapshots[0].players.map((player) => player.total)).toEqual([0, 0]);
    expect(snapshot(timeline, "match-1").players.map((player) => [player.displayName, player.total, player.delta])).toEqual([
      ["Ana", 7, 7],
      ["Mihai", 4, 4],
    ]);
    expect(snapshot(timeline, "match-2").players.map((player) => [player.displayName, player.total, player.delta])).toEqual([
      ["Ana", 11, 4],
      ["Mihai", 6, 2],
    ]);
    expect(timeline.finalMax).toBe(11);
  });

  it("sorts tied totals by Romanian display name and gives tied players the same rank", () => {
    const timeline = buildLeaderboardRaceTimeline(input({
      users: [
        { id: 1, username: "zara", firstName: "Zara", lastName: null },
        { id: 2, username: "ana", firstName: "ana", lastName: null },
      ],
      matches: [match({
        id: 1,
        kickoffTime: "2026-06-11T18:00:00.000Z",
        predictions: [
          { userId: 1, pointsAwarded: 4 },
          { userId: 2, pointsAwarded: 4 },
        ],
      })],
    }));

    expect(snapshot(timeline, "match-1").players.map((player) => [player.displayName, player.rank])).toEqual([
      ["ana", 1],
      ["Zara", 1],
    ]);
  });

  it("keeps a player through their last prediction and drops them on the next match", () => {
    const timeline = buildLeaderboardRaceTimeline(input({
      users: [
        { id: 1, username: "early_exit", firstName: null, lastName: null },
        { id: 2, username: "finalist", firstName: null, lastName: null },
      ],
      matches: [
        match({
          id: 1,
          kickoffTime: "2026-06-11T18:00:00.000Z",
          predictions: [{ userId: 1, pointsAwarded: 7 }, { userId: 2, pointsAwarded: 2 }],
        }),
        match({
          id: 2,
          kickoffTime: "2026-06-12T18:00:00.000Z",
          predictions: [{ userId: 1, pointsAwarded: 0 }, { userId: 2, pointsAwarded: 4 }],
        }),
        match({
          id: 3,
          kickoffTime: "2026-06-13T18:00:00.000Z",
          predictions: [{ userId: 2, pointsAwarded: 7 }],
        }),
      ],
    }));

    expect(snapshot(timeline, "match-2").players.map((player) => player.username)).toContain("early_exit");
    expect(snapshot(timeline, "match-3").players.map((player) => player.username)).not.toContain("early_exit");
  });

  it("keeps a player visible through skipped matches when they predict again later", () => {
    const timeline = buildLeaderboardRaceTimeline(input({
      users: [{ id: 1, username: "returned_later", firstName: null, lastName: null }],
      matches: [
        match({ id: 1, kickoffTime: "2026-06-11T18:00:00.000Z", predictions: [{ userId: 1, pointsAwarded: 2 }] }),
        match({ id: 2, kickoffTime: "2026-06-12T18:00:00.000Z", predictions: [] }),
        match({ id: 3, kickoffTime: "2026-06-13T18:00:00.000Z", predictions: [{ userId: 1, pointsAwarded: 7 }] }),
      ],
    }));

    expect(snapshot(timeline, "match-2").players.map((player) => player.username)).toContain("returned_later");
    expect(playerTotal(snapshot(timeline, "match-2"), "returned_later")).toBe(2);
    expect(playerTotal(snapshot(timeline, "match-3"), "returned_later")).toBe(9);
  });

  it("awards group-standing points on the last finished match in that group", () => {
    const timeline = buildLeaderboardRaceTimeline(input({
      users: [{ id: 1, username: "ana", firstName: "Ana", lastName: null }],
      matches: [
        match({ id: 1, kickoffTime: "2026-06-11T18:00:00.000Z", round: "GROUP_1", predictions: [{ userId: 1, pointsAwarded: 7 }] }),
        match({ id: 2, kickoffTime: "2026-06-20T18:00:00.000Z", round: "GROUP_3", predictions: [{ userId: 1, pointsAwarded: 0 }] }),
      ],
      groupStandingPredictions: [
        { userId: 1, groupId: 1, pointsAwarded: 3 },
        { userId: 1, groupId: 1, pointsAwarded: 3 },
        { userId: 1, groupId: 1, pointsAwarded: null },
      ],
    }));

    expect(playerTotal(snapshot(timeline, "match-1"), "ana")).toBe(7);
    expect(snapshot(timeline, "match-2").players[0]).toMatchObject({ total: 13, delta: 6 });
  });

  it("reconstructs dark-horse milestones and caps them at the stored award", () => {
    const timeline = buildLeaderboardRaceTimeline(input({
      users: [{ id: 1, username: "ana", firstName: "Ana", lastName: null }],
      matches: [
        match({
          id: 10,
          kickoffTime: "2026-06-28T18:00:00.000Z",
          round: "R32",
          groupId: null,
          homeTeam: { id: 10, name: "Argentina" },
          awayTeam: { id: 20, name: "Spania" },
          homeScore: 2,
          awayScore: 1,
          predictions: [{ userId: 1, pointsAwarded: 4 }],
        }),
        match({
          id: 11,
          kickoffTime: "2026-07-03T18:00:00.000Z",
          round: "R16",
          groupId: null,
          homeTeam: { id: 10, name: "Argentina" },
          awayTeam: { id: 30, name: "Brazilia" },
          homeScore: 1,
          awayScore: 0,
          predictions: [{ userId: 1, pointsAwarded: 8 }],
        }),
      ],
      bonusPredictions: [{
        userId: 1,
        darkHorseTeamId: 10,
        darkHorsePts: 10,
        championPts: null,
        runnerUpPts: null,
        topScorerPts: null,
      }],
    }));

    expect(snapshot(timeline, "match-10").players[0]).toMatchObject({ total: 10, delta: 10 });
    expect(snapshot(timeline, "match-11").players[0]).toMatchObject({ total: 22, delta: 12 });
  });

  it("adds champion, runner-up, top-scorer, and winning dark-horse points at the Final", () => {
    const timeline = buildLeaderboardRaceTimeline(input({
      users: [{ id: 1, username: "ana", firstName: "Ana", lastName: null }],
      matches: [match({
        id: 20,
        kickoffTime: "2026-07-19T18:00:00.000Z",
        round: "FINAL",
        groupId: null,
        homeTeam: { id: 10, name: "Argentina" },
        awayTeam: { id: 20, name: "Spania" },
        homeScore: 1,
        awayScore: 1,
        homeAdvanced: true,
        predictions: [{ userId: 1, pointsAwarded: 10 }],
      })],
      bonusPredictions: [{
        userId: 1,
        darkHorseTeamId: 10,
        darkHorsePts: 30,
        championPts: 20,
        runnerUpPts: 10,
        topScorerPts: 15,
      }],
    }));

    expect(snapshot(timeline, "match-20").players[0]).toMatchObject({ total: 85, delta: 85 });
  });

  it("omits users without match predictions and ignores null awards", () => {
    const timeline = buildLeaderboardRaceTimeline(input({
      users: [
        { id: 1, username: "active", firstName: null, lastName: null },
        { id: 2, username: "never_played", firstName: null, lastName: null },
      ],
      matches: [match({
        id: 1,
        kickoffTime: "2026-06-11T18:00:00.000Z",
        predictions: [{ userId: 1, pointsAwarded: null }],
      })],
      groupStandingPredictions: [{ userId: 1, groupId: 1, pointsAwarded: null }],
      bonusPredictions: [{
        userId: 1,
        darkHorseTeamId: 10,
        darkHorsePts: null,
        championPts: null,
        runnerUpPts: null,
        topScorerPts: null,
      }],
    }));

    expect(timeline.snapshots[0].players.map((player) => player.username)).toEqual(["active"]);
    expect(snapshot(timeline, "match-1").players[0].total).toBe(0);
  });

  it("matches the existing leaderboard total for players active through the Final", () => {
    const raceInput = input({
      users: [{ id: 1, username: "ana", firstName: "Ana", lastName: null }],
      matches: [
        match({
          id: 19,
          kickoffTime: "2026-06-25T18:00:00.000Z",
          round: "GROUP_3",
          groupId: 1,
          predictions: [{ userId: 1, pointsAwarded: 7 }],
        }),
        match({
          id: 20,
          kickoffTime: "2026-07-19T18:00:00.000Z",
          round: "FINAL",
          groupId: null,
          predictions: [{ userId: 1, pointsAwarded: 10 }],
        }),
      ],
      groupStandingPredictions: [{ userId: 1, groupId: 1, pointsAwarded: 3 }],
      bonusPredictions: [{
        userId: 1,
        darkHorseTeamId: 99,
        darkHorsePts: 0,
        championPts: 20,
        runnerUpPts: 10,
        topScorerPts: 15,
      }],
    });
    const timeline = buildLeaderboardRaceTimeline(raceInput);
    const [leaderboardRow] = summarizeLeaderboardRows([{
      id: 1,
      username: "ana",
      firstName: "Ana",
      lastName: null,
      matchPredictions: [
        { pointsAwarded: 7, match: { round: "GROUP_3" } },
        { pointsAwarded: 10, match: { round: "FINAL" } },
      ],
      groupStandingPredictions: [{ pointsAwarded: 3 }],
      bonusPrediction: {
        darkHorsePts: 0,
        championPts: 20,
        runnerUpPts: 10,
        topScorerPts: 15,
      },
    }]);

    expect(timeline.snapshots.at(-1)?.players[0].total).toBe(leaderboardRow.total);
  });
});

describe("getLeaderboardRaceTimeline", () => {
  it("loads the authoritative race inputs and serializes match dates", async () => {
    const fakePrisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, username: "ana", firstName: "Ana", lastName: null },
        ]),
      },
      match: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            round: "FINAL",
            kickoffTime: new Date("2026-07-19T18:00:00.000Z"),
            groupId: null,
            homeScore: 2,
            awayScore: 1,
            homeAdvanced: true,
            homeTeam: { id: 10, name: "Argentina" },
            awayTeam: { id: 20, name: "Spania" },
            predictions: [{ userId: 1, pointsAwarded: 10 }],
          },
        ]),
      },
      groupStandingPrediction: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      bonusPrediction: {
        findMany: jest.fn().mockResolvedValue([
          {
            userId: 1,
            darkHorseTeamId: 10,
            darkHorsePts: 30,
            championPts: 20,
            runnerUpPts: 0,
            topScorerPts: 15,
          },
        ]),
      },
    };

    const timeline = await getLeaderboardRaceTimeline(fakePrisma as never);

    expect(fakePrisma.match.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "FINISHED" },
      orderBy: [{ kickoffTime: "asc" }, { id: "asc" }],
    }));
    expect(timeline.snapshots.at(-1)).toMatchObject({
      occurredAt: "2026-07-19T18:00:00.000Z",
      detail: "Argentina 2–1 Spania",
    });
    expect(timeline.snapshots.at(-1)?.players[0].total).toBe(75);
  });
});
