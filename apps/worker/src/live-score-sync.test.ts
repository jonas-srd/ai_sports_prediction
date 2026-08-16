import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchSupportedLiveScoreFixtures,
  isFinalScoreFixture,
  normalizeSupportedLiveScoreRow
} from "./jobs/sync-live-sport-scores";

test("normalizes a supported live-score row including progress", () => {
  const fixture = normalizeSupportedLiveScoreRow({
    idEvent: "2554858",
    idLeague: "5071",
    strLeague: "UEFA Conference League",
    strSport: "Soccer",
    strHomeTeam: "Brann",
    strAwayTeam: "Apollon Limassol",
    intHomeScore: "0",
    intAwayScore: "1",
    strStatus: "HT",
    strProgress: "45+2",
    strTimestamp: "2026-08-05T17:00:00"
  });

  assert.equal(fixture?.homeScore, 0);
  assert.equal(fixture?.awayScore, 1);
  assert.equal(fixture?.liveProgress, "45+2");
  assert.equal(isFinalScoreFixture(fixture!), false);
});

test("stores only confirmed final results", () => {
  const fixture = normalizeSupportedLiveScoreRow({
    idEvent: "2554858",
    idLeague: "5071",
    strHomeTeam: "Brann",
    strAwayTeam: "Apollon Limassol",
    intHomeScore: "1",
    intAwayScore: "2",
    strStatus: "FT",
    strProgress: "Final",
    strTimestamp: "2026-08-05T17:00:00"
  });

  assert.ok(fixture);
  assert.equal(isFinalScoreFixture(fixture), true);
});

test("ignores not-started rows from the broad livescore feed", () => {
  assert.equal(normalizeSupportedLiveScoreRow({
    idEvent: "future",
    idLeague: "4387",
    strHomeTeam: "Boston Celtics",
    strAwayTeam: "New York Knicks",
    strStatus: "NS",
    strProgress: null,
    strTimestamp: "2026-08-06T00:00:00"
  }), null);
});

test("ignores postponed rows from the broad livescore feed", () => {
  assert.equal(normalizeSupportedLiveScoreRow({
    idEvent: "postponed",
    idLeague: "4481",
    strHomeTeam: "KÍ Klaksvík",
    strAwayTeam: "Lech Poznań",
    strStatus: "PST",
    strProgress: null,
    strTimestamp: "2026-08-13T19:45:00"
  }), null);
});

test("retries a transient provider failure before returning live scores", async () => {
  let calls = 0;
  const delays: number[] = [];

  const fixtures = await fetchSupportedLiveScoreFixtures("test-key", {
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(null, { status: 503 });
      }
      return Response.json({ events: [] });
    },
    sleep: async (delayMs) => {
      delays.push(delayMs);
    },
    baseDelayMs: 10
  });

  assert.deepEqual(fixtures, []);
  assert.equal(calls, 2);
  assert.deepEqual(delays, [10]);
});

test("stops after bounded retries when a provider outage persists", async () => {
  let calls = 0;
  const delays: number[] = [];

  await assert.rejects(
    fetchSupportedLiveScoreFixtures("test-key", {
      fetchImpl: async () => {
        calls += 1;
        return new Response(null, { status: 503 });
      },
      sleep: async (delayMs) => {
        delays.push(delayMs);
      },
      maxAttempts: 3,
      baseDelayMs: 10
    }),
    /HTTP 503 after 3 attempts/
  );

  assert.equal(calls, 3);
  assert.deepEqual(delays, [10, 20]);
});

test("does not retry a non-transient provider rejection", async () => {
  let calls = 0;

  await assert.rejects(
    fetchSupportedLiveScoreFixtures("test-key", {
      fetchImpl: async () => {
        calls += 1;
        return new Response(null, { status: 401 });
      },
      sleep: async () => {
        assert.fail("non-transient responses must not be retried");
      }
    }),
    /HTTP 401/
  );

  assert.equal(calls, 1);
});
