// football-data.org v4 client.
// Docs: https://www.football-data.org/documentation/api
// WC competition code: "WC".

const BASE = "https://api.football-data.org/v4";

export type FdStage =
  | "GROUP_STAGE"
  | "LAST_32"
  | "LAST_16"
  | "QUARTER_FINALS"
  | "SEMI_FINALS"
  | "THIRD_PLACE"
  | "FINAL";

export type FdTeam = {
  id: number | null;
  name: string | null;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
};

export type FdMatch = {
  id: number;
  utcDate: string;
  status:
    | "SCHEDULED"
    | "TIMED"
    | "IN_PLAY"
    | "PAUSED"
    | "FINISHED"
    | "POSTPONED"
    | "SUSPENDED"
    | "CANCELLED";
  matchday: number | null;
  stage: FdStage;
  group: string | null; // "GROUP_A" … "GROUP_L" for GROUP_STAGE, null otherwise
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
    extraTime?: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null };
  };
};

// Bound how long the cron will wait on football-data. Without this the route
// can hang for the whole platform request timeout if the upstream stalls.
const FETCH_TIMEOUT_MS = 10_000;

export async function fetchWorldCupMatches(): Promise<FdMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) throw new Error("FOOTBALL_DATA_API_KEY not set");

  const res = await fetch(`${BASE}/competitions/WC/matches`, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`football-data.org error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { matches: FdMatch[] };
  return data.matches;
}
