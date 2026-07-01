/**
 * Purpose: Reads production dashboard data from the dedicated API service.
 */
import type {
  AccessCondition,
  ForecastHorizon,
  PromptStrategy
} from "@/lib/benchmark-analytics";
import { normalizeStage } from "@/lib/benchmark-analytics";
import type {
  DashboardMatch,
  DashboardPrediction,
  DashboardSpecialPrediction
} from "@/lib/dashboard-types";

type ApiMatchRow = Record<string, any>;
type ApiPredictionRow = Record<string, any>;
type ApiSpecialPredictionRow = Record<string, any>;

export async function getDashboardMatchesFromApi(): Promise<DashboardMatch[] | null> {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    return null;
  }

  const [matchesResponse, predictionsResponse] = await Promise.all([
    fetchJson<{ matches: ApiMatchRow[] }>(`${apiUrl}/v1/matches`),
    fetchJson<{ predictions: ApiPredictionRow[] }>(`${apiUrl}/v1/benchmark-predictions`)
  ]);

  const matches = matchesResponse.matches.map(toDashboardMatch);
  const byMatchId = new Map(matches.map((match) => [match.id, match]));

  for (const row of predictionsResponse.predictions) {
    const match = byMatchId.get(String(row.match_id));
    if (match) {
      match.predictions.push(toDashboardPrediction(row));
    }
  }

  return matches;
}

export async function getSpecialPredictionsFromApi(): Promise<DashboardSpecialPrediction[] | null> {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    return null;
  }

  const response = await fetchJson<{ predictions: ApiSpecialPredictionRow[] }>(`${apiUrl}/v1/special-predictions`);
  return response.predictions.map(toSpecialPrediction);
}

function getApiUrl(): string | null {
  const value = process.env.AI_SPORTS_API_URL ?? process.env.INTERNAL_API_URL;
  return value ? value.replace(/\/+$/, "") : null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`API request failed ${response.status}: ${url}`);
  }

  return response.json() as Promise<T>;
}

function toDashboardMatch(row: ApiMatchRow): DashboardMatch {
  return {
    id: String(row.id),
    homeTeam: String(row.home_team),
    awayTeam: String(row.away_team),
    actualHome: toNullableNumber(row.home_score_90 ?? row.home_score),
    actualAway: toNullableNumber(row.away_score_90 ?? row.away_score),
    status: row.status ?? undefined,
    utcDate: row.utc_date ? new Date(row.utc_date).toISOString() : undefined,
    competition: row.competition ?? undefined,
    venue: row.venue ?? null,
    stage: normalizeStage(row.stage ?? row.competition),
    groupName: row.group_name ?? null,
    isKnockout: Boolean(row.is_knockout),
    predictions: []
  };
}

