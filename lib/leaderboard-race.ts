import { buildDisplayName } from "@/lib/leaderboard";
import type { PrismaClient } from "@prisma/client";

export type RaceRound =
  | "GROUP_1"
  | "GROUP_2"
  | "GROUP_3"
  | "R32"
  | "R16"
  | "QF"
  | "SF"
  | "THIRD_PLACE"
  | "FINAL";

export type LeaderboardRaceInput = {
  users: Array<{
    id: number;
    username: string;
    firstName: string | null;
    lastName: string | null;
  }>;
  matches: Array<{
    id: number;
    round: RaceRound;
    kickoffTime: string;
    groupId: number | null;
    homeScore: number | null;
    awayScore: number | null;
    homeAdvanced: boolean | null;
    homeTeam: { id: number; name: string } | null;
    awayTeam: { id: number; name: string } | null;
    predictions: Array<{
      userId: number;
      pointsAwarded: number | null;
    }>;
  }>;
  groupStandingPredictions: Array<{
    userId: number;
    groupId: number;
    pointsAwarded: number | null;
  }>;
  bonusPredictions: Array<{
    userId: number;
    darkHorseTeamId: number;
    darkHorsePts: number | null;
    championPts: number | null;
    runnerUpPts: number | null;
    topScorerPts: number | null;
  }>;
};

export type RacePlayerSnapshot = {
  userId: number;
  username: string;
  displayName: string;
  total: number;
  delta: number;
  rank: number;
};

export type RaceSnapshot = {
  key: string;
  kind: "start" | "match";
  occurredAt: string;
  round: RaceRound | null;
  label: string;
  detail: string | null;
  players: RacePlayerSnapshot[];
  leaderChanged: boolean;
};

export type RaceTimeline = {
  snapshots: RaceSnapshot[];
  finalMax: number;
};

const GROUP_ROUNDS = new Set<RaceRound>(["GROUP_1", "GROUP_2", "GROUP_3"]);

const ROUND_LABELS: Record<RaceRound, string> = {
  GROUP_1: "Grupe · Etapa 1",
  GROUP_2: "Grupe · Etapa 2",
  GROUP_3: "Grupe · Etapa 3",
  R32: "Șaisprezecimi",
  R16: "Optimi",
  QF: "Sferturi",
  SF: "Semifinale",
  THIRD_PLACE: "Finala mică",
  FINAL: "Finala",
};

type MatchInput = LeaderboardRaceInput["matches"][number];
type EventTuple = readonly [time: number, matchId: number];

function compareEventTuple(a: EventTuple, b: EventTuple): number {
  return a[0] - b[0] || a[1] - b[1];
}

function eventTuple(match: MatchInput): EventTuple {
  return [new Date(match.kickoffTime).getTime(), match.id];
}

function knockoutWinnerId(match: MatchInput): number | null {
  if (!match.homeTeam || !match.awayTeam) return null;
  if (match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore > match.awayScore) return match.homeTeam.id;
  if (match.awayScore > match.homeScore) return match.awayTeam.id;
  if (match.homeAdvanced === true) return match.homeTeam.id;
  if (match.homeAdvanced === false) return match.awayTeam.id;
  return null;
}

function matchDetail(match: MatchInput): string | null {
  if (!match.homeTeam || !match.awayTeam) return null;
  if (match.homeScore === null || match.awayScore === null) {
    return `${match.homeTeam.name} – ${match.awayTeam.name}`;
  }
  return `${match.homeTeam.name} ${match.homeScore}–${match.awayScore} ${match.awayTeam.name}`;
}

function darkHorseTotalAfterMatch(match: MatchInput, teamId: number): number | null {
  const involved = match.homeTeam?.id === teamId || match.awayTeam?.id === teamId;
  if (!involved) return null;
  const advanced = knockoutWinnerId(match) === teamId;

  switch (match.round) {
    case "R32":
      return advanced ? 6 : 3;
    case "R16":
      return advanced ? 10 : 6;
    case "QF":
      return advanced ? 15 : 10;
    case "SF":
      return advanced ? 22 : 15;
    case "FINAL":
      return advanced ? 30 : 22;
    default:
      return null;
  }
}

function addDelta(
  deltasByMatch: Map<number, Map<number, number>>,
  matchId: number,
  userId: number,
  points: number
): void {
  if (points <= 0) return;
  const byUser = deltasByMatch.get(matchId) ?? new Map<number, number>();
  byUser.set(userId, (byUser.get(userId) ?? 0) + points);
  deltasByMatch.set(matchId, byUser);
}

function rankPlayers(
  users: LeaderboardRaceInput["users"],
  totals: Map<number, number>,
  deltas: Map<number, number>,
  isVisible: (userId: number) => boolean
): RacePlayerSnapshot[] {
  const players = users
    .filter((user) => isVisible(user.id))
    .map((user) => ({
      userId: user.id,
      username: user.username,
      displayName: buildDisplayName(user),
      total: totals.get(user.id) ?? 0,
      delta: deltas.get(user.id) ?? 0,
      rank: 0,
    }))
    .sort((a, b) =>
      b.total - a.total ||
      a.displayName.localeCompare(b.displayName, "ro", { sensitivity: "base" })
    );

  let rank = 1;
  for (let index = 0; index < players.length; index += 1) {
    if (index > 0 && players[index].total !== players[index - 1].total) rank = index + 1;
    players[index].rank = rank;
  }
  return players;
}

