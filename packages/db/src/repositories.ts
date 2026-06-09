/**
 * Purpose: Small repository helpers used by cron jobs and future API routes.
 * Keeping DB calls here prevents prediction/scoring jobs from depending on table details.
 */
import type {
  BenchmarkPredictionIdentity,
  BenchmarkPredictionRow,
  MatchRow,
  ModelRow,
  NewBenchmarkPredictionRow,
  NewPredictionEvaluationRow,
  PredictionEvaluationRow,
  PredictionRow
} from "./types";
import type { SqliteDb } from "./sqlite";
import { randomUUID } from "node:crypto";

export async function upsertModels(db: SqliteDb, models: ModelRow[]): Promise<void> {
  const statement = db.prepare(`
    insert into models (
      id,
      name,
      provider,
      active,
      model_version,
      model_family,
      supports_tool_access,
      is_open_weight
    )
    values (
      @id,
      @name,
      @provider,
      @active,
      @model_version,
      @model_family,
      @supports_tool_access,
      @is_open_weight
    )
    on conflict(id) do update set
      name = excluded.name,
      provider = excluded.provider,
      active = excluded.active,
      model_version = excluded.model_version,
      model_family = excluded.model_family,
      supports_tool_access = excluded.supports_tool_access,
      is_open_weight = excluded.is_open_weight
  `);

  const transaction = db.transaction((rows: ModelRow[]) => {
    for (const model of rows) {
      statement.run({
        ...model,
        active: model.active ? 1 : 0,
        model_version: model.model_version ?? null,
        model_family: model.model_family ?? null,
        supports_tool_access: toNullableInteger(model.supports_tool_access),
        is_open_weight: toNullableInteger(model.is_open_weight)
      });
    }
  });

  transaction(models);
}

export async function upsertMatches(db: SqliteDb, matches: MatchRow[]): Promise<void> {
  const statement = db.prepare(`
    insert into matches (
      id,
      utc_date,
      competition,
      home_team,
      away_team,
      venue,
      status,
      home_score,
      away_score,
      source,
      source_match_id,
      tournament_edition,
      stage,
      group_name,
      matchday,
      is_knockout,
      updated_at
    )
    values (
      @id,
      @utc_date,
      @competition,
      @home_team,
      @away_team,
      @venue,
      @status,
      @home_score,
      @away_score,
      @source,
      @source_match_id,
      @tournament_edition,
      @stage,
      @group_name,
      @matchday,
      @is_knockout,
      current_timestamp
    )
    on conflict(id) do update set
      utc_date = excluded.utc_date,
      competition = excluded.competition,
      home_team = excluded.home_team,
      away_team = excluded.away_team,
      venue = excluded.venue,
      status = excluded.status,
      home_score = excluded.home_score,
      away_score = excluded.away_score,
      source = excluded.source,
      source_match_id = excluded.source_match_id,
      tournament_edition = excluded.tournament_edition,
      stage = excluded.stage,
      group_name = excluded.group_name,
      matchday = excluded.matchday,
      is_knockout = excluded.is_knockout,
      updated_at = current_timestamp
  `);

  const transaction = db.transaction((rows: MatchRow[]) => {
    for (const match of rows) {
      statement.run(toMatchParams(match));
    }
  });

  transaction(matches);
}

export async function listTodayMatches(db: SqliteDb, date = new Date()): Promise<MatchRow[]> {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return db.prepare(`
    select
      id,
      utc_date,
      competition,
      home_team,
      away_team,
      venue,
      status,
      home_score,
      away_score,
      source,
      source_match_id,
      tournament_edition,
      stage,
      group_name,
      matchday,
      is_knockout
    from matches
    where utc_date >= ? and utc_date < ?
    order by utc_date asc
  `).all(start.toISOString(), end.toISOString()) as MatchRow[];
}

export async function listMatches(db: SqliteDb): Promise<MatchRow[]> {
  return db.prepare(`
    select
      id,
      utc_date,
      competition,
      home_team,
      away_team,
      venue,
      status,
      home_score,
      away_score,
      source,
      source_match_id,
      tournament_edition,
      stage,
      group_name,
      matchday,
      is_knockout
    from matches
    order by utc_date asc
  `).all() as MatchRow[];
}

