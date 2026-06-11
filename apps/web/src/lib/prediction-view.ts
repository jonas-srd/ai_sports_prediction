/**
 * Purpose: Shared Home/Matches prediction filtering for engagement pages.
 * The default compares each model by its best-scoring configuration only.
 */
import type {
  AccessCondition,
  ForecastHorizon,
  PromptStrategy
} from "@/lib/benchmark-analytics";
import { buildAnalyticsLeaderboard, formatCondition } from "@/lib/benchmark-analytics";
import type { DashboardLeaderboardEntry, DashboardMatch, DashboardPrediction } from "@/lib/dashboard-data";

export type PredictionViewMode = "best" | "custom";
export type CustomPredictionMode = "all" | "filtered";

export type PredictionViewState = {
  mode: PredictionViewMode;
  customMode: CustomPredictionMode;
  models: string[];
  accessConditions: AccessCondition[];
  promptStrategies: PromptStrategy[];
  forecastHorizons: ForecastHorizon[];
};

export type PredictionViewOptions = {
  models: string[];
  accessConditions: AccessCondition[];
  promptStrategies: PromptStrategy[];
  forecastHorizons: ForecastHorizon[];
};

type LeaderboardDisplayOptions = {
  conciseProvider?: boolean;
};

export function getPredictionViewOptions(matches: DashboardMatch[]): PredictionViewOptions {
  const predictions = getAllPredictions(matches);

  return {
    models: sortedUnique(predictions.map((prediction) => prediction.model)),
    accessConditions: sortedUnique(predictions.map((prediction) => prediction.accessCondition)),
    promptStrategies: sortedUnique(predictions.map((prediction) => prediction.promptStrategy)),
    forecastHorizons: sortedUnique(predictions.map((prediction) => prediction.forecastHorizon))
  };
}

export function getDefaultPredictionViewState(options: PredictionViewOptions): PredictionViewState {
  return {
    mode: "best",
    customMode: "all",
    models: options.models,
    accessConditions: options.accessConditions,
    promptStrategies: options.promptStrategies,
    forecastHorizons: options.forecastHorizons
  };
}

export function filterMatchesForPredictionView(
  matches: DashboardMatch[],
  state: PredictionViewState
): DashboardMatch[] {
  const allowedKeys = state.mode === "best" ? getBestConfigurationKeysByModel(getAllPredictions(matches)) : null;

  return matches.map((match) => ({
    ...match,
    predictions: match.predictions.filter((prediction) => {
      if (allowedKeys) {
        return allowedKeys.has(getPredictionConfigurationKey(prediction));
      }

      if (state.customMode === "all") {
        return true;
      }

      return isSelected(prediction.model, state.models)
        && isSelected(prediction.accessCondition, state.accessConditions)
        && isSelected(prediction.promptStrategy, state.promptStrategies)
        && isSelected(prediction.forecastHorizon, state.forecastHorizons);
    })
  }));
}

