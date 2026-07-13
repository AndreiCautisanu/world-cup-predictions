import type { PrismaClient } from "@prisma/client";
import type { FdMatch } from "@/lib/football-api";
import { processFdMatches } from "@/lib/sync";
import { calculateAndStorePoints } from "@/lib/recalc";

jest.mock("@/lib/recalc", () => ({
  calculateAndStorePoints: jest.fn().mockResolvedValue(undefined),
}));

describe("processFdMatches", () => {
  it("stores the 120-minute score for matches decided by penalties", async () => {
    const localMatch = {
      id: 42,
      externalId: "98765",
      round: "R16",
      homeTeamId: 1,
      awayTeamId: 2,
      status: "SCHEDULED",
      homeScore: null,
      awayScore: null,
      wentToPens: null,
      homeAdvanced: null,
    };
    const update = jest.fn().mockResolvedValue(localMatch);
    const prisma = {
      match: {
        findUnique: jest.fn().mockResolvedValue(localMatch),
        update,
      },
    } as unknown as PrismaClient;

    const fdMatch = {
      id: 98765,
      utcDate: "2026-07-05T19:00:00Z",
      status: "FINISHED",
      matchday: null,
      stage: "LAST_16",
      group: null,
      homeTeam: { id: 1, name: "Germany", shortName: "Germany", tla: "GER", crest: null },
      awayTeam: { id: 2, name: "Paraguay", shortName: "Paraguay", tla: "PAR", crest: null },
      score: {
        winner: "AWAY_TEAM",
        duration: "PENALTY_SHOOTOUT",
        fullTime: { home: 4, away: 5 },
        regularTime: { home: 1, away: 1 },
        halfTime: { home: 0, away: 0 },
        extraTime: { home: 0, away: 0 },
        penalties: { home: 3, away: 4 },
      },
    } as FdMatch;

    const result = await processFdMatches(prisma, [fdMatch]);

    expect(update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: {
        homeScore: 1,
        awayScore: 1,
        wentToPens: true,
        homeAdvanced: false,
        status: "FINISHED",
      },
    });
    expect(calculateAndStorePoints).toHaveBeenCalledWith(prisma, 42);
    expect(result.updatedMatches).toEqual([42]);
  });
});
