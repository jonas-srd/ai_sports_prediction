/**
 * Purpose: Opens and initializes the local SQLite database used by the MVP.
 * The default database file is data/world-cup.db and can be overridden with SQLITE_DB_PATH.
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type SqliteDb = Database.Database;

export function createSqliteDb(dbPath = getDefaultDbPath()): SqliteDb {
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initializeSchema(db);

  return db;
}

export function getDefaultDbPath(): string {
  if (process.env.SQLITE_DB_PATH) {
    return resolve(process.env.SQLITE_DB_PATH);
  }

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(currentDir, "../../..");

  return resolve(repoRoot, "data/world-cup.db");
}

function initializeSchema(db: SqliteDb): void {
  db.exec(`
    create table if not exists models (
      id text primary key,
      name text not null,
      provider text not null,
      active integer not null default 1,
      created_at text not null default current_timestamp
    );

    create table if not exists matches (
      id text primary key,
      utc_date text not null,
      competition text not null,
      home_team text not null,
      away_team text not null,
      venue text,
      status text not null default 'SCHEDULED',
      home_score integer,
      away_score integer,
      home_score_90 integer,
      away_score_90 integer,
      home_score_full integer,
      away_score_full integer,
      home_score_extra_time integer,
      away_score_extra_time integer,
      home_penalties integer,
      away_penalties integer,
      result_duration text,
      result_winner text check (result_winner is null or result_winner in ('home', 'draw', 'away')),
      actual_advancer text check (actual_advancer is null or actual_advancer in ('home', 'away')),
      created_at text not null default current_timestamp,
      updated_at text not null default current_timestamp
    );

    create table if not exists predictions (
      id text primary key,
      match_id text not null references matches(id) on delete cascade,
      model_id text not null references models(id) on delete cascade,
      predicted_home integer not null,
      predicted_away integer not null,
      confidence real,
      reason text,
      raw_response text not null,
      created_at text not null default current_timestamp,
      unique (match_id, model_id)
    );

    create table if not exists scores (
      id text primary key,
      prediction_id text not null references predictions(id) on delete cascade,
      points integer not null,
      reason text not null,
      scored_at text not null default current_timestamp,
      unique (prediction_id)
    );

    create table if not exists benchmark_predictions (
      id text primary key,
      run_id text,
      match_id text not null references matches(id) on delete cascade,

      predictor_type text not null check (predictor_type in ('llm', 'baseline')),
      predictor_id text not null,
      provider text not null,
      model_id text references models(id) on delete set null,
      model_version text,

      access_condition text not null check (access_condition in ('closed_book', 'open_book', 'not_applicable')),
      prompt_strategy text not null check (prompt_strategy in ('direct_score', 'probabilistic_forecast', 'not_applicable')),
      forecast_horizon text not null check (forecast_horizon in ('T_24H', 'T_2H', 'STAGE_OPENING')),
      sample_id integer not null default 1,

      scheduled_prediction_time_utc text,
      actual_prediction_time_utc text,
      kickoff_time_utc text,
      minutes_before_kickoff integer,
      timing_status text check (timing_status is null or timing_status in ('on_time', 'early', 'late', 'missed', 'fallback')),

      prompt_template_id text,
      prompt_hash text,
      raw_prompt text,
      raw_response text not null,
      response_id text,
      temperature real,
      top_p real,
      max_tokens integer,
      latency_ms integer,
      input_tokens integer,
      output_tokens integer,
      cost_usd real,

      home_win_90_prob real,
      draw_90_prob real,
      away_win_90_prob real,
      expected_home_goals_90 real,
      expected_away_goals_90 real,
      most_likely_score_90_home integer,
      most_likely_score_90_away integer,
      home_win_full_prob real,
      draw_full_prob real,
      away_win_full_prob real,
      most_likely_score_full_home integer,
      most_likely_score_full_away integer,
      home_advances_prob real,
      away_advances_prob real,
      confidence real,
      reason text,

      validation_status text check (
        validation_status is null or validation_status in (
          'valid',
          'normalized',
          'repaired',
          'repaired_and_normalized',
          'invalid_json',
          'invalid_schema',
          'invalid_probability_range',
          'invalid_probability_sum',
          'invalid_score',
          'invalid_after_repair',
          'api_error',
          'timeout'
        )
      ),
      is_valid_for_scoring integer not null default 0,
      repair_attempted integer not null default 0,
      repair_raw_response text,
      normalization_applied integer not null default 0,
      normalized_fields text not null default '[]',
      validation_errors text not null default '[]',
      prob_sum_90_original real,
      prob_sum_90_final real,
      prob_sum_full_original real,
      prob_sum_full_final real,
      prob_sum_advancement_original real,
      prob_sum_advancement_final real,

      tools_enabled integer not null default 0,
      tool_type text,
      tool_calls_observed integer,
      num_tool_calls integer,
      tool_trace_available integer not null default 0,
      tool_trace text,
      open_book_compliance text not null default 'not_applicable' check (
        open_book_compliance in ('observed_search', 'no_observed_search', 'unknown', 'not_applicable')
      ),

      created_at text not null default current_timestamp,
      updated_at text not null default current_timestamp,

      unique (
        match_id,
        predictor_type,
        predictor_id,
        forecast_horizon,
        access_condition,
        prompt_strategy,
        sample_id
      )
    );

    create table if not exists prediction_evaluations (
      id text primary key,
      prediction_id text not null references benchmark_predictions(id) on delete cascade,

      actual_result_90 text check (actual_result_90 is null or actual_result_90 in ('home', 'draw', 'away')),
      actual_result_full text check (actual_result_full is null or actual_result_full in ('home', 'draw', 'away')),
      actual_advancer text check (actual_advancer is null or actual_advancer in ('home', 'away')),
      predicted_result_90_from_probs text check (
        predicted_result_90_from_probs is null or predicted_result_90_from_probs in ('home', 'draw', 'away')
      ),
      predicted_result_90_from_score text check (
        predicted_result_90_from_score is null or predicted_result_90_from_score in ('home', 'draw', 'away')
      ),
      predicted_result_full_from_probs text check (
        predicted_result_full_from_probs is null or predicted_result_full_from_probs in ('home', 'draw', 'away')
      ),

      brier_90 real,
      log_loss_90 real,
      top_outcome_correct_90 integer,
      exact_score_90_correct integer,
      goal_difference_90_correct integer,
      tendency_90_correct_from_score integer,
      home_goal_abs_error_90 integer,
      away_goal_abs_error_90 integer,
      total_goals_abs_error_90 integer,
      goal_difference_abs_error_90 integer,
      kicktipp_points_90 integer,
      advancement_brier real,
      advancement_log_loss real,
      advancement_accuracy integer,
      score_result_matches_prob_argmax_90 integer,
      score_result_matches_prob_argmax_full integer,
      expected_goals_score_distance real,

      evaluated_at_utc text not null default current_timestamp,
      unique (prediction_id)
    );

    create table if not exists special_prediction_runs (
      id text primary key,
      forecast_horizon text not null check (forecast_horizon in ('T_24H', 'T_2H', 'STAGE_OPENING')),
      sample_id integer not null default 1,
      started_at_utc text not null,
      created_at text not null default current_timestamp
    );

    create table if not exists special_predictions (
      id text primary key,
      run_id text references special_prediction_runs(id) on delete set null,

      question_id text not null,
      question_label text not null,
      prediction_type text not null check (prediction_type in ('single_choice', 'multi_choice_fixed_k')),
      k integer,

      predictor_type text not null check (predictor_type in ('llm', 'baseline')),
      predictor_id text not null,
      provider text not null,
      model_id text references models(id) on delete set null,
      model_version text,

      access_condition text not null check (access_condition in ('closed_book', 'open_book', 'not_applicable')),
      prompt_strategy text not null check (prompt_strategy in ('direct_score', 'probabilistic_forecast', 'not_applicable')),
      forecast_horizon text not null check (forecast_horizon in ('T_24H', 'T_2H', 'STAGE_OPENING')),
      sample_id integer not null default 1,

      actual_prediction_time_utc text,
      prompt_template_id text,
      prompt_hash text,
      raw_prompt text,
      raw_response text not null,
      parsed_response text,
      response_id text,
      temperature real,
      top_p real,
      max_tokens integer,
      latency_ms integer,
      input_tokens integer,
      output_tokens integer,
      cost_usd real,

      final_pick text,
      final_picks text not null default '[]',
      confidence real,
      reasoning_summary text,

      validation_status text check (
        validation_status is null or validation_status in (
          'valid',
          'normalized',
          'repaired',
          'repaired_and_normalized',
          'invalid_json',
          'invalid_schema',
          'invalid_probability_range',
          'invalid_probability_sum',
          'invalid_candidate',
          'invalid_pick_count',
          'invalid_rank',
          'invalid_after_repair',
          'api_error',
          'timeout'
        )
      ),
      is_valid_for_scoring integer not null default 0,
      repair_attempted integer not null default 0,
      repair_raw_response text,
      normalization_applied integer not null default 0,
      normalized_fields text not null default '[]',
      validation_errors text not null default '[]',
      probability_sum_original real,
      probability_sum_final real,

      tools_enabled integer not null default 0,
      tool_type text,
      tool_calls_observed integer,
      num_tool_calls integer,
      tool_trace_available integer not null default 0,
      tool_trace text,
      open_book_compliance text not null default 'not_applicable' check (
        open_book_compliance in ('observed_search', 'no_observed_search', 'unknown', 'not_applicable')
      ),

      created_at text not null default current_timestamp,
      updated_at text not null default current_timestamp,

      unique (
        question_id,
        predictor_type,
        predictor_id,
        forecast_horizon,
        access_condition,
        prompt_strategy,
        sample_id
      )
    );

    create table if not exists special_prediction_options (
      id text primary key,
      prediction_id text not null references special_predictions(id) on delete cascade,
      question_id text not null,
      candidate_id text not null,
      candidate_label text not null,
      candidate_type text not null,
      probability real not null,
      rank integer not null,
      is_final_pick integer not null default 0,
      created_at text not null default current_timestamp,
      unique (prediction_id, candidate_id)
    );

    create table if not exists scheduler_locks (
      lock_key text primary key,
      owner text not null,
      acquired_at_utc text not null,
      expires_at_utc text not null,
      updated_at_utc text not null default current_timestamp
    );

    create index if not exists idx_scheduler_locks_expires on scheduler_locks(expires_at_utc);
  `);

  migrateForecastHorizonFromT1HToT2H(db);
  createIndexes(db);

  ensureColumn(db, "matches", "venue", "text");
  ensureColumn(db, "matches", "home_score_90", "integer");
  ensureColumn(db, "matches", "away_score_90", "integer");
  ensureColumn(db, "matches", "home_score_full", "integer");
  ensureColumn(db, "matches", "away_score_full", "integer");
  ensureColumn(db, "matches", "home_score_extra_time", "integer");
  ensureColumn(db, "matches", "away_score_extra_time", "integer");
  ensureColumn(db, "matches", "home_penalties", "integer");
  ensureColumn(db, "matches", "away_penalties", "integer");
  ensureColumn(db, "matches", "result_duration", "text");
  ensureColumn(db, "matches", "result_winner", "text check (result_winner is null or result_winner in ('home', 'draw', 'away'))");
  ensureColumn(db, "matches", "actual_advancer", "text check (actual_advancer is null or actual_advancer in ('home', 'away'))");
  ensureColumn(db, "matches", "source", "text");
  ensureColumn(db, "matches", "source_match_id", "text");
  ensureColumn(db, "matches", "tournament_edition", "text");
  ensureColumn(db, "matches", "stage", "text");
  ensureColumn(db, "matches", "group_name", "text");
  ensureColumn(db, "matches", "matchday", "integer");
  ensureColumn(db, "matches", "is_knockout", "integer not null default 0");
  ensureColumn(db, "models", "model_version", "text");
  ensureColumn(db, "models", "model_family", "text");
  ensureColumn(db, "models", "supports_tool_access", "integer");
  ensureColumn(db, "models", "is_open_weight", "integer");
  backfillLegacyGroupStageResultColumns(db);
}

function createIndexes(db: SqliteDb): void {
  db.exec(`
    create index if not exists idx_benchmark_predictions_match on benchmark_predictions(match_id);
    create index if not exists idx_benchmark_predictions_predictor on benchmark_predictions(predictor_type, predictor_id);
    create index if not exists idx_benchmark_predictions_conditions on benchmark_predictions(
      forecast_horizon,
      access_condition,
      prompt_strategy
    );
    create index if not exists idx_special_predictions_question on special_predictions(question_id);
    create index if not exists idx_special_predictions_predictor on special_predictions(predictor_type, predictor_id);
    create index if not exists idx_special_predictions_conditions on special_predictions(
      forecast_horizon,
      access_condition,
      prompt_strategy
    );
    create index if not exists idx_special_prediction_options_prediction on special_prediction_options(prediction_id);
    create index if not exists idx_scheduler_locks_expires on scheduler_locks(expires_at_utc);
  `);
}

function migrateForecastHorizonFromT1HToT2H(db: SqliteDb): void {
  const tables = ["benchmark_predictions", "special_prediction_runs", "special_predictions"];
  const oldSchemaTables = tables.filter((table) => {
    const row = db.prepare(`
      select sql
      from sqlite_master
      where type = 'table' and name = ?
    `).get(table) as { sql: string } | undefined;

    return Boolean(row?.sql.includes("'T_1H'"));
  });

  if (oldSchemaTables.length > 0) {
    const schemaVersion = db.pragma("schema_version", { simple: true }) as number;

    db.pragma("writable_schema = ON");
    try {
      for (const table of oldSchemaTables) {
        db.prepare(`
          update sqlite_master
          set sql = replace(sql, '''T_1H''', '''T_2H''')
          where type = 'table' and name = ?
        `).run(table);
      }
      db.pragma(`schema_version = ${schemaVersion + 1}`);
    } finally {
      db.pragma("writable_schema = OFF");
    }
  }

  for (const table of tables) {
    if (hasTable(db, table)) {
      db.prepare(`update ${table} set forecast_horizon = 'T_2H' where forecast_horizon = 'T_1H'`).run();
    }
  }
}

function hasTable(db: SqliteDb, table: string): boolean {
  const row = db.prepare(`
    select 1 as exists_value
    from sqlite_master
    where type = 'table' and name = ?
  `).get(table) as { exists_value: number } | undefined;

  return Boolean(row);
}

function ensureColumn(db: SqliteDb, table: string, column: string, definition: string): void {
  const columns = db.prepare(`pragma table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`alter table ${table} add column ${column} ${definition}`);
  }
}

function backfillLegacyGroupStageResultColumns(db: SqliteDb): void {
  db.exec(`
    update matches
    set
      home_score_90 = coalesce(home_score_90, home_score),
      away_score_90 = coalesce(away_score_90, away_score),
      home_score_full = coalesce(home_score_full, home_score),
      away_score_full = coalesce(away_score_full, away_score),
      result_winner = coalesce(
        result_winner,
        case
          when home_score > away_score then 'home'
          when home_score < away_score then 'away'
          when home_score = away_score then 'draw'
          else null
        end
      )
    where status = 'FINISHED'
      and coalesce(is_knockout, 0) = 0
      and (
        stage = 'group_stage'
        or group_name is not null
        or matchday is not null
      )
      and home_score is not null
      and away_score is not null
  `);
}
