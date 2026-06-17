import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAnalyticsLeaderboard,
  buildAnalyticsSeries,
  filterBenchmarkPredictions,
  type BenchmarkDisplayPrediction
} from "./benchmark-analytics";

const basePrediction: BenchmarkDisplayPrediction = {
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
  actualHome90: 1,
  actualAway90: 0,
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
  scoreResultMatchesProbArgmax90: true
};

test("ranks higher-is-better metrics descending", () => {
  const rows = buildAnalyticsLeaderboard([
    basePrediction,
    { ...basePrediction, id: "p2", predictorId: "model-b", model: "Model B", kicktippPoints90: 1 }
  ], "kicktipp_points_90");

  assert.equal(rows[0].model, "Model A");
  assert.equal(rows[0].metricValue, 5);
  assert.equal(rows[1].model, "Model B");
});

test("ranks lower-is-better metrics ascending", () => {
  const rows = buildAnalyticsLeaderboard([
    basePrediction,
    { ...basePrediction, id: "p2", predictorId: "model-b", model: "Model B", brier90: 0.1 }
  ], "brier_90");

  assert.equal(rows[0].model, "Model B");
  assert.equal(rows[0].metricValue, 0.1);
});

test("keeps the same rank for tied metric values", () => {
  const rows = buildAnalyticsLeaderboard([
    basePrediction,
    { ...basePrediction, id: "p2", predictorId: "model-b", model: "Model B" },
    { ...basePrediction, id: "p3", predictorId: "model-c", model: "Model C" }
  ], "top_outcome_accuracy_90");

  assert.deepEqual(rows.map((row) => row.rank), [1, 1, 1]);
});

test("filters by benchmark condition", () => {
  const records = [
    basePrediction,
    {
      ...basePrediction,
      id: "p2",
      predictorId: "model-b",
      model: "Model B",
      accessCondition: "open_book" as const,
      promptStrategy: "probabilistic_forecast" as const
    }
  ];

  const filtered = filterBenchmarkPredictions(records, {
    forecastHorizons: ["T_24H"],
    accessConditions: ["open_book"],
    promptStrategies: ["probabilistic_forecast"],
    stages: [],
    models: [],
    providers: [],
    dateFrom: "",
    dateTo: ""
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].model, "Model B");
});

test("invalid predictions count in validity metrics but not performance metrics", () => {
  const invalid = {
    ...basePrediction,
    id: "p2",
    predictorId: "model-b",
    model: "Model B",
    isValidForScoring: false,
    validationStatus: "invalid_json",
    kicktippPoints90: null,
    brier90: null
  } satisfies BenchmarkDisplayPrediction;

  const invalidRows = buildAnalyticsLeaderboard([basePrediction, invalid], "invalid_output_rate");
  const pointsRows = buildAnalyticsLeaderboard([basePrediction, invalid], "kicktipp_points_90");

  assert.equal(invalidRows.find((row) => row.model === "Model B")?.metricValue, 1);
  assert.equal(pointsRows.find((row) => row.model === "Model B")?.metricValue, null);
});

test("timeline series stop at the last match with an available result", () => {
  const records = [
    { ...basePrediction, forecastHorizon: "STAGE_OPENING" as const },
    {
      ...basePrediction,
      id: "p2",
      matchId: "m2",
      matchDate: "2026-06-12T19:00:00Z",
      forecastHorizon: "STAGE_OPENING" as const,
      kicktippPoints90: 1
    },
    {
      ...basePrediction,
      id: "future-stage-opening",
      matchId: "m3",
      matchDate: "2026-06-28T19:00:00Z",
      actualHome90: null,
      actualAway90: null,
      kicktippPoints90: null,
      forecastHorizon: "STAGE_OPENING" as const
    }
  ];

  const [series] = buildAnalyticsSeries(records, "kicktipp_points_90");

  assert.equal(series.values.length, 2);
  assert.deepEqual(series.values.map((value) => value.matchOrder), [1, 2]);
});
