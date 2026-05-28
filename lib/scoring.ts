export type MatchScore = { ph: number; pa: number };
export type MatchResult = { ah: number; aa: number };

export type KnockoutPrediction = {
  ph: number;
  pa: number;
  predictsEt: boolean;
  predictsPens: boolean;
};

export type KnockoutResult = {
  ah: number;
  aa: number;
  wentToEt: boolean;
  wentToPens: boolean;
};

function sign(n: number): -1 | 0 | 1 {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

export function groupMatchPoints(pred: MatchScore, actual: MatchResult): number {
  const predictedResult = sign(pred.ph - pred.pa);
  const actualResult = sign(actual.ah - actual.aa);

  if (predictedResult !== actualResult) return 0;
  if (pred.ph === actual.ah && pred.pa === actual.aa) return 7;
  if (pred.ph === actual.ah || pred.pa === actual.aa) return 4;
  return 2;
}

export function knockoutMatchPoints(
  pred: KnockoutPrediction,
  actual: KnockoutResult
): number {
  const predictedResult = sign(pred.ph - pred.pa);
  const actualResult = sign(actual.ah - actual.aa);

  if (predictedResult !== actualResult) return 0;

  const exactScore = pred.ph === actual.ah && pred.pa === actual.aa;
  if (!exactScore) return 4;

  const calledEt = actual.wentToEt && pred.predictsEt === true;
  const calledPens = actual.wentToPens && pred.predictsPens === true;
  if (calledEt || calledPens) return 10;
  return 8;
}

export function groupStandingPoints(
  predicted: Record<number, number>,
  actual: Record<number, number>
): number {
  let pts = 0;
  for (const position of [1, 2, 3, 4]) {
    if (predicted[position] === actual[position]) pts += 3;
  }
  return pts;
}

export type DarkHorseRound =
  | "GROUP_EXIT"
  | "R32"
  | "R16"
  | "QF"
  | "SF"
  | "FINAL"
  | "WINNER";

const DARK_HORSE_POINTS: Record<DarkHorseRound, number> = {
  GROUP_EXIT: 0,
  R32: 3,
  R16: 6,
  QF: 10,
  SF: 15,
  FINAL: 22,
  WINNER: 30,
};

export function darkHorsePoints(round: DarkHorseRound): number {
  return DARK_HORSE_POINTS[round];
}

export const BONUS_POINTS = {
  champion: 20,
  runnerUp: 10,
  topScorer: 15,
};
