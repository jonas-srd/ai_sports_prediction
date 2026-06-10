/**
 * Purpose: Paper-grade benchmark evaluation metrics for validated World Cup predictions.
 */
export type ResultClass = "home" | "draw" | "away";

export type AdvancerClass = "home" | "away";

export type Scoreline = {
  home: number;
  away: number;
};

export type BenchmarkPredictionForEvaluation = {
  homeWin90Prob: number;
  draw90Prob: number;
  awayWin90Prob: number;
  expectedHomeGoals90: number;
  expectedAwayGoals90: number;
  mostLikelyScore90: Scoreline;
  homeWinFullProb: number;
  drawFullProb: number;
  awayWinFullProb: number;
  mostLikelyScoreFull: Scoreline;
  homeAdvancesProb: number | null;
  awayAdvancesProb: number | null;
};

export type BenchmarkActualResult = {
  score90: Scoreline;
  actualFullResult?: ResultClass | null;
  actualAdvancer?: AdvancerClass | null;
};

export type BenchmarkEvaluationMetrics = {
  actualResult90: ResultClass;
  actualResultFull: ResultClass;
  actualAdvancer: AdvancerClass | null;
  predictedResult90FromProbs: ResultClass;
  predictedResult90FromScore: ResultClass;
  predictedResultFullFromProbs: ResultClass;
  brier90: number;
  logLoss90: number;
  topOutcomeCorrect90: boolean;
  exactScore90Correct: boolean;
  goalDifference90Correct: boolean;
  tendency90CorrectFromScore: boolean;
  homeGoalAbsError90: number;
  awayGoalAbsError90: number;
  totalGoalsAbsError90: number;
  goalDifferenceAbsError90: number;
  kicktippPoints90: number;
  advancementBrier: number | null;
  advancementLogLoss: number | null;
  advancementAccuracy: boolean | null;
  scoreResultMatchesProbArgmax90: boolean;
  scoreResultMatchesProbArgmaxFull: boolean;
  expectedGoalsScoreDistance: number;
};

export const LOG_LOSS_EPSILON = 1e-15;

export function evaluateBenchmarkPrediction(
  prediction: BenchmarkPredictionForEvaluation,
  actual: BenchmarkActualResult
): BenchmarkEvaluationMetrics {
  const actualResult90 = resultFromScore(actual.score90);
  const actualResultFull = actual.actualFullResult ?? actualResult90;
  const predictedResult90FromProbs = argmaxResult({
    home: prediction.homeWin90Prob,
    draw: prediction.draw90Prob,
    away: prediction.awayWin90Prob
  });
  const predictedResult90FromScore = resultFromScore(prediction.mostLikelyScore90);
  const predictedResultFullFromProbs = argmaxResult({
    home: prediction.homeWinFullProb,
    draw: prediction.drawFullProb,
    away: prediction.awayWinFullProb
  });
  const predictedResultFullFromScore = resultFromScore(prediction.mostLikelyScoreFull);
  const exactScore90Correct = scoresEqual(prediction.mostLikelyScore90, actual.score90);
  const predictedGoalDifference90 = goalDifference(prediction.mostLikelyScore90);
  const actualGoalDifference90 = goalDifference(actual.score90);
  const goalDifference90Correct = predictedGoalDifference90 === actualGoalDifference90;
  const tendency90CorrectFromScore = predictedResult90FromScore === actualResult90;
  const advancement = evaluateAdvancement(prediction, actual.actualAdvancer ?? null);

  return {
    actualResult90,
    actualResultFull,
    actualAdvancer: actual.actualAdvancer ?? null,
    predictedResult90FromProbs,
    predictedResult90FromScore,
    predictedResultFullFromProbs,
    brier90: brierScore(
      {
        home: prediction.homeWin90Prob,
        draw: prediction.draw90Prob,
        away: prediction.awayWin90Prob
      },
      actualResult90
    ),
    logLoss90: logLoss(resultProbability(prediction, actualResult90)),
    topOutcomeCorrect90: predictedResult90FromProbs === actualResult90,
    exactScore90Correct,
    goalDifference90Correct,
    tendency90CorrectFromScore,
    homeGoalAbsError90: Math.abs(prediction.mostLikelyScore90.home - actual.score90.home),
    awayGoalAbsError90: Math.abs(prediction.mostLikelyScore90.away - actual.score90.away),
    totalGoalsAbsError90: Math.abs(totalGoals(prediction.mostLikelyScore90) - totalGoals(actual.score90)),
    goalDifferenceAbsError90: Math.abs(predictedGoalDifference90 - actualGoalDifference90),
    kicktippPoints90: calculateBenchmarkKicktippPoints({
      exactScore90Correct,
      goalDifference90Correct,
      tendency90CorrectFromScore
    }),
    advancementBrier: advancement.brier,
    advancementLogLoss: advancement.logLoss,
    advancementAccuracy: advancement.accuracy,
    scoreResultMatchesProbArgmax90: predictedResult90FromScore === predictedResult90FromProbs,
    scoreResultMatchesProbArgmaxFull: predictedResultFullFromScore === predictedResultFullFromProbs,
    expectedGoalsScoreDistance:
      Math.abs(prediction.expectedHomeGoals90 - prediction.mostLikelyScore90.home)
      + Math.abs(prediction.expectedAwayGoals90 - prediction.mostLikelyScore90.away)
  };
}

