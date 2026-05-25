const GROUP_ROUNDS = new Set(["GROUP_1", "GROUP_2", "GROUP_3"]);

export function isKnockoutRound(round: string): boolean {
  return !GROUP_ROUNDS.has(round);
}

export type MatchPredictionInput = {
  homeScore: number;
  awayScore: number;
  predictsEt?: boolean;
  predictsPens?: boolean;
};

export type MatchPredictionUpsertData = {
  homeScore: number;
  awayScore: number;
  predictsEt: boolean | null;
  predictsPens: boolean | null;
};

export function buildMatchPredictionUpsertData(
  round: string,
  input: MatchPredictionInput
): MatchPredictionUpsertData {
  if (!isKnockoutRound(round)) {
    return {
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      predictsEt: null,
      predictsPens: null,
    };
  }
  return {
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    predictsEt: input.predictsEt ?? false,
    predictsPens: input.predictsPens ?? false,
  };
}