export async function listUpcomingMatches(db: SqliteDb, limit = 1, from = new Date()): Promise<MatchRow[]> {
  return db.prepare(`
    select
      id,
      utc_date,
      competition,
      home_team,
      away_team,
      venue,
      status,
      home_score,
      away_score,
      source,
      source_match_id,
      tournament_edition,
      stage,
      group_name,
      matchday,
      is_knockout
    from matches
    where utc_date >= ?
      and status in ('SCHEDULED', 'TIMED')
    order by utc_date asc
    limit ?
  `).all(from.toISOString(), limit) as MatchRow[];
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

export async function upsertBenchmarkPrediction(
  db: SqliteDb,
  prediction: NewBenchmarkPredictionRow
): Promise<string> {
  const id = prediction.id ?? randomUUID();

  db.prepare(`
    insert into benchmark_predictions (
      id,
      run_id,
      match_id,
      predictor_type,
      predictor_id,
      provider,
      model_id,
      model_version,
      access_condition,
      prompt_strategy,
      forecast_horizon,
      sample_id,
      scheduled_prediction_time_utc,
      actual_prediction_time_utc,
      kickoff_time_utc,
      minutes_before_kickoff,
      timing_status,
      prompt_template_id,
      prompt_hash,
      raw_prompt,
      raw_response,
      response_id,
      temperature,
      top_p,
      max_tokens,
      latency_ms,
      input_tokens,
      output_tokens,
      cost_usd,
      home_win_90_prob,
      draw_90_prob,
      away_win_90_prob,
      expected_home_goals_90,
      expected_away_goals_90,
      most_likely_score_90_home,
      most_likely_score_90_away,
      home_win_full_prob,
      draw_full_prob,
      away_win_full_prob,
      most_likely_score_full_home,
      most_likely_score_full_away,
      home_advances_prob,
      away_advances_prob,
      confidence,
      reason,
      validation_status,
      is_valid_for_scoring,
      repair_attempted,
      repair_raw_response,
      normalization_applied,
      normalized_fields,
      validation_errors,
      prob_sum_90_original,
      prob_sum_90_final,
      prob_sum_full_original,
      prob_sum_full_final,
      prob_sum_advancement_original,
      prob_sum_advancement_final,
      tools_enabled,
      tool_type,
      tool_calls_observed,
      num_tool_calls,
      tool_trace_available,
      tool_trace,
      open_book_compliance,
      updated_at
    )
    values (
      @id,
      @run_id,
      @match_id,
      @predictor_type,
      @predictor_id,
      @provider,
      @model_id,
      @model_version,
      @access_condition,
      @prompt_strategy,
      @forecast_horizon,
      @sample_id,
      @scheduled_prediction_time_utc,
      @actual_prediction_time_utc,
      @kickoff_time_utc,
      @minutes_before_kickoff,
      @timing_status,
      @prompt_template_id,
      @prompt_hash,
      @raw_prompt,
      @raw_response,
      @response_id,
      @temperature,
      @top_p,
      @max_tokens,
      @latency_ms,
      @input_tokens,
      @output_tokens,
      @cost_usd,
      @home_win_90_prob,
      @draw_90_prob,
      @away_win_90_prob,
      @expected_home_goals_90,
      @expected_away_goals_90,
      @most_likely_score_90_home,
      @most_likely_score_90_away,
      @home_win_full_prob,
      @draw_full_prob,
      @away_win_full_prob,
      @most_likely_score_full_home,
      @most_likely_score_full_away,
      @home_advances_prob,
      @away_advances_prob,
      @confidence,
      @reason,
      @validation_status,
      @is_valid_for_scoring,
      @repair_attempted,
      @repair_raw_response,
      @normalization_applied,
      @normalized_fields,
      @validation_errors,
      @prob_sum_90_original,
      @prob_sum_90_final,
      @prob_sum_full_original,
      @prob_sum_full_final,
      @prob_sum_advancement_original,
      @prob_sum_advancement_final,
      @tools_enabled,
      @tool_type,
      @tool_calls_observed,
      @num_tool_calls,
      @tool_trace_available,
      @tool_trace,
      @open_book_compliance,
      current_timestamp
    )
    on conflict(
      match_id,
      predictor_type,
      predictor_id,
      forecast_horizon,
      access_condition,
      prompt_strategy,
      sample_id
    ) do update set
      run_id = excluded.run_id,
      provider = excluded.provider,
      model_id = excluded.model_id,
      model_version = excluded.model_version,
      scheduled_prediction_time_utc = excluded.scheduled_prediction_time_utc,
      actual_prediction_time_utc = excluded.actual_prediction_time_utc,
      kickoff_time_utc = excluded.kickoff_time_utc,
      minutes_before_kickoff = excluded.minutes_before_kickoff,
      timing_status = excluded.timing_status,
      prompt_template_id = excluded.prompt_template_id,
      prompt_hash = excluded.prompt_hash,
      raw_prompt = excluded.raw_prompt,
      raw_response = excluded.raw_response,
      response_id = excluded.response_id,
      temperature = excluded.temperature,
      top_p = excluded.top_p,
      max_tokens = excluded.max_tokens,
      latency_ms = excluded.latency_ms,
      input_tokens = excluded.input_tokens,
      output_tokens = excluded.output_tokens,
      cost_usd = excluded.cost_usd,
      home_win_90_prob = excluded.home_win_90_prob,
      draw_90_prob = excluded.draw_90_prob,
      away_win_90_prob = excluded.away_win_90_prob,
      expected_home_goals_90 = excluded.expected_home_goals_90,
      expected_away_goals_90 = excluded.expected_away_goals_90,
      most_likely_score_90_home = excluded.most_likely_score_90_home,
      most_likely_score_90_away = excluded.most_likely_score_90_away,
      home_win_full_prob = excluded.home_win_full_prob,
      draw_full_prob = excluded.draw_full_prob,
      away_win_full_prob = excluded.away_win_full_prob,
      most_likely_score_full_home = excluded.most_likely_score_full_home,
      most_likely_score_full_away = excluded.most_likely_score_full_away,
      home_advances_prob = excluded.home_advances_prob,
      away_advances_prob = excluded.away_advances_prob,
      confidence = excluded.confidence,
      reason = excluded.reason,
      validation_status = excluded.validation_status,
      is_valid_for_scoring = excluded.is_valid_for_scoring,
      repair_attempted = excluded.repair_attempted,
      repair_raw_response = excluded.repair_raw_response,
      normalization_applied = excluded.normalization_applied,
      normalized_fields = excluded.normalized_fields,
      validation_errors = excluded.validation_errors,
      prob_sum_90_original = excluded.prob_sum_90_original,
      prob_sum_90_final = excluded.prob_sum_90_final,
      prob_sum_full_original = excluded.prob_sum_full_original,
      prob_sum_full_final = excluded.prob_sum_full_final,
      prob_sum_advancement_original = excluded.prob_sum_advancement_original,
      prob_sum_advancement_final = excluded.prob_sum_advancement_final,
      tools_enabled = excluded.tools_enabled,
      tool_type = excluded.tool_type,
      tool_calls_observed = excluded.tool_calls_observed,
      num_tool_calls = excluded.num_tool_calls,
      tool_trace_available = excluded.tool_trace_available,
      tool_trace = excluded.tool_trace,
      open_book_compliance = excluded.open_book_compliance,
      updated_at = current_timestamp
  `).run(toBenchmarkPredictionParams({ ...prediction, id }));

  const row = db.prepare(`
    select id
    from benchmark_predictions
    where match_id = @match_id
      and predictor_type = @predictor_type
      and predictor_id = @predictor_id
      and forecast_horizon = @forecast_horizon
      and access_condition = @access_condition
      and prompt_strategy = @prompt_strategy
      and sample_id = @sample_id
  `).get({
    match_id: prediction.match_id,
    predictor_type: prediction.predictor_type,
    predictor_id: prediction.predictor_id,
    forecast_horizon: prediction.forecast_horizon,
    access_condition: prediction.access_condition,
    prompt_strategy: prediction.prompt_strategy,
    sample_id: prediction.sample_id
  }) as { id: string } | undefined;

  return row?.id ?? id;
}

export async function getBenchmarkPredictionById(
  db: SqliteDb,
  predictionId: string
): Promise<BenchmarkPredictionRow | null> {
  const row = db.prepare(`
    select *
    from benchmark_predictions
    where id = ?
  `).get(predictionId) as BenchmarkPredictionDbRow | undefined;

  return row ? parseBenchmarkPredictionRow(row) : null;
}

export async function upsertPredictionEvaluation(
  db: SqliteDb,
  evaluation: NewPredictionEvaluationRow
): Promise<string> {
  const id = evaluation.id ?? randomUUID();

  db.prepare(`
    insert into prediction_evaluations (
      id,
      prediction_id,
      actual_result_90,
      actual_result_full,
      actual_advancer,
      predicted_result_90_from_probs,
      predicted_result_90_from_score,
      predicted_result_full_from_probs,
      brier_90,
      log_loss_90,
      top_outcome_correct_90,
      exact_score_90_correct,
      goal_difference_90_correct,
      tendency_90_correct_from_score,
      home_goal_abs_error_90,
      away_goal_abs_error_90,
      total_goals_abs_error_90,
      goal_difference_abs_error_90,
      kicktipp_points_90,
      advancement_brier,
      advancement_log_loss,
      advancement_accuracy,
      score_result_matches_prob_argmax_90,
      score_result_matches_prob_argmax_full,
      expected_goals_score_distance,
      evaluated_at_utc
    )
    values (
      @id,
      @prediction_id,
      @actual_result_90,
      @actual_result_full,
      @actual_advancer,
      @predicted_result_90_from_probs,
      @predicted_result_90_from_score,
      @predicted_result_full_from_probs,
      @brier_90,
      @log_loss_90,
      @top_outcome_correct_90,
      @exact_score_90_correct,
      @goal_difference_90_correct,
      @tendency_90_correct_from_score,
      @home_goal_abs_error_90,
      @away_goal_abs_error_90,
      @total_goals_abs_error_90,
      @goal_difference_abs_error_90,
      @kicktipp_points_90,
      @advancement_brier,
      @advancement_log_loss,
      @advancement_accuracy,
      @score_result_matches_prob_argmax_90,
      @score_result_matches_prob_argmax_full,
      @expected_goals_score_distance,
      @evaluated_at_utc
    )
    on conflict(prediction_id) do update set
      actual_result_90 = excluded.actual_result_90,
      actual_result_full = excluded.actual_result_full,
      actual_advancer = excluded.actual_advancer,
      predicted_result_90_from_probs = excluded.predicted_result_90_from_probs,
      predicted_result_90_from_score = excluded.predicted_result_90_from_score,
      predicted_result_full_from_probs = excluded.predicted_result_full_from_probs,
      brier_90 = excluded.brier_90,
      log_loss_90 = excluded.log_loss_90,
      top_outcome_correct_90 = excluded.top_outcome_correct_90,
      exact_score_90_correct = excluded.exact_score_90_correct,
      goal_difference_90_correct = excluded.goal_difference_90_correct,
      tendency_90_correct_from_score = excluded.tendency_90_correct_from_score,
      home_goal_abs_error_90 = excluded.home_goal_abs_error_90,
      away_goal_abs_error_90 = excluded.away_goal_abs_error_90,
      total_goals_abs_error_90 = excluded.total_goals_abs_error_90,
      goal_difference_abs_error_90 = excluded.goal_difference_abs_error_90,
      kicktipp_points_90 = excluded.kicktipp_points_90,
      advancement_brier = excluded.advancement_brier,
      advancement_log_loss = excluded.advancement_log_loss,
      advancement_accuracy = excluded.advancement_accuracy,
      score_result_matches_prob_argmax_90 = excluded.score_result_matches_prob_argmax_90,
      score_result_matches_prob_argmax_full = excluded.score_result_matches_prob_argmax_full,
      expected_goals_score_distance = excluded.expected_goals_score_distance,
      evaluated_at_utc = excluded.evaluated_at_utc
  `).run(toPredictionEvaluationParams({ ...evaluation, id }));

  const row = db.prepare(`
    select id
    from prediction_evaluations
    where prediction_id = ?
  `).get(evaluation.prediction_id) as { id: string } | undefined;

  return row?.id ?? id;
}

export async function getPredictionEvaluationByPredictionId(
  db: SqliteDb,
  predictionId: string
): Promise<PredictionEvaluationRow | null> {
  const row = db.prepare(`
    select *
    from prediction_evaluations
    where prediction_id = ?
  `).get(predictionId) as PredictionEvaluationRow | undefined;

  return row ?? null;
}

export async function listFinishedPredictions(
  db: SqliteDb,
  options: { includeAlreadyScored?: boolean } = {}
): Promise<Array<PredictionRow & { matches: MatchRow }>> {
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
      m.venue,
      m.status,
      m.home_score,
      m.away_score
    from predictions p
    inner join matches m on m.id = p.match_id
    left join scores s on s.prediction_id = p.id
    where m.status = 'FINISHED'
      and m.home_score is not null
      and m.away_score is not null
      and (? = 1 or s.id is null)
  `).all(options.includeAlreadyScored ? 1 : 0) as Array<{
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
    venue: string | null;
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
      venue: row.venue,
      status: row.status,
      home_score: row.home_score,
      away_score: row.away_score
    }
  }));
}

export async function listUnscoredFinishedPredictions(db: SqliteDb): Promise<Array<PredictionRow & { matches: MatchRow }>> {
  return listFinishedPredictions(db, { includeAlreadyScored: false });
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

type MatchParams = MatchRow & {
  source: string | null;
  source_match_id: string | null;
  tournament_edition: string | null;
  stage: string | null;
  group_name: string | null;
  matchday: number | null;
  is_knockout: number;
};

type BenchmarkPredictionDbRow = Omit<
  BenchmarkPredictionRow,
  "raw_response" | "repair_raw_response" | "normalized_fields" | "validation_errors" | "tool_trace"
> & {
  raw_response: string;
  repair_raw_response: string | null;
  normalized_fields: string;
  validation_errors: string;
  tool_trace: string | null;
};

type BenchmarkPredictionParams = Required<Pick<NewBenchmarkPredictionRow, "id">> & BenchmarkPredictionIdentity & {
  run_id: string | null;
  scheduled_prediction_time_utc: string | null;
  actual_prediction_time_utc: string | null;
  kickoff_time_utc: string | null;
  minutes_before_kickoff: number | null;
  timing_status: string | null;
  prompt_template_id: string | null;
  prompt_hash: string | null;
  raw_prompt: string | null;
  raw_response: string;
  response_id: string | null;
  temperature: number | null;
  top_p: number | null;
  max_tokens: number | null;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  home_win_90_prob: number | null;
  draw_90_prob: number | null;
  away_win_90_prob: number | null;
  expected_home_goals_90: number | null;
  expected_away_goals_90: number | null;
  most_likely_score_90_home: number | null;
  most_likely_score_90_away: number | null;
  home_win_full_prob: number | null;
  draw_full_prob: number | null;
  away_win_full_prob: number | null;
  most_likely_score_full_home: number | null;
  most_likely_score_full_away: number | null;
  home_advances_prob: number | null;
  away_advances_prob: number | null;
  confidence: number | null;
  reason: string | null;
  validation_status: string | null;
  is_valid_for_scoring: number;
  repair_attempted: number;
  repair_raw_response: string | null;
  normalization_applied: number;
  normalized_fields: string;
  validation_errors: string;
  prob_sum_90_original: number | null;
  prob_sum_90_final: number | null;
  prob_sum_full_original: number | null;
  prob_sum_full_final: number | null;
  prob_sum_advancement_original: number | null;
  prob_sum_advancement_final: number | null;
  tools_enabled: number;
  tool_type: string | null;
  tool_calls_observed: number | null;
  num_tool_calls: number | null;
  tool_trace_available: number;
  tool_trace: string | null;
  open_book_compliance: string;
};

function toMatchParams(match: MatchRow): MatchParams {
  return {
    ...match,
    source: match.source ?? null,
    source_match_id: match.source_match_id ?? null,
    tournament_edition: match.tournament_edition ?? null,
    stage: match.stage ?? null,
    group_name: match.group_name ?? null,
    matchday: match.matchday ?? null,
    is_knockout: toInteger(match.is_knockout)
  };
}

function toBenchmarkPredictionParams(
  prediction: NewBenchmarkPredictionRow & { id: string }
): BenchmarkPredictionParams {
  return {
    id: prediction.id,
    run_id: prediction.run_id ?? null,
    match_id: prediction.match_id,
    predictor_type: prediction.predictor_type,
    predictor_id: prediction.predictor_id,
    provider: prediction.provider,
    model_id: prediction.model_id ?? null,
    model_version: prediction.model_version ?? null,
    access_condition: prediction.access_condition,
    prompt_strategy: prediction.prompt_strategy,
    forecast_horizon: prediction.forecast_horizon,
    sample_id: prediction.sample_id,
    scheduled_prediction_time_utc: prediction.scheduled_prediction_time_utc ?? null,
    actual_prediction_time_utc: prediction.actual_prediction_time_utc ?? null,
    kickoff_time_utc: prediction.kickoff_time_utc ?? null,
    minutes_before_kickoff: prediction.minutes_before_kickoff ?? null,
    timing_status: prediction.timing_status ?? null,
    prompt_template_id: prediction.prompt_template_id ?? null,
    prompt_hash: prediction.prompt_hash ?? null,
    raw_prompt: prediction.raw_prompt ?? null,
    raw_response: serializeJson(prediction.raw_response),
    response_id: prediction.response_id ?? null,
    temperature: prediction.temperature ?? null,
    top_p: prediction.top_p ?? null,
    max_tokens: prediction.max_tokens ?? null,
    latency_ms: prediction.latency_ms ?? null,
    input_tokens: prediction.input_tokens ?? null,
    output_tokens: prediction.output_tokens ?? null,
    cost_usd: prediction.cost_usd ?? null,
    home_win_90_prob: prediction.home_win_90_prob ?? null,
    draw_90_prob: prediction.draw_90_prob ?? null,
    away_win_90_prob: prediction.away_win_90_prob ?? null,
    expected_home_goals_90: prediction.expected_home_goals_90 ?? null,
    expected_away_goals_90: prediction.expected_away_goals_90 ?? null,
    most_likely_score_90_home: prediction.most_likely_score_90_home ?? null,
    most_likely_score_90_away: prediction.most_likely_score_90_away ?? null,
    home_win_full_prob: prediction.home_win_full_prob ?? null,
    draw_full_prob: prediction.draw_full_prob ?? null,
    away_win_full_prob: prediction.away_win_full_prob ?? null,
    most_likely_score_full_home: prediction.most_likely_score_full_home ?? null,
    most_likely_score_full_away: prediction.most_likely_score_full_away ?? null,
    home_advances_prob: prediction.home_advances_prob ?? null,
    away_advances_prob: prediction.away_advances_prob ?? null,
    confidence: prediction.confidence ?? null,
    reason: prediction.reason ?? null,
    validation_status: prediction.validation_status ?? null,
    is_valid_for_scoring: toInteger(prediction.is_valid_for_scoring),
    repair_attempted: toInteger(prediction.repair_attempted),
    repair_raw_response: serializeNullableJson(prediction.repair_raw_response),
    normalization_applied: toInteger(prediction.normalization_applied),
    normalized_fields: serializeJson(prediction.normalized_fields ?? []),
    validation_errors: serializeJson(prediction.validation_errors ?? []),
    prob_sum_90_original: prediction.prob_sum_90_original ?? null,
    prob_sum_90_final: prediction.prob_sum_90_final ?? null,
    prob_sum_full_original: prediction.prob_sum_full_original ?? null,
    prob_sum_full_final: prediction.prob_sum_full_final ?? null,
    prob_sum_advancement_original: prediction.prob_sum_advancement_original ?? null,
    prob_sum_advancement_final: prediction.prob_sum_advancement_final ?? null,
    tools_enabled: toInteger(prediction.tools_enabled),
    tool_type: prediction.tool_type ?? null,
    tool_calls_observed: toNullableInteger(prediction.tool_calls_observed),
    num_tool_calls: prediction.num_tool_calls ?? null,
    tool_trace_available: toInteger(prediction.tool_trace_available),
    tool_trace: serializeNullableJson(prediction.tool_trace),
    open_book_compliance: prediction.open_book_compliance ?? "not_applicable"
  };
}

function toPredictionEvaluationParams(
  evaluation: NewPredictionEvaluationRow & { id: string }
): Record<string, string | number | null> {
  return {
    id: evaluation.id,
    prediction_id: evaluation.prediction_id,
    actual_result_90: evaluation.actual_result_90 ?? null,
    actual_result_full: evaluation.actual_result_full ?? null,
    actual_advancer: evaluation.actual_advancer ?? null,
    predicted_result_90_from_probs: evaluation.predicted_result_90_from_probs ?? null,
    predicted_result_90_from_score: evaluation.predicted_result_90_from_score ?? null,
    predicted_result_full_from_probs: evaluation.predicted_result_full_from_probs ?? null,
    brier_90: evaluation.brier_90 ?? null,
    log_loss_90: evaluation.log_loss_90 ?? null,
    top_outcome_correct_90: toNullableInteger(evaluation.top_outcome_correct_90),
    exact_score_90_correct: toNullableInteger(evaluation.exact_score_90_correct),
    goal_difference_90_correct: toNullableInteger(evaluation.goal_difference_90_correct),
    tendency_90_correct_from_score: toNullableInteger(evaluation.tendency_90_correct_from_score),
    home_goal_abs_error_90: evaluation.home_goal_abs_error_90 ?? null,
    away_goal_abs_error_90: evaluation.away_goal_abs_error_90 ?? null,
    total_goals_abs_error_90: evaluation.total_goals_abs_error_90 ?? null,
    goal_difference_abs_error_90: evaluation.goal_difference_abs_error_90 ?? null,
    kicktipp_points_90: evaluation.kicktipp_points_90 ?? null,
    advancement_brier: evaluation.advancement_brier ?? null,
    advancement_log_loss: evaluation.advancement_log_loss ?? null,
    advancement_accuracy: toNullableInteger(evaluation.advancement_accuracy),
    score_result_matches_prob_argmax_90: toNullableInteger(evaluation.score_result_matches_prob_argmax_90),
    score_result_matches_prob_argmax_full: toNullableInteger(evaluation.score_result_matches_prob_argmax_full),
    expected_goals_score_distance: evaluation.expected_goals_score_distance ?? null,
    evaluated_at_utc: evaluation.evaluated_at_utc ?? new Date().toISOString()
  };
}

function parseBenchmarkPredictionRow(row: BenchmarkPredictionDbRow): BenchmarkPredictionRow {
  return {
    ...row,
    raw_response: parseJson(row.raw_response),
    repair_raw_response: row.repair_raw_response ? parseJson(row.repair_raw_response) : null,
    normalized_fields: parseJson(row.normalized_fields),
    validation_errors: parseJson(row.validation_errors),
    tool_trace: row.tool_trace ? parseJson(row.tool_trace) : null
  };
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function serializeNullableJson(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return serializeJson(value);
}

function toInteger(value: boolean | number | null | undefined): number {
  return value ? 1 : 0;
}

function toNullableInteger(value: boolean | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return toInteger(value);
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
