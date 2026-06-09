/**
 * Purpose: Local scoring helper for the deployed web app.
 * Keeping this inside apps/web makes the Vercel deployment independent from workspace package resolution.
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
    return { points: 4, reason: "exact" };
  }

  const predictedDiff = predicted.home - predicted.away;
  const actualDiff = actual.home - actual.away;

  if (predictedDiff === actualDiff) {
    return { points: 3, reason: "goal_difference" };
  }

  if (Math.sign(predictedDiff) === Math.sign(actualDiff)) {
    return { points: 2, reason: "tendency" };
  }

  return { points: 0, reason: "miss" };
}
