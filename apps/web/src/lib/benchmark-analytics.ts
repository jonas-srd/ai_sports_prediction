/**
 * Purpose: Single frontend aggregation layer for the World Cup 2026 benchmark UI.
 * All benchmark leaderboards, charts, and match displays should use these helpers
 * instead of recalculating prediction scores from legacy MVP fields.
 */
export type AccessCondition = "closed_book" | "open_book" | "not_applicable";
export type PromptStrategy = "direct_score" | "probabilistic_forecast" | "not_applicable";
export type ForecastHorizon = "T_24H" | "T_2H" | "STAGE_OPENING";
export type TournamentStage =
  | "group_stage"
  | "round_of_32"
  | "round_of_16"
  | "quarterfinal"
  | "semifinal"
  | "third_place"
  | "final"
  | "unknown";

export type MetricDirection = "higher" | "lower";

export type AnalyticsMetric =
  | "kicktipp_points_90"
  | "brier_90"
  | "log_loss_90"
  | "top_outcome_accuracy_90"
  | "exact_score_accuracy_90"
  | "goal_difference_accuracy_90"
  | "mean_goal_difference_abs_error_90"
  | "mean_total_goals_abs_error_90"
  | "advancement_accuracy"
  | "invalid_output_rate"
  | "repair_rate"
  | "normalization_rate"
  | "open_book_search_observed_rate"
  | "score_probability_consistency_rate";

export type BenchmarkDisplayPrediction = {
  id: string;
  matchId: string;
  model: string;
  provider: string;
  predictorId: string;
  accessCondition: AccessCondition;
  promptStrategy: PromptStrategy;
  forecastHorizon: ForecastHorizon;
  stage: TournamentStage;
  matchDate: string | null;
  homeTeam?: string;
  awayTeam?: string;
  actualHome90?: number | null;
  actualAway90?: number | null;
  actualHomeFull?: number | null;
  actualAwayFull?: number | null;
  actualAdvancer?: string | null;
  sampleId: number;
  predictedHome: number | null;
  predictedAway: number | null;
  predictedFullHome: number | null;
  predictedFullAway: number | null;
  homeWin90Prob: number | null;
  draw90Prob: number | null;
  awayWin90Prob: number | null;
  homeWinFullProb: number | null;
  drawFullProb: number | null;
  awayWinFullProb: number | null;
  homeAdvancesProb: number | null;
  awayAdvancesProb: number | null;
  confidence: number | null;
  reason: string | null;
  validationStatus: string | null;
  isValidForScoring: boolean;
  repairAttempted: boolean;
  normalizationApplied: boolean;
  openBookCompliance: string;
  toolsEnabled: boolean;
  toolCallsObserved: boolean | null;
  numToolCalls: number | null;
  brier90: number | null;
  logLoss90: number | null;
  topOutcomeCorrect90: boolean | null;
  exactScore90Correct: boolean | null;
  goalDifference90Correct: boolean | null;
  tendency90CorrectFromScore: boolean | null;
  homeGoalAbsError90: number | null;
  awayGoalAbsError90: number | null;
  totalGoalsAbsError90: number | null;
  goalDifferenceAbsError90: number | null;
  kicktippPoints90: number | null;
  advancementAccuracy: boolean | null;
  scoreResultMatchesProbArgmax90: boolean | null;
};

export type AnalyticsFilters = {
  forecastHorizons: ForecastHorizon[];
  accessConditions: AccessCondition[];
  promptStrategies: PromptStrategy[];
  stages: TournamentStage[];
  models: string[];
  providers: string[];
  dateFrom: string;
  dateTo: string;
};

export type MetricDefinition = {
  key: AnalyticsMetric;
  label: string;
  shortLabel: string;
  direction: MetricDirection;
  kind: "sum" | "mean" | "rate";
  includeInvalid: boolean;
  format: (value: number | null) => string;
};

