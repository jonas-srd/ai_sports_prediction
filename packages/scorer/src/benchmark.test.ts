/**
 * Purpose: Unit coverage for World Cup benchmark evaluation metrics.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  brierScore,
  calculateBenchmarkKicktippPoints,
  evaluateBenchmarkPrediction,
  logLoss
} from "./benchmark";

test("computes Brier score for home/draw/away probabilities", () => {
  const result = brierScore({ home: 0.6, draw: 0.25, away: 0.15 }, "home");

  assert.ok(Math.abs(result - (0.16 + 0.0625 + 0.0225)) < 1e-12);
});

test("clips log loss to avoid log(0)", () => {
  assert.equal(logLoss(1), -Math.log(1 - 1e-15));
  assert.equal(logLoss(0), -Math.log(1e-15));
});

test("computes categorical, scoreline, and Kicktipp metrics", () => {
  const result = evaluateBenchmarkPrediction(
    {
      homeWin90Prob: 0.5,
      draw90Prob: 0.3,
      awayWin90Prob: 0.2,
      expectedHomeGoals90: 1.4,
      expectedAwayGoals90: 0.7,
      mostLikelyScore90: { home: 1, away: 0 },
      homeWinFullProb: 0.5,
      drawFullProb: 0.3,
      awayWinFullProb: 0.2,
      mostLikelyScoreFull: { home: 1, away: 0 },
      homeAdvancesProb: null,
      awayAdvancesProb: null
    },
    {
      score90: { home: 2, away: 1 }
    }
  );

  assert.equal(result.actualResult90, "home");
  assert.equal(result.predictedResult90FromProbs, "home");
  assert.equal(result.predictedResult90FromScore, "home");
  assert.equal(result.topOutcomeCorrect90, true);
  assert.equal(result.exactScore90Correct, false);
  assert.equal(result.goalDifference90Correct, true);
  assert.equal(result.tendency90CorrectFromScore, true);
  assert.equal(result.homeGoalAbsError90, 1);
  assert.equal(result.awayGoalAbsError90, 1);
  assert.equal(result.totalGoalsAbsError90, 2);
  assert.equal(result.goalDifferenceAbsError90, 0);
  assert.equal(result.kicktippPoints90, 2);
  assert.equal(result.scoreResultMatchesProbArgmax90, true);
  assert.ok(Math.abs(result.expectedGoalsScoreDistance - 1.1) < 1e-12);
});

test("uses protocol Kicktipp point scheme", () => {
  assert.equal(calculateBenchmarkKicktippPoints({
    exactScore90Correct: true,
    goalDifference90Correct: true,
    tendency90CorrectFromScore: true
  }), 5);
  assert.equal(calculateBenchmarkKicktippPoints({
    exactScore90Correct: false,
    goalDifference90Correct: true,
    tendency90CorrectFromScore: true
  }), 2);
  assert.equal(calculateBenchmarkKicktippPoints({
    exactScore90Correct: false,
    goalDifference90Correct: false,
    tendency90CorrectFromScore: true
  }), 1);
  assert.equal(calculateBenchmarkKicktippPoints({
    exactScore90Correct: false,
    goalDifference90Correct: false,
    tendency90CorrectFromScore: false
  }), 0);
});

test("computes knockout advancement metrics when actual advancer is available", () => {
  const result = evaluateBenchmarkPrediction(
    {
      homeWin90Prob: 0.4,
      draw90Prob: 0.3,
      awayWin90Prob: 0.3,
      expectedHomeGoals90: 1,
      expectedAwayGoals90: 1,
      mostLikelyScore90: { home: 1, away: 1 },
      homeWinFullProb: 0.45,
      drawFullProb: 0.1,
      awayWinFullProb: 0.45,
      mostLikelyScoreFull: { home: 2, away: 1 },
      homeAdvancesProb: 0.65,
      awayAdvancesProb: 0.35
    },
    {
      score90: { home: 1, away: 1 },
      actualAdvancer: "home"
    }
  );

  assert.equal(result.advancementAccuracy, true);
  assert.equal(result.advancementBrier, (0.65 - 1) ** 2 + 0.35 ** 2);
  assert.equal(result.advancementLogLoss, -Math.log(0.65));
});

test("keeps 90-minute result separate from full-match knockout outcome", () => {
  const result = evaluateBenchmarkPrediction(
    {
      homeWin90Prob: 0.25,
      draw90Prob: 0.5,
      awayWin90Prob: 0.25,
      expectedHomeGoals90: 1,
      expectedAwayGoals90: 1,
      mostLikelyScore90: { home: 1, away: 1 },
      homeWinFullProb: 0.6,
      drawFullProb: 0,
      awayWinFullProb: 0.4,
      mostLikelyScoreFull: { home: 2, away: 1 },
      homeAdvancesProb: 0.6,
      awayAdvancesProb: 0.4
    },
    {
      score90: { home: 1, away: 1 },
      actualFullResult: "home",
      actualAdvancer: "home"
    }
  );

  assert.equal(result.actualResult90, "draw");
  assert.equal(result.actualResultFull, "home");
  assert.equal(result.actualAdvancer, "home");
  assert.equal(result.topOutcomeCorrect90, true);
  assert.equal(result.advancementAccuracy, true);
});

test("leaves advancement metrics null without an actual advancer", () => {
  const result = evaluateBenchmarkPrediction(
    {
      homeWin90Prob: 0.4,
      draw90Prob: 0.3,
      awayWin90Prob: 0.3,
      expectedHomeGoals90: 1,
      expectedAwayGoals90: 1,
      mostLikelyScore90: { home: 1, away: 1 },
      homeWinFullProb: 0.4,
      drawFullProb: 0.3,
      awayWinFullProb: 0.3,
      mostLikelyScoreFull: { home: 1, away: 1 },
      homeAdvancesProb: null,
      awayAdvancesProb: null
    },
    {
      score90: { home: 1, away: 1 }
    }
  );

  assert.equal(result.advancementAccuracy, null);
  assert.equal(result.advancementBrier, null);
  assert.equal(result.advancementLogLoss, null);
});
