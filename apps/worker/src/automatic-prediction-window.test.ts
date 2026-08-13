import assert from "node:assert/strict";
import test from "node:test";
import { openRouterPredictionProfileExists, type PostgresDb } from "@ai-sports-prediction/db";
import {
  AUTOMATIC_PREDICTION_LEAD_DAYS,
  fetchUpcomingFixtures,
  prioritizeFixturesForCoverage,
  SPORT_API_LEAGUES,
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

test("prioritizes every sport and competition before taking a second fixture from one league", () => {
  const fixtures = [
    fixtureAt("2026-08-10T12:00:00.000Z", "NS", { id: "pl-1", competition: "Premier League" }),
    fixtureAt("2026-08-10T13:00:00.000Z", "NS", { id: "pl-2", competition: "Premier League" }),
    fixtureAt("2026-08-10T14:00:00.000Z", "NS", { id: "nfl-1", competition: "NFL", sport: "nfl" }),
    fixtureAt("2026-08-10T15:00:00.000Z", "NS", { id: "atp-1", competition: "ATP", sport: "tennis" })
  ];

  assert.deepEqual(
    prioritizeFixturesForCoverage(fixtures).map((fixture) => fixture.id),
    ["pl-1", "nfl-1", "atp-1", "pl-2"]
  );
});

test("automatic prediction coverage includes every public sport and the Conference League", () => {
  const configuredSports = new Set(SPORT_API_LEAGUES.map((league) => league.sport));

  assert.deepEqual([...configuredSports].sort(), ["football", "nba", "nfl", "tennis"]);
  assert.ok(
    SPORT_API_LEAGUES.some(
      (league) => league.competition === "UEFA Conference League" && league.sport === "football"
    )
  );
});

test("fixture discovery asks the same dedicated next-schedule endpoint used by public pages", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    requestedUrls.push(String(input));
    return new Response(JSON.stringify({ events: [] }), {
      headers: { "content-type": "application/json" },
      status: 200
    });
  }) as typeof fetch;

  try {
    await fetchUpcomingFixtures("test-key");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.ok(requestedUrls.some((url) => url.includes("/schedule/next/league/5071")));
  assert.ok(requestedUrls.some((url) => url.includes("/schedule/next/league/4391")));
  assert.ok(requestedUrls.some((url) => url.includes("/schedule/next/league/4387")));
  assert.ok(requestedUrls.some((url) => url.includes("/schedule/next/league/4464")));
});

test("continental fixtures are not rejected because the venue has a real country", async () => {
  const originalFetch = globalThis.fetch;
  const kickoff = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    const events = url.includes("/schedule/next/league/5071")
      ? [{
          idEvent: "conference-1",
          idLeague: "5071",
          strLeague: "UEFA Conference League",
          strSport: "Soccer",
          strCountry: "Kazakhstan",
          strHomeTeam: "Tobol",
          strAwayTeam: "Partizan Belgrade",
          strTimestamp: kickoff,
          strStatus: "NS"
        }]
      : [];
    return new Response(JSON.stringify({ schedule: events }), {
      headers: { "content-type": "application/json" },
      status: 200
    });
  }) as typeof fetch;

  try {
    const fixtures = await fetchUpcomingFixtures("test-key");
    assert.ok(fixtures.some((fixture) => fixture.id === "conference-1"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function fixtureAt(
  utcDate: string,
  status = "NS",
  overrides: Partial<SportFixture> = {}
): SportFixture {
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
    matchday: null,
    ...overrides
  };
}