export type AnalyticsLeaderboardRow = {
  key: string;
  rank: number;
  model: string;
  provider: string;
  predictorId: string;
  forecastHorizon: ForecastHorizon;
  accessCondition: AccessCondition;
  promptStrategy: PromptStrategy;
  stages: TournamentStage[];
  matchesScored: number;
  predictionsTotal: number;
  metricValue: number | null;
  kicktippPoints90: number | null;
  brier90: number | null;
  logLoss90: number | null;
  topOutcomeAccuracy90: number | null;
  exactScoreAccuracy90: number | null;
  goalDifferenceAccuracy90: number | null;
  meanGoalDifferenceAbsError90: number | null;
  meanTotalGoalsAbsError90: number | null;
  advancementAccuracy: number | null;
  invalidOutputRate: number | null;
  repairRate: number | null;
  normalizationRate: number | null;
  openBookSearchObservedRate: number | null;
  scoreProbabilityConsistencyRate: number | null;
};

export type AnalyticsSeries = {
  key: string;
  label: string;
  values: Array<{
    matchOrder: number;
    matchId: string;
    date: string | null;
    value: number | null;
  }>;
};

export const METRIC_DEFINITIONS: Record<AnalyticsMetric, MetricDefinition> = {
  kicktipp_points_90: {
    key: "kicktipp_points_90",
    label: "Points",
    shortLabel: "Points",
    direction: "higher",
    kind: "sum",
    includeInvalid: false,
    format: formatNumber
  },
  brier_90: {
    key: "brier_90",
    label: "Brier score",
    shortLabel: "Brier",
    direction: "lower",
    kind: "mean",
    includeInvalid: false,
    format: formatDecimal
  },
  log_loss_90: {
    key: "log_loss_90",
    label: "Log loss",
    shortLabel: "Log loss",
    direction: "lower",
    kind: "mean",
    includeInvalid: false,
    format: formatDecimal
  },
  top_outcome_accuracy_90: {
    key: "top_outcome_accuracy_90",
    label: "Top-outcome accuracy",
    shortLabel: "Top acc.",
    direction: "higher",
    kind: "rate",
    includeInvalid: false,
    format: formatPercent
  },
  exact_score_accuracy_90: {
    key: "exact_score_accuracy_90",
    label: "Exact-score accuracy",
    shortLabel: "Exact",
    direction: "higher",
    kind: "rate",
    includeInvalid: false,
    format: formatPercent
  },
  goal_difference_accuracy_90: {
    key: "goal_difference_accuracy_90",
    label: "Goal-difference accuracy",
    shortLabel: "GD acc.",
    direction: "higher",
    kind: "rate",
    includeInvalid: false,
    format: formatPercent
  },
  mean_goal_difference_abs_error_90: {
    key: "mean_goal_difference_abs_error_90",
    label: "Mean goal-difference error",
    shortLabel: "GD err.",
    direction: "lower",
    kind: "mean",
    includeInvalid: false,
    format: formatDecimal
  },
  mean_total_goals_abs_error_90: {
    key: "mean_total_goals_abs_error_90",
    label: "Mean total-goals error",
    shortLabel: "Goals err.",
    direction: "lower",
    kind: "mean",
    includeInvalid: false,
    format: formatDecimal
  },
  advancement_accuracy: {
    key: "advancement_accuracy",
    label: "Advancement accuracy",
    shortLabel: "Adv.",
    direction: "higher",
    kind: "rate",
    includeInvalid: false,
    format: formatPercent
  },
  invalid_output_rate: {
    key: "invalid_output_rate",
    label: "Invalid-output rate",
    shortLabel: "Invalid",
    direction: "lower",
    kind: "rate",
    includeInvalid: true,
    format: formatPercent
  },
  repair_rate: {
    key: "repair_rate",
    label: "Repair rate",
    shortLabel: "Repair",
    direction: "lower",
    kind: "rate",
    includeInvalid: true,
    format: formatPercent
  },
  normalization_rate: {
    key: "normalization_rate",
    label: "Normalization rate",
    shortLabel: "Norm.",
    direction: "lower",
    kind: "rate",
    includeInvalid: true,
    format: formatPercent
  },
  open_book_search_observed_rate: {
    key: "open_book_search_observed_rate",
    label: "Open-book search observed",
    shortLabel: "Search",
    direction: "higher",
    kind: "rate",
    includeInvalid: true,
    format: formatPercent
  },
  score_probability_consistency_rate: {
    key: "score_probability_consistency_rate",
    label: "Score/probability consistency",
    shortLabel: "Consist.",
    direction: "higher",
    kind: "rate",
    includeInvalid: false,
    format: formatPercent
  }
};

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  forecastHorizons: [],
  accessConditions: [],
  promptStrategies: [],
  stages: [],
  models: [],
  providers: [],
  dateFrom: "",
  dateTo: ""
};

