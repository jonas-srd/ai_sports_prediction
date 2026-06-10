/**
 * Purpose: Exports reproducible World Cup 2026 benchmark datasets for paper analysis.
 */
import "../load-env";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSqliteDb, getDefaultDbPath } from "@llm-kicktipp/db";
import type { SqliteDb } from "@llm-kicktipp/db";

type ExportRow = Record<string, unknown>;

const RAW_PREDICTION_HEADERS = [
  "prediction_id",
  "run_id",
  "match_id",
  "source_match_id",
  "match_utc_date",
  "competition",
  "tournament_edition",
  "stage",
  "group_name",
  "home_team",
  "away_team",
  "venue",
  "is_knockout",
  "predictor_type",
  "predictor_id",
  "provider",
  "model_id",
  "model_name",
  "model_provider",
  "model_version",
  "model_family",
  "supports_tool_access",
  "is_open_weight",
  "access_condition",
  "prompt_strategy",
  "forecast_horizon",
  "sample_id",
  "scheduled_prediction_time_utc",
  "actual_prediction_time_utc",
  "kickoff_time_utc",
  "minutes_before_kickoff",
  "timing_status",
  "prompt_template_id",
  "prompt_hash",
  "raw_prompt_sha256",
  "raw_prompt",
  "raw_response_sha256",
  "raw_response",
  "repair_raw_response_sha256",
  "repair_raw_response",
  "response_id",
  "temperature",
  "top_p",
  "max_tokens",
  "latency_ms",
  "input_tokens",
  "output_tokens",
  "cost_usd",
  "created_at",
  "updated_at"
];

const VALIDATED_PREDICTION_HEADERS = [
  "prediction_id",
  "run_id",
  "match_id",
  "source_match_id",
  "match_utc_date",
  "competition",
  "tournament_edition",
  "stage",
  "group_name",
  "home_team",
  "away_team",
  "venue",
  "is_knockout",
  "predictor_type",
  "predictor_id",
  "provider",
  "model_id",
  "model_name",
  "model_provider",
  "model_version",
  "model_family",
  "supports_tool_access",
  "is_open_weight",
  "access_condition",
  "prompt_strategy",
  "forecast_horizon",
  "sample_id",
  "scheduled_prediction_time_utc",
  "actual_prediction_time_utc",
  "kickoff_time_utc",
  "minutes_before_kickoff",
  "timing_status",
  "prompt_template_id",
  "prompt_hash",
  "raw_prompt_sha256",
  "raw_response_sha256",
  "response_id",
  "temperature",
  "top_p",
  "max_tokens",
  "latency_ms",
  "input_tokens",
  "output_tokens",
  "cost_usd",
  "home_win_90_prob",
  "draw_90_prob",
  "away_win_90_prob",
  "expected_home_goals_90",
  "expected_away_goals_90",
  "most_likely_score_90_home",
  "most_likely_score_90_away",
  "home_win_full_prob",
  "draw_full_prob",
  "away_win_full_prob",
  "most_likely_score_full_home",
  "most_likely_score_full_away",
  "home_advances_prob",
  "away_advances_prob",
  "confidence",
  "reason",
  "validation_status",
  "is_valid_for_scoring",
  "repair_attempted",
  "repair_raw_response_sha256",
  "normalization_applied",
  "normalized_fields",
  "validation_errors",
  "prob_sum_90_original",
  "prob_sum_90_final",
  "prob_sum_full_original",
  "prob_sum_full_final",
  "prob_sum_advancement_original",
  "prob_sum_advancement_final",
  "tools_enabled",
  "tool_type",
  "tool_calls_observed",
  "num_tool_calls",
  "tool_trace_available",
  "tool_trace_sha256",
  "open_book_compliance",
  "created_at",
  "updated_at"
];

