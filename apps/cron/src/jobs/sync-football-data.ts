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
    winner?: string | null;
    duration?: string | null;
    regularTime?: FootballDataScore | null;
    fullTime: FootballDataScore;
    halfTime?: FootballDataScore | null;
    extraTime?: FootballDataScore | null;
    penalties?: FootballDataScore | null;
  };
};

type FootballDataScore = {
  home?: number | null;
  away?: number | null;
  homeTeam?: number | null;
  awayTeam?: number | null;
};

type NormalizedResult = {
  score90: {
    home: number | null;
    away: number | null;
  };
  scoreFull: {
    home: number | null;
    away: number | null;
  };
  scoreExtraTime: {
    home: number | null;
    away: number | null;
  };
  penalties: {
    home: number | null;
    away: number | null;
  };
  resultWinner: MatchRow["result_winner"];
  actualAdvancer: MatchRow["actual_advancer"];
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
  const result = normalizeResult(match.score);

  return {
    id: `football-data-${match.id}`,
    utc_date: match.utcDate,
    competition: formatCompetition(match),
    home_team: formatTeamName(match.homeTeam),
    away_team: formatTeamName(match.awayTeam),
    venue: match.venue ?? null,
    status: normalizeStatus(match.status),
    home_score: result.scoreFull.home,
    away_score: result.scoreFull.away,
    home_score_90: result.score90.home,
    away_score_90: result.score90.away,
    home_score_full: result.scoreFull.home,
    away_score_full: result.scoreFull.away,
    home_score_extra_time: result.scoreExtraTime.home,
    away_score_extra_time: result.scoreExtraTime.away,
    home_penalties: result.penalties.home,
    away_penalties: result.penalties.away,
    result_duration: match.score.duration ?? null,
    result_winner: result.resultWinner,
    actual_advancer: isKnockoutStage(stage) ? result.actualAdvancer : null,
    source: "football-data.org",
    source_match_id: String(match.id),
    tournament_edition: `FIFA World Cup ${season}`,
    stage,
    group_name: match.group ?? null,
    matchday: match.matchday ?? null,
    is_knockout: stage ? isKnockoutStage(stage) : null
  };
}

function normalizeResult(score: FootballDataMatch["score"]): NormalizedResult {
  const regularOrFull = score.regularTime ?? score.fullTime;
  const extraTime = score.extraTime ?? null;
  const penalties = score.penalties ?? null;
  const score90 = readScore(regularOrFull);
  const scoreExtraTime = readScore(extraTime);
  const penaltyScore = readScore(penalties);
  const scoreFull = hasCompleteScore(scoreExtraTime) ? scoreExtraTime : score90;
  const resultWinner = normalizeWinner(score.winner)
    ?? resultFromNonDrawScore(penaltyScore)
    ?? resultFromScore(scoreFull);

  return {
    score90,
    scoreFull,
    scoreExtraTime,
    penalties: penaltyScore,
    resultWinner,
    actualAdvancer: resultWinner === "home" || resultWinner === "away" ? resultWinner : null
  };
}

function readScore(score: FootballDataScore | null | undefined): { home: number | null; away: number | null } {
  return {
    home: score?.home ?? score?.homeTeam ?? null,
    away: score?.away ?? score?.awayTeam ?? null
  };
}

function hasCompleteScore(score: { home: number | null; away: number | null }): boolean {
  return score.home !== null && score.away !== null;
}

function resultFromScore(score: { home: number | null; away: number | null }): MatchRow["result_winner"] {
  if (!hasCompleteScore(score)) return null;
  if ((score.home as number) > (score.away as number)) return "home";
  if ((score.home as number) < (score.away as number)) return "away";
  return "draw";
}

function resultFromNonDrawScore(score: { home: number | null; away: number | null }): MatchRow["actual_advancer"] {
  const result = resultFromScore(score);
  return result === "home" || result === "away" ? result : null;
}

function normalizeWinner(winner: string | null | undefined): MatchRow["result_winner"] {
  if (winner === "HOME_TEAM") return "home";
  if (winner === "AWAY_TEAM") return "away";
  if (winner === "DRAW") return "draw";
  return null;
}

function isKnockoutStage(stage: string | null): boolean {
  return stage !== null && stage !== "group_stage";
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
