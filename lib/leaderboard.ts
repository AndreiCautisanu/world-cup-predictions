import type { PrismaClient } from "@prisma/client";

const GROUP_ROUNDS = new Set(["GROUP_1", "GROUP_2", "GROUP_3"]);

export type LeaderboardUserInput = {
  id: number;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  matchPredictions: Array<{
    pointsAwarded: number | null;
    match: { round: string };
  }>;
  groupStandingPredictions: Array<{ pointsAwarded: number | null }>;
  bonusPrediction: {
    championPts: number | null;
    runnerUpPts: number | null;
    topScorerPts: number | null;
    darkHorsePts: number | null;
  } | null;
};

export type LeaderboardRow = {
  userId: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  groupMatchPts: number;
  groupStandingPts: number;
  knockoutPts: number;
  bonusPts: number;
  total: number;
};

export function buildDisplayName(u: {
  username: string;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const first = u.firstName?.trim();
  const last = u.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return u.username;
}

export function summarizeLeaderboardRows(
  users: LeaderboardUserInput[]
): LeaderboardRow[] {
  return users
    .map((u) => {
      let groupMatchPts = 0;
      let knockoutPts = 0;
      for (const mp of u.matchPredictions) {
        const pts = mp.pointsAwarded ?? 0;
        if (GROUP_ROUNDS.has(mp.match.round)) groupMatchPts += pts;
        else knockoutPts += pts;
      }
      const groupStandingPts = u.groupStandingPredictions.reduce(
        (sum, p) => sum + (p.pointsAwarded ?? 0),
        0
      );
      const b = u.bonusPrediction;
      const bonusPts =
        (b?.championPts ?? 0) +
        (b?.runnerUpPts ?? 0) +
        (b?.topScorerPts ?? 0) +
        (b?.darkHorsePts ?? 0);
      return {
        userId: u.id,
        username: u.username,
        firstName: u.firstName ?? null,
        lastName: u.lastName ?? null,
        displayName: buildDisplayName(u),
        groupMatchPts,
        groupStandingPts,
        knockoutPts,
        bonusPts,
        total: groupMatchPts + groupStandingPts + knockoutPts + bonusPts,
      };
    })
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.displayName.localeCompare(b.displayName, "ro", { sensitivity: "base" });
    });
}

export async function getLeaderboard(
  prisma: PrismaClient
): Promise<LeaderboardRow[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      matchPredictions: {
        select: { pointsAwarded: true, match: { select: { round: true } } },
      },
      groupStandingPredictions: { select: { pointsAwarded: true } },
      bonusPrediction: {
        select: {
          championPts: true,
          runnerUpPts: true,
          topScorerPts: true,
          darkHorsePts: true,
        },
      },
    },
  });
  return summarizeLeaderboardRows(users);
}
