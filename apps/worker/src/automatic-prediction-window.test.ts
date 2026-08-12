import assert from "node:assert/strict";
import test from "node:test";
import { openRouterPredictionProfileExists, type PostgresDb } from "@ai-sports-prediction/db";
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

test("treats a stored profile as complete even when the configured model version changes", async () => {
  let sql = "";
  let parameters: unknown[] = [];
  const db = {
    query: async (statement: string, values: unknown[]) => {
      sql = statement;
      parameters = values;
      return { rowCount: 1, rows: [{ exists: 1 }] };
    }
  } as unknown as PostgresDb;

  assert.equal(await openRouterPredictionProfileExists(db, "sport-api:fixture-1", "nexus"), true);
  assert.match(sql, /lower\(m\.provider\) = 'openrouter'/u);
  assert.match(sql, /lower\(m\.name\) = \$2/u);
  assert.deepEqual(parameters, ["sport-api:fixture-1", "nexus"]);
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