export function buildPredictionViewLeaderboard(
  matches: DashboardMatch[],
  options: LeaderboardDisplayOptions = {}
): DashboardLeaderboardEntry[] {
  const predictions = getAllPredictions(matches);
  const hasBenchmarkPredictions = predictions.some((prediction) => !prediction.id.startsWith("legacy:"));

  if (!hasBenchmarkPredictions) {
    return getLegacyLeaderboardFromPredictions(predictions);
  }

  return buildAnalyticsLeaderboard(predictions, "kicktipp_points_90")
    .map((row) => ({
      model: row.model,
      provider: options.conciseProvider
        ? `${row.provider} / best setup`
        : formatProviderWithConfig(row.provider, row.accessCondition, row.promptStrategy, row.forecastHorizon),
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

export function getPredictionViewSummary(state: PredictionViewState, matches: DashboardMatch[]): string {
  const shown = getAllPredictions(filterMatchesForPredictionView(matches, state)).length;

  if (state.mode === "best") {
    return `Best setup per model, ${shown} picks shown`;
  }

  if (state.customMode === "all") {
    return `All model strategies, ${shown} picks shown`;
  }

  return `Custom strategy view, ${shown} picks shown`;
}

export function getPredictionConfigurationKey(prediction: DashboardPrediction): string {
  return [
    prediction.predictorId,
    prediction.provider,
    prediction.forecastHorizon,
    prediction.accessCondition,
    prediction.promptStrategy
  ].join("::");
}

function getBestConfigurationKeysByModel(predictions: DashboardPrediction[]): Set<string> {
  const leaderboard = buildPredictionViewLeaderboardFromPredictions(predictions);
  const bestByModel = new Map<string, DashboardLeaderboardEntry>();
  const bestKeys = new Set<string>();

  for (const entry of leaderboard) {
    if (!entry.key) {
      continue;
    }

    const current = bestByModel.get(entry.model);
    if (!current || compareBestConfigurationEntry(entry, current) < 0) {
      bestByModel.set(entry.model, entry);
    }
  }

  for (const entry of bestByModel.values()) {
    if (!entry.key) {
      continue;
    }

    bestKeys.add(entry.key);
  }

  return bestKeys;
}

function buildPredictionViewLeaderboardFromPredictions(predictions: DashboardPrediction[]): DashboardLeaderboardEntry[] {
  const hasBenchmarkPredictions = predictions.some((prediction) => !prediction.id.startsWith("legacy:"));

  if (!hasBenchmarkPredictions) {
    return getLegacyLeaderboardFromPredictions(predictions);
  }

  return buildAnalyticsLeaderboard(predictions, "kicktipp_points_90")
    .map((row) => ({
      model: row.model,
      provider: row.provider,
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

function getLegacyLeaderboardFromPredictions(predictions: DashboardPrediction[]): DashboardLeaderboardEntry[] {
  const totals = new Map<string, DashboardLeaderboardEntry>();

  for (const prediction of predictions) {
    const current = totals.get(prediction.model) ?? {
      model: prediction.model,
      provider: prediction.provider,
      points: 0,
      exact: 0,
      scored: 0,
      pending: 0,
      key: getPredictionConfigurationKey(prediction),
      forecastHorizon: prediction.forecastHorizon,
      accessCondition: prediction.accessCondition,
      promptStrategy: prediction.promptStrategy
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

  return [...totals.values()].sort((a, b) =>
    b.points - a.points
    || b.exact - a.exact
    || b.scored - a.scored
    || a.model.localeCompare(b.model)
  );
}

function compareBestConfigurationEntry(left: DashboardLeaderboardEntry, right: DashboardLeaderboardEntry): number {
  return right.points - left.points
    || getPreferredAccessRank(left.accessCondition) - getPreferredAccessRank(right.accessCondition)
    || getPreferredPromptRank(left.promptStrategy) - getPreferredPromptRank(right.promptStrategy)
    || getPreferredHorizonRank(left.forecastHorizon) - getPreferredHorizonRank(right.forecastHorizon)
    || right.exact - left.exact
    || right.scored - left.scored
    || left.provider.localeCompare(right.provider)
    || (left.key ?? "").localeCompare(right.key ?? "");
}

function getPreferredAccessRank(value?: AccessCondition): number {
  if (value === "open_book") return 0;
  if (value === "closed_book") return 1;
  return 2;
}

function getPreferredPromptRank(value?: PromptStrategy): number {
  if (value === "probabilistic_forecast") return 0;
  if (value === "direct_score") return 1;
  return 2;
}

function getPreferredHorizonRank(value?: ForecastHorizon): number {
  if (value === "STAGE_OPENING") return 0;
  if (value === "T_24H") return 1;
  if (value === "T_2H") return 2;
  return 3;
}

function getAllPredictions(matches: DashboardMatch[]): DashboardPrediction[] {
  return matches.flatMap((match) => match.predictions);
}

function isSelected<T extends string>(value: T, selected: T[]): boolean {
  return selected.includes(value);
}

function sortedUnique<T extends string>(values: T[]): T[] {
  return [...new Set(values)].sort((a, b) => formatCondition(a).localeCompare(formatCondition(b)));
}

function formatProviderWithConfig(
  provider: string,
  accessCondition: AccessCondition,
  promptStrategy: PromptStrategy,
  forecastHorizon: ForecastHorizon
): string {
  return `${provider} / ${formatCondition(accessCondition)} / ${formatCondition(promptStrategy)} / ${forecastHorizon}`;
}