function toDashboardPrediction(row: ApiPredictionRow): DashboardPrediction {
  const scorePoints = toNullableNumber(row.kicktipp_points_90);

  return {
    id: String(row.id),
    matchId: String(row.match_id),
    model: String(row.model_name ?? row.predictor_id),
    provider: String(row.model_provider ?? row.provider),
    predictorId: String(row.predictor_id),
    accessCondition: toAccessCondition(row.access_condition),
    promptStrategy: toPromptStrategy(row.prompt_strategy),
    forecastHorizon: toForecastHorizon(row.forecast_horizon),
    stage: normalizeStage(row.stage),
    matchDate: row.utc_date ? new Date(row.utc_date).toISOString() : null,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    actualHome90: toNullableNumber(row.home_score_90),
    actualAway90: toNullableNumber(row.away_score_90),
    actualHomeFull: toNullableNumber(row.home_score_full),
    actualAwayFull: toNullableNumber(row.away_score_full),
    actualAdvancer: row.actual_advancer ?? null,
    sampleId: Number(row.sample_id ?? 1),
    predictedHome: toNullableNumber(row.most_likely_score_90_home),
    predictedAway: toNullableNumber(row.most_likely_score_90_away),
    predictedFullHome: toNullableNumber(row.most_likely_score_full_home),
    predictedFullAway: toNullableNumber(row.most_likely_score_full_away),
    homeWin90Prob: toNullableNumber(row.home_win_90_prob),
    draw90Prob: toNullableNumber(row.draw_90_prob),
    awayWin90Prob: toNullableNumber(row.away_win_90_prob),
    homeWinFullProb: toNullableNumber(row.home_win_full_prob),
    drawFullProb: toNullableNumber(row.draw_full_prob),
    awayWinFullProb: toNullableNumber(row.away_win_full_prob),
    homeAdvancesProb: toNullableNumber(row.home_advances_prob),
    awayAdvancesProb: toNullableNumber(row.away_advances_prob),
    confidence: toNullableNumber(row.confidence),
    reason: row.reason ?? null,
    validationStatus: row.validation_status ?? null,
    isValidForScoring: Boolean(row.is_valid_for_scoring),
    repairAttempted: Boolean(row.repair_attempted),
    normalizationApplied: Boolean(row.normalization_applied),
    openBookCompliance: String(row.open_book_compliance ?? "not_applicable"),
    toolsEnabled: Boolean(row.tools_enabled),
    toolCallsObserved: toNullableBoolean(row.tool_calls_observed),
    numToolCalls: toNullableNumber(row.num_tool_calls),
    brier90: toNullableNumber(row.brier_90),
    logLoss90: toNullableNumber(row.log_loss_90),
    topOutcomeCorrect90: toNullableBoolean(row.top_outcome_correct_90),
    exactScore90Correct: toNullableBoolean(row.exact_score_90_correct),
    goalDifference90Correct: toNullableBoolean(row.goal_difference_90_correct),
    tendency90CorrectFromScore: toNullableBoolean(row.tendency_90_correct_from_score),
    homeGoalAbsError90: toNullableNumber(row.home_goal_abs_error_90),
    awayGoalAbsError90: toNullableNumber(row.away_goal_abs_error_90),
    totalGoalsAbsError90: toNullableNumber(row.total_goals_abs_error_90),
    goalDifferenceAbsError90: toNullableNumber(row.goal_difference_abs_error_90),
    kicktippPoints90: scorePoints,
    advancementAccuracy: toNullableBoolean(row.advancement_accuracy),
    scoreResultMatchesProbArgmax90: toNullableBoolean(row.score_result_matches_prob_argmax_90),
    scorePoints,
    scoreReason: scorePoints === null ? null : `benchmark points: ${scorePoints}`
  };
}

function toSpecialPrediction(row: ApiSpecialPredictionRow): DashboardSpecialPrediction {
  return {
    id: String(row.id),
    questionId: String(row.question_id),
    questionLabel: String(row.question_label),
    predictionType: row.prediction_type,
    k: toNullableNumber(row.k),
    model: String(row.predictor_id),
    provider: String(row.provider),
    predictorId: String(row.predictor_id),
    accessCondition: toAccessCondition(row.access_condition),
    promptStrategy: toPromptStrategy(row.prompt_strategy),
    forecastHorizon: toForecastHorizon(row.forecast_horizon),
    sampleId: Number(row.sample_id ?? 1),
    finalPick: row.final_pick ?? null,
    finalPicks: Array.isArray(row.final_picks) ? row.final_picks : [],
    confidence: toNullableNumber(row.confidence),
    reasoningSummary: row.reasoning_summary ?? null,
    validationStatus: row.validation_status ?? null,
    isValidForScoring: Boolean(row.is_valid_for_scoring),
    isCorrect: null,
    questionScorePoints: 0
  };
}

function toAccessCondition(value: string): AccessCondition {
  return value === "open_book" || value === "not_applicable" ? value : "closed_book";
}

function toPromptStrategy(value: string): PromptStrategy {
  return value === "probabilistic_forecast" || value === "not_applicable" ? value : "direct_score";
}

function toForecastHorizon(value: string): ForecastHorizon {
  return value === "T_2H" || value === "STAGE_OPENING" ? value : "T_24H";
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toNullableBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) {
    return null;
  }

  return Boolean(value);
}
