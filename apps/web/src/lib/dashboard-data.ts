/**
 * Purpose: Provides dashboard data from local SQLite when available, with sample fallback data.
 * The website only reads SQLite; fetch/predict/score writes happen through local cron scripts.
 */
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { calculatePredictionScore } from "@/lib/scorer";

export type DashboardPrediction = {
  model: string;
  provider: string;
  predictedHome: number;
  predictedAway: number;
};

export type DashboardMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  actualHome: number | null;
  actualAway: number | null;
  status?: string;
  utcDate?: string;
  competition?: string;
  venue?: string | null;
  predictions: DashboardPrediction[];
};

export const sampleMatches: DashboardMatch[] = [
  {
    id: "sample-1",
    homeTeam: "Germany",
    awayTeam: "France",
    actualHome: 2,
    actualAway: 1,
    venue: "Sample Stadium",
    predictions: [
      { model: "GPT-4o", provider: "OpenAI", predictedHome: 2, predictedAway: 1 },
      { model: "Claude 3.5 Sonnet", provider: "Anthropic", predictedHome: 1, predictedAway: 1 },
      { model: "Gemini Pro 1.5", provider: "Google", predictedHome: 2, predictedAway: 0 },
      { model: "Grok 2", provider: "xAI", predictedHome: 0, predictedAway: 1 }
    ]
  },
  {
    id: "sample-2",
    homeTeam: "Brazil",
    awayTeam: "Argentina",
    actualHome: 1,
    actualAway: 1,
    venue: "Sample Stadium",
    predictions: [
      { model: "GPT-4o", provider: "OpenAI", predictedHome: 1, predictedAway: 1 },
      { model: "Claude 3.5 Sonnet", provider: "Anthropic", predictedHome: 2, predictedAway: 1 },
      { model: "Gemini Pro 1.5", provider: "Google", predictedHome: 0, predictedAway: 0 },
      { model: "Grok 2", provider: "xAI", predictedHome: 1, predictedAway: 2 }
    ]
  }
];

export function getDashboardMatches(): DashboardMatch[] {
  const dbPath = getSqliteDbPath();
  if (!existsSync(dbPath)) {
    return sampleMatches;
  }

  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const venueSelect = hasColumn(db, "matches", "venue") ? "m.venue" : "null";
    const rows = db.prepare(`
      select
        m.id,
        m.utc_date,
        m.competition,
        m.home_team,
        m.away_team,
        ${venueSelect} as venue,
        m.status,
        m.home_score,
        m.away_score,
        mo.name as model_name,
        mo.provider as model_provider,
        p.predicted_home,
        p.predicted_away
      from matches m
      left join predictions p on p.match_id = m.id
      left join models mo on mo.id = p.model_id
      order by m.utc_date asc, mo.name asc
    `).all() as DbMatchRow[];

    db.close();

    const matches = rowsToMatches(rows);
    return matches.length > 0 ? matches : sampleMatches;
  } catch {
    return sampleMatches;
  }
}

export function getLeaderboard() {
  const dbLeaderboard = getSqliteLeaderboard();
  if (dbLeaderboard.length > 0) {
    return dbLeaderboard;
  }

  const totals = new Map<string, { model: string; provider: string; points: number; exact: number }>();

  for (const match of sampleMatches) {
    if (match.actualHome === null || match.actualAway === null) {
      continue;
    }

    for (const prediction of match.predictions) {
      const score = calculatePredictionScore(
        { home: prediction.predictedHome, away: prediction.predictedAway },
        { home: match.actualHome, away: match.actualAway }
      );

      const current = totals.get(prediction.model) ?? {
        model: prediction.model,
        provider: prediction.provider,
        points: 0,
        exact: 0
      };

      current.points += score.points;
      current.exact += score.reason === "exact" ? 1 : 0;
      totals.set(prediction.model, current);
    }
  }

  return [...totals.values()].sort((a, b) => b.points - a.points || b.exact - a.exact);
}

type DbMatchRow = {
  id: string;
  utc_date: string;
  competition: string;
  home_team: string;
  away_team: string;
  venue: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  model_name: string | null;
  model_provider: string | null;
  predicted_home: number | null;
  predicted_away: number | null;
};

type DbLeaderboardRow = {
  model: string;
  provider: string;
  points: number;
  exact: number;
};

type DbLeaderboardPredictionRow = {
  model: string;
  provider: string;
  predicted_home: number;
  predicted_away: number;
  home_score: number | null;
  away_score: number | null;
};

function getSqliteDbPath(): string {
  if (process.env.SQLITE_DB_PATH) {
    return resolve(process.env.SQLITE_DB_PATH);
  }

  const candidates = [
    resolve(process.cwd(), "data/world-cup.db"),
    resolve(process.cwd(), "../data/world-cup.db"),
    resolve(process.cwd(), "../../data/world-cup.db")
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

function rowsToMatches(rows: DbMatchRow[]): DashboardMatch[] {
  const matches = new Map<string, DashboardMatch>();

  for (const row of rows) {
    const match = matches.get(row.id) ?? {
      id: row.id,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      venue: row.venue,
      actualHome: row.home_score,
      actualAway: row.away_score,
      status: row.status,
      utcDate: row.utc_date,
      competition: row.competition,
      predictions: []
    };

    if (
      row.model_name &&
      row.model_provider &&
      row.predicted_home !== null &&
      row.predicted_away !== null
    ) {
      match.predictions.push({
        model: row.model_name,
        provider: row.model_provider,
        predictedHome: row.predicted_home,
        predictedAway: row.predicted_away
      });
    }

    matches.set(row.id, match);
  }

  return [...matches.values()];
}

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const columns = db.prepare(`pragma table_info(${table})`).all() as Array<{ name: string }>;
  return columns.some((entry) => entry.name === column);
}

function getSqliteLeaderboard() {
  const dbPath = getSqliteDbPath();
  if (!existsSync(dbPath)) {
    return [];
  }

  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const rows = db.prepare(`
      select
        mo.name as model,
        mo.provider as provider,
        p.predicted_home,
        p.predicted_away,
        m.home_score,
        m.away_score
      from predictions p
      inner join models mo on mo.id = p.model_id
      inner join matches m on m.id = p.match_id
      order by mo.name asc
    `).all() as DbLeaderboardPredictionRow[];

    db.close();

    return rowsToLeaderboard(rows);
  } catch {
    return [];
  }
}

function rowsToLeaderboard(rows: DbLeaderboardPredictionRow[]): DbLeaderboardRow[] {
  const totals = new Map<string, DbLeaderboardRow>();

  for (const row of rows) {
    const current = totals.get(row.model) ?? {
      model: row.model,
      provider: row.provider,
      points: 0,
      exact: 0
    };

    if (row.home_score !== null && row.away_score !== null) {
      const score = calculatePredictionScore(
        { home: row.predicted_home, away: row.predicted_away },
        { home: row.home_score, away: row.away_score }
      );

      current.points += score.points;
      current.exact += score.reason === "exact" ? 1 : 0;
    }

    totals.set(row.model, current);
  }

  return [...totals.values()].sort((a, b) => b.points - a.points || b.exact - a.exact || a.model.localeCompare(b.model));
}
