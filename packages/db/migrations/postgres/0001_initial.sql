create table if not exists schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists models (
  id text primary key,
  name text not null,
  provider text not null,
  active boolean not null default true,
  model_version text,
  model_family text,
  supports_tool_access boolean,
  is_open_weight boolean,
  created_at timestamptz not null default now()
);

create table if not exists matches (
  id text primary key,
  utc_date timestamptz not null,
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
  source text,
  source_match_id text,
  tournament_edition text,
  stage text,
  group_name text,
  matchday integer,
  is_knockout boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists predictions (
  id text primary key,
  match_id text not null references matches(id) on delete cascade,
  model_id text not null references models(id) on delete cascade,
  predicted_home integer not null,
  predicted_away integer not null,
  confidence double precision,
  reason text,
  raw_response text not null,
  created_at timestamptz not null default now(),
  unique (match_id, model_id)
);

create table if not exists scores (
  id text primary key,
  prediction_id text not null references predictions(id) on delete cascade,
  points integer not null,
  reason text not null,
  scored_at timestamptz not null default now(),
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
  scheduled_prediction_time_utc timestamptz,
  actual_prediction_time_utc timestamptz,
  kickoff_time_utc timestamptz,
  minutes_before_kickoff integer,
  timing_status text check (timing_status is null or timing_status in ('on_time', 'early', 'late', 'missed', 'fallback')),
  prompt_template_id text,
  prompt_hash text,
  raw_prompt text,
  raw_response text not null,
  response_id text,
  temperature double precision,
  top_p double precision,
  max_tokens integer,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  cost_usd double precision,
  home_win_90_prob double precision,
  draw_90_prob double precision,
  away_win_90_prob double precision,
  expected_home_goals_90 double precision,
  expected_away_goals_90 double precision,
  most_likely_score_90_home integer,
  most_likely_score_90_away integer,
  home_win_full_prob double precision,
  draw_full_prob double precision,
  away_win_full_prob double precision,
  most_likely_score_full_home integer,
  most_likely_score_full_away integer,
  home_advances_prob double precision,
  away_advances_prob double precision,
  confidence double precision,
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
  is_valid_for_scoring boolean not null default false,
  repair_attempted boolean not null default false,
  repair_raw_response text,
  normalization_applied boolean not null default false,
  normalized_fields jsonb not null default '[]'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  prob_sum_90_original double precision,
  prob_sum_90_final double precision,
  prob_sum_full_original double precision,
  prob_sum_full_final double precision,
  prob_sum_advancement_original double precision,
  prob_sum_advancement_final double precision,
  tools_enabled boolean not null default false,
  tool_type text,
  tool_calls_observed integer,
  num_tool_calls integer,
  tool_trace_available boolean not null default false,
  tool_trace jsonb,
  open_book_compliance text not null default 'not_applicable' check (
    open_book_compliance in ('observed_search', 'no_observed_search', 'unknown', 'not_applicable')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
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
  brier_90 double precision,
  log_loss_90 double precision,
  top_outcome_correct_90 boolean,
  exact_score_90_correct boolean,
  goal_difference_90_correct boolean,
  tendency_90_correct_from_score boolean,
  home_goal_abs_error_90 integer,
  away_goal_abs_error_90 integer,
  total_goals_abs_error_90 integer,
  goal_difference_abs_error_90 integer,
  kicktipp_points_90 integer,
  advancement_brier double precision,
  advancement_log_loss double precision,
  advancement_accuracy boolean,
  score_result_matches_prob_argmax_90 boolean,
  score_result_matches_prob_argmax_full boolean,
  expected_goals_score_distance double precision,
  evaluated_at_utc timestamptz not null default now(),
  unique (prediction_id)
);

create table if not exists special_prediction_runs (
  id text primary key,
  forecast_horizon text not null check (forecast_horizon in ('T_24H', 'T_2H', 'STAGE_OPENING')),
  sample_id integer not null default 1,
  started_at_utc timestamptz not null,
  created_at timestamptz not null default now()
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
  actual_prediction_time_utc timestamptz,
  prompt_template_id text,
  prompt_hash text,
  raw_prompt text,
  raw_response text not null,
  parsed_response jsonb,
  response_id text,
  temperature double precision,
  top_p double precision,
  max_tokens integer,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  cost_usd double precision,
  final_pick text,
  final_picks jsonb not null default '[]'::jsonb,
  confidence double precision,
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
  is_valid_for_scoring boolean not null default false,
  repair_attempted boolean not null default false,
  repair_raw_response text,
  normalization_applied boolean not null default false,
  normalized_fields jsonb not null default '[]'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  probability_sum_original double precision,
  probability_sum_final double precision,
  tools_enabled boolean not null default false,
  tool_type text,
  tool_calls_observed integer,
  num_tool_calls integer,
  tool_trace_available boolean not null default false,
  tool_trace jsonb,
  open_book_compliance text not null default 'not_applicable' check (
    open_book_compliance in ('observed_search', 'no_observed_search', 'unknown', 'not_applicable')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
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
  probability double precision not null,
  rank integer not null,
  is_final_pick boolean not null default false,
  created_at timestamptz not null default now(),
  unique (prediction_id, candidate_id)
);

create table if not exists scheduler_locks (
  lock_key text primary key,
  owner text not null,
  acquired_at_utc timestamptz not null,
  expires_at_utc timestamptz not null,
  updated_at_utc timestamptz not null default now()
);

create table if not exists job_attempts (
  id text primary key,
  queue_name text not null,
  job_name text not null,
  idempotency_key text not null,
  payload_hash text not null,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  attempt integer not null default 1,
  provider_response_id text,
  error_message text,
  error_stack text,
  started_at_utc timestamptz,
  finished_at_utc timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (queue_name, idempotency_key, attempt)
);

create table if not exists backup_artifacts (
  id text primary key,
  artifact_type text not null check (artifact_type in ('postgres_dump', 'logical_export', 'legacy_archive')),
  storage_url text not null,
  bytes bigint not null,
  sha256 text not null,
  schema_version text,
  created_at_utc timestamptz not null default now()
);

create table if not exists backup_verifications (
  id text primary key,
  artifact_id text not null references backup_artifacts(id) on delete cascade,
  status text not null check (status in ('succeeded', 'failed')),
  verified_at_utc timestamptz not null default now(),
  row_counts jsonb not null default '{}'::jsonb,
  error_message text
);

create index if not exists idx_matches_utc_date on matches(utc_date);
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
create index if not exists idx_job_attempts_status on job_attempts(status, created_at);
create index if not exists idx_backup_artifacts_created on backup_artifacts(created_at_utc);
