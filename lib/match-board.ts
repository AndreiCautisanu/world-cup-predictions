export type Bucket = "home" | "draw" | "away";

export function predictionBucket(homeScore: number, awayScore: number): Bucket {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

export type DrawBadge = "pen" | "prel" | null;

// For knockout predicted-draws: which tiebreak the user expects to advance the
// game. Penalties take precedence over extra time (a pens prediction implies ET).
export function koDrawBadge(p: {
  predictsEt: boolean | null;
  predictsPens: boolean | null;
}): DrawBadge {
  if (p.predictsPens) return "pen";
  if (p.predictsEt) return "prel";
  return null;
}
