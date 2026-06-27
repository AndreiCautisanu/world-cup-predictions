export type MatchScore = { ph: number; pa: number };
export type MatchResult = { ah: number; aa: number };

export type KnockoutPrediction = {
  ph: number;
  pa: number;
  // Who the user backs to advance on penalties. Only consulted when the
  // predicted scoreline is a draw (ph === pa); ignored for decisive picks.
  homeAdvances?: boolean | null;
};

export type KnockoutResult = {
  ah: number;
  aa: number;
  // Who actually advanced on penalties. Only consulted when the recorded
  // scoreline is a draw (ah === aa); ignored for decisive results.
  homeAdvances?: boolean | null;
};

function sign(n: number): -1 | 0 | 1 {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

type Advancer = "HOME" | "AWAY" | null;

// Who progresses, given a recorded scoreline and (for draws) the shootout winner.
// A decisive scoreline determines the advancer on its own; a draw defers to the
// penalties flag, which may be unknown (null) until the result is fully recorded.
function knockoutAdvancer(h: number, a: number, homeAdvances?: boolean | null): Advancer {
  if (h > a) return "HOME";
  if (a > h) return "AWAY";
  if (homeAdvances === true) return "HOME";
  if (homeAdvances === false) return "AWAY";
  return null;
}

export function groupMatchPoints(pred: MatchScore, actual: MatchResult): number {
  const predictedResult = sign(pred.ph - pred.pa);
  const actualResult = sign(actual.ah - actual.aa);

  if (predictedResult !== actualResult) return 0;
  if (pred.ph === actual.ah && pred.pa === actual.aa) return 7;
  if (pred.ph === actual.ah || pred.pa === actual.aa) return 4;
  return 2;
}

// Knockout scoring is built on two facts about the official 120-minute record:
// who advances, and the manner (decided in regulation/ET vs. drawn → penalties).
//
//   Right advancer + right manner + exact scoreline ... 10
//   Right advancer + right manner, scoreline off ......  7
//   Right advancer, wrong manner ......................  4
//   Wrong advancer, but correctly called a draw→pens ..  4   (saw the shootout)
//   Otherwise .........................................  0
//
// The invariant: a wrong-advancer pick can tie but never beat a right-advancer
// one (both top out at 4), so calling who progresses always carries its weight.
export function knockoutMatchPoints(
  pred: KnockoutPrediction,
  actual: KnockoutResult
): number {
  const predDraw = pred.ph === pred.pa;
  const actualDraw = actual.ah === actual.aa;

  const predAdvancer = knockoutAdvancer(pred.ph, pred.pa, pred.homeAdvances);
  const actualAdvancer = knockoutAdvancer(actual.ah, actual.aa, actual.homeAdvances);
  const rightAdvancer = predAdvancer !== null && predAdvancer === actualAdvancer;

  if (rightAdvancer) {
    // "Manner" = decided-in-120 vs. drawn→pens. predDraw === actualDraw means
    // the user called the manner correctly.
    if (predDraw !== actualDraw) return 4;
    const exactScore = pred.ph === actual.ah && pred.pa === actual.aa;
    return exactScore ? 10 : 7;
  }

  // Wrong advancer: a small consolation for reading that it would be a stalemate
  // going to penalties, even though the shootout fell the other way.
  if (predDraw && actualDraw) return 4;
  return 0;
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
