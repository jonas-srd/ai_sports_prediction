"use client";

/**
 * Purpose: Client-side filters, charts, and detailed table for benchmark analytics.
 */
import { useMemo, useState } from "react";
import {
  buildAnalyticsLeaderboard,
  buildAnalyticsSeries,
  filterBenchmarkPredictions,
  formatCondition,
  formatMetricValue,
  formatStage,
  getDefaultAnalyticsFilters,
  getMetricDefinition,
  METRIC_DEFINITIONS,
  type AccessCondition,
  type AnalyticsFilters,
  type AnalyticsLeaderboardRow,
  type AnalyticsMetric,
  type AnalyticsSeries,
  type BenchmarkDisplayPrediction,
  type ForecastHorizon,
  type PromptStrategy,
  type TournamentStage
} from "@/lib/benchmark-analytics";
import { InfoTooltip, type TooltipLine } from "@/components/info-tooltip";

type AnalyticsDashboardProps = {
  predictions: BenchmarkDisplayPrediction[];
};

const METRICS = Object.keys(METRIC_DEFINITIONS) as AnalyticsMetric[];
const SERIES_COLORS = ["#b33a27", "#204f35", "#d69632", "#263b67", "#7d2b1f", "#0d6b5f", "#7f5b24", "#443a2f"];
const FILTER_HELP = {
  metric: "Choose the evaluation metric used for ranking models, for example scores, Brier score, or log loss.",
  forecastHorizon: "Filter predictions by when they were made, such as stage-opening, 24 hours before kickoff, or 1 hour before kickoff.",
  access: "Filter whether the model predicted from its own knowledge only or was allowed to use web-search/tool access.",
  prompt: "Filter the prompt format used for the prediction, for example direct score prediction or probabilistic forecast.",
  stage: "Filter matches by tournament stage, such as group stage or knockout rounds.",
  model: "Show predictions from one model configuration or compare all models.",
  provider: "Filter by model provider or model family, such as OpenAI, Anthropic, Google, or Mistral.",
  from: "Only include matches scheduled on or after this date.",
  to: "Only include matches scheduled on or before this date."
} as const;