export function buildLeaderboardRaceTimeline(input: LeaderboardRaceInput): RaceTimeline {
  const matches = [...input.matches].sort((a, b) => compareEventTuple(eventTuple(a), eventTuple(b)));
  const participantIds = new Set(matches.flatMap((match) => match.predictions.map((prediction) => prediction.userId)));
  const users = input.users.filter((user) => participantIds.has(user.id));

  const lastPredictionByUser = new Map<number, EventTuple>();
  for (const match of matches) {
    const tuple = eventTuple(match);
    for (const prediction of match.predictions) {
      const previous = lastPredictionByUser.get(prediction.userId);
      if (!previous || compareEventTuple(tuple, previous) > 0) {
        lastPredictionByUser.set(prediction.userId, tuple);
      }
    }
  }

  const milestoneDeltas = new Map<number, Map<number, number>>();

  const lastGroupMatch = new Map<number, MatchInput>();
  for (const match of matches) {
    if (match.groupId === null || !GROUP_ROUNDS.has(match.round)) continue;
    const previous = lastGroupMatch.get(match.groupId);
    if (!previous || compareEventTuple(eventTuple(match), eventTuple(previous)) > 0) {
      lastGroupMatch.set(match.groupId, match);
    }
  }
  for (const prediction of input.groupStandingPredictions) {
    const finalMatch = lastGroupMatch.get(prediction.groupId);
    if (finalMatch) {
      addDelta(milestoneDeltas, finalMatch.id, prediction.userId, prediction.pointsAwarded ?? 0);
    }
  }

  for (const bonus of input.bonusPredictions) {
    const cap = bonus.darkHorsePts ?? 0;
    let awarded = 0;
    for (const match of matches) {
      const reconstructed = darkHorseTotalAfterMatch(match, bonus.darkHorseTeamId);
      if (reconstructed === null) continue;
      const nextAwarded = Math.min(cap, reconstructed);
      addDelta(milestoneDeltas, match.id, bonus.userId, nextAwarded - awarded);
      awarded = Math.max(awarded, nextAwarded);
    }
  }

  const finalMatch = [...matches].reverse().find((match) => match.round === "FINAL");
  if (finalMatch) {
    for (const bonus of input.bonusPredictions) {
      addDelta(
        milestoneDeltas,
        finalMatch.id,
        bonus.userId,
        (bonus.championPts ?? 0) + (bonus.runnerUpPts ?? 0) + (bonus.topScorerPts ?? 0)
      );
    }
  }

  const totals = new Map(users.map((user) => [user.id, 0]));
  const snapshots: RaceSnapshot[] = [];
  const firstTime = matches[0]?.kickoffTime ?? new Date(0).toISOString();
  const initialPlayers = rankPlayers(users, totals, new Map(), () => true);
  snapshots.push({
    key: "start",
    kind: "start",
    occurredAt: firstTime,
    round: null,
    label: "Startul turneului",
    detail: null,
    players: initialPlayers,
    leaderChanged: false,
  });

  let previousLeaderId = initialPlayers[0]?.userId ?? null;
  for (const match of matches) {
    const deltas = new Map<number, number>();
    for (const prediction of match.predictions) {
      const points = prediction.pointsAwarded ?? 0;
      deltas.set(prediction.userId, (deltas.get(prediction.userId) ?? 0) + points);
    }
    for (const [userId, points] of milestoneDeltas.get(match.id) ?? []) {
      deltas.set(userId, (deltas.get(userId) ?? 0) + points);
    }
    for (const [userId, points] of deltas) {
      totals.set(userId, (totals.get(userId) ?? 0) + points);
    }

    const currentTuple = eventTuple(match);
    const players = rankPlayers(
      users,
      totals,
      deltas,
      (userId) => {
        const lastTuple = lastPredictionByUser.get(userId);
        return lastTuple !== undefined && compareEventTuple(currentTuple, lastTuple) <= 0;
      }
    );
    const leaderId = players[0]?.userId ?? null;
    snapshots.push({
      key: `match-${match.id}`,
      kind: "match",
      occurredAt: match.kickoffTime,
      round: match.round,
      label: ROUND_LABELS[match.round],
      detail: matchDetail(match),
      players,
      leaderChanged: previousLeaderId !== null && leaderId !== null && previousLeaderId !== leaderId,
    });
    previousLeaderId = leaderId;
  }

  const finalMax = snapshots.reduce(
    (maximum, frame) => Math.max(maximum, ...frame.players.map((player) => player.total)),
    0
  );
  return { snapshots, finalMax };
}

export async function getLeaderboardRaceTimeline(
  prisma: PrismaClient
): Promise<RaceTimeline> {
  const [users, matches, groupStandingPredictions, bonusPredictions] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
      },
    }),
    prisma.match.findMany({
      where: { status: "FINISHED" },
      select: {
        id: true,
        round: true,
        kickoffTime: true,
        groupId: true,
        homeScore: true,
        awayScore: true,
        homeAdvanced: true,
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        predictions: { select: { userId: true, pointsAwarded: true } },
      },
      orderBy: [{ kickoffTime: "asc" }, { id: "asc" }],
    }),
    prisma.groupStandingPrediction.findMany({
      select: {
        userId: true,
        groupId: true,
        pointsAwarded: true,
      },
    }),
    prisma.bonusPrediction.findMany({
      select: {
        userId: true,
        darkHorseTeamId: true,
        darkHorsePts: true,
        championPts: true,
        runnerUpPts: true,
        topScorerPts: true,
      },
    }),
  ]);

  return buildLeaderboardRaceTimeline({
    users,
    matches: matches.map((match) => ({
      ...match,
      round: match.round as RaceRound,
      kickoffTime: match.kickoffTime.toISOString(),
    })),
    groupStandingPredictions,
    bonusPredictions,
  });
}