export function resultFromScore(score: Scoreline): ResultClass {
  if (score.home > score.away) return "home";
  if (score.home < score.away) return "away";
  return "draw";
}

export function argmaxResult(probabilities: Record<ResultClass, number>): ResultClass {
  if (probabilities.home >= probabilities.draw && probabilities.home >= probabilities.away) {
    return "home";
  }

  if (probabilities.draw >= probabilities.away) {
    return "draw";
  }

  return "away";
}

export function brierScore(probabilities: Record<ResultClass, number>, actual: ResultClass): number {
  return (probabilities.home - indicator(actual, "home")) ** 2
    + (probabilities.draw - indicator(actual, "draw")) ** 2
    + (probabilities.away - indicator(actual, "away")) ** 2;
}

export function logLoss(probability: number, epsilon = LOG_LOSS_EPSILON): number {
  return -Math.log(clip(probability, epsilon, 1 - epsilon));
}

export function calculateBenchmarkKicktippPoints(args: {
  exactScore90Correct: boolean;
  goalDifference90Correct: boolean;
  tendency90CorrectFromScore: boolean;
}): number {
  if (args.exactScore90Correct) return 5;
  if (args.goalDifference90Correct) return 2;
  if (args.tendency90CorrectFromScore) return 1;
  return 0;
}

function evaluateAdvancement(
  prediction: BenchmarkPredictionForEvaluation,
  actualAdvancer: AdvancerClass | null
): { brier: number | null; logLoss: number | null; accuracy: boolean | null } {
  if (
    actualAdvancer === null
    || prediction.homeAdvancesProb === null
    || prediction.awayAdvancesProb === null
  ) {
    return { brier: null, logLoss: null, accuracy: null };
  }

  const predictedAdvancer = prediction.homeAdvancesProb >= prediction.awayAdvancesProb ? "home" : "away";
  const actualProbability = actualAdvancer === "home"
    ? prediction.homeAdvancesProb
    : prediction.awayAdvancesProb;

  return {
    brier: (prediction.homeAdvancesProb - indicator(actualAdvancer, "home")) ** 2
      + (prediction.awayAdvancesProb - indicator(actualAdvancer, "away")) ** 2,
    logLoss: logLoss(actualProbability),
    accuracy: predictedAdvancer === actualAdvancer
  };
}

function resultProbability(prediction: BenchmarkPredictionForEvaluation, actual: ResultClass): number {
  if (actual === "home") return prediction.homeWin90Prob;
  if (actual === "draw") return prediction.draw90Prob;
  return prediction.awayWin90Prob;
}

function indicator<T extends string>(actual: T, expected: T): number {
  return actual === expected ? 1 : 0;
}

function clip(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function scoresEqual(left: Scoreline, right: Scoreline): boolean {
  return left.home === right.home && left.away === right.away;
}

function goalDifference(score: Scoreline): number {
  return score.home - score.away;
}

function totalGoals(score: Scoreline): number {
  return score.home + score.away;
}
