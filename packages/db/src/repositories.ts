/**
 * Purpose: Small repository helpers used by cron jobs and future API routes.
 * Keeping DB calls here prevents prediction/scoring jobs from depending on table details.
 */
import type { MatchRow, ModelRow, PredictionRow } from "./types";
import type { SqliteDb } from "./sqlite";
import { randomUUID } from "node:crypto";

export async function upsertModels(db: SqliteDb, models: ModelRow[]): Promise<void> {
  const statement = db.prepare(`
    insert into models (id, name, provider, active)
    values (@id, @name, @provider, @active)
    on conflict(id) do update set
      name = excluded.name,
      provider = excluded.provider,
      active = excluded.active
  `);

  const transaction = db.transaction((rows: ModelRow[]) => {
    for (const model of rows) {
      statement.run({
        ...model,
        active: model.active ? 1 : 0
      });
    }
  });

  transaction(models);
}

export async function upsertMatches(db: SqliteDb, matches: MatchRow[]): Promise<void> {
  const statement = db.prepare(`
    insert into matches (id, utc_date, competition, home_team, away_team, status, home_score, away_score, updated_at)
    values (@id, @utc_date, @competition, @home_team, @away_team, @status, @home_score, @away_score, current_timestamp)
    on conflict(id) do update set
      utc_date = excluded.utc_date,
      competition = excluded.competition,
      home_team = excluded.home_team,
      away_team = excluded.away_team,
      status = excluded.status,
      home_score = excluded.home_score,
      away_score = excluded.away_score,
      updated_at = current_timestamp
  `);

  const transaction = db.transaction((rows: MatchRow[]) => {
    for (const match of rows) {
      statement.run(match);
    }
  });

  transaction(matches);
}

export async function listTodayMatches(db: SqliteDb, date = new Date()): Promise<MatchRow[]> {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return db.prepare(`
    select id, utc_date, competition, home_team, away_team, status, home_score, away_score
    from matches
    where utc_date >= ? and utc_date < ?
    order by utc_date asc
  `).all(start.toISOString(), end.toISOString()) as MatchRow[];
}

export async function listMatches(db: SqliteDb): Promise<MatchRow[]> {
  return db.prepare(`
    select id, utc_date, competition, home_team, away_team, status, home_score, away_score
    from matches
    order by utc_date asc
  `).all() as MatchRow[];
}

export async function upsertPrediction(
  db: SqliteDb,
  prediction: Omit<PredictionRow, "id" | "created_at">
): Promise<void> {
  db.prepare(`
    insert into predictions (
      id,
      match_id,
      model_id,
      predicted_home,
      predicted_away,
      confidence,
      reason,
      raw_response
    )
    values (
      @id,
      @match_id,
      @model_id,
      @predicted_home,
      @predicted_away,
      @confidence,
      @reason,
      @raw_response
    )
    on conflict(match_id, model_id) do update set
      predicted_home = excluded.predicted_home,
      predicted_away = excluded.predicted_away,
      confidence = excluded.confidence,
      reason = excluded.reason,
      raw_response = excluded.raw_response,
      created_at = current_timestamp
  `).run({
    id: randomUUID(),
    ...prediction,
    raw_response: JSON.stringify(prediction.raw_response)
  });
}

export async function listUnscoredFinishedPredictions(db: SqliteDb): Promise<Array<PredictionRow & { matches: MatchRow }>> {
  const rows = db.prepare(`
    select
      p.id as prediction_id,
      p.match_id,
      p.model_id,
      p.predicted_home,
      p.predicted_away,
      p.confidence,
      p.reason as prediction_reason,
      p.raw_response,
      p.created_at,
      m.id as match_id_value,
      m.utc_date,
      m.competition,
      m.home_team,
      m.away_team,
      m.status,
      m.home_score,
      m.away_score
    from predictions p
    inner join matches m on m.id = p.match_id
    left join scores s on s.prediction_id = p.id
    where m.status = 'FINISHED'
      and m.home_score is not null
      and m.away_score is not null
      and s.id is null
  `).all() as Array<{
    prediction_id: string;
    match_id: string;
    model_id: string;
    predicted_home: number;
    predicted_away: number;
    confidence: number | null;
    prediction_reason: string | null;
    raw_response: string;
    created_at: string;
    match_id_value: string;
    utc_date: string;
    competition: string;
    home_team: string;
    away_team: string;
    status: string;
    home_score: number | null;
    away_score: number | null;
  }>;

  return rows.map((row) => ({
    id: row.prediction_id,
    match_id: row.match_id,
    model_id: row.model_id,
    predicted_home: row.predicted_home,
    predicted_away: row.predicted_away,
    confidence: row.confidence,
    reason: row.prediction_reason,
    raw_response: parseJson(row.raw_response),
    created_at: row.created_at,
    matches: {
      id: row.match_id_value,
      utc_date: row.utc_date,
      competition: row.competition,
      home_team: row.home_team,
      away_team: row.away_team,
      status: row.status,
      home_score: row.home_score,
      away_score: row.away_score
    }
  }));
}

export async function upsertScore(
  db: SqliteDb,
  score: { prediction_id: string; points: number; reason: string }
): Promise<void> {
  db.prepare(`
    insert into scores (id, prediction_id, points, reason)
    values (@id, @prediction_id, @points, @reason)
    on conflict(prediction_id) do update set
      points = excluded.points,
      reason = excluded.reason,
      scored_at = current_timestamp
  `).run({
    id: randomUUID(),
    ...score
  });
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
