import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTOMATIC_PREDICTION_LEAD_DAYS,
  shouldCreateAutomaticPrediction,
  type SportFixture
} from "./jobs/generate-upcoming-sport-api-predictions";

const now = Date.parse("2026-08-05T12:00:00.000Z");

test("creates a prediction exactly seven days before kickoff", () => {
  assert.equal(AUTOMATIC_PREDICTION_LEAD_DAYS, 7);
  assert.equal(shouldCreateAutomaticPrediction(fixtureAt("2026-08-12T12:00:00.000Z"), now), true);
});

test("waits while kickoff is still more than seven days away", () => {
  assert.equal(shouldCreateAutomaticPrediction(fixtureAt("2026-08-12T12:00:01.000Z"), now), false);
});

test("does not generate predictions for past or finished fixtures", () => {
  assert.equal(shouldCreateAutomaticPrediction(fixtureAt("2026-08-05T11:59:59.000Z"), now), false);
  assert.equal(shouldCreateAutomaticPrediction(fixtureAt("2026-08-10T12:00:00.000Z", "FT"), now), false);
});

function fixtureAt(utcDate: string, status = "NS"): SportFixture {
  return {
    id: "fixture-1",
    competition: "Test League",
    sport: "football",
    utcDate,
    homeTeam: "Home Team",
    awayTeam: "Away Team",
    venue: null,
    status,
    round: null,
    matchday: null
  };
}
