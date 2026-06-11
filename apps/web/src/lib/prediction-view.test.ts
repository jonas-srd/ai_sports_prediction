import assert from "node:assert/strict";
import test from "node:test";
import type { DashboardMatch, DashboardPrediction } from "./dashboard-data";
import { filterMatchesForPredictionView, type PredictionViewState } from "./prediction-view";

const basePrediction: DashboardPrediction = {
  id: "p1",
  matchId: "m1",
  model: "Model A",
  provider: "openrouter",
  predictorId: "model-a",
  accessCondition: "closed_book",
  promptStrategy: "direct_score",
  forecastHorizon: "T_24H",
  stage: "group_stage",
  matchDate: "2026-06-11T19:00:00Z",
  sampleId: 1,
  predictedHome: 1,
  predictedAway: 0,
  predictedFullHome: 1,
  predictedFullAway: 0,
  homeWin90Prob: 0.5,
  draw90Prob: 0.25,
  awayWin90Prob: 0.25,
  homeWinFullProb: 0.5,
  drawFullProb: 0.25,
  awayWinFullProb: 0.25,
  homeAdvancesProb: null,
  awayAdvancesProb: null,
  confidence: 0.5,
  reason: "Test",
  validationStatus: "valid",
  isValidForScoring: true,
  repairAttempted: false,
  normalizationApplied: false,
  openBookCompliance: "not_applicable",
  toolsEnabled: false,
  toolCallsObserved: null,
  numToolCalls: null,
  brier90: 0.3,
  logLoss90: 0.8,
  topOutcomeCorrect90: true,
  exactScore90Correct: true,
  goalDifference90Correct: true,
  tendency90CorrectFromScore: true,
  homeGoalAbsError90: 0,
  awayGoalAbsError90: 0,
  totalGoalsAbsError90: 0,
  goalDifferenceAbsError90: 0,
  kicktippPoints90: 5,
  advancementAccuracy: null,
  scoreResultMatchesProbArgmax90: true,
  scorePoints: 5,
  scoreReason: "exact score"
};

const bestModeState: PredictionViewState = {
  mode: "best",
  customMode: "all",
  models: ["Model A"],
  accessConditions: ["closed_book", "open_book"],
  promptStrategies: ["direct_score", "probabilistic_forecast"],
  forecastHorizons: ["T_24H", "STAGE_OPENING"]
};

test("best per model prefers open-book probabilistic stage-opening config when scores tie", () => {
  const preferredPrediction = {
    ...basePrediction,
    id: "p2",
    accessCondition: "open_book" as const,
    promptStrategy: "probabilistic_forecast" as const,
    forecastHorizon: "STAGE_OPENING" as const,
    openBookCompliance: "observed_search" as const
  };
  const match: DashboardMatch = {
    id: "m1",
    homeTeam: "Germany",
    awayTeam: "France",
    actualHome: 1,
    actualAway: 0,
    predictions: [basePrediction, preferredPrediction]
  };

  const [filteredMatch] = filterMatchesForPredictionView([match], bestModeState);

  assert.equal(filteredMatch.predictions.length, 1);
  assert.equal(filteredMatch.predictions[0].id, "p2");
});
