import assert from "node:assert/strict";
import { listMatchesDueForOddsRefresh, type PostgresDb } from "@ai-sports-prediction/db";
import { formatOddsApiDate, getCandidateOddsKeys } from "./jobs/refresh-upcoming-odds";

const baseCandidate = {
  matchId: "match-1",
  sourceMatchId: "source-1",
  sport: "tennis",
  utcDate: "2026-08-02T12:00:00.000Z",
  competition: "ATP Canadian Open",
  homeTeam: "Player One",
  awayTeam: "Player Two",
  refreshReason: "daily" as const
};

const activeSports = [
  { key: "tennis_atp_canadian_open", group: "Tennis", active: true, has_outrights: false },
  { key: "tennis_atp_washington_open", group: "Tennis", active: true, has_outrights: false },
  { key: "tennis_wta_washington_open", group: "Tennis", active: true, has_outrights: false },
  { key: "basketball_nba", group: "Basketball", active: false, has_outrights: false }
];

assert.deepEqual(getCandidateOddsKeys(baseCandidate, activeSports), [
  "tennis_atp_canadian_open",
  "tennis_atp_washington_open"
]);

assert.deepEqual(getCandidateOddsKeys({
  ...baseCandidate,
  competition: "WTA Washington Open"
}, activeSports), ["tennis_wta_washington_open"]);

assert.deepEqual(getCandidateOddsKeys({
  ...baseCandidate,
  sport: "nba",
  competition: "NBA",
  homeTeam: "Boston Celtics",
  awayTeam: "New York Knicks"
}, activeSports), []);

assert.deepEqual(getCandidateOddsKeys({
  ...baseCandidate,
  sport: "football",
  competition: "Bundesliga",
  homeTeam: "Bayern Munich",
  awayTeam: "Borussia Dortmund"
}, []), ["soccer_germany_bundesliga"]);

assert.equal(
  formatOddsApiDate(new Date("2026-08-01T18:27:51.765Z")),
  "2026-08-01T18:27:51Z"
);

let capturedSql = "";
let capturedParameters: unknown[] = [];
const fakeDb = {
  async query(sql: string, parameters: unknown[]) {
    capturedSql = sql;
    capturedParameters = parameters;
    return {
      rows: [{
        match_id: "match-2",
        source_match_id: "source-2",
        sport: "football",
        utc_date: new Date("2026-08-10T18:00:00.000Z"),
        competition: "Bundesliga",
        home_team: "Home",
        away_team: "Away",
        refresh_reason: "pre_match"
      }]
    };
  }
} as unknown as PostgresDb;

const scheduled = await listMatchesDueForOddsRefresh(fakeDb, {
  lookaheadDays: 7,
  dailyRefreshMinutes: 1440,
  preMatchMinutes: 60,
  limit: 250
});

assert.deepEqual(capturedParameters, [7, 1440, 60, 250]);
assert.match(capturedSql, /latest_check\.checked_at_utc <= now\(\) - \(\$2::int/);
assert.match(capturedSql, /m\.utc_date - \(\$3::int/);
assert.equal(scheduled[0]?.refreshReason, "pre_match");

console.log("Odds refresh tests passed.");
