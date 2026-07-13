/**
 * Maps a match prediction's awarded points to a visual tier so the UI can
 * colour-code at-a-glance how well a prediction did. The buckets correspond
 * to the actual scoring values emitted by lib/scoring.ts:
 *
 *   group:    0   2 (result only)   4 (result + one side)         7 (exact)
 *   knockout: 0   3 (advancer)   5 (+ manner)   7 (+ one side)   10 (exact)
 *
 * Several point values are overloaded across the two scales, so the round must
 * be supplied to disambiguate. In particular the "exact" visual tier means a
 * full exact score in a group match (7) but only "one team's goals right" in a
 * KO match (7) — so its displayed label is round-aware (see matchTierLabel).
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
  3: "partial",
  5: "close",
  7: "exact",
  10: "perfect",
};

export function matchPredictionTier(
  pointsAwarded: number | null | undefined,
  round?: string
): MatchTier {
  if (pointsAwarded === null || pointsAwarded === undefined) return "none";
  const isGroup = round !== undefined && GROUP_ROUNDS.has(round);
  const tier = (isGroup ? GROUP_TIER : KO_TIER)[pointsAwarded];
  if (tier) return tier;
  // Defensive fallback for an unexpected value or an unknown round.
  if (pointsAwarded >= 10) return "perfect";
  if (pointsAwarded >= 7) return "exact";
  if (pointsAwarded >= 4) return "close";
  if (pointsAwarded > 0) return "partial";
  return "miss";
}

export const MATCH_TIER_LABEL: Record<MatchTier, string> = {
  none: "În așteptare",
  miss: "Ratat",
  // Universal across group (2pt: correct W/D/L) and KO (3pt: correct advancer).
  // "Învingător" reads wrong for draws — every group prediction that landed
  // 2pts on a 0-0 / 1-1 / 2-2 etc. would have shown "Winner" with no winner.
  partial: "Rezultat corect",
  close: "Aproape",
  exact: "Scor exact",
  perfect: "Perfect!",
};

// KO matches reuse the "exact" visual tier for the 7-point band — one team's
// goals right, or a correctly-called tie → penalties with the wrong tie score.
// Neither is a full exact score (that's perfect/10), so override the label.
const KO_TIER_LABEL: Partial<Record<MatchTier, string>> = {
  exact: "Foarte aproape",
};

export function matchTierLabel(tier: MatchTier, round?: string): string {
  const isGroup = round !== undefined && GROUP_ROUNDS.has(round);
  if (!isGroup) {
    const override = KO_TIER_LABEL[tier];
    if (override) return override;
  }
  return MATCH_TIER_LABEL[tier];
}
