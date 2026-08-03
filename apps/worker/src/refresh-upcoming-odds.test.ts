import assert from "node:assert/strict";
import { formatOddsApiDate, getCandidateOddsKeys } from "./jobs/refresh-upcoming-odds";

const baseCandidate = {
  matchId: "match-1",
  sourceMatchId: "source-1",
  sport: "tennis",
  utcDate: "2026-08-02T12:00:00.000Z",
  competition: "ATP Canadian Open",
  homeTeam: "Player One",
  awayTeam: "Player Two"
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

console.log("Odds refresh tests passed.");