const EVALUATION_HEADERS = [
  "prediction_id",
  "run_id",
  "match_id",
  "source_match_id",
  "match_utc_date",
  "competition",
  "tournament_edition",
  "stage",
  "group_name",
  "home_team",
  "away_team",
  "venue",
  "is_knockout",
  "predictor_type",
  "predictor_id",
  "provider",
  "model_id",
  "model_name",
  "model_provider",
  "model_version",
  "model_family",
  "access_condition",
  "prompt_strategy",
  "forecast_horizon",
  "sample_id",
  "validation_status",
  "is_valid_for_scoring",
  "actual_result_90",
  "actual_result_full",
  "actual_advancer",
  "predicted_result_90_from_probs",
  "predicted_result_90_from_score",
  "predicted_result_full_from_probs",
  "brier_90",
  "log_loss_90",
  "top_outcome_correct_90",
  "exact_score_90_correct",
  "goal_difference_90_correct",
  "tendency_90_correct_from_score",
  "home_goal_abs_error_90",
  "away_goal_abs_error_90",
  "total_goals_abs_error_90",
  "goal_difference_abs_error_90",
  "kicktipp_points_90",
  "advancement_brier",
  "advancement_log_loss",
  "advancement_accuracy",
  "score_result_matches_prob_argmax_90",
  "score_result_matches_prob_argmax_full",
  "expected_goals_score_distance",
  "prediction_created_at",
  "prediction_updated_at",
  "evaluated_at_utc"
];

const MATCH_HEADERS = [
  "match_id",
  "utc_date",
  "competition",
  "tournament_edition",
  "stage",
  "group_name",
  "matchday",
  "home_team",
  "away_team",
  "venue",
  "is_knockout",
  "status",
  "home_score",
  "away_score",
  "home_score_90",
  "away_score_90",
  "home_score_full",
  "away_score_full",
  "home_score_extra_time",
  "away_score_extra_time",
  "home_penalties",
  "away_penalties",
  "result_duration",
  "result_winner",
  "actual_advancer",
  "source",
  "source_match_id",
  "created_at",
  "updated_at"
];

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const outputDir = resolveOutputDir(options.outDir);
  const db = createSqliteDb();

  mkdirSync(outputDir, { recursive: true });

  const matches = queryMatches(db);
  const rawPredictions = withHashes(queryRawPredictions(db));
  const validatedPredictions = withHashes(queryValidatedPredictions(db));
  const evaluations = queryEvaluations(db);
  const toolLogs = withHashes(queryToolLogs(db));

  const outputs = [
    writeCsv(resolve(outputDir, "worldcup2026_matches.csv"), MATCH_HEADERS, matches),
    writeCsv(resolve(outputDir, "worldcup2026_predictions_raw.csv"), RAW_PREDICTION_HEADERS, rawPredictions),
    writeCsv(
      resolve(outputDir, "worldcup2026_predictions_validated.csv"),
      VALIDATED_PREDICTION_HEADERS,
      validatedPredictions
    ),
    writeCsv(resolve(outputDir, "worldcup2026_evaluations.csv"), EVALUATION_HEADERS, evaluations),
    writeJsonl(resolve(outputDir, "worldcup2026_tool_logs.jsonl"), toolLogs.map(toToolLogJson))
  ];

  db.close();

  console.log(`Exported World Cup 2026 paper datasets to ${outputDir}`);
  console.log(`SQLite DB: ${getDefaultDbPath()}`);
  for (const output of outputs) {
    console.log(`${output.path} (${output.rows} rows)`);
  }
}

function queryMatches(db: SqliteDb): ExportRow[] {
  return db.prepare(`
    select
      id as match_id,
      utc_date,
      competition,
      tournament_edition,
      stage,
      group_name,
      matchday,
      home_team,
      away_team,
      venue,
      is_knockout,
      status,
      home_score,
      away_score,
      home_score_90,
      away_score_90,
      home_score_full,
      away_score_full,
      home_score_extra_time,
      away_score_extra_time,
      home_penalties,
      away_penalties,
      result_duration,
      result_winner,
      actual_advancer,
      source,
      source_match_id,
      created_at,
      updated_at
    from matches
    order by utc_date asc, id asc
  `).all() as ExportRow[];
}