export function getMetricDefinition(metric: AnalyticsMetric): MetricDefinition {
  return METRIC_DEFINITIONS[metric];
}

export function getDefaultAnalyticsFilters(): AnalyticsFilters {
  return {
    ...DEFAULT_ANALYTICS_FILTERS
  };
}

export function filterBenchmarkPredictions(
  records: BenchmarkDisplayPrediction[],
  filters: AnalyticsFilters
): BenchmarkDisplayPrediction[] {
  return records.filter((record) => {
    if (!isAllowed(record.forecastHorizon, filters.forecastHorizons)) return false;
    if (!isAllowed(record.accessCondition, filters.accessConditions)) return false;
    if (!isAllowed(record.promptStrategy, filters.promptStrategies)) return false;
    if (!isAllowed(record.stage, filters.stages)) return false;
    if (!isAllowed(record.model, filters.models)) return false;
    if (!isAllowed(record.provider, filters.providers)) return false;
    if (filters.dateFrom && (!record.matchDate || record.matchDate.slice(0, 10) < filters.dateFrom)) return false;
    if (filters.dateTo && (!record.matchDate || record.matchDate.slice(0, 10) > filters.dateTo)) return false;
    return true;
  });
}

export function buildAnalyticsLeaderboard(
  records: BenchmarkDisplayPrediction[],
  metric: AnalyticsMetric
): AnalyticsLeaderboardRow[] {
  const metricDefinition = getMetricDefinition(metric);
  const groups = groupByConfiguration(records);

  const rows = [...groups.entries()].map(([key, group]) => {
    const row = summarizeGroup(key, group);
    return {
      ...row,
      metricValue: getLeaderboardMetricValue(row, metricDefinition.key)
    };
  });

  return rankAnalyticsRows(rows, metricDefinition);
}

export function rankAnalyticsRows(
  rows: Array<Omit<AnalyticsLeaderboardRow, "rank"> & { rank?: number }>,
  metricDefinition: MetricDefinition
): AnalyticsLeaderboardRow[] {
  const sortedRows = rows
    .slice()
    .sort((left, right) => compareMetricValues(left.metricValue, right.metricValue, metricDefinition.direction)
      || left.model.localeCompare(right.model)
      || left.accessCondition.localeCompare(right.accessCondition)
      || left.promptStrategy.localeCompare(right.promptStrategy)
      || left.forecastHorizon.localeCompare(right.forecastHorizon));

  let currentRank = 0;
  let previousMetricValue: number | null | undefined;

  return sortedRows.map((row, index) => {
    if (index === 0 || !areMetricValuesTied(row.metricValue, previousMetricValue)) {
      currentRank = index + 1;
    }

    previousMetricValue = row.metricValue;
    return { ...row, rank: currentRank };
  });
}

