/**
 * Purpose: Syncs FIFA World Cup fixtures/results from football-data.org into local SQLite.
 * The API key is read from server-side env var FOOTBALL_DATA_API_KEY and is never exposed to the browser.
 */
import "../load-env";
import { createSqliteDb, getDefaultDbPath, upsertMatches } from "@llm-kicktipp/db";
import type { MatchRow } from "@llm-kicktipp/db";

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage?: string;
  group?: string | null;
  matchday?: number | null;
  venue?: string | null;
  competition: {
    code: string;
    name: string;
  };
  homeTeam: {
    name: string | null;
    shortName?: string | null;
    tla?: string | null;
  };
  awayTeam: {
    name: string | null;
    shortName?: string | null;
    tla?: string | null;
  };
  score: {
    fullTime: {
      home: number | null;
      away: number | null;
    };
  };
};

type FootballDataResponse = {
  matches?: FootballDataMatch[];
  errorCode?: number;
  message?: string;
};

async function main() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("Missing FOOTBALL_DATA_API_KEY. Add it to .env, not to frontend code.");
  }

  const competition = process.env.FOOTBALL_DATA_COMPETITION ?? "WC";
  const season = process.env.FOOTBALL_DATA_SEASON ?? "2026";
  const url = new URL(`https://api.football-data.org/v4/competitions/${competition}/matches`);
  url.searchParams.set("season", season);

  const response = await fetch(url, {
    headers: {
      "X-Auth-Token": apiKey
    }
  });

  const body = (await response.json()) as FootballDataResponse;

  if (!response.ok) {
    throw new Error(`football-data.org sync failed: ${body.message ?? JSON.stringify(body)}`);
  }

  const matches = (body.matches ?? []).map(toMatchRow);
  const db = createSqliteDb();

  await upsertMatches(db, matches);
  db.close();

  console.log(`Synced ${matches.length} matches from football-data.org competition=${competition} season=${season}.`);
  console.log(`SQLite DB: ${getDefaultDbPath()}`);
}

function toMatchRow(match: FootballDataMatch): MatchRow {
  const season = process.env.FOOTBALL_DATA_SEASON ?? "2026";
  const stage = normalizeStage(match.stage);

  return {
    id: `football-data-${match.id}`,
    utc_date: match.utcDate,
    competition: formatCompetition(match),
    home_team: formatTeamName(match.homeTeam),
    away_team: formatTeamName(match.awayTeam),
    venue: match.venue ?? null,
    status: normalizeStatus(match.status),
    home_score: match.score.fullTime.home,
    away_score: match.score.fullTime.away,
    source: "football-data.org",
    source_match_id: String(match.id),
    tournament_edition: `FIFA World Cup ${season}`,
    stage,
    group_name: match.group ?? null,
    matchday: match.matchday ?? null,
    is_knockout: stage ? stage !== "group_stage" : null
  };
}

function formatCompetition(match: FootballDataMatch): string {
  const details = [match.stage, match.group].filter(Boolean).join(" - ");
  return details ? `${match.competition.name} - ${details}` : match.competition.name;
}

function formatTeamName(team: FootballDataMatch["homeTeam"]): string {
  return team.name ?? team.shortName ?? team.tla ?? "TBD";
}

function normalizeStatus(status: string): string {
  if (status === "FINISHED") return "FINISHED";
  if (status === "SCHEDULED" || status === "TIMED") return "SCHEDULED";
  if (status === "POSTPONED") return "POSTPONED";
  if (status === "CANCELLED") return "CANCELLED";
  return "LIVE";
}

function normalizeStage(stage?: string): string | null {
  switch (stage) {
    case "GROUP_STAGE":
      return "group_stage";
    case "LAST_32":
      return "round_of_32";
    case "LAST_16":
      return "round_of_16";
    case "QUARTER_FINALS":
      return "quarterfinal";
    case "SEMI_FINALS":
      return "semifinal";
    case "THIRD_PLACE":
      return "third_place";
    case "FINAL":
      return "final";
    default:
      return stage?.toLowerCase() ?? null;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
