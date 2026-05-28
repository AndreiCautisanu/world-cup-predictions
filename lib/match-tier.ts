/**
 * Maps a match prediction's awarded points to a visual tier so the UI can
 * colour-code at-a-glance how well a prediction did. The buckets correspond
 * to the actual scoring values emitted by lib/scoring.ts:
 *
 *   group:    0   2 (winner only)   5 (winner + one side)   7 (exact)
 *   knockout: 0   4 (winner only)                            8 (exact regulation)   10 (exact + ET/pens called)
 */
export type MatchTier = "none" | "miss" | "partial" | "close" | "exact" | "perfect";

export function matchPredictionTier(
  pointsAwarded: number | null | undefined
): MatchTier {
  if (pointsAwarded === null || pointsAwarded === undefined) return "none";
  if (pointsAwarded === 0) return "miss";
  if (pointsAwarded === 2 || pointsAwarded === 4) return "partial";
  if (pointsAwarded === 5) return "close";
  if (pointsAwarded >= 10) return "perfect";
  if (pointsAwarded >= 7) return "exact"; // 7 (group) and 8 (KO regulation)
  // Defensive fallback for any unexpected scoring value (1, 3, 6, 9 ...).
  return pointsAwarded > 0 ? "partial" : "miss";
}

export const MATCH_TIER_LABEL: Record<MatchTier, string> = {
  none: "În așteptare",
  miss: "Ratat",
  partial: "Învingător",
  close: "Aproape",
  exact: "Scor exact",
  perfect: "Perfect!",
};
