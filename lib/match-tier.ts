/**
 * Maps a match prediction's awarded points to a visual tier so the UI can
 * colour-code at-a-glance how well a prediction did. The buckets correspond
 * to the actual scoring values emitted by lib/scoring.ts:
 *
 *   group:    0   2 (winner only)   4 (winner + one side)   7 (exact)
 *   knockout: 0   4 (winner only)                            8 (exact regulation)   10 (exact + ET/pens called)
 *
 * 4 is overloaded — it means "close" in a group match and "partial" in a KO
 * match — so the round must be supplied to disambiguate.
 */
export type MatchTier = "none" | "miss" | "partial" | "close" | "exact" | "perfect";

const GROUP_ROUNDS = new Set(["GROUP_1", "GROUP_2", "GROUP_3"]);

const GROUP_TIER: Record<number, MatchTier> = {
  0: "miss",
  2: "partial",
  4: "close",
  7: "exact",
};

const KO_TIER: Record<number, MatchTier> = {
  0: "miss",
  4: "partial",
  8: "exact",
  10: "perfect",
};

export function matchPredictionTier(
  pointsAwarded: number | null | undefined,
  round?: string
): MatchTier {
  if (pointsAwarded === null || pointsAwarded === undefined) return "none";
  const isGroup = round !== undefined && GROUP_ROUNDS.has(round);
  const exact = (isGroup ? GROUP_TIER : KO_TIER)[pointsAwarded];
  if (exact) return exact;
  // Defensive fallback for an unexpected value or an unknown round.
  if (pointsAwarded >= 10) return "perfect";
  if (pointsAwarded >= 7) return "exact";
  if (pointsAwarded > 0) return "partial";
  return "miss";
}

export const MATCH_TIER_LABEL: Record<MatchTier, string> = {
  none: "În așteptare",
  miss: "Ratat",
  partial: "Învingător",
  close: "Aproape",
  exact: "Scor exact",
  perfect: "Perfect!",
};
