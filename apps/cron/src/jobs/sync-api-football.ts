/**
 * Purpose: Syncs all FIFA World Cup fixtures/results from API-Football into local SQLite.
 * The API key is read from server-side env var API_FOOTBALL_KEY and is never exposed to the browser.
 */
import "../load-env";
import { createSqliteDb, getDefaultDbPath, upsertMatches } from "@llm-kicktipp/db";
import type { MatchRow } from "@llm-kicktipp/db";

type ApiFootballFixture = {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
      long: string;
    };
  };
  league: {
    id: number;
    name: string;
    season: number;
    round?: string;
  };
  teams: {
    home: {
      name: string;
    };
    away: {
      name: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    fulltime: {
      home: number | null;
      away: number | null;
    };
  };
};

type ApiFootballResponse = {
  errors: unknown[] | Record<string, unknown>;
  response: ApiFootballFixture[];
};

async function main() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    throw new Error("Missing API_FOOTBALL_KEY. Add it to .env, not to frontend code.");
  }

  const leagueId = process.env.API_FOOTBALL_LEAGUE_ID ?? "1";
  const season = process.env.API_FOOTBALL_SEASON ?? "2026";
  const url = new URL("https://v3.football.api-sports.io/fixtures");

  url.searchParams.set("league", leagueId);
  url.searchParams.set("season", season);

  const response = await fetch(url, {
    headers: {
      "x-apisports-key": apiKey
    }
  });

  const body = (await response.json()) as ApiFootballResponse;

  if (!response.ok || hasApiErrors(body.errors)) {
    throw new Error(`API-Football sync failed: ${JSON.stringify(body.errors)}`);
  }

  const matches = body.response.map(toMatchRow);
  const db = createSqliteDb();
  await upsertMatches(db, matches);
  db.close();

  console.log(`Synced ${matches.length} World Cup matches from API-Football league=${leagueId} season=${season}.`);
  console.log(`SQLite DB: ${getDefaultDbPath()}`);
}

function toMatchRow(item: ApiFootballFixture): MatchRow {
  return {
    id: `api-football-${item.fixture.id}`,
    utc_date: item.fixture.date,
    competition: item.league.round ? `${item.league.name} - ${item.league.round}` : item.league.name,
    home_team: item.teams.home.name,
    away_team: item.teams.away.name,
    status: normalizeStatus(item.fixture.status.short),
    home_score: item.goals.home ?? item.score.fulltime.home,
    away_score: item.goals.away ?? item.score.fulltime.away
  };
}

function normalizeStatus(status: string): string {
  if (["FT", "AET", "PEN"].includes(status)) return "FINISHED";
  if (["NS", "TBD"].includes(status)) return "SCHEDULED";
  if (["PST"].includes(status)) return "POSTPONED";
  if (["CANC", "ABD", "AWD", "WO"].includes(status)) return "CANCELLED";
  return "LIVE";
}

function hasApiErrors(errors: ApiFootballResponse["errors"]): boolean {
  if (Array.isArray(errors)) {
    return errors.length > 0;
  }

  return Object.keys(errors).length > 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
