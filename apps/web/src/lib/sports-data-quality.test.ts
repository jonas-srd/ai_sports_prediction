import assert from "node:assert/strict";
import test from "node:test";
import { auditSportsMatches } from "./sports-data-quality";
import type { SportApiMatch, SportApiTeam } from "./sports-api-data";

const realLogo = "https://www.thesportsdb.com/images/media/team/badge/example.png";

test("publishes a valid NBA matchup with real logos", () => {
  const report = auditSportsMatches({
    expectedLeagueId: "4387",
    league: { id: "4387", name: "NBA", sportName: "Basketball" },
    matches: [match({
      awayLogo: realLogo,
      awayName: "New York Knicks",
      competition: "NBA",
      homeLogo: realLogo,
      homeName: "Boston Celtics",
      leagueId: "4387",
      providerCompetition: "NBA",
      providerSport: "Basketball"
    })],
    sport: "nba",
    teams: []
  });

  assert.equal(report.matches.length, 1);
  assert.equal(report.report.blocked, 0);
});

test("blocks non-NBA teams even when a provider labels the event NBA", () => {
  const report = auditSportsMatches({
    expectedLeagueId: "4387",
    league: { id: "4387", name: "NBA", sportName: "Basketball" },
    matches: [match({
      awayLogo: realLogo,
      awayName: "Rapid City Marshals",
      competition: "NBA",
      homeLogo: realLogo,
      homeName: "Wichita Regulators",
      leagueId: "4387",
      providerCompetition: "NBA",
      providerSport: "Basketball"
    })],
    sport: "nba",
    teams: []
  });

  assert.equal(report.matches.length, 0);
  assert.equal(report.report.blocked, 1);
  assert.equal(report.report.issues.filter((issue) => issue.code === "nba_team_mismatch").length, 2);
});

test("blocks a wrong DFB-Pokal league ID and competition", () => {
  const teams: SportApiTeam[] = [
    { id: "1", logo: realLogo, name: "Bayern Munich" },
    { id: "2", logo: realLogo, name: "Borussia Dortmund" }
  ];
  const report = auditSportsMatches({
    expectedLeagueId: "4485",
    league: {
      aliases: ["DFB Pokal"],
      id: "4485",
      name: "DFB-Pokal",
      sportName: "Soccer",
      strictIdentity: true
    },
    matches: [match({
      awayLogo: realLogo,
      awayName: "Borussia Dortmund",
      competition: "DFB-Pokal",
      homeLogo: realLogo,
      homeName: "Bayern Munich",
      leagueId: "9999",
      providerCompetition: "Korean FA Cup",
      providerSport: "Soccer"
    })],
    sport: "football",
    teams
  });

  assert.deepEqual(
    new Set(report.report.issues.map((issue) => issue.code)),
    new Set(["league_id_mismatch", "competition_mismatch"])
  );
});

test("blocks Champions League qualifiers from the main competition", () => {
  const teams: SportApiTeam[] = [
    { id: "1", logo: realLogo, name: "Universitatea Craiova" },
    { id: "2", logo: realLogo, name: "Maxline Vitebsk" }
  ];
  const report = auditSportsMatches({
    expectedLeagueId: "4480",
    league: {
      aliases: ["Champions League"],
      id: "4480",
      mainStageOnly: true,
      name: "UEFA Champions League",
      sportName: "Soccer",
      strictIdentity: true
    },
    matches: [match({
      awayLogo: realLogo,
      awayName: "Maxline Vitebsk",
      competition: "UEFA Champions League",
      date: "2026-07-15T17:30:00.000Z",
      homeLogo: realLogo,
      homeName: "Universitatea Craiova",
      leagueId: "4480",
      providerCompetition: "UEFA Champions League",
      providerSport: "Soccer",
      providerStage: "First qualifying round"
    })],
    sport: "football",
    teams
  });

  assert.equal(report.matches.length, 0);
  assert.ok(report.report.issues.some((issue) => issue.code === "champions_league_qualifier"));
});

test("requires confirmed flag URLs for tennis players", () => {
  const report = auditSportsMatches({
    expectedLeagueId: "4464",
    league: { id: "4464", name: "ATP", sportName: "Tennis" },
    matches: [match({
      awayLogo: "https://flagcdn.com/w80/it.png",
      awayName: "Jannik Sinner",
      competition: "ATP",
      homeLogo: null,
      homeName: "Carlos Alcaraz",
      leagueId: "4464",
      providerCompetition: "ATP",
      providerSport: "Tennis"
    })],
    sport: "tennis",
    teams: []
  });

  assert.equal(report.matches.length, 0);
  assert.ok(report.report.issues.some((issue) => issue.code === "missing_tennis_flag"));
});

function match(overrides: Partial<SportApiMatch>): SportApiMatch {
  return {
    awayLogo: null,
    awayName: "Away",
    awayScore: null,
    competition: "Competition",
    date: "2026-09-15T18:00:00.000Z",
    homeLogo: null,
    homeName: "Home",
    homeScore: null,
    id: "tsdb:test",
    status: "Scheduled",
    ...overrides
  };
}