function queryRawPredictions(db: SqliteDb): ExportRow[] {
  return db.prepare(`
    select
      bp.id as prediction_id,
      bp.run_id,
      bp.match_id,
      m.source_match_id,
      m.utc_date as match_utc_date,
      m.competition,
      m.tournament_edition,
      m.stage,
      m.group_name,
      m.home_team,
      m.away_team,
      m.venue,
      m.is_knockout,
      bp.predictor_type,
      bp.predictor_id,
      bp.provider,
      bp.model_id,
      mo.name as model_name,
      mo.provider as model_provider,
      bp.model_version,
      mo.model_family,
      mo.supports_tool_access,
      mo.is_open_weight,
      bp.access_condition,
      bp.prompt_strategy,
      bp.forecast_horizon,
      bp.sample_id,
      bp.scheduled_prediction_time_utc,
      bp.actual_prediction_time_utc,
      bp.kickoff_time_utc,
      bp.minutes_before_kickoff,
      bp.timing_status,
      bp.prompt_template_id,
      bp.prompt_hash,
      bp.raw_prompt,
      bp.raw_response,
      bp.repair_raw_response,
      bp.response_id,
      bp.temperature,
      bp.top_p,
      bp.max_tokens,
      bp.latency_ms,
      bp.input_tokens,
      bp.output_tokens,
      bp.cost_usd,
      bp.created_at,
      bp.updated_at
    from benchmark_predictions bp
    left join matches m on m.id = bp.match_id
    left join models mo on mo.id = bp.model_id
    order by m.utc_date asc, bp.predictor_id asc, bp.forecast_horizon asc,
      bp.access_condition asc, bp.prompt_strategy asc, bp.sample_id asc
  `).all() as ExportRow[];
}

function queryValidatedPredictions(db: SqliteDb): ExportRow[] {
  return db.prepare(`
    select
      bp.id as prediction_id,
      bp.run_id,
      bp.match_id,
      m.source_match_id,
      m.utc_date as match_utc_date,
      m.competition,
      m.tournament_edition,
      m.stage,
      m.group_name,
      m.home_team,
      m.away_team,
      m.venue,
      m.is_knockout,
      bp.predictor_type,
      bp.predictor_id,
      bp.provider,
      bp.model_id,
      mo.name as model_name,
      mo.provider as model_provider,
      bp.model_version,
      mo.model_family,
      mo.supports_tool_access,
      mo.is_open_weight,
      bp.access_condition,
      bp.prompt_strategy,
      bp.forecast_horizon,
      bp.sample_id,
      bp.scheduled_prediction_time_utc,
      bp.actual_prediction_time_utc,
      bp.kickoff_time_utc,
      bp.minutes_before_kickoff,
      bp.timing_status,
      bp.prompt_template_id,
      bp.prompt_hash,
      bp.raw_prompt,
      bp.raw_response,
      bp.response_id,
      bp.temperature,
      bp.top_p,
      bp.max_tokens,
      bp.latency_ms,
      bp.input_tokens,
      bp.output_tokens,
      bp.cost_usd,
      bp.home_win_90_prob,
      bp.draw_90_prob,
      bp.away_win_90_prob,
      bp.expected_home_goals_90,
      bp.expected_away_goals_90,
      bp.most_likely_score_90_home,
      bp.most_likely_score_90_away,
      bp.home_win_full_prob,
      bp.draw_full_prob,
      bp.away_win_full_prob,
      bp.most_likely_score_full_home,
      bp.most_likely_score_full_away,
      bp.home_advances_prob,
      bp.away_advances_prob,
      bp.confidence,
      bp.reason,
      bp.validation_status,
      bp.is_valid_for_scoring,
      bp.repair_attempted,
      bp.repair_raw_response,
      bp.normalization_applied,
      bp.normalized_fields,
      bp.validation_errors,
      bp.prob_sum_90_original,
      bp.prob_sum_90_final,
      bp.prob_sum_full_original,
      bp.prob_sum_full_final,
      bp.prob_sum_advancement_original,
      bp.prob_sum_advancement_final,
      bp.tools_enabled,
      bp.tool_type,
      bp.tool_calls_observed,
      bp.num_tool_calls,
      bp.tool_trace_available,
      bp.tool_trace,
      bp.open_book_compliance,
      bp.created_at,
      bp.updated_at
    from benchmark_predictions bp
    left join matches m on m.id = bp.match_id
    left join models mo on mo.id = bp.model_id
    order by m.utc_date asc, bp.predictor_id asc, bp.forecast_horizon asc,
      bp.access_condition asc, bp.prompt_strategy asc, bp.sample_id asc
  `).all() as ExportRow[];
}

