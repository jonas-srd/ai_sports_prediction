/**
 * Purpose: Provides dashboard data from SQLite with benchmark records as source of truth.
 * If no benchmark records exist yet, a small legacy adapter keeps old MVP data visible.
 */
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildAnalyticsLeaderboard,
  normalizeStage,
  type AccessCondition,
  type BenchmarkDisplayPrediction,
  type ForecastHorizon,
  type PromptStrategy,
  type TournamentStage
} from "@/lib/benchmark-analytics";

export type DashboardPrediction = BenchmarkDisplayPrediction & {
  scorePoints: number | null;
  scoreReason: string | null;
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
  stage?: TournamentStage;
  groupName?: string | null;
  isKnockout?: boolean;
  predictions: DashboardPrediction[];
};

export type DashboardLeaderboardEntry = {
  model: string;
  provider: string;
  points: number;
  exact: number;
  scored: number;
  pending: number;
  key?: string;
  forecastHorizon?: ForecastHorizon;
  accessCondition?: AccessCondition;
  promptStrategy?: PromptStrategy;
};

export const sampleMatches: DashboardMatch[] = [
  {
    id: "sample-1",
    homeTeam: "Germany",
    awayTeam: "France",
    actualHome: 2,
    actualAway: 1,
    venue: "Sample Stadium",
    stage: "group_stage",
    isKnockout: false,
    predictions: [
      createLegacySamplePrediction("sample-1", "GPT-5.5", "OpenAI", 2, 1, 5, "exact score"),
      createLegacySamplePrediction("sample-1", "Claude Opus 4.8", "Anthropic", 1, 1, 0, "miss"),
      createLegacySamplePrediction("sample-1", "Gemini 3.1 Pro", "Google", 2, 0, 1, "tendency"),
      createLegacySamplePrediction("sample-1", "Grok 4.3", "xAI", 0, 1, 0, "miss")
    ]
  },
  {
    id: "sample-2",
    homeTeam: "Brazil",
    awayTeam: "Argentina",
    actualHome: 1,
    actualAway: 1,
    venue: "Sample Stadium",
    stage: "group_stage",
    isKnockout: false,
    predictions: [
      createLegacySamplePrediction("sample-2", "GPT-5.5", "OpenAI", 1, 1, 5, "exact score"),
      createLegacySamplePrediction("sample-2", "Claude Opus 4.8", "Anthropic", 2, 1, 0, "miss"),
      createLegacySamplePrediction("sample-2", "Gemini 3.1 Pro", "Google", 0, 0, 2, "goal difference"),
      createLegacySamplePrediction("sample-2", "Grok 4.3", "xAI", 1, 2, 0, "miss")
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
    const matches = getDbMatches(db);

    if (matches.length === 0) {
      db.close();
      return sampleMatches;
    }

    const benchmarkPredictions = getBenchmarkPredictionRows(db);
    const dashboardMatches = attachPredictionsToMatches(
      matches,
      benchmarkPredictions.length > 0 ? benchmarkPredictions : getLegacyPredictionRows(db)
    );

    db.close();
    return dashboardMatches;
  } catch {
    return sampleMatches;
  }
}

export function getBenchmarkPredictions(): DashboardPrediction[] {
  return getDashboardMatches().flatMap((match) => match.predictions);
}

export function getLeaderboard(): DashboardLeaderboardEntry[] {
  const predictions = getBenchmarkPredictions();
  const hasBenchmarkPredictions = predictions.some((prediction) => !prediction.id.startsWith("legacy:"));

  if (hasBenchmarkPredictions) {
    return buildAnalyticsLeaderboard(predictions, "kicktipp_points_90")
      .map((row) => ({
        model: row.model,
        provider: formatProviderWithConfig(row.provider, row.accessCondition, row.promptStrategy, row.forecastHorizon),
        points: row.kicktippPoints90 ?? 0,
        exact: Math.round((row.exactScoreAccuracy90 ?? 0) * row.matchesScored),
        scored: row.matchesScored,
        pending: Math.max(0, row.predictionsTotal - row.matchesScored),
        key: row.key,
        forecastHorizon: row.forecastHorizon,
        accessCondition: row.accessCondition,
        promptStrategy: row.promptStrategy
      }));
  }

  return getLegacyLeaderboardFromPredictions(predictions);
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
  home_score_90: number | null;
  away_score_90: number | null;
  stage: string | null;
  group_name: string | null;
  is_knockout: number | null;
};

type PredictionRow = {
  match_id: string;
  prediction: DashboardPrediction;
};

type LegacyPredictionDbRow = {
  match_id: string;
  model_id: string;
  model_name: string | null;
  model_provider: string | null;
  predicted_home: number;
  predicted_away: number;
  confidence: number | null;
  reason: string | null;
  points: number | null;
  score_reason: string | null;
};

type BenchmarkPredictionDbRow = {
  id: string;
  match_id: string;
  predictor_id: string;
  provider: string;
  model_name: string | null;
  model_provider: string | null;
  access_condition: string;
  prompt_strategy: string;
  forecast_horizon: string;
  sample_id: number;
  most_likely_score_90_home: number | null;
  most_likely_score_90_away: number | null;
  most_likely_score_full_home: number | null;
  most_likely_score_full_away: number | null;
  home_win_90_prob: number | null;
  draw_90_prob: number | null;
  away_win_90_prob: number | null;
  home_win_full_prob: number | null;
  draw_full_prob: number | null;
  away_win_full_prob: number | null;
  home_advances_prob: number | null;
  away_advances_prob: number | null;
  confidence: number | null;
  reason: string | null;
  validation_status: string | null;
  is_valid_for_scoring: number;
  repair_attempted: number;
  normalization_applied: number;
  open_book_compliance: string;
  tools_enabled: number;
  tool_calls_observed: number | null;
  num_tool_calls: number | null;
  match_date: string | null;
  match_stage: string | null;
  match_competition: string | null;
  brier_90: number | null;
  log_loss_90: number | null;
  top_outcome_correct_90: number | null;
  exact_score_90_correct: number | null;
  goal_difference_90_correct: number | null;
  tendency_90_correct_from_score: number | null;
  home_goal_abs_error_90: number | null;
  away_goal_abs_error_90: number | null;
  total_goals_abs_error_90: number | null;
  goal_difference_abs_error_90: number | null;
  kicktipp_points_90: number | null;
  advancement_accuracy: number | null;
  score_result_matches_prob_argmax_90: number | null;
};

function getDbMatches(db: Database.Database): DashboardMatch[] {
  const hasVenue = hasColumn(db, "matches", "venue");
  const hasHomeScore90 = hasColumn(db, "matches", "home_score_90");
  const hasAwayScore90 = hasColumn(db, "matches", "away_score_90");
  const hasStage = hasColumn(db, "matches", "stage");
  const hasGroup = hasColumn(db, "matches", "group_name");
  const hasKnockout = hasColumn(db, "matches", "is_knockout");

  const rows = db.prepare(`
    select
      id,
      utc_date,
      competition,
      home_team,
      away_team,
      ${hasVenue ? "venue" : "null"} as venue,
      status,
      home_score,
      away_score,
      ${hasHomeScore90 ? "home_score_90" : "home_score"} as home_score_90,
      ${hasAwayScore90 ? "away_score_90" : "away_score"} as away_score_90,
      ${hasStage ? "stage" : "null"} as stage,
      ${hasGroup ? "group_name" : "null"} as group_name,
      ${hasKnockout ? "is_knockout" : "0"} as is_knockout
    from matches
    order by utc_date asc
  `).all() as DbMatchRow[];

  return rows.map((row) => ({
    id: row.id,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    actualHome: row.home_score_90 ?? row.home_score,
    actualAway: row.away_score_90 ?? row.away_score,
    status: row.status,
    utcDate: row.utc_date,
    competition: row.competition,
    venue: row.venue,
    stage: normalizeStage(row.stage ?? row.competition),
    groupName: row.group_name,
    isKnockout: Boolean(row.is_knockout),
    predictions: []
  }));
}

function getBenchmarkPredictionRows(db: Database.Database): PredictionRow[] {
  if (!hasTable(db, "benchmark_predictions")) {
    return [];
  }

  const rows = db.prepare(`
    select
      bp.id,
      bp.match_id,
      bp.predictor_id,
      bp.provider,
      mo.name as model_name,
      mo.provider as model_provider,
      bp.access_condition,
      bp.prompt_strategy,
      bp.forecast_horizon,
      bp.sample_id,
      bp.most_likely_score_90_home,
      bp.most_likely_score_90_away,
      bp.most_likely_score_full_home,
      bp.most_likely_score_full_away,
      bp.home_win_90_prob,
      bp.draw_90_prob,
      bp.away_win_90_prob,
      bp.home_win_full_prob,
      bp.draw_full_prob,
      bp.away_win_full_prob,
      bp.home_advances_prob,
      bp.away_advances_prob,
      bp.confidence,
      bp.reason,
      bp.validation_status,
      bp.is_valid_for_scoring,
      bp.repair_attempted,
      bp.normalization_applied,
      bp.open_book_compliance,
      bp.tools_enabled,
      bp.tool_calls_observed,
      bp.num_tool_calls,
      m.utc_date as match_date,
      m.stage as match_stage,
      m.competition as match_competition,
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
      pe.advancement_accuracy,
      pe.score_result_matches_prob_argmax_90
    from benchmark_predictions bp
    inner join matches m on m.id = bp.match_id
    left join models mo on mo.id = bp.model_id
    left join prediction_evaluations pe on pe.prediction_id = bp.id
    order by m.utc_date asc, bp.predictor_id asc, bp.forecast_horizon asc, bp.access_condition asc, bp.prompt_strategy asc
  `).all() as BenchmarkPredictionDbRow[];

  return rows.map((row) => {
    const scorePoints = getBenchmarkKicktippPoints(row);

    return {
      match_id: row.match_id,
      prediction: {
        id: row.id,
        matchId: row.match_id,
        model: formatModelName(row.model_name ?? row.predictor_id, row.predictor_id),
        provider: row.model_provider ?? row.provider,
        predictorId: row.predictor_id,
        accessCondition: toAccessCondition(row.access_condition),
        promptStrategy: toPromptStrategy(row.prompt_strategy),
        forecastHorizon: toForecastHorizon(row.forecast_horizon),
        stage: normalizeStage(row.match_stage ?? row.match_competition),
        matchDate: row.match_date,
        sampleId: row.sample_id,
        predictedHome: row.most_likely_score_90_home,
        predictedAway: row.most_likely_score_90_away,
        predictedFullHome: row.most_likely_score_full_home,
        predictedFullAway: row.most_likely_score_full_away,
        homeWin90Prob: row.home_win_90_prob,
        draw90Prob: row.draw_90_prob,
        awayWin90Prob: row.away_win_90_prob,
        homeWinFullProb: row.home_win_full_prob,
        drawFullProb: row.draw_full_prob,
        awayWinFullProb: row.away_win_full_prob,
        homeAdvancesProb: row.home_advances_prob,
        awayAdvancesProb: row.away_advances_prob,
        confidence: row.confidence,
        reason: row.reason,
        validationStatus: row.validation_status,
        isValidForScoring: Boolean(row.is_valid_for_scoring),
        repairAttempted: Boolean(row.repair_attempted),
        normalizationApplied: Boolean(row.normalization_applied),
        openBookCompliance: row.open_book_compliance,
        toolsEnabled: Boolean(row.tools_enabled),
        toolCallsObserved: toNullableBoolean(row.tool_calls_observed),
        numToolCalls: row.num_tool_calls,
        brier90: row.brier_90,
        logLoss90: row.log_loss_90,
        topOutcomeCorrect90: toNullableBoolean(row.top_outcome_correct_90),
        exactScore90Correct: toNullableBoolean(row.exact_score_90_correct),
        goalDifference90Correct: toNullableBoolean(row.goal_difference_90_correct),
        tendency90CorrectFromScore: toNullableBoolean(row.tendency_90_correct_from_score),
        homeGoalAbsError90: row.home_goal_abs_error_90,
        awayGoalAbsError90: row.away_goal_abs_error_90,
        totalGoalsAbsError90: row.total_goals_abs_error_90,
        goalDifferenceAbsError90: row.goal_difference_abs_error_90,
        kicktippPoints90: scorePoints,
        advancementAccuracy: toNullableBoolean(row.advancement_accuracy),
        scoreResultMatchesProbArgmax90: toNullableBoolean(row.score_result_matches_prob_argmax_90),
        scorePoints,
        scoreReason: getBenchmarkScoreReason(row)
      }
    };
  });
}

function getLegacyPredictionRows(db: Database.Database): PredictionRow[] {
  if (!hasTable(db, "predictions")) {
    return [];
  }

  const rows = db.prepare(`
    select
      p.match_id,
      p.model_id,
      mo.name as model_name,
      mo.provider as model_provider,
      p.predicted_home,
      p.predicted_away,
      p.confidence,
      p.reason,
      s.points,
      s.reason as score_reason
    from predictions p
    left join models mo on mo.id = p.model_id
    left join scores s on s.prediction_id = p.id
    order by mo.name asc
  `).all() as LegacyPredictionDbRow[];

  return rows.map((row) => ({
    match_id: row.match_id,
    prediction: createLegacyPrediction({
      matchId: row.match_id,
      model: formatModelName(row.model_name ?? row.model_id, row.model_id),
      provider: row.model_provider ?? "legacy",
      predictedHome: row.predicted_home,
      predictedAway: row.predicted_away,
      confidence: row.confidence,
      reason: row.reason,
      points: row.points,
      scoreReason: row.score_reason
    })
  }));
}

function attachPredictionsToMatches(matches: DashboardMatch[], rows: PredictionRow[]): DashboardMatch[] {
  const byMatch = new Map<string, DashboardPrediction[]>();

  for (const row of rows) {
    const predictions = byMatch.get(row.match_id) ?? [];
    predictions.push(row.prediction);
    byMatch.set(row.match_id, predictions);
  }

  return matches.map((match) => ({
    ...match,
    predictions: (byMatch.get(match.id) ?? []).sort(comparePredictions)
  }));
}

function getLegacyLeaderboardFromPredictions(predictions: DashboardPrediction[]): DashboardLeaderboardEntry[] {
  const totals = new Map<string, DashboardLeaderboardEntry>();

  for (const prediction of predictions) {
    const current = totals.get(prediction.model) ?? {
      model: prediction.model,
      provider: prediction.provider,
      points: 0,
      exact: 0,
      scored: 0,
      pending: 0
    };

    if (prediction.scorePoints !== null) {
      current.points += prediction.scorePoints;
      current.exact += prediction.scoreReason === "exact score" || prediction.scoreReason === "exact" ? 1 : 0;
      current.scored += 1;
    } else {
      current.pending += 1;
    }

    totals.set(prediction.model, current);
  }

  return [...totals.values()].sort((a, b) => b.points - a.points || b.exact - a.exact || a.model.localeCompare(b.model));
}

function createLegacyPrediction(args: {
  matchId: string;
  model: string;
  provider: string;
  predictedHome: number;
  predictedAway: number;
  confidence?: number | null;
  reason?: string | null;
  points?: number | null;
  scoreReason?: string | null;
}): DashboardPrediction {
  return {
    id: `legacy:${args.matchId}:${args.model}`,
    matchId: args.matchId,
    model: args.model,
    provider: args.provider,
    predictorId: args.model,
    accessCondition: "not_applicable",
    promptStrategy: "not_applicable",
    forecastHorizon: "STAGE_OPENING",
    stage: "unknown",
    matchDate: null,
    sampleId: 1,
    predictedHome: args.predictedHome,
    predictedAway: args.predictedAway,
    predictedFullHome: args.predictedHome,
    predictedFullAway: args.predictedAway,
    homeWin90Prob: null,
    draw90Prob: null,
    awayWin90Prob: null,
    homeWinFullProb: null,
    drawFullProb: null,
    awayWinFullProb: null,
    homeAdvancesProb: null,
    awayAdvancesProb: null,
    confidence: args.confidence ?? null,
    reason: args.reason ?? null,
    validationStatus: "legacy_adapter",
    isValidForScoring: true,
    repairAttempted: false,
    normalizationApplied: false,
    openBookCompliance: "not_applicable",
    toolsEnabled: false,
    toolCallsObserved: null,
    numToolCalls: null,
    brier90: null,
    logLoss90: null,
    topOutcomeCorrect90: null,
    exactScore90Correct: args.scoreReason === "exact" || args.scoreReason === "exact score",
    goalDifference90Correct: args.scoreReason === "goal_difference" || args.scoreReason === "goal difference",
    tendency90CorrectFromScore: args.scoreReason === "tendency",
    homeGoalAbsError90: null,
    awayGoalAbsError90: null,
    totalGoalsAbsError90: null,
    goalDifferenceAbsError90: null,
    kicktippPoints90: args.points ?? null,
    advancementAccuracy: null,
    scoreResultMatchesProbArgmax90: null,
    scorePoints: args.points ?? null,
    scoreReason: args.scoreReason ?? null
  };
}

function createLegacySamplePrediction(
  matchId: string,
  model: string,
  provider: string,
  predictedHome: number,
  predictedAway: number,
  points: number,
  scoreReason: string
): DashboardPrediction {
  return createLegacyPrediction({
    matchId,
    model,
    provider,
    predictedHome,
    predictedAway,
    points,
    scoreReason
  });
}

function getBenchmarkScoreReason(row: BenchmarkPredictionDbRow): string | null {
  if (row.kicktipp_points_90 === null) {
    return null;
  }

  if (row.exact_score_90_correct) return "exact score";
  if (row.goal_difference_90_correct) return "goal difference";
  if (row.tendency_90_correct_from_score) return "tendency";
  return "miss";
}

function getBenchmarkKicktippPoints(row: BenchmarkPredictionDbRow): number | null {
  if (row.kicktipp_points_90 === null) {
    return null;
  }

  if (row.exact_score_90_correct) return 5;
  if (row.goal_difference_90_correct) return 2;
  if (row.tendency_90_correct_from_score) return 1;
  return 0;
}

function formatModelName(rawName: string, modelId?: string | null): string {
  const knownName = MODEL_DISPLAY_NAMES[modelId ?? ""] ?? MODEL_DISPLAY_NAMES[rawName];
  if (knownName) {
    return knownName;
  }

  const source = rawName.includes("/") ? rawName.split("/").pop() ?? rawName : rawName;

  return source
    .replace(/^~/, "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\bgpt\b/gi, "GPT")
    .replace(/\bai\b/gi, "AI")
    .replace(/\bllama\b/gi, "Llama")
    .replace(/\bclaude\b/gi, "Claude")
    .replace(/\bgemini\b/gi, "Gemini")
    .replace(/\bgrok\b/gi, "Grok")
    .replace(/\bdeepseek\b/gi, "DeepSeek")
    .replace(/\bqwen\b/gi, "Qwen")
    .replace(/\bmistral\b/gi, "Mistral")
    .replace(/\bopus\b/gi, "Opus")
    .replace(/\bsonnet\b/gi, "Sonnet")
    .replace(/\bflash\b/gi, "Flash")
    .replace(/\bpro\b/gi, "Pro")
    .replace(/\bmax\b/gi, "Max")
    .replace(/\bplus\b/gi, "Plus")
    .replace(/\blarge\b/gi, "Large")
    .replace(/\bmedium\b/gi, "Medium")
    .replace(/\bv(\d+)\b/gi, "V$1")
    .replace(/\b(\d+) (\d+)\b/g, "$1.$2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "openai/gpt-5.5": "GPT-5.5",
  "openai_gpt_5_5": "GPT-5.5",
  "anthropic/claude-opus-4.8": "Claude Opus 4.8",
  "anthropic_claude_opus_4_8": "Claude Opus 4.8",
  "google/gemini-3.1-pro-preview": "Gemini 3.1 Pro",
  "google_gemini_3_1_pro": "Gemini 3.1 Pro",
  "x-ai/grok-4.3": "Grok 4.3",
  "xai_grok_4_3": "Grok 4.3",
  "deepseek/deepseek-v4-pro": "DeepSeek V4 Pro",
  "deepseek_v4_pro": "DeepSeek V4 Pro",
  "qwen/qwen3.7-max": "Qwen 3.7 Max",
  "qwen_3_7_max": "Qwen 3.7 Max",
  "mistralai/mistral-large-2512": "Mistral Large 2512",
  "mistral_large_2512": "Mistral Large 2512",
  "anthropic/claude-fable-5": "Claude Fable 5",
  "anthropic_claude_fable_5": "Claude Fable 5",
  "anthropic/claude-sonnet-4.6": "Claude Sonnet 4.6",
  "anthropic_claude_sonnet_4_6": "Claude Sonnet 4.6",
  "google/gemini-3.5-flash": "Gemini 3.5 Flash",
  "google_gemini_3_5_flash": "Gemini 3.5 Flash",
  "deepseek/deepseek-v4-flash": "DeepSeek V4 Flash",
  "deepseek_v4_flash": "DeepSeek V4 Flash",
  "qwen/qwen3.7-plus": "Qwen 3.7 Plus",
  "qwen_3_7_plus": "Qwen 3.7 Plus",
  "mistralai/mistral-medium-3-5": "Mistral Medium 3.5",
  "mistral_medium_3_5": "Mistral Medium 3.5",
  "meta-llama/llama-4-maverick": "Llama 4 Maverick",
  "llama_4_maverick": "Llama 4 Maverick",
  "nvidia/nemotron-3-ultra-550b-a55b": "Nemotron 3 Ultra",
  "nvidia_nemotron_3_ultra": "Nemotron 3 Ultra",
  "minimax/minimax-m3": "MiniMax M3",
  "minimax_m3": "MiniMax M3",
  "~moonshotai/kimi-latest": "Kimi Latest",
  "moonshot_kimi_latest_frozen_alias_not_primary": "Kimi Latest"
};

function comparePredictions(a: DashboardPrediction, b: DashboardPrediction): number {
  return (b.scorePoints ?? -1) - (a.scorePoints ?? -1)
    || a.model.localeCompare(b.model)
    || a.forecastHorizon.localeCompare(b.forecastHorizon)
    || a.accessCondition.localeCompare(b.accessCondition)
    || a.promptStrategy.localeCompare(b.promptStrategy);
}

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

function hasTable(db: Database.Database, table: string): boolean {
  const row = db.prepare(`
    select name
    from sqlite_master
    where type = 'table' and name = ?
  `).get(table);
  return Boolean(row);
}

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const columns = db.prepare(`pragma table_info(${table})`).all() as Array<{ name: string }>;
  return columns.some((entry) => entry.name === column);
}

function toNullableBoolean(value: number | null): boolean | null {
  if (value === null || value === undefined) {
    return null;
  }

  return Boolean(value);
}

function toAccessCondition(value: string): AccessCondition {
  return value === "closed_book" || value === "open_book" ? value : "not_applicable";
}

function toPromptStrategy(value: string): PromptStrategy {
  return value === "direct_score" || value === "probabilistic_forecast" ? value : "not_applicable";
}

function toForecastHorizon(value: string): ForecastHorizon {
  return value === "T_24H" || value === "T_1H" || value === "STAGE_OPENING" ? value : "STAGE_OPENING";
}

function formatProviderWithConfig(
  provider: string,
  accessCondition: AccessCondition,
  promptStrategy: PromptStrategy,
  forecastHorizon: ForecastHorizon
): string {
  return `${provider} / ${accessCondition.replaceAll("_", " ")} / ${promptStrategy.replaceAll("_", " ")} / ${forecastHorizon}`;
}