export function AnalyticsDashboard({ predictions }: AnalyticsDashboardProps) {
  const defaultFilters = useMemo(() => getDefaultAnalyticsFilters(predictions), [predictions]);
  const [filters, setFilters] = useState<AnalyticsFilters>(defaultFilters);
  const [metric, setMetric] = useState<AnalyticsMetric>("kicktipp_points_90");
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

  const options = useMemo(() => getFilterOptions(predictions), [predictions]);
  const filteredPredictions = useMemo(
    () => filterBenchmarkPredictions(predictions, filters),
    [predictions, filters]
  );
  const leaderboard = useMemo(
    () => buildAnalyticsLeaderboard(filteredPredictions, metric),
    [filteredPredictions, metric]
  );
  const series = useMemo(
    () => buildAnalyticsSeries(filteredPredictions, metric, highlightedKey),
    [filteredPredictions, metric, highlightedKey]
  );
  const metricDefinition = getMetricDefinition(metric);

  if (predictions.length === 0) {
    return (
      <section className="panel analyticsEmptyPanel">
        <p className="sectionKicker">No benchmark predictions</p>
        <h2>Analytics will appear after benchmark predictions are generated</h2>
        <p>
          Run the benchmark prediction pipeline first. Legacy MVP predictions are intentionally excluded from this page.
        </p>
      </section>
    );
  }

  return (
    <div className="analyticsStack">
      <div className="fullDatasetExportBar">
        <div className="fullDatasetExportBox">
          <button
            className="clearFilterButton exportCsvButton"
            type="button"
            onClick={() => exportFullDatasetCsv(predictions)}
          >
            Full dataset export to CSV
          </button>
        </div>
      </div>

      <section className="panel analyticsFiltersPanel">
        <div className="panelHeader">
          <div>
            <p className="sectionKicker">Filters</p>
            <h2>Benchmark slice</h2>
          </div>
          <button className="clearFilterButton" type="button" onClick={() => {
            setFilters(defaultFilters);
            setHighlightedKey(null);
          }}>
            Reset
          </button>
        </div>

        <div className="analyticsFilterGrid">
          <SelectFilter
            label="Metric"
            help={FILTER_HELP.metric}
            value={metric}
            options={METRICS.map((entry) => ({ value: entry, label: METRIC_DEFINITIONS[entry].label }))}
            onChange={(value) => setMetric(value as AnalyticsMetric)}
          />
          <SelectFilter
            label="Forecast horizon"
            help={FILTER_HELP.forecastHorizon}
            value={filters.forecastHorizon}
            options={[{ value: "all", label: "All horizons" }, ...options.forecastHorizons.map((value) => ({ value, label: value }))]}
            onChange={(value) => updateFilter(setFilters, "forecastHorizon", value as AnalyticsFilters["forecastHorizon"])}
          />
          <SelectFilter
            label="Access"
            help={FILTER_HELP.access}
            value={filters.accessCondition}
            options={[{ value: "all", label: "All access" }, ...options.accessConditions.map((value) => ({ value, label: formatCondition(value) }))]}
            onChange={(value) => updateFilter(setFilters, "accessCondition", value as AnalyticsFilters["accessCondition"])}
          />
          <SelectFilter
            label="Prompt"
            help={FILTER_HELP.prompt}
            value={filters.promptStrategy}
            options={[{ value: "all", label: "All prompts" }, ...options.promptStrategies.map((value) => ({ value, label: formatCondition(value) }))]}
            onChange={(value) => updateFilter(setFilters, "promptStrategy", value as AnalyticsFilters["promptStrategy"])}
          />
          <SelectFilter
            label="Stage"
            help={FILTER_HELP.stage}
            value={filters.stage}
            options={[{ value: "all", label: "All stages" }, ...options.stages.map((value) => ({ value, label: formatStage(value) }))]}
            onChange={(value) => updateFilter(setFilters, "stage", value as AnalyticsFilters["stage"])}
          />
          <SelectFilter
            label="Model"
            help={FILTER_HELP.model}
            value={filters.model}
            options={[{ value: "all", label: "All models" }, ...options.models.map((value) => ({ value, label: value }))]}
            onChange={(value) => updateFilter(setFilters, "model", value)}
          />
          <SelectFilter
            label="Provider"
            help={FILTER_HELP.provider}
            value={filters.provider}
            options={[{ value: "all", label: "All providers" }, ...options.providers.map((value) => ({ value, label: value }))]}
            onChange={(value) => updateFilter(setFilters, "provider", value)}
          />
          <DateFilter
            label="From"
            help={FILTER_HELP.from}
            value={filters.dateFrom}
            onChange={(value) => updateFilter(setFilters, "dateFrom", value)}
          />
          <DateFilter
            label="To"
            help={FILTER_HELP.to}
            value={filters.dateTo}
            onChange={(value) => updateFilter(setFilters, "dateTo", value)}
          />
        </div>
      </section>

      <section className="analyticsChartGrid">
        <div className="panel analyticsChartPanel">
          <div className="analyticsChartHeader">
            <div>
              <p className="sectionKicker">Ranked leaderboard</p>
              <h2>{metricDefinition.label}</h2>
            </div>
            <span className="metricDirectionBadge">{metricDefinition.direction === "higher" ? "Higher is better" : "Lower is better"}</span>
          </div>
          <RankedBarChart
            highlightedKey={highlightedKey}
            metric={metric}
            rows={leaderboard}
            onSelect={(key) => setHighlightedKey(highlightedKey === key ? null : key)}
          />
        </div>

        <div className="panel analyticsChartPanel">
          <div className="analyticsChartHeader">
            <div>
              <p className="sectionKicker">Match order</p>
              <h2>Performance over time</h2>
            </div>
            {highlightedKey ? (
              <button className="clearFilterButton" type="button" onClick={() => setHighlightedKey(null)}>
                Clear highlight
              </button>
            ) : null}
          </div>
          <LineChart metric={metric} series={series} />
        </div>
      </section>

      <section className="panel analyticsTablePanel">
        <div className="panelHeader">
          <div>
            <p className="sectionKicker">Detailed leaderboard</p>
            <h2>Model configurations</h2>
          </div>
          <span className="tableSummary">{leaderboard.length} rows / {filteredPredictions.length} predictions</span>
        </div>
        <AnalyticsTable
          highlightedKey={highlightedKey}
          metric={metric}
          rows={leaderboard}
          onSelect={(key) => setHighlightedKey(highlightedKey === key ? null : key)}
        />
      </section>
    </div>
  );
}

