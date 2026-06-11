/**
 * Purpose: Shared database row types for matches, models, predictions, and scores.
 * These types mirror the local SQLite schema and keep app and cron code aligned.
 */
export type ModelRow = {
  id: string;
  name: string;
  provider: string;
  active: boolean | number;
  model_version?: string | null;
  model_family?: string | null;
  supports_tool_access?: boolean | number | null;
  is_open_weight?: boolean | number | null;
};

export type MatchRow = {
  id: string;
  utc_date: string;
  competition: string;
  home_team: string;
  away_team: string;
  venue: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_score_90?: number | null;
  away_score_90?: number | null;
  home_score_full?: number | null;
  away_score_full?: number | null;
  home_score_extra_time?: number | null;
  away_score_extra_time?: number | null;
  home_penalties?: number | null;
  away_penalties?: number | null;
  result_duration?: string | null;
  result_winner?: MatchResultClass | null;
  actual_advancer?: AdvancerClass | null;
  source?: string | null;
  source_match_id?: string | null;
  tournament_edition?: string | null;
  stage?: string | null;
  group_name?: string | null;
  matchday?: number | null;
  is_knockout?: boolean | number | null;
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

export type PredictorType = "llm" | "baseline";

export type AccessCondition = "closed_book" | "open_book" | "not_applicable";

export type PromptStrategy = "direct_score" | "probabilistic_forecast" | "not_applicable";

export type ForecastHorizon = "T_24H" | "T_1H" | "STAGE_OPENING";

export type TimingStatus = "on_time" | "early" | "late" | "missed" | "fallback";

export type OpenBookCompliance = "observed_search" | "no_observed_search" | "unknown" | "not_applicable";

export type ValidationStatus =
  | "valid"
  | "normalized"
  | "repaired"
  | "repaired_and_normalized"
  | "invalid_json"
  | "invalid_schema"
  | "invalid_probability_range"
  | "invalid_probability_sum"
  | "invalid_score"
  | "invalid_after_repair"
  | "api_error"
  | "timeout";

export type SpecialPredictionType = "single_choice" | "multi_choice_fixed_k";

export type SpecialPredictionValidationStatus =
  | "valid"
  | "normalized"
  | "repaired"
  | "repaired_and_normalized"
  | "invalid_json"
  | "invalid_schema"
  | "invalid_probability_range"
  | "invalid_probability_sum"
  | "invalid_candidate"
  | "invalid_pick_count"
  | "invalid_rank"
  | "invalid_after_repair"
  | "api_error"
  | "timeout";

export type MatchResultClass = "home" | "draw" | "away";

export type AdvancerClass = "home" | "away";

export type BenchmarkPredictionIdentity = {
  match_id: string;
  predictor_type: PredictorType;
  predictor_id: string;
  provider: string;
  model_id: string | null;
  model_version: string | null;
  access_condition: AccessCondition;
  prompt_strategy: PromptStrategy;
  forecast_horizon: ForecastHorizon;
  sample_id: number;
};

export type BenchmarkPredictionRow = BenchmarkPredictionIdentity & {
  id: string;
  run_id: string | null;
  scheduled_prediction_time_utc: string | null;
  actual_prediction_time_utc: string | null;
  kickoff_time_utc: string | null;
  minutes_before_kickoff: number | null;
  timing_status: TimingStatus | null;
  prompt_template_id: string | null;
  prompt_hash: string | null;
  raw_prompt: string | null;
  raw_response: unknown;
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
  validation_status: ValidationStatus | null;
  is_valid_for_scoring: boolean | number;
  repair_attempted: boolean | number;
  repair_raw_response: unknown;
  normalization_applied: boolean | number;
  normalized_fields: unknown;
  validation_errors: unknown;
  prob_sum_90_original: number | null;
  prob_sum_90_final: number | null;
  prob_sum_full_original: number | null;
  prob_sum_full_final: number | null;
  prob_sum_advancement_original: number | null;
  prob_sum_advancement_final: number | null;
  tools_enabled: boolean | number;
  tool_type: string | null;
  tool_calls_observed: boolean | number | null;
  num_tool_calls: number | null;
  tool_trace_available: boolean | number;
  tool_trace: unknown;
  open_book_compliance: OpenBookCompliance;
  created_at: string;
  updated_at: string;
};

export type NewBenchmarkPredictionRow = BenchmarkPredictionIdentity & {
  id?: string;
  run_id?: string | null;
  scheduled_prediction_time_utc?: string | null;
  actual_prediction_time_utc?: string | null;
  kickoff_time_utc?: string | null;
  minutes_before_kickoff?: number | null;
  timing_status?: TimingStatus | null;
  prompt_template_id?: string | null;
  prompt_hash?: string | null;
  raw_prompt?: string | null;
  raw_response: unknown;
  response_id?: string | null;
  temperature?: number | null;
  top_p?: number | null;
  max_tokens?: number | null;
  latency_ms?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cost_usd?: number | null;
  home_win_90_prob?: number | null;
  draw_90_prob?: number | null;
  away_win_90_prob?: number | null;
  expected_home_goals_90?: number | null;
  expected_away_goals_90?: number | null;
  most_likely_score_90_home?: number | null;
  most_likely_score_90_away?: number | null;
  home_win_full_prob?: number | null;
  draw_full_prob?: number | null;
  away_win_full_prob?: number | null;
  most_likely_score_full_home?: number | null;
  most_likely_score_full_away?: number | null;
  home_advances_prob?: number | null;
  away_advances_prob?: number | null;
  confidence?: number | null;
  reason?: string | null;
  validation_status?: ValidationStatus | null;
  is_valid_for_scoring?: boolean | number;
  repair_attempted?: boolean | number;
  repair_raw_response?: unknown;
  normalization_applied?: boolean | number;
  normalized_fields?: unknown;
  validation_errors?: unknown;
  prob_sum_90_original?: number | null;
  prob_sum_90_final?: number | null;
  prob_sum_full_original?: number | null;
  prob_sum_full_final?: number | null;
  prob_sum_advancement_original?: number | null;
  prob_sum_advancement_final?: number | null;
  tools_enabled?: boolean | number;
  tool_type?: string | null;
  tool_calls_observed?: boolean | number | null;
  num_tool_calls?: number | null;
  tool_trace_available?: boolean | number;
  tool_trace?: unknown;
  open_book_compliance?: OpenBookCompliance;
};

export type PredictionEvaluationRow = {
  id: string;
  prediction_id: string;
  actual_result_90: MatchResultClass | null;
  actual_result_full: MatchResultClass | null;
  actual_advancer: AdvancerClass | null;
  predicted_result_90_from_probs: MatchResultClass | null;
  predicted_result_90_from_score: MatchResultClass | null;
  predicted_result_full_from_probs: MatchResultClass | null;
  brier_90: number | null;
  log_loss_90: number | null;
  top_outcome_correct_90: boolean | number | null;
  exact_score_90_correct: boolean | number | null;
  goal_difference_90_correct: boolean | number | null;
  tendency_90_correct_from_score: boolean | number | null;
  home_goal_abs_error_90: number | null;
  away_goal_abs_error_90: number | null;
  total_goals_abs_error_90: number | null;
  goal_difference_abs_error_90: number | null;
  kicktipp_points_90: number | null;
  advancement_brier: number | null;
  advancement_log_loss: number | null;
  advancement_accuracy: boolean | number | null;
  score_result_matches_prob_argmax_90: boolean | number | null;
  score_result_matches_prob_argmax_full: boolean | number | null;
  expected_goals_score_distance: number | null;
  evaluated_at_utc: string;
};

export type NewPredictionEvaluationRow = Partial<Omit<PredictionEvaluationRow, "id" | "prediction_id" | "evaluated_at_utc">> & {
  id?: string;
  prediction_id: string;
  evaluated_at_utc?: string;
};

export type SpecialPredictionIdentity = {
  question_id: string;
  predictor_type: PredictorType;
  predictor_id: string;
  provider: string;
  model_id: string | null;
  model_version: string | null;
  access_condition: AccessCondition;
  prompt_strategy: PromptStrategy;
  forecast_horizon: ForecastHorizon;
  sample_id: number;
};

export type SpecialPredictionOptionRow = {
  id: string;
  prediction_id: string;
  question_id: string;
  candidate_id: string;
  candidate_label: string;
  candidate_type: string;
  probability: number;
  rank: number;
  is_final_pick: boolean | number;
  created_at: string;
};

export type NewSpecialPredictionOptionRow = Omit<
  SpecialPredictionOptionRow,
  "id" | "prediction_id" | "created_at"
> & {
  id?: string;
};

export type SpecialPredictionRow = SpecialPredictionIdentity & {
  id: string;
  run_id: string | null;
  question_label: string;
  prediction_type: SpecialPredictionType;
  k: number | null;
  actual_prediction_time_utc: string | null;
  prompt_template_id: string | null;
  prompt_hash: string | null;
  raw_prompt: string | null;
  raw_response: unknown;
  parsed_response: unknown;
  response_id: string | null;
  temperature: number | null;
  top_p: number | null;
  max_tokens: number | null;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  final_pick: string | null;
  final_picks: unknown;
  confidence: number | null;
  reasoning_summary: string | null;
  validation_status: SpecialPredictionValidationStatus | null;
  is_valid_for_scoring: boolean | number;
  repair_attempted: boolean | number;
  repair_raw_response: unknown;
  normalization_applied: boolean | number;
  normalized_fields: unknown;
  validation_errors: unknown;
  probability_sum_original: number | null;
  probability_sum_final: number | null;
  tools_enabled: boolean | number;
  tool_type: string | null;
  tool_calls_observed: boolean | number | null;
  num_tool_calls: number | null;
  tool_trace_available: boolean | number;
  tool_trace: unknown;
  open_book_compliance: OpenBookCompliance;
  created_at: string;
  updated_at: string;
  options?: SpecialPredictionOptionRow[];
};

export type NewSpecialPredictionRow = SpecialPredictionIdentity & {
  id?: string;
  run_id?: string | null;
  question_label: string;
  prediction_type: SpecialPredictionType;
  k?: number | null;
  actual_prediction_time_utc?: string | null;
  prompt_template_id?: string | null;
  prompt_hash?: string | null;
  raw_prompt?: string | null;
  raw_response: unknown;
  parsed_response?: unknown;
  response_id?: string | null;
  temperature?: number | null;
  top_p?: number | null;
  max_tokens?: number | null;
  latency_ms?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cost_usd?: number | null;
  final_pick?: string | null;
  final_picks?: unknown;
  confidence?: number | null;
  reasoning_summary?: string | null;
  validation_status?: SpecialPredictionValidationStatus | null;
  is_valid_for_scoring?: boolean | number;
  repair_attempted?: boolean | number;
  repair_raw_response?: unknown;
  normalization_applied?: boolean | number;
  normalized_fields?: unknown;
  validation_errors?: unknown;
  probability_sum_original?: number | null;
  probability_sum_final?: number | null;
  tools_enabled?: boolean | number;
  tool_type?: string | null;
  tool_calls_observed?: boolean | number | null;
  num_tool_calls?: number | null;
  tool_trace_available?: boolean | number;
  tool_trace?: unknown;
  open_book_compliance?: OpenBookCompliance;
  options?: NewSpecialPredictionOptionRow[];
};
