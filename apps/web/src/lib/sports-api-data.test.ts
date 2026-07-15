import assert from "node:assert/strict";
import test from "node:test";
import { matchesTheSportsDbLeagueRow } from "./sports-league-identity";

const uefaChampionsLeague = {
  id: "4480",
  name: "UEFA Champions League",
  aliases: ["Champions League"],
  eventCountry: "Europe",
  mainStageOnly: true,
  sportName: "Soccer",
  strictIdentity: true
};

test("accepts UEFA Champions League rows by the canonical league id", () => {
  assert.equal(matchesTheSportsDbLeagueRow({
    idLeague: "4480",
    strLeague: "UEFA Champions League"
  }, "4480", uefaChampionsLeague), true);
});

test("accepts an id-less European Champions League row", () => {
  assert.equal(matchesTheSportsDbLeagueRow({
    strLeague: "Champions League",
    strCountry: "Europe"
  }, "4480", uefaChampionsLeague), true);
});

test("rejects an id-less Belarusian Champions League row", () => {
  assert.equal(matchesTheSportsDbLeagueRow({
    strLeague: "Champions League",
    strCountry: "Belarus"
  }, "4480", uefaChampionsLeague), false);
});

test("rejects a row carrying a different league id", () => {
  assert.equal(matchesTheSportsDbLeagueRow({
    idLeague: "9999",
    strLeague: "UEFA Champions League",
    strCountry: "Europe"
  }, "4480", uefaChampionsLeague), false);
});

test("rejects conflicting Belarusian metadata even when the league id is mislabeled as UEFA", () => {
  assert.equal(matchesTheSportsDbLeagueRow({
    idLeague: "4480",
    strLeague: "Champions League",
    strCountry: "Belarus"
  }, "4480", uefaChampionsLeague), false);
});

test("rejects UEFA Champions League qualification fixtures in summer", () => {
  assert.equal(matchesTheSportsDbLeagueRow({
    idLeague: "4480",
    strLeague: "UEFA Champions League",
    strHomeTeam: "Universitatea Craiova",
    strAwayTeam: "Maxline Vitebsk",
    strTimestamp: "2026-07-15T17:30:00"
  }, "4480", uefaChampionsLeague), false);
});

test("accepts UEFA Champions League main-stage fixtures", () => {
  assert.equal(matchesTheSportsDbLeagueRow({
    idLeague: "4480",
    strLeague: "UEFA Champions League",
    strTimestamp: "2026-09-16T19:00:00"
  }, "4480", uefaChampionsLeague), true);
});

test("accepts the current DFB-Pokal league id", () => {
  assert.equal(matchesTheSportsDbLeagueRow({
    idLeague: "4485",
    strLeague: "DFB-Pokal",
    strSport: "Soccer"
  }, "4485", {
    name: "DFB-Pokal",
    eventCountry: "Germany",
    sportName: "Soccer",
    strictIdentity: true
  }), true);
});

test("rejects the old Arena Football League id for DFB-Pokal", () => {
  assert.equal(matchesTheSportsDbLeagueRow({
    idLeague: "4470",
    strLeague: "Arena Football League",
    strSport: "American Football"
  }, "4485", {
    name: "DFB-Pokal",
    eventCountry: "Germany",
    sportName: "Soccer",
    strictIdentity: true
  }), false);
});
