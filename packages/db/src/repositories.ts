/**
 * Purpose: Small repository helpers used by cron jobs and future API routes.
 * Keeping DB calls here prevents prediction/scoring jobs from depending on table details.
 */
import type { MatchRow, ModelRow, PredictionRow } from "./types";

type SupabaseLike = {
  from: (table: string) => any;
};

export async function upsertModels(db: SupabaseLike, models: ModelRow[]): Promise<void> {
  const { error } = await db.from("models").upsert(models, { onConflict: "id" });
  if (error) throw error;
}

export async function upsertMatches(db: SupabaseLike, matches: MatchRow[]): Promise<void> {
  const { error } = await db.from("matches").upsert(matches, { onConflict: "id" });
  if (error) throw error;
}

export async function listTodayMatches(db: SupabaseLike, date = new Date()): Promise<MatchRow[]> {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const { data, error } = await db
    .from("matches")
    .select("*")
    .gte("utc_date", start.toISOString())
    .lt("utc_date", end.toISOString())
    .order("utc_date", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function upsertPrediction(
  db: SupabaseLike,
  prediction: Omit<PredictionRow, "id" | "created_at">
): Promise<void> {
  const { error } = await db.from("predictions").upsert(prediction, {
    onConflict: "match_id,model_id"
  });

  if (error) throw error;
}

export async function listUnscoredFinishedPredictions(db: SupabaseLike): Promise<Array<PredictionRow & { matches: MatchRow }>> {
  const { data, error } = await db
    .from("predictions")
    .select("*, matches!inner(*)")
    .not("matches.home_score", "is", null)
    .not("matches.away_score", "is", null)
    .eq("matches.status", "FINISHED");

  if (error) throw error;
  return data ?? [];
}

export async function upsertScore(
  db: SupabaseLike,
  score: { prediction_id: string; points: number; reason: string }
): Promise<void> {
  const { error } = await db.from("scores").upsert(score, { onConflict: "prediction_id" });
  if (error) throw error;
}
