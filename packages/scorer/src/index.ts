/**
 * Purpose: Contains the Kicktipp-style scoring rules used to compare LLM predictions.
 * Exact score gets 5 points, exact goal difference gets 2 points, correct tendency gets 1 point, otherwise 0.
 */
export type ScoreReason = "exact" | "goal_difference" | "tendency" | "miss";

export type ScoreResult = {
  points: number;
  reason: ScoreReason;
};

export type MatchScore = {
  home: number;
  away: number;
};

export function calculatePredictionScore(predicted: MatchScore, actual: MatchScore): ScoreResult {
  if (predicted.home === actual.home && predicted.away === actual.away) {
    return { points: 5, reason: "exact" };
  }

  const predictedDiff = predicted.home - predicted.away;
  const actualDiff = actual.home - actual.away;

  if (predictedDiff === actualDiff) {
    return { points: 2, reason: "goal_difference" };
  }

  if (Math.sign(predictedDiff) === Math.sign(actualDiff)) {
    return { points: 1, reason: "tendency" };
  }

  return { points: 0, reason: "miss" };
}
