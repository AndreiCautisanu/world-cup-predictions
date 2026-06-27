import { buildDisplayName } from "@/lib/leaderboard";

export type Bucket = "home" | "draw" | "away";

export function predictionBucket(homeScore: number, awayScore: number): Bucket {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

export type DrawAdvancer = "home" | "away" | null;

// For a knockout predicted-draw, which side the user backs to win the shootout.
// A draw pick is implicitly a penalties pick, so this is the only extra info the
// board surfaces. null when the user didn't say (shouldn't happen for fresh
// picks, but old/partial data may lack it).
export function koDrawAdvancer(p: { homeAdvances: boolean | null }): DrawAdvancer {
  if (p.homeAdvances === true) return "home";
  if (p.homeAdvances === false) return "away";
  return null;
}

export type BoardParticipant = {
  displayName: string;
  isMe: boolean;
  homeScore: number;
  awayScore: number;
  homeAdvances: boolean | null;
  pointsAwarded: number | null;
};

export type PredictionRow = {
  userId: number;
  homeScore: number;
  awayScore: number;
  homeAdvances: boolean | null;
  pointsAwarded: number | null;
  user: { username: string; firstName: string | null; lastName: string | null };
};

export function shapeParticipants(
  rows: PredictionRow[],
  meId: number
): BoardParticipant[] {
  return rows.map((r) => ({
    displayName: buildDisplayName(r.user),
    isMe: r.userId === meId,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    homeAdvances: r.homeAdvances,
    pointsAwarded: r.pointsAwarded,
  }));
}

// Group into outcome columns. Within a column: best score first once the match
// is final (so the winners float to the top), else alphabetical by name.
export function bucketParticipants(
  participants: BoardParticipant[],
  final: boolean
): Record<Bucket, BoardParticipant[]> {
  const columns: Record<Bucket, BoardParticipant[]> = { home: [], draw: [], away: [] };
  for (const p of participants) {
    columns[predictionBucket(p.homeScore, p.awayScore)].push(p);
  }
  const sorter = (a: BoardParticipant, b: BoardParticipant) => {
    if (final) {
      const diff = (b.pointsAwarded ?? 0) - (a.pointsAwarded ?? 0);
      if (diff !== 0) return diff;
    }
    return a.displayName.localeCompare(b.displayName, "ro");
  };
  columns.home.sort(sorter);
  columns.draw.sort(sorter);
  columns.away.sort(sorter);
  return columns;
}
