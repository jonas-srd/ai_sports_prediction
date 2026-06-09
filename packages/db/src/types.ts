/**
 * Purpose: Shared database row types for matches, models, predictions, and scores.
 * These types mirror the local SQLite schema and keep app and cron code aligned.
 */
export type ModelRow = {
  id: string;
  name: string;
  provider: string;
  active: boolean | number;
};

export type MatchRow = {
  id: string;
  utc_date: string;
  competition: string;
  home_team: string;
  away_team: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
};

export type PredictionRow = {
  id: string;
  match_id: string;
  model_id: string;
  predicted_home: number;
  predicted_away: number;
  confidence: number | null;
  reason: string | null;
  raw_response: unknown;
  created_at: string;
};

export type ScoreRow = {
  id: string;
  prediction_id: string;
  points: number;
  reason: string;
  scored_at: string;
};
