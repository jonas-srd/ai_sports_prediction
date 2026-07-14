import assert from "node:assert/strict";
import { buildModelPredictions, PREDICTION_MODELS } from "./prediction-models";

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

console.log("Prediction model variants passed.");
