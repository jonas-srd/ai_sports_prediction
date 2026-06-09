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
    venue?: {
      name: string | null;
      city: string | null;
    };
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

  const args = parseCliArgs(process.argv.slice(2));
  const leagueId = args.league ?? process.env.API_FOOTBALL_LEAGUE_ID ?? "1";
  const season = args.season ?? process.env.API_FOOTBALL_SEASON ?? "2026";
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
    throw new Error(formatApiFootballError(body.errors, season));
  }

  const matches = body.response.map(toMatchRow);
  const db = createSqliteDb();
  await upsertMatches(db, matches);
  db.close();

  console.log(`Synced ${matches.length} World Cup matches from API-Football league=${leagueId} season=${season}.`);
  console.log(`SQLite DB: ${getDefaultDbPath()}`);
}

function toMatchRow(item: ApiFootballFixture): MatchRow {
  const season = String(item.league.season);
  const stage = normalizeStage(item.league.round);

  return {
    id: `api-football-${item.fixture.id}`,
    utc_date: item.fixture.date,
    competition: item.league.round ? `${item.league.name} - ${item.league.round}` : item.league.name,
    home_team: item.teams.home.name,
    away_team: item.teams.away.name,
    venue: formatVenue(item.fixture.venue),
    status: normalizeStatus(item.fixture.status.short),
    home_score: item.goals.home ?? item.score.fulltime.home,
    away_score: item.goals.away ?? item.score.fulltime.away,
    source: "api-football",
    source_match_id: String(item.fixture.id),
    tournament_edition: `FIFA World Cup ${season}`,
    stage,
    group_name: parseGroupName(item.league.round),
    matchday: null,
    is_knockout: stage ? stage !== "group_stage" : null
  };
}

function formatVenue(venue: ApiFootballFixture["fixture"]["venue"]): string | null {
  if (!venue?.name && !venue?.city) {
    return null;
  }

  return [venue.name, venue.city].filter(Boolean).join(", ");
}

function normalizeStatus(status: string): string {
  if (["FT", "AET", "PEN"].includes(status)) return "FINISHED";
  if (["NS", "TBD"].includes(status)) return "SCHEDULED";
  if (["PST"].includes(status)) return "POSTPONED";
  if (["CANC", "ABD", "AWD", "WO"].includes(status)) return "CANCELLED";
  return "LIVE";
}

function normalizeStage(round?: string): string | null {
  const normalized = round?.toLowerCase() ?? "";

  if (!normalized) return null;
  if (normalized.includes("group")) return "group_stage";
  if (normalized.includes("round of 32") || normalized.includes("last 32")) return "round_of_32";
  if (normalized.includes("round of 16") || normalized.includes("last 16")) return "round_of_16";
  if (normalized.includes("quarter")) return "quarterfinal";
  if (normalized.includes("semi")) return "semifinal";
  if (normalized.includes("third") || normalized.includes("3rd")) return "third_place";
  if (normalized.includes("final")) return "final";

  return normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function parseGroupName(round?: string): string | null {
  const match = round?.match(/group\s+([A-L])/i);
  return match ? `GROUP_${match[1].toUpperCase()}` : null;
}

function hasApiErrors(errors: ApiFootballResponse["errors"]): boolean {
  if (Array.isArray(errors)) {
    return errors.length > 0;
  }

  return Object.keys(errors).length > 0;
}

function parseCliArgs(args: string[]): { league?: string; season?: string } {
  const parsed: { league?: string; season?: string } = {};

  for (const arg of args) {
    const [key, value] = arg.replace(/^--/, "").split("=");

    if (key === "league" && value) {
      parsed.league = value;
    }

    if (key === "season" && value) {
      parsed.season = value;
    }
  }

  return parsed;
}

function formatApiFootballError(errors: ApiFootballResponse["errors"], season: string): string {
  const serialized = JSON.stringify(errors);

  if (serialized.includes("Free plans do not have access to this season")) {
    return [
      `API-Football free plan does not allow season ${season}.`,
      "For a local smoke test, run: npm run sync:api-football -- --season=2022",
      "For real World Cup 2026 data, use an API-Football plan that includes season 2026 or seed fixtures manually.",
      `Original API error: ${serialized}`
    ].join("\n");
  }

  return `API-Football sync failed: ${serialized}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
