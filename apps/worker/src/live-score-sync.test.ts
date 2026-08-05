import assert from "node:assert/strict";
import test from "node:test";
import { isFinalScoreFixture, normalizeSupportedLiveScoreRow } from "./jobs/sync-live-sport-scores";

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