function queryEvaluations(db: SqliteDb): ExportRow[] {
  return db.prepare(`
    select
      bp.id as prediction_id,
      bp.run_id,
      bp.match_id,
      m.source_match_id,
      m.utc_date as match_utc_date,
      m.competition,
      m.tournament_edition,
      m.stage,
      m.group_name,
      m.home_team,
      m.away_team,
      m.venue,
      m.is_knockout,
      bp.predictor_type,
      bp.predictor_id,
      bp.provider,
      bp.model_id,
      mo.name as model_name,
      mo.provider as model_provider,
      bp.model_version,
      mo.model_family,
      bp.access_condition,
      bp.prompt_strategy,
      bp.forecast_horizon,
      bp.sample_id,
      bp.validation_status,
      bp.is_valid_for_scoring,
      pe.actual_result_90,
      pe.actual_result_full,
      pe.actual_advancer,
      pe.predicted_result_90_from_probs,
      pe.predicted_result_90_from_score,
      pe.predicted_result_full_from_probs,
      pe.brier_90,
      pe.log_loss_90,
      pe.top_outcome_correct_90,
      pe.exact_score_90_correct,
      pe.goal_difference_90_correct,
      pe.tendency_90_correct_from_score,
      pe.home_goal_abs_error_90,
      pe.away_goal_abs_error_90,
      pe.total_goals_abs_error_90,
      pe.goal_difference_abs_error_90,
      pe.kicktipp_points_90,
      pe.advancement_brier,
      pe.advancement_log_loss,
      pe.advancement_accuracy,
      pe.score_result_matches_prob_argmax_90,
      pe.score_result_matches_prob_argmax_full,
      pe.expected_goals_score_distance,
      bp.created_at as prediction_created_at,
      bp.updated_at as prediction_updated_at,
      pe.evaluated_at_utc
    from benchmark_predictions bp
    left join matches m on m.id = bp.match_id
    left join models mo on mo.id = bp.model_id
    left join prediction_evaluations pe on pe.prediction_id = bp.id
    order by m.utc_date asc, bp.predictor_id asc, bp.forecast_horizon asc,
      bp.access_condition asc, bp.prompt_strategy asc, bp.sample_id asc
  `).all() as ExportRow[];
}

function queryToolLogs(db: SqliteDb): ExportRow[] {
  return db.prepare(`
    select
      bp.id as prediction_id,
      bp.run_id,
      bp.match_id,
      m.source_match_id,
      m.utc_date as match_utc_date,
      m.competition,
      m.tournament_edition,
      m.stage,
      m.group_name,
      m.home_team,
      m.away_team,
      m.venue,
      m.is_knockout,
      bp.predictor_type,
      bp.predictor_id,
      bp.provider,
      bp.model_id,
      mo.name as model_name,
      mo.provider as model_provider,
      bp.model_version,
      mo.model_family,
      bp.access_condition,
      bp.prompt_strategy,
      bp.forecast_horizon,
      bp.sample_id,
      bp.prompt_hash,
      bp.raw_prompt,
      bp.raw_response,
      bp.tools_enabled,
      bp.tool_type,
      bp.tool_calls_observed,
      bp.num_tool_calls,
      bp.tool_trace_available,
      bp.tool_trace,
      bp.open_book_compliance,
      bp.validation_status,
      bp.is_valid_for_scoring,
      bp.created_at,
      bp.updated_at
    from benchmark_predictions bp
    left join matches m on m.id = bp.match_id
    left join models mo on mo.id = bp.model_id
    where bp.access_condition = 'open_book'
      or bp.tools_enabled = 1
      or bp.tool_type is not null
    order by m.utc_date asc, bp.predictor_id asc, bp.forecast_horizon asc,
      bp.access_condition asc, bp.prompt_strategy asc, bp.sample_id asc
  `).all() as ExportRow[];
}

