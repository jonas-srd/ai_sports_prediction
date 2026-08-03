import assert from "node:assert/strict";
import { buildModelPredictions, buildStoredModelPredictions, PREDICTION_MODELS } from "./prediction-models";
import type { SportApiMatch } from "./sports-api-data";

for (const sport of ["football", "nfl", "nba", "tennis"] as const) {
  const variants = buildModelPredictions({
    baseConfidence: 64,
    basePick: "Home Team",
    baseScore: sport === "nba" ? "112:107" : sport === "nfl" ? "27:21" : sport === "tennis" ? "2:1" : "2:1",
    homeName: "Home Team",
    awayName: "Away Team",
    locale: "en",
    seed: 731,
    sport
  });

  assert.deepEqual(Object.keys(variants), PREDICTION_MODELS.map((model) => model.id));
  assert.equal(new Set(Object.values(variants).map((prediction) => prediction.reason)).size, 3);
  assert.equal(new Set(Object.values(variants).map((prediction) => prediction.confidence)).size, 3);

  for (const prediction of Object.values(variants)) {
    assert.equal(prediction.probabilities.reduce((sum, probability) => sum + probability.value, 0), 100);
    assert.ok(prediction.confidence >= 0 && prediction.confidence <= 100);
  }
}

const germanDraw = buildModelPredictions({
  baseConfidence: 52,
  basePick: "Remis",
  baseScore: "1:1",
  homeName: "Heimteam",
  awayName: "Auswärtsteam",
  locale: "de",
  seed: 118,
  sport: "football"
});
assert.equal(germanDraw.nexus.pick, "Remis");
assert.equal(germanDraw.nexus.probabilities.reduce((sum, probability) => sum + probability.value, 0), 100);

const storedMatch: SportApiMatch = {
  id: "fixture-1",
  competition: "Test League",
  date: "2026-08-10T18:00:00.000Z",
  homeName: "Home Team",
  awayName: "Away Team",
  homeLogo: null,
  awayLogo: null,
  homeScore: null,
  awayScore: null,
  status: "NS",
  predictions: [
    { id: "n", modelKey: "nexus", modelName: "NEXUS", modelVersion: "test/model", provider: "OpenRouter", predictedHome: 2, predictedAway: 1, confidence: 61, reason: "Nexus reason", createdAt: null },
    { id: "p", modelKey: "pulse", modelName: "PULSE", modelVersion: "test/model", provider: "OpenRouter", predictedHome: 1, predictedAway: 1, confidence: 42, reason: "Pulse reason", createdAt: null },
    { id: "e", modelKey: "edge", modelName: "EDGE", modelVersion: "test/model", provider: "OpenRouter", predictedHome: 0, predictedAway: 1, confidence: 56, reason: "Edge reason", createdAt: null }
  ]
};
const storedVariants = buildStoredModelPredictions(storedMatch, "football", "en");
assert.ok(storedVariants);
assert.equal(storedVariants.nexus.score, "2:1");
assert.equal(storedVariants.pulse.pick, "Draw");
assert.equal(storedVariants.edge.reason, "Edge reason");
assert.equal(storedVariants.nexus.source, "openrouter");
assert.equal(buildStoredModelPredictions({ ...storedMatch, predictions: storedMatch.predictions?.slice(0, 2) }, "football", "en"), null);

console.log("Prediction model variants passed.");
