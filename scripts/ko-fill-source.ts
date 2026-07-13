import type { FdMatch } from "../lib/football-api";

export async function loadFootballDataMatchesForKoFill(
  fetcher: () => Promise<FdMatch[]>,
  apiKey = process.env.FOOTBALL_DATA_API_KEY
): Promise<FdMatch[]> {
  if (!apiKey) {
    console.log("ℹ FOOTBALL_DATA_API_KEY not set; applying manual matchups only.");
    return [];
  }

  console.log("📡 Fetching WC2026 fixtures from football-data.org…");
  return fetcher();
}