export function buildAnalyticsSeries(
  records: BenchmarkDisplayPrediction[],
  metric: AnalyticsMetric,
  highlightedKey?: string | null,
  orderedKeys?: string[]
): AnalyticsSeries[] {
  const metricDefinition = getMetricDefinition(metric);
  const groups = groupByConfiguration(records);
  const timeline = buildResultTimeline(records);
  const selectedKeys = highlightedKey
    ? [highlightedKey]
    : orderedKeys?.length
      ? orderedKeys
      : [...groups.keys()].sort((leftKey, rightKey) => leftKey.localeCompare(rightKey));
  const entries = selectedKeys
    .map((key) => [key, groups.get(key)] as const)
    .filter((entry): entry is readonly [string, BenchmarkDisplayPrediction[]] => Boolean(entry[1]))
    .slice(0, highlightedKey ? 1 : 8);

  return entries.map(([key, group]) => ({
    key,
    label: formatConfigurationLabel(group[0]),
    values: buildSeriesValues(group, metricDefinition, timeline)
  }));
}

export function formatStage(value: TournamentStage | "all"): string {
  if (value === "all") return "All stages";
  if (value === "round_of_32") return "Round of 32";
  if (value === "round_of_16") return "Round of 16";
  if (value === "third_place") return "Third place";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatCondition(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatMetricValue(metric: AnalyticsMetric, value: number | null): string {
  return getMetricDefinition(metric).format(value);
}

export function normalizeStage(value?: string | null): TournamentStage {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("group_stage")) return "group_stage";
  if (normalized.includes("round_of_32") || normalized.includes("last_32")) return "round_of_32";
  if (normalized.includes("round_of_16") || normalized.includes("last_16")) return "round_of_16";
  if (normalized.includes("quarter")) return "quarterfinal";
  if (normalized.includes("semi")) return "semifinal";
  if (normalized.includes("third")) return "third_place";
  if (normalized.includes("final")) return "final";
  return "unknown";
}

function groupByConfiguration(records: BenchmarkDisplayPrediction[]): Map<string, BenchmarkDisplayPrediction[]> {
  const groups = new Map<string, BenchmarkDisplayPrediction[]>();

  for (const record of records) {
    const key = getConfigurationKey(record);
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  return groups;
}

function summarizeGroup(key: string, records: BenchmarkDisplayPrediction[]): Omit<AnalyticsLeaderboardRow, "rank" | "metricValue"> & {
  metricValue?: number | null;
} {
  const first = records[0];
  const scored = records.filter(isScoredPerformanceRecord);

  return {
    key,
    model: first.model,
    provider: first.provider,
    predictorId: first.predictorId,
    forecastHorizon: first.forecastHorizon,
    accessCondition: first.accessCondition,
    promptStrategy: first.promptStrategy,
    stages: Array.from(new Set(records.map((record) => record.stage))) as TournamentStage[],
    matchesScored: countDistinct(scored.map((record) => record.matchId)),
    predictionsTotal: records.length,
    kicktippPoints90: sumNullable(scored.map((record) => record.kicktippPoints90)),
    brier90: meanNullable(scored.map((record) => record.brier90)),
    logLoss90: meanNullable(scored.map((record) => record.logLoss90)),
    topOutcomeAccuracy90: meanBooleans(scored.map((record) => record.topOutcomeCorrect90)),
    exactScoreAccuracy90: meanBooleans(scored.map((record) => record.exactScore90Correct)),
    goalDifferenceAccuracy90: meanBooleans(scored.map((record) => record.goalDifference90Correct)),
    meanGoalDifferenceAbsError90: meanNullable(scored.map((record) => record.goalDifferenceAbsError90)),
    meanTotalGoalsAbsError90: meanNullable(scored.map((record) => record.totalGoalsAbsError90)),
    advancementAccuracy: meanBooleans(scored.map((record) => record.advancementAccuracy)),
    invalidOutputRate: meanBooleans(records.map((record) => !record.isValidForScoring)),
    repairRate: meanBooleans(records.map((record) => record.repairAttempted)),
    normalizationRate: meanBooleans(records.map((record) => record.normalizationApplied)),
    openBookSearchObservedRate: meanBooleans(
      records
        .filter((record) => record.accessCondition === "open_book")
        .map((record) => record.openBookCompliance === "observed_search" || record.toolCallsObserved === true)
    ),
    scoreProbabilityConsistencyRate: meanBooleans(scored.map((record) => record.scoreResultMatchesProbArgmax90))
  };
}

function buildResultTimeline(records: BenchmarkDisplayPrediction[]): Map<string, number> {
  const resultedMatches = new Map<string, { matchId: string; date: string | null }>();

  for (const record of records) {
    if (!hasMatchResult(record)) {
      continue;
    }

    const current = resultedMatches.get(record.matchId);
    if (!current || getTimeValue(record.matchDate) < getTimeValue(current.date)) {
      resultedMatches.set(record.matchId, {
        matchId: record.matchId,
        date: record.matchDate
      });
    }
  }

  return new Map(
    [...resultedMatches.values()]
      .sort((left, right) => getTimeValue(left.date) - getTimeValue(right.date) || left.matchId.localeCompare(right.matchId))
      .map((match, index) => [match.matchId, index + 1])
  );
}

function buildSeriesValues(
  records: BenchmarkDisplayPrediction[],
  metricDefinition: MetricDefinition,
  timeline: Map<string, number>
): AnalyticsSeries["values"] {
  const ordered = records
    .slice()
    .filter((record) => timeline.has(record.matchId))
    .sort((left, right) => getTimeValue(left.matchDate) - getTimeValue(right.matchDate) || left.matchId.localeCompare(right.matchId));
  const values: AnalyticsSeries["values"] = [];
  const cumulative: number[] = [];

  ordered.forEach((record) => {
    const value = getRecordMetricValue(record, metricDefinition.key);
    const include = shouldIncludeRecordForMetric(record, metricDefinition) && value !== null;

    if (include) {
      cumulative.push(value);
    }

    values.push({
      matchOrder: timeline.get(record.matchId) ?? values.length + 1,
      matchId: record.matchId,
      date: record.matchDate,
      value: getCumulativeValue(cumulative, metricDefinition)
    });
  });

  return values;
}

function getCumulativeValue(values: number[], metricDefinition: MetricDefinition): number | null {
  if (values.length === 0) {
    return null;
  }

  if (metricDefinition.kind === "sum") {
    return values.reduce((sum, value) => sum + value, 0);
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getRecordMetricValue(record: BenchmarkDisplayPrediction, metric: AnalyticsMetric): number | null {
  switch (metric) {
    case "kicktipp_points_90":
      return record.kicktippPoints90;
    case "brier_90":
      return record.brier90;
    case "log_loss_90":
      return record.logLoss90;
    case "top_outcome_accuracy_90":
      return booleanToNumber(record.topOutcomeCorrect90);
    case "exact_score_accuracy_90":
      return booleanToNumber(record.exactScore90Correct);
    case "goal_difference_accuracy_90":
      return booleanToNumber(record.goalDifference90Correct);
    case "mean_goal_difference_abs_error_90":
      return record.goalDifferenceAbsError90;
    case "mean_total_goals_abs_error_90":
      return record.totalGoalsAbsError90;
    case "advancement_accuracy":
      return booleanToNumber(record.advancementAccuracy);
    case "invalid_output_rate":
      return record.isValidForScoring ? 0 : 1;
    case "repair_rate":
      return record.repairAttempted ? 1 : 0;
    case "normalization_rate":
      return record.normalizationApplied ? 1 : 0;
    case "open_book_search_observed_rate":
      if (record.accessCondition !== "open_book") return null;
      return record.openBookCompliance === "observed_search" || record.toolCallsObserved === true ? 1 : 0;
    case "score_probability_consistency_rate":
      return booleanToNumber(record.scoreResultMatchesProbArgmax90);
  }
}

function getLeaderboardMetricValue(row: Omit<AnalyticsLeaderboardRow, "rank" | "metricValue">, metric: AnalyticsMetric): number | null {
  switch (metric) {
    case "kicktipp_points_90":
      return row.kicktippPoints90;
    case "brier_90":
      return row.brier90;
    case "log_loss_90":
      return row.logLoss90;
    case "top_outcome_accuracy_90":
      return row.topOutcomeAccuracy90;
    case "exact_score_accuracy_90":
      return row.exactScoreAccuracy90;
    case "goal_difference_accuracy_90":
      return row.goalDifferenceAccuracy90;
    case "mean_goal_difference_abs_error_90":
      return row.meanGoalDifferenceAbsError90;
    case "mean_total_goals_abs_error_90":
      return row.meanTotalGoalsAbsError90;
    case "advancement_accuracy":
      return row.advancementAccuracy;
    case "invalid_output_rate":
      return row.invalidOutputRate;
    case "repair_rate":
      return row.repairRate;
    case "normalization_rate":
      return row.normalizationRate;
    case "open_book_search_observed_rate":
      return row.openBookSearchObservedRate;
    case "score_probability_consistency_rate":
      return row.scoreProbabilityConsistencyRate;
  }
}

function shouldIncludeRecordForMetric(record: BenchmarkDisplayPrediction, metricDefinition: MetricDefinition): boolean {
  if (metricDefinition.includeInvalid) {
    return true;
  }

  return isScoredPerformanceRecord(record);
}

function isScoredPerformanceRecord(record: BenchmarkDisplayPrediction): boolean {
  return record.isValidForScoring && record.kicktippPoints90 !== null;
}

function hasMatchResult(record: BenchmarkDisplayPrediction): boolean {
  return record.actualHome90 !== null && record.actualHome90 !== undefined
    && record.actualAway90 !== null && record.actualAway90 !== undefined;
}

function isAllowed<T extends string>(value: T, selected: T[]): boolean {
  return selected.length === 0 || selected.includes(value);
}

function getConfigurationKey(record: BenchmarkDisplayPrediction): string {
  return [
    record.predictorId,
    record.provider,
    record.forecastHorizon,
    record.accessCondition,
    record.promptStrategy
  ].join("::");
}

function formatConfigurationLabel(record: BenchmarkDisplayPrediction): string {
  return `${record.model} / ${formatCondition(record.accessCondition)} / ${formatCondition(record.promptStrategy)} / ${record.forecastHorizon}`;
}

function compareMetricValues(left: number | null | undefined, right: number | null | undefined, direction: MetricDirection): number {
  if (left === null || left === undefined) return right === null || right === undefined ? 0 : 1;
  if (right === null || right === undefined) return -1;
  return direction === "higher" ? right - left : left - right;
}

function areMetricValuesTied(left: number | null | undefined, right: number | null | undefined): boolean {
  if (left === null || left === undefined || right === null || right === undefined) {
    return left === right;
  }

  return Math.abs(left - right) <= 1e-12;
}

function meanNullable(values: Array<number | null>): number | null {
  const numbers = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function sumNullable(values: Array<number | null>): number | null {
  const numbers = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, value) => sum + value, 0);
}

function meanBooleans(values: Array<boolean | null>): number | null {
  const booleans = values.filter((value): value is boolean => typeof value === "boolean");
  if (booleans.length === 0) return null;
  return booleans.filter(Boolean).length / booleans.length;
}

function booleanToNumber(value: boolean | null): number | null {
  if (value === null) return null;
  return value ? 1 : 0;
}

function countDistinct(values: string[]): number {
  return new Set(values).size;
}

function getTimeValue(value: string | null): number {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function formatNumber(value: number | null): string {
  if (value === null) return "-";
  return `${Math.round(value)}`;
}

function formatDecimal(value: number | null): string {
  if (value === null) return "-";
  return value.toFixed(3);
}

function formatPercent(value: number | null): string {
  if (value === null) return "-";
  return `${Math.round(value * 100)}%`;
}
