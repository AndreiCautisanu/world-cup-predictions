const GROUP_ROUNDS = new Set(["GROUP_1", "GROUP_2", "GROUP_3"]);

export function isKnockoutRound(round: string): boolean {
  return !GROUP_ROUNDS.has(round);
}

export type MatchPredictionInput = {
  homeScore: number;
  awayScore: number;
  // Who advances on penalties — only relevant for a knockout draw pick.
  homeAdvances?: boolean | null;
};

export type MatchPredictionUpsertData = {
  homeScore: number;
  awayScore: number;
  homeAdvances: boolean | null;
};

export function buildMatchPredictionUpsertData(
  round: string,
  input: MatchPredictionInput
): MatchPredictionUpsertData {
  // homeAdvances only carries meaning for a knockout draw pick. For group games
  // and decisive knockout picks the scoreline already determines the outcome,
  // so we null it out to keep the stored data unambiguous.
  const isDraw = input.homeScore === input.awayScore;
  const homeAdvances =
    isKnockoutRound(round) && isDraw ? input.homeAdvances ?? null : null;
  return {
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    homeAdvances,
  };
}