function RankedBarChart({
  rows,
  metric,
  highlightedKey,
  onSelect
}: {
  rows: AnalyticsLeaderboardRow[];
  metric: AnalyticsMetric;
  highlightedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const metricDefinition = getMetricDefinition(metric);
  const values = rows.map((row) => row.metricValue).filter((value): value is number => value !== null);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;

  if (rows.length === 0) {
    return <EmptyChart label="No rows match the selected filters." />;
  }

  return (
    <div className="rankedBarChart">
      {rows.slice(0, 12).map((row) => {
        const value = row.metricValue;
        const width = getBarWidth(value, min, max, metricDefinition.direction);
        return (
          <button
            className={`barChartRow${highlightedKey === row.key ? " isSelected" : ""}`}
            key={row.key}
            type="button"
            onClick={() => onSelect(row.key)}
          >
            <span className="barRank">#{row.rank}</span>
            <span className="barLabel barModelLabel">
              <span>{row.model}</span>
              <InfoTooltip
                label={`${row.model} configuration`}
                lines={buildModelConfigurationHelp(row)}
              />
            </span>
            <span className="barTrack">
              <span className="barFill" style={{ width: `${width}%` }} />
            </span>
            <strong>{metricDefinition.format(value)}</strong>
          </button>
        );
      })}
    </div>
  );
}

function getBarWidth(value: number | null, min: number, max: number, direction: "higher" | "lower"): number {
  if (value === null) {
    return 0;
  }

  if (max === min) {
    return 100;
  }

  const normalized = direction === "higher"
    ? (value - min) / (max - min)
    : (max - value) / (max - min);

  return Math.max(4, Math.min(100, normalized * 100));
}

function LineChart({ series, metric }: { series: AnalyticsSeries[]; metric: AnalyticsMetric }) {
  const metricDefinition = getMetricDefinition(metric);
  const allValues = series.flatMap((entry) => entry.values.map((value) => value.value)).filter((value): value is number => value !== null);

  if (series.length === 0 || allValues.length === 0) {
    return <EmptyChart label="No scored values yet for this metric and filter set." />;
  }

  const domain = getLineChartDomain(metricDefinition, allValues);
  const min = domain.min;
  const max = domain.max;
  const mid = min + (max - min) / 2;
  const range = max - min || 1;
  const maxLength = Math.max(...series.map((entry) => entry.values.length), 1);
  const xTicks = buildMatchOrderTicks(maxLength);

  return (
    <div className="lineChartWrap">
      <svg className="lineChart" role="img" viewBox="0 0 720 300" aria-label={`${metricDefinition.label} over matches`}>
        <line className="chartAxis" x1="54" x2="690" y1="248" y2="248" />
        <line className="chartAxis" x1="54" x2="54" y1="24" y2="248" />
        <line className="chartGridLine" x1="54" x2="690" y1="136" y2="136" />
        <text className="chartTickLabel" x="46" y="30" textAnchor="end">{metricDefinition.format(max)}</text>
        <text className="chartTickLabel" x="46" y="140" textAnchor="end">{metricDefinition.format(mid)}</text>
        <text className="chartTickLabel" x="46" y="252" textAnchor="end">{metricDefinition.format(min)}</text>
        {xTicks.map((tick) => {
          const x = getChartX(tick, maxLength);
          return (
            <g key={tick}>
              <line className="chartTick" x1={x} x2={x} y1="248" y2="254" />
              <text className="chartTickLabel" x={x} y="268" textAnchor="middle">{tick}</text>
            </g>
          );
        })}
        <text className="chartAxisLabel" x="372" y="292" textAnchor="middle">Match order</text>
        <text className="chartAxisLabel" textAnchor="middle" transform="translate(14 136) rotate(-90)">
          {metricDefinition.shortLabel}
        </text>
        {series.map((entry, index) => {
          const points = entry.values
            .filter((point) => point.value !== null)
            .map((point) => {
              const x = getChartX(point.matchOrder, maxLength);
              const y = 248 - (((point.value ?? min) - min) / range) * 224;
              return `${x},${y}`;
            });

          return points.length > 0 ? (
            <polyline
              fill="none"
              key={entry.key}
              points={points.join(" ")}
              stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
          ) : null;
        })}
      </svg>
      <div className="lineChartLegend">
        {series.map((entry, index) => (
          <span key={entry.key}>
            <i style={{ background: SERIES_COLORS[index % SERIES_COLORS.length] }} />
            {entry.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function AnalyticsTable({
  rows,
  metric,
  highlightedKey,
  onSelect
}: {
  rows: AnalyticsLeaderboardRow[];
  metric: AnalyticsMetric;
  highlightedKey: string | null;
  onSelect: (key: string) => void;
}) {
  if (rows.length === 0) {
    return <EmptyChart label="No table rows match the selected filters." />;
  }

  return (
    <div className="analyticsTableScroll">
      <table className="analyticsTable">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Model</th>
            <th>Provider</th>
            <th>Horizon</th>
            <th>Access</th>
            <th>Prompt</th>
            <th>Scored</th>
            <th>Scores</th>
            <th>Brier</th>
            <th>Log loss</th>
            <th>Top acc.</th>
            <th>Exact</th>
            <th>GD acc.</th>
            <th>Total-goals err.</th>
            <th>Invalid</th>
            <th>Repair</th>
            <th>Search</th>
            <th>Selected metric</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className={highlightedKey === row.key ? "isSelected" : ""}
              key={row.key}
              onClick={() => onSelect(row.key)}
            >
              <td>#{row.rank}</td>
              <td>
                <span className="modelConfigCell">
                  <span>{row.model}</span>
                  <InfoTooltip
                    label={`${row.model} configuration`}
                    lines={buildModelConfigurationHelp(row)}
                  />
                </span>
              </td>
              <td>{row.provider}</td>
              <td>{row.forecastHorizon}</td>
              <td>{formatCondition(row.accessCondition)}</td>
              <td>{formatCondition(row.promptStrategy)}</td>
              <td>{row.matchesScored}</td>
              <td>{formatMetricValue("kicktipp_points_90", row.kicktippPoints90)}</td>
              <td>{formatMetricValue("brier_90", row.brier90)}</td>
              <td>{formatMetricValue("log_loss_90", row.logLoss90)}</td>
              <td>{formatMetricValue("top_outcome_accuracy_90", row.topOutcomeAccuracy90)}</td>
              <td>{formatMetricValue("exact_score_accuracy_90", row.exactScoreAccuracy90)}</td>
              <td>{formatMetricValue("goal_difference_accuracy_90", row.goalDifferenceAccuracy90)}</td>
              <td>{formatMetricValue("mean_total_goals_abs_error_90", row.meanTotalGoalsAbsError90)}</td>
              <td>{formatMetricValue("invalid_output_rate", row.invalidOutputRate)}</td>
              <td>{formatMetricValue("repair_rate", row.repairRate)}</td>
              <td>{formatMetricValue("open_book_search_observed_rate", row.openBookSearchObservedRate)}</td>
              <td>{formatMetricValue(metric, row.metricValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SelectFilter({
  label,
  help,
  value,
  options,
  onChange
}: {
  label: string;
  help: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="filterField">
      <FilterLabel help={help} label={label} />
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function getLineChartDomain(metricDefinition: ReturnType<typeof getMetricDefinition>, values: number[]): { min: number; max: number } {
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (metricDefinition.kind === "rate") {
    return getRateChartDomain(minValue, maxValue);
  }

  return getNumericChartDomain(minValue, maxValue);
}

function getRateChartDomain(minValue: number, maxValue: number): { min: number; max: number } {
  if (minValue === maxValue) {
    if (maxValue >= 1) {
      return { min: 0.9, max: 1 };
    }

    if (minValue <= 0) {
      return { min: 0, max: 0.1 };
    }

    const padding = Math.max(0.05, Math.abs(maxValue) * 0.1);
    return {
      min: Math.max(0, minValue - padding),
      max: Math.min(1, maxValue + padding)
    };
  }

  const range = maxValue - minValue;
  const padding = Math.max(0.02, range * 0.14);

  return {
    min: Math.max(0, minValue - padding),
    max: Math.min(1, maxValue + padding)
  };
}

function getNumericChartDomain(minValue: number, maxValue: number): { min: number; max: number } {
  if (minValue === maxValue) {
    const padding = Math.max(0.01, Math.abs(maxValue) * 0.1, maxValue === 0 ? 1 : 0);
    return roundChartDomain(minValue - padding, maxValue + padding);
  }

  const range = maxValue - minValue;
  const padding = Math.max(range * 0.14, Math.abs(maxValue) * 0.02, 0.01);
  return roundChartDomain(minValue - padding, maxValue + padding);
}

function roundChartDomain(rawMin: number, rawMax: number): { min: number; max: number } {
  const range = rawMax - rawMin || 1;
  const step = niceNumber(range / 2);
  const min = Math.floor(rawMin / step) * step;
  const max = Math.ceil(rawMax / step) * step;

  return min === max ? { min: min - step, max: max + step } : { min, max };
}

function niceNumber(value: number): number {
  const exponent = Math.floor(Math.log10(Math.max(value, Number.EPSILON)));
  const fraction = value / 10 ** exponent;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;

  return niceFraction * 10 ** exponent;
}

function getChartX(matchOrder: number, maxLength: number): number {
  return 54 + ((matchOrder - 1) / Math.max(maxLength - 1, 1)) * 636;
}

function buildMatchOrderTicks(maxLength: number): number[] {
  if (maxLength <= 1) {
    return [1];
  }

  const desiredTickCount = Math.min(6, maxLength);
  const step = Math.max(1, Math.ceil((maxLength - 1) / (desiredTickCount - 1)));
  const ticks: number[] = [];

  for (let tick = 1; tick < maxLength; tick += step) {
    ticks.push(tick);
  }

  if (ticks[ticks.length - 1] !== maxLength) {
    ticks.push(maxLength);
  }

  return ticks;
}

function DateFilter({
  label,
  help,
  value,
  onChange
}: {
  label: string;
  help: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="filterField">
      <FilterLabel help={help} label={label} />
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function FilterLabel({ label, help }: { label: string; help: string }) {
  return (
    <span className="filterLabel">
      <span>{label}</span>
      <InfoTooltip label={label} text={help} />
    </span>
  );
}

function buildModelConfigurationHelp(row: AnalyticsLeaderboardRow): TooltipLine[] {
  const stages = row.stages.length > 0
    ? row.stages.map(formatStage).join(", ")
    : "the currently selected stages";

  return [
    {
      label: row.forecastHorizon,
      text: explainForecastHorizon(row.forecastHorizon)
    },
    {
      label: formatCondition(row.accessCondition),
      text: explainAccessCondition(row.accessCondition)
    },
    {
      label: formatCondition(row.promptStrategy),
      text: explainPromptStrategy(row.promptStrategy)
    },
    {
      label: "Stage coverage",
      text: stages
    },
    {
      label: "Predictions",
      text: `${row.predictionsTotal} total predictions in this configuration.`
    },
    {
      label: "Evaluation",
      text: `${row.matchesScored} match(es) currently have evaluation scores.`
    }
  ];
}

function explainForecastHorizon(value: string): string {
  if (value === "STAGE_OPENING") {
    return "Stage opening means these predictions were generated once at the start of the stage, before the group-stage run.";
  }

  if (value === "T_24H") {
    return "T_24H means the prediction was scheduled approximately 24 hours before kickoff.";
  }

  if (value === "T_1H") {
    return "T_1H means the prediction was scheduled approximately 1 hour before kickoff.";
  }

  return `${value} is the forecast horizon used for this configuration.`;
}

function explainAccessCondition(value: string): string {
  if (value === "open_book") {
    return "Open book means the model was allowed to use configured web-search/tool access before answering.";
  }

  if (value === "closed_book") {
    return "Closed book means the model had to answer from its internal knowledge only, without search/tool access.";
  }

  return `${formatCondition(value)} is the access condition for this configuration.`;
}

function explainPromptStrategy(value: string): string {
  if (value === "direct_score") {
    return "Direct score asks the model for the most likely scoreline plus required probabilities.";
  }

  if (value === "probabilistic_forecast") {
    return "Probabilistic forecast emphasizes calibrated outcome probabilities before the scoreline.";
  }

  return `${formatCondition(value)} is the prompt strategy used for this configuration.`;
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="emptyState analyticsEmptyState">
      <strong>No data</strong>
      <p>{label}</p>
    </div>
  );
}

function getFilterOptions(predictions: BenchmarkDisplayPrediction[]) {
  return {
    forecastHorizons: sortedUnique(predictions.map((prediction) => prediction.forecastHorizon)) as ForecastHorizon[],
    accessConditions: sortedUnique(predictions.map((prediction) => prediction.accessCondition)) as AccessCondition[],
    promptStrategies: sortedUnique(predictions.map((prediction) => prediction.promptStrategy)) as PromptStrategy[],
    stages: sortedUnique(predictions.map((prediction) => prediction.stage)) as TournamentStage[],
    models: sortedUnique(predictions.map((prediction) => prediction.model)),
    providers: sortedUnique(predictions.map((prediction) => prediction.provider))
  };
}

function updateFilter<K extends keyof AnalyticsFilters>(
  setFilters: (updater: (current: AnalyticsFilters) => AnalyticsFilters) => void,
  key: K,
  value: AnalyticsFilters[K]
): void {
  setFilters((current) => ({ ...current, [key]: value }));
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function exportFullDatasetCsv(predictions: BenchmarkDisplayPrediction[]): void {
  const headers = [
    "Prediction ID",
    "Match ID",
    "Match date",
    "Stage",
    "Home team",
    "Away team",
    "Actual home 90",
    "Actual away 90",
    "Actual home full",
    "Actual away full",
    "Actual advancer",
    "Model",
    "Provider",
    "Predictor ID",
    "Horizon",
    "Access",
    "Prompt",
    "Sample ID",
    "Predicted home 90",
    "Predicted away 90",
    "Predicted home full",
    "Predicted away full",
    "Home win 90 prob",
    "Draw 90 prob",
    "Away win 90 prob",
    "Home win full prob",
    "Draw full prob",
    "Away win full prob",
    "Home advances prob",
    "Away advances prob",
    "Confidence",
    "Reason",
    "Validation status",
    "Valid for scoring",
    "Repair attempted",
    "Normalization applied",
    "Open-book compliance",
    "Tools enabled",
    "Tool calls observed",
    "Number of tool calls",
    "Brier 90",
    "Log loss 90",
    "Top outcome correct 90",
    "Exact score correct 90",
    "Goal difference correct 90",
    "Tendency correct from score",
    "Home goal abs error 90",
    "Away goal abs error 90",
    "Total goals abs error 90",
    "Goal difference abs error 90",
    "Scores 90",
    "Advancement accuracy",
    "Score/prob argmax consistent 90"
  ];
  const rows = predictions.map((prediction) => [
    prediction.id,
    prediction.matchId,
    prediction.matchDate,
    formatStage(prediction.stage),
    prediction.homeTeam ?? "",
    prediction.awayTeam ?? "",
    prediction.actualHome90 ?? null,
    prediction.actualAway90 ?? null,
    prediction.actualHomeFull ?? null,
    prediction.actualAwayFull ?? null,
    prediction.actualAdvancer ?? null,
    prediction.model,
    prediction.provider,
    prediction.predictorId,
    prediction.forecastHorizon,
    formatCondition(prediction.accessCondition),
    formatCondition(prediction.promptStrategy),
    prediction.sampleId,
    prediction.predictedHome,
    prediction.predictedAway,
    prediction.predictedFullHome,
    prediction.predictedFullAway,
    prediction.homeWin90Prob,
    prediction.draw90Prob,
    prediction.awayWin90Prob,
    prediction.homeWinFullProb,
    prediction.drawFullProb,
    prediction.awayWinFullProb,
    prediction.homeAdvancesProb,
    prediction.awayAdvancesProb,
    prediction.confidence,
    prediction.reason,
    prediction.validationStatus,
    prediction.isValidForScoring,
    prediction.repairAttempted,
    prediction.normalizationApplied,
    prediction.openBookCompliance,
    prediction.toolsEnabled,
    prediction.toolCallsObserved,
    prediction.numToolCalls,
    prediction.brier90,
    prediction.logLoss90,
    prediction.topOutcomeCorrect90,
    prediction.exactScore90Correct,
    prediction.goalDifference90Correct,
    prediction.tendency90CorrectFromScore,
    prediction.homeGoalAbsError90,
    prediction.awayGoalAbsError90,
    prediction.totalGoalsAbsError90,
    prediction.goalDifferenceAbsError90,
    prediction.kicktippPoints90,
    prediction.advancementAccuracy,
    prediction.scoreResultMatchesProbArgmax90
  ]);

  downloadCsv(
    `worldcup2026-full-prediction-dataset-${new Date().toISOString().slice(0, 10)}.csv`,
    headers,
    rows
  );
}

function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>
): void {
  const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string | number | boolean | null | undefined): string {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}