function withHashes(rows: ExportRow[]): ExportRow[] {
  return rows.map((row) => ({
    ...row,
    raw_prompt_sha256: hashNullable(row.raw_prompt),
    raw_response_sha256: hashNullable(row.raw_response),
    repair_raw_response_sha256: hashNullable(row.repair_raw_response),
    tool_trace_sha256: hashNullable(row.tool_trace)
  }));
}

function toToolLogJson(row: ExportRow): ExportRow {
  return {
    prediction_id: row.prediction_id,
    run_id: row.run_id,
    match_id: row.match_id,
    source_match_id: row.source_match_id,
    match_utc_date: row.match_utc_date,
    competition: row.competition,
    tournament_edition: row.tournament_edition,
    stage: row.stage,
    group_name: row.group_name,
    home_team: row.home_team,
    away_team: row.away_team,
    venue: row.venue,
    is_knockout: toBooleanOrNull(row.is_knockout),
    predictor_type: row.predictor_type,
    predictor_id: row.predictor_id,
    provider: row.provider,
    model_id: row.model_id,
    model_name: row.model_name,
    model_provider: row.model_provider,
    model_version: row.model_version,
    model_family: row.model_family,
    access_condition: row.access_condition,
    prompt_strategy: row.prompt_strategy,
    forecast_horizon: row.forecast_horizon,
    sample_id: row.sample_id,
    prompt_hash: row.prompt_hash,
    raw_prompt_sha256: row.raw_prompt_sha256,
    raw_response_sha256: row.raw_response_sha256,
    tools_enabled: toBooleanOrNull(row.tools_enabled),
    tool_type: row.tool_type,
    tool_calls_observed: toBooleanOrNull(row.tool_calls_observed),
    num_tool_calls: row.num_tool_calls,
    tool_trace_available: toBooleanOrNull(row.tool_trace_available),
    tool_trace_sha256: row.tool_trace_sha256,
    tool_trace: parseJsonValue(row.tool_trace),
    open_book_compliance: row.open_book_compliance,
    validation_status: row.validation_status,
    is_valid_for_scoring: toBooleanOrNull(row.is_valid_for_scoring),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function writeCsv(path: string, headers: string[], rows: ExportRow[]): { path: string; rows: number } {
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ];

  writeFileSync(path, `${lines.join("\n")}\n`, "utf8");
  return { path, rows: rows.length };
}

function writeJsonl(path: string, rows: ExportRow[]): { path: string; rows: number } {
  const contents = rows.map((row) => JSON.stringify(row)).join("\n");
  writeFileSync(path, rows.length > 0 ? `${contents}\n` : "", "utf8");
  return { path, rows: rows.length };
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const serialized = typeof value === "string" ? value : String(value);
  if (!/[",\r\n]/.test(serialized)) {
    return serialized;
  }

  return `"${serialized.replace(/"/g, "\"\"")}"`;
}

function hashNullable(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return createHash("sha256").update(String(value)).digest("hex");
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== "string") {
    return value ?? null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toBooleanOrNull(value: unknown): boolean | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value === 0 || value === "0" || value === false) {
    return false;
  }

  if (value === 1 || value === "1" || value === true) {
    return true;
  }

  return Boolean(value);
}

function parseCliArgs(args: string[]): { outDir?: string } {
  const parsed: { outDir?: string } = {};

  for (const arg of args) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "out-dir" && value) {
      parsed.outDir = value;
    }
  }

  return parsed;
}

function resolveOutputDir(outDir?: string): string {
  if (outDir) {
    return isAbsolute(outDir) ? outDir : resolve(process.cwd(), outDir);
  }

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(currentDir, "../../../..");
  return resolve(repoRoot, "exports");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
