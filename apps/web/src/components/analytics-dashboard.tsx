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
import type { DashboardSpecialPrediction } from "@/lib/dashboard-data";
import { InfoTooltip, type TooltipLine } from "@/components/info-tooltip";
import { type Locale } from "@/lib/i18n";
import { getModelWarning, hasModelWarning } from "@/lib/model-warnings";

type AnalyticsDashboardProps = {
  locale: Locale;
  predictions: BenchmarkDisplayPrediction[];
  specialPredictions: DashboardSpecialPrediction[];
};

const METRICS = Object.keys(METRIC_DEFINITIONS) as AnalyticsMetric[];
const SERIES_STYLES = [
  { color: "#b33a27", dash: "", width: 4.5 },
  { color: "#204f35", dash: "10 5", width: 4.2 },
  { color: "#263b67", dash: "2 5", width: 4.2 },
  { color: "#8a5a00", dash: "14 5 2 5", width: 4.2 },
  { color: "#7d2b1f", dash: "7 4", width: 3.8 },
  { color: "#0d6b5f", dash: "2 4 10 4", width: 3.8 },
  { color: "#5b3a89", dash: "12 6", width: 3.8 },
  { color: "#443a2f", dash: "3 5", width: 3.8 }
];
const FILTER_HELP = {
  en: {
    metric: "Choose the evaluation metric used for ranking models, for example points, Brier score, or log loss.",
    forecastHorizon: "Choose one or more prediction horizons, such as stage-opening, 24 hours before kickoff, or 2 hours before kickoff.",
    access: "Choose one or more access conditions: internal knowledge only or web-search/tool access.",
    prompt: "Choose one or more prompt formats, for example direct score prediction or probabilistic forecast.",
    stage: "Choose one or more tournament stages, such as group stage or knockout rounds.",
    model: "Choose one or more model configurations to compare.",
    provider: "Choose one or more providers or model families, such as OpenAI, Anthropic, Google, or Mistral.",
    from: "Only include matches scheduled on or after this date.",
    to: "Only include matches scheduled on or before this date."
  },
  de: {
    metric: "Wählt die Bewertungsmetrik für das Modellranking, zum Beispiel Punkte, Brier Score oder Log Loss.",
    forecastHorizon: "Filtert Prognosen danach, wann sie erstellt wurden, etwa zum Phasenstart, 24 Stunden vor Anpfiff oder 2 Stunden vor Anpfiff.",
    access: "Filtert, ob das Modell nur aus eigenem Wissen prognostiziert hat oder Websuche/Tools nutzen durfte.",
    prompt: "Filtert das Prompt-Format der Prognose, zum Beispiel Direct Score oder Probabilistic Forecast.",
    stage: "Filtert Spiele nach Turnierphase, etwa Gruppenphase oder K.-o.-Runden.",
    model: "Zeigt Prognosen einer Modellkonfiguration oder vergleicht alle Modelle.",
    provider: "Filtert nach Modellanbieter oder Modellfamilie.",
    from: "Berücksichtigt nur Spiele ab diesem Datum.",
    to: "Berücksichtigt nur Spiele bis zu diesem Datum."
  }
} as const;

const ANALYTICS_TEXT = {
  en: {
    noBenchmark: "No benchmark predictions",
    noBenchmarkTitle: "Analytics will appear after benchmark predictions are generated",
    noBenchmarkDescription: "Run the benchmark prediction pipeline first. Legacy MVP predictions are intentionally excluded from this page.",
    exportCsv: "Full dataset export to CSV",
    filters: "Filters",
    benchmarkSlice: "Benchmark slice",
    reset: "Reset",
    metric: "Metric",
    forecastHorizon: "Forecast horizon",
    access: "Access",
    prompt: "Prompt",
    stage: "Stage",
    model: "Model",
    provider: "Provider",
    from: "From",
    to: "To",
    allHorizons: "All horizons",
    allAccess: "All access",
    allPrompts: "All prompts",
    allStages: "All stages",
    allModels: "All models",
    allProviders: "All providers",
    clear: "Clear",
    selectAll: "Select all",
    rankedLeaderboard: "Ranked leaderboard",
    higherBetter: "Higher is better",
    lowerBetter: "Lower is better",
    matchOrder: "Resulted match order",
    performanceOverTime: "Performance over time",
    clearHighlight: "Clear highlight",
    detailedLeaderboard: "Detailed leaderboard",
    modelConfigurations: "Model configurations",
    rows: "rows",
    predictions: "predictions",
    noRowsFilters: "No rows match the selected filters.",
    noScoredValues: "No scored values yet for this metric and filter set.",
    noTableRows: "No table rows match the selected filters.",
    noData: "No data",
    selectedMetric: "Selected metric",
    rank: "Rank",
    horizon: "Horizon",
    scored: "Scored",
    scores: "Points",
    brier: "Brier",
    logLoss: "Log loss",
    topAcc: "Top acc.",
    exact: "Exact",
    gdAcc: "GD acc.",
    totalGoalsErr: "Total-goals err.",
    invalid: "Invalid",
    repair: "Repair",
    search: "Search",
    config: "configuration",
    stageCoverage: "Stage coverage",
    predictionsTotal: "total predictions in this configuration.",
    evaluationScores: "match(es) currently have evaluation scores.",
    currentStages: "the currently selected stages",
    stageOpening: "Stage opening means these predictions were generated once at the start of the stage, before the group-stage run.",
    t24h: "T_24H means the prediction was scheduled approximately 24 hours before kickoff.",
    t2h: "T_2H means the prediction was scheduled approximately 2 hours before kickoff.",
    forecastFallback: "is the forecast horizon used for this configuration.",
    openBook: "Open book means the model was allowed to use configured web-search/tool access before answering.",
    closedBook: "Closed book means the model had to answer from its internal knowledge only, without search/tool access.",
    accessFallback: "is the access condition for this configuration.",
    directScore: "Direct score asks the model for the most likely scoreline plus required probabilities.",
    probabilistic: "Probabilistic forecast emphasizes calibrated outcome probabilities before the scoreline.",
    promptFallback: "is the prompt strategy used for this configuration.",
    partialCoverage: "Partial coverage"
  },
  de: {
    noBenchmark: "Keine Benchmark-Prognosen",
    noBenchmarkTitle: "Die Analyse erscheint nach dem Erzeugen von Benchmark-Prognosen",
    noBenchmarkDescription: "Starte zuerst die Benchmark-Pipeline. Alte MVP-Prognosen werden auf dieser Seite bewusst ausgeschlossen.",
    exportCsv: "Vollständigen Datensatz als CSV exportieren",
    filters: "Filter",
    benchmarkSlice: "Benchmark-Ausschnitt",
    reset: "Zurücksetzen",
    metric: "Metrik",
    forecastHorizon: "Prognosehorizont",
    access: "Zugriff",
    prompt: "Prompt",
    stage: "Turnierphase",
    model: "Modell",
    provider: "Anbieter",
    from: "Von",
    to: "Bis",
    allHorizons: "Alle Horizonte",
    allAccess: "Alle Zugriffe",
    allPrompts: "Alle Prompts",
    allStages: "Alle Phasen",
    allModels: "Alle Modelle",
    allProviders: "Alle Anbieter",
    clear: "Leeren",
    selectAll: "Alle wählen",
    rankedLeaderboard: "Rangliste",
    higherBetter: "Höher ist besser",
    lowerBetter: "Niedriger ist besser",
    matchOrder: "Reihenfolge gewerteter Spiele",
    performanceOverTime: "Leistung im Zeitverlauf",
    clearHighlight: "Hervorhebung löschen",
    detailedLeaderboard: "Detaillierte Rangliste",
    modelConfigurations: "Modellkonfigurationen",
    rows: "Zeilen",
    predictions: "Prognosen",
    noRowsFilters: "Keine Zeilen passen zu den ausgewählten Filtern.",
    noScoredValues: "Noch keine gewerteten Werte für diese Metrik und Filterauswahl.",
    noTableRows: "Keine Tabellenzeilen passen zu den ausgewählten Filtern.",
    noData: "Keine Daten",
    selectedMetric: "Ausgewählte Metrik",
    rank: "Rang",
    horizon: "Horizont",
    scored: "Gewertet",
    scores: "Punkte",
    brier: "Brier",
    logLoss: "Log Loss",
    topAcc: "Top-Gen.",
    exact: "Exakt",
    gdAcc: "TD-Gen.",
    totalGoalsErr: "Torfehler",
    invalid: "Ungültig",
    repair: "Reparatur",
    search: "Suche",
    config: "Konfiguration",
    stageCoverage: "Phasenabdeckung",
    predictionsTotal: "Prognosen insgesamt in dieser Konfiguration.",
    evaluationScores: "Spiel(e) haben aktuell Auswertungen.",
    currentStages: "die aktuell ausgewählten Phasen",
    stageOpening: "Stage Opening bedeutet, dass diese Prognosen einmal zu Beginn der Phase erzeugt wurden.",
    t24h: "T_24H bedeutet, dass die Prognose ungefähr 24 Stunden vor Anpfiff geplant wurde.",
    t2h: "T_2H bedeutet, dass die Prognose ungefähr 2 Stunden vor Anpfiff geplant wurde.",
    forecastFallback: "ist der Prognosehorizont dieser Konfiguration.",
    openBook: "Open Book bedeutet, dass das Modell konfigurierte Websuche/Tools verwenden durfte.",
    closedBook: "Closed Book bedeutet, dass das Modell ohne Suche/Tools aus internem Wissen antworten musste.",
    accessFallback: "ist die Zugriffsbedingung dieser Konfiguration.",
    directScore: "Direct Score fragt nach dem wahrscheinlichsten Ergebnis plus benötigten Wahrscheinlichkeiten.",
    probabilistic: "Probabilistic Forecast betont kalibrierte Ergebniswahrscheinlichkeiten vor dem Ergebnis-Tipp.",
    promptFallback: "ist die Prompt-Strategie dieser Konfiguration.",
    partialCoverage: "Teilabdeckung"
  }
} as const;

export function AnalyticsDashboard({ locale, predictions, specialPredictions }: AnalyticsDashboardProps) {
  const text = ANALYTICS_TEXT[locale];
  const defaultFilters = useMemo(() => getDefaultAnalyticsFilters(), []);
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
  const seriesOrder = useMemo(() => leaderboard.map((row) => row.key), [leaderboard]);
  const series = useMemo(
    () => buildAnalyticsSeries(filteredPredictions, metric, highlightedKey, seriesOrder),
    [filteredPredictions, metric, highlightedKey, seriesOrder]
  );
  const metricDefinition = getMetricDefinition(metric);

  if (predictions.length === 0) {
    return (
      <section className="panel analyticsEmptyPanel">
        <p className="sectionKicker">{text.noBenchmark}</p>
        <h2>{text.noBenchmarkTitle}</h2>
        <p>
          {text.noBenchmarkDescription}
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
            onClick={() => exportFullDatasetCsv(predictions, specialPredictions)}
          >
            {text.exportCsv}
          </button>
        </div>
      </div>

      <section
        className="panel analyticsFiltersPanel"
        onClickCapture={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest(".analyticsDropdownShell")) {
            return;
          }

          event.currentTarget
            .querySelectorAll<HTMLDetailsElement>(".analyticsDropdownShell[open]")
            .forEach((dropdown) => {
              dropdown.open = false;
            });
        }}
      >
        <div className="panelHeader">
          <div>
            <p className="sectionKicker">{text.filters}</p>
            <h2>{text.benchmarkSlice}</h2>
          </div>
          <button className="clearFilterButton" type="button" onClick={() => {
            setFilters(defaultFilters);
            setHighlightedKey(null);
          }}>
            {text.reset}
          </button>
        </div>

        <div className="analyticsFilterGrid">
          <SelectFilter
            label={text.metric}
            help={FILTER_HELP[locale].metric}
            value={metric}
            options={METRICS.map((entry) => ({ value: entry, label: formatMetricLabel(entry, locale) }))}
            onChange={(value) => {
              setMetric(value as AnalyticsMetric);
              setHighlightedKey(null);
            }}
          />
          <MultiSelectFilter
            label={text.forecastHorizon}
            help={FILTER_HELP[locale].forecastHorizon}
            clearLabel={text.clear}
            selectAllLabel={text.selectAll}
            values={options.forecastHorizons}
            selected={filters.forecastHorizons}
            allLabel={text.allHorizons}
            formatValue={(value) => value}
            onChange={(value) => updateFilter(setFilters, "forecastHorizons", value)}
          />
          <MultiSelectFilter
            label={text.access}
            help={FILTER_HELP[locale].access}
            clearLabel={text.clear}
            selectAllLabel={text.selectAll}
            values={options.accessConditions}
            selected={filters.accessConditions}
            allLabel={text.allAccess}
            formatValue={formatCondition}
            onChange={(value) => updateFilter(setFilters, "accessConditions", value)}
          />
          <MultiSelectFilter
            label={text.prompt}
            help={FILTER_HELP[locale].prompt}
            clearLabel={text.clear}
            selectAllLabel={text.selectAll}
            values={options.promptStrategies}
            selected={filters.promptStrategies}
            allLabel={text.allPrompts}
            formatValue={formatCondition}
            onChange={(value) => updateFilter(setFilters, "promptStrategies", value)}
          />
          <MultiSelectFilter
            label={text.stage}
            help={FILTER_HELP[locale].stage}
            clearLabel={text.clear}
            selectAllLabel={text.selectAll}
            values={options.stages}
            selected={filters.stages}
            allLabel={text.allStages}
            formatValue={formatStage}
            onChange={(value) => updateFilter(setFilters, "stages", value)}
          />
          <MultiSelectFilter
            label={text.model}
            help={FILTER_HELP[locale].model}
            clearLabel={text.clear}
            selectAllLabel={text.selectAll}
            values={options.models}
            selected={filters.models}
            allLabel={text.allModels}
            formatValue={(value) => value}
            onChange={(value) => updateFilter(setFilters, "models", value)}
          />
          <MultiSelectFilter
            label={text.provider}
            help={FILTER_HELP[locale].provider}
            clearLabel={text.clear}
            selectAllLabel={text.selectAll}
            values={options.providers}
            selected={filters.providers}
            allLabel={text.allProviders}
            formatValue={(value) => value}
            onChange={(value) => updateFilter(setFilters, "providers", value)}
          />
          <div className="dateRangeFilterRow">
            <DateFilter
              label={text.from}
              help={FILTER_HELP[locale].from}
              value={filters.dateFrom}
              onChange={(value) => updateFilter(setFilters, "dateFrom", value)}
            />
            <DateFilter
              label={text.to}
              help={FILTER_HELP[locale].to}
              value={filters.dateTo}
              onChange={(value) => updateFilter(setFilters, "dateTo", value)}
            />
          </div>
        </div>
      </section>

      <section className="analyticsChartGrid">
        <div className="panel analyticsChartPanel">
          <div className="analyticsChartHeader">
            <div>
              <p className="sectionKicker">{text.rankedLeaderboard}</p>
              <h2>{formatMetricLabel(metric, locale)}</h2>
            </div>
            <span className="metricDirectionBadge">{metricDefinition.direction === "higher" ? text.higherBetter : text.lowerBetter}</span>
          </div>
          <RankedBarChart
            highlightedKey={highlightedKey}
            locale={locale}
            metric={metric}
            rows={leaderboard}
            onSelect={(key) => setHighlightedKey(highlightedKey === key ? null : key)}
          />
        </div>

        <div className="panel analyticsChartPanel">
          <div className="analyticsChartHeader">
            <div>
              <p className="sectionKicker">{text.matchOrder}</p>
              <h2>{text.performanceOverTime}</h2>
            </div>
            {highlightedKey ? (
              <button className="clearFilterButton" type="button" onClick={() => setHighlightedKey(null)}>
                {text.clearHighlight}
              </button>
            ) : null}
          </div>
          <LineChart locale={locale} metric={metric} series={series} />
        </div>
      </section>

      <section className="panel analyticsTablePanel">
        <div className="panelHeader">
          <div>
            <p className="sectionKicker">{text.detailedLeaderboard}</p>
            <h2>{text.modelConfigurations}</h2>
          </div>
          <span className="tableSummary">{leaderboard.length} {text.rows} / {filteredPredictions.length} {text.predictions}</span>
        </div>
        <AnalyticsTable
          highlightedKey={highlightedKey}
          locale={locale}
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
  locale,
  highlightedKey,
  onSelect
}: {
  rows: AnalyticsLeaderboardRow[];
  metric: AnalyticsMetric;
  locale: Locale;
  highlightedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const metricDefinition = getMetricDefinition(metric);
  const text = ANALYTICS_TEXT[locale];
  const values = rows.map((row) => row.metricValue).filter((value): value is number => value !== null);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;

  if (rows.length === 0) {
    return <EmptyChart label={text.noRowsFilters} locale={locale} />;
  }

  return (
    <div className="rankedBarChart">
      {rows.slice(0, 12).map((row) => {
        const value = row.metricValue;
        const width = getBarWidth(value, min, max, metricDefinition.direction);
        const warning = getModelWarning(row, locale);
        return (
          <button
            className={`barChartRow${highlightedKey === row.key ? " isSelected" : ""}${warning ? " hasWarning" : ""}`}
            key={row.key}
            type="button"
            onClick={() => onSelect(row.key)}
          >
            <span className="barRank">#{row.rank}</span>
            <span className="barLabel barModelLabel">
              <span className="barModelName">{row.model}</span>
              {warning ? <WarningBadge warning={warning} /> : null}
              <span className="barSetupBox">{formatAnalyticsSetupLabel(row)}</span>
              <InfoTooltip
                label={`${row.model} ${text.config}`}
                lines={buildModelConfigurationHelp(row, locale)}
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

function formatAnalyticsSetupLabel(row: AnalyticsLeaderboardRow): string {
  return [
    row.provider,
    row.accessCondition.replaceAll("_", " "),
    row.promptStrategy.replaceAll("_", " "),
    row.forecastHorizon
  ].join(" / ");
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

function LineChart({ locale, series, metric }: { locale: Locale; series: AnalyticsSeries[]; metric: AnalyticsMetric }) {
  const metricDefinition = getMetricDefinition(metric);
  const text = ANALYTICS_TEXT[locale];
  const allValues = series.flatMap((entry) => entry.values.map((value) => value.value)).filter((value): value is number => value !== null);

  if (series.length === 0 || allValues.length === 0) {
    return <EmptyChart label={text.noScoredValues} locale={locale} />;
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
      <svg className="lineChart" role="img" viewBox="0 0 720 300" aria-label={`${formatMetricLabel(metric, locale)} ${text.performanceOverTime}`}>
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
        <text className="chartAxisLabel" x="372" y="292" textAnchor="middle">{text.matchOrder}</text>
        <text className="chartAxisLabel" textAnchor="middle" transform="translate(14 136) rotate(-90)">
          {formatMetricShortLabel(metric, locale)}
        </text>
        {series.map((entry, index) => {
          const style = SERIES_STYLES[index % SERIES_STYLES.length];
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
              stroke={style.color}
              strokeDasharray={style.dash}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={style.width}
            />
          ) : null;
        })}
      </svg>
      <div className="lineChartLegend">
        {series.map((entry, index) => {
          const style = SERIES_STYLES[index % SERIES_STYLES.length];
          return (
          <span key={entry.key}>
            <i style={{ background: style.color }} />
            {formatSeriesLegendLabel(entry.label)}
          </span>
          );
        })}
      </div>
    </div>
  );
}

function formatSeriesLegendLabel(label: string): string {
  const parts = label.split(" / ");
  if (parts.length < 4) {
    return label;
  }

  const [model, access, prompt, horizon] = parts;
  return `${model} · ${abbreviateCondition(access)} · ${abbreviateCondition(prompt)} · ${horizon}`;
}

function abbreviateCondition(value: string): string {
  if (value === "Closed Book") return "CB";
  if (value === "Open Book") return "OB";
  if (value === "Direct Score") return "DS";
  if (value === "Probabilistic Forecast") return "PF";
  return value;
}

function AnalyticsTable({
  rows,
  metric,
  locale,
  highlightedKey,
  onSelect
}: {
  rows: AnalyticsLeaderboardRow[];
  metric: AnalyticsMetric;
  locale: Locale;
  highlightedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const text = ANALYTICS_TEXT[locale];
  if (rows.length === 0) {
    return <EmptyChart label={text.noTableRows} locale={locale} />;
  }

  return (
    <div className="analyticsTableScroll">
      <table className="analyticsTable">
        <thead>
          <tr>
            <th>{text.rank}</th>
            <th>{text.model}</th>
            <th>{text.provider}</th>
            <th>{text.horizon}</th>
            <th>{text.access}</th>
            <th>{text.prompt}</th>
            <th>{text.scored}</th>
            <th>{text.scores}</th>
            <th>{text.brier}</th>
            <th>{text.logLoss}</th>
            <th>{text.topAcc}</th>
            <th>{text.exact}</th>
            <th>{text.gdAcc}</th>
            <th>{text.totalGoalsErr}</th>
            <th>{text.invalid}</th>
            <th>{text.repair}</th>
            <th>{text.search}</th>
            <th>{text.selectedMetric}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const warning = getModelWarning(row, locale);

            return (
              <tr
                className={`${highlightedKey === row.key ? "isSelected" : ""}${warning ? " hasWarning" : ""}`}
                key={row.key}
                onClick={() => onSelect(row.key)}
              >
                <td>#{row.rank}</td>
                <td>
                  <span className="modelConfigCell">
                    <span>{row.model}</span>
                    {warning ? <WarningBadge warning={warning} /> : null}
                    <InfoTooltip
                      label={`${row.model} ${text.config}`}
                      lines={buildModelConfigurationHelp(row, locale)}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WarningBadge({ warning }: { warning: NonNullable<ReturnType<typeof getModelWarning>> }) {
  return (
    <span className="modelWarningBadge" title={warning.text}>
      {warning.label}
    </span>
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
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="filterField analyticsSingleSelectDropdown">
      <FilterLabel help={help} label={label} />
      <details className="analyticsDropdownShell" name="analytics-filter-dropdowns">
        <summary className="analyticsDropdownSummary">
          <span>{selectedOption?.label ?? value}</span>
        </summary>
        <div className="analyticsMultiSelectMenu">
          <div className="filterChipGrid analyticsFilterChipGrid">
            {options.map((option) => (
              <button
                className={`analyticsSelectOption${option.value === value ? " isSelected" : ""}`}
                key={option.value}
                type="button"
                onClick={(event) => {
                  onChange(option.value);
                  const details = event.currentTarget.closest("details");
                  if (details) {
                    details.open = false;
                  }
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

function MultiSelectFilter<T extends string>({
  label,
  help,
  clearLabel,
  selectAllLabel,
  allLabel,
  values,
  selected,
  formatValue,
  onChange
}: {
  label: string;
  help: string;
  clearLabel: string;
  selectAllLabel: string;
  allLabel: string;
  values: T[];
  selected: T[];
  formatValue: (value: T) => string;
  onChange: (value: T[]) => void;
}) {
  const allSelected = selected.length === 0 || selected.length === values.length;
  const activeLabel = selected.length === 0 ? allLabel : `${selected.length}/${values.length}`;

  return (
    <div className="filterField analyticsMultiSelectDropdown">
      <FilterLabel help={help} label={label} />
      <details className="analyticsDropdownShell" name="analytics-filter-dropdowns">
        <summary className="analyticsDropdownSummary">
          <span>{activeLabel}</span>
        </summary>
        <div className="analyticsMultiSelectMenu">
          <button
            className="filterSelectAllButton"
            type="button"
            onClick={() => onChange(allSelected ? [] : values)}
          >
            {allSelected ? clearLabel : selectAllLabel}
          </button>
          <div className="filterChipGrid analyticsFilterChipGrid">
            {values.map((value) => {
              const isChecked = selected.length === 0 || selected.includes(value);
              const id = `analytics-${label}-${value}`.replace(/[^a-z0-9_-]+/gi, "-");

              return (
                <label className={`filterChip${isChecked ? " isChecked" : ""}`} htmlFor={id} key={value}>
                  <input
                    checked={isChecked}
                    id={id}
                    type="checkbox"
                    onChange={() => onChange(toggleSelection(selected, value, values))}
                  />
                  <span>{formatValue(value)}</span>
                </label>
              );
            })}
          </div>
        </div>
      </details>
    </div>
  );
}

function toggleSelection<T extends string>(selected: T[], value: T, values: T[]): T[] {
  const normalizedSelected = selected.length === 0 ? values : selected;
  const next = normalizedSelected.includes(value)
    ? normalizedSelected.filter((entry) => entry !== value)
    : [...normalizedSelected, value];

  return next.length === values.length ? [] : next;
}

function getLineChartDomain(metricDefinition: ReturnType<typeof getMetricDefinition>, values: number[]): { min: number; max: number } {
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (metricDefinition.kind === "rate") {
    return { min: 0, max: 1 };
  }

  if (metricDefinition.key === "kicktipp_points_90") {
    return { min: 0, max: getNiceUpperBound(maxValue, 5) };
  }

  if (metricDefinition.key === "brier_90") {
    const upper = maxValue <= 2 ? Math.min(2, getNiceUpperBound(Math.max(maxValue, 0.5), 0.5)) : getNiceUpperBound(maxValue, 1);
    return { min: 0, max: upper };
  }

  if (metricDefinition.key === "log_loss_90") {
    return { min: 0, max: getNiceUpperBound(maxValue, 1) };
  }

  if (minValue >= 0) {
    return { min: 0, max: getNiceUpperBound(maxValue, 1) };
  }

  return getNumericChartDomain(minValue, maxValue);
}

function getNiceUpperBound(maxValue: number, fallback: number): number {
  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return fallback;
  }

  const padded = maxValue * 1.12;
  const step = niceNumber(padded / 4);
  return Math.max(fallback, Math.ceil(padded / step) * step);
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

function buildModelConfigurationHelp(row: AnalyticsLeaderboardRow, locale: Locale): TooltipLine[] {
  const text = ANALYTICS_TEXT[locale];
  const stages = row.stages.length > 0
    ? row.stages.map(formatStage).join(", ")
    : text.currentStages;
  const warning = getModelWarning(row, locale);

  const lines: TooltipLine[] = [
    {
      label: row.forecastHorizon,
      text: explainForecastHorizon(row.forecastHorizon, locale)
    },
    {
      label: formatCondition(row.accessCondition),
      text: explainAccessCondition(row.accessCondition, locale)
    },
    {
      label: formatCondition(row.promptStrategy),
      text: explainPromptStrategy(row.promptStrategy, locale)
    },
    {
      label: text.stageCoverage,
      text: stages
    },
    {
      label: text.predictions,
      text: `${row.predictionsTotal} ${text.predictionsTotal}`
    },
    {
      label: locale === "de" ? "Auswertung" : "Evaluation",
      text: `${row.matchesScored} ${text.evaluationScores}`
    }
  ];

  if (warning) {
    lines.unshift({
      label: warning.label,
      text: warning.text
    });
  }

  return lines;
}

function explainForecastHorizon(value: string, locale: Locale): string {
  const text = ANALYTICS_TEXT[locale];
  if (value === "STAGE_OPENING") {
    return text.stageOpening;
  }

  if (value === "T_24H") {
    return text.t24h;
  }

  if (value === "T_2H") {
    return text.t2h;
  }

  return `${value} ${text.forecastFallback}`;
}

function explainAccessCondition(value: string, locale: Locale): string {
  const text = ANALYTICS_TEXT[locale];
  if (value === "open_book") {
    return text.openBook;
  }

  if (value === "closed_book") {
    return text.closedBook;
  }

  return `${formatCondition(value)} ${text.accessFallback}`;
}

function explainPromptStrategy(value: string, locale: Locale): string {
  const text = ANALYTICS_TEXT[locale];
  if (value === "direct_score") {
    return text.directScore;
  }

  if (value === "probabilistic_forecast") {
    return text.probabilistic;
  }

  return `${formatCondition(value)} ${text.promptFallback}`;
}

function EmptyChart({ label, locale }: { label: string; locale: Locale }) {
  return (
    <div className="emptyState analyticsEmptyState">
      <strong>{ANALYTICS_TEXT[locale].noData}</strong>
      <p>{label}</p>
    </div>
  );
}

function formatMetricLabel(metric: AnalyticsMetric, locale: Locale): string {
  if (locale === "en") {
    return METRIC_DEFINITIONS[metric].label;
  }

  switch (metric) {
    case "kicktipp_points_90":
      return "Punkte";
    case "brier_90":
      return "Brier Score";
    case "log_loss_90":
      return "Log Loss";
    case "top_outcome_accuracy_90":
      return "Top-Outcome-Genauigkeit";
    case "exact_score_accuracy_90":
      return "Exakte Ergebnisgenauigkeit";
    case "goal_difference_accuracy_90":
      return "Tordifferenz-Genauigkeit";
    case "mean_goal_difference_abs_error_90":
      return "Mittlerer Tordifferenzfehler";
    case "mean_total_goals_abs_error_90":
      return "Mittlerer Gesamt-Torfehler";
    case "advancement_accuracy":
      return "Weiterkommens-Genauigkeit";
    case "invalid_output_rate":
      return "Rate ungültiger Ausgaben";
    case "repair_rate":
      return "Reparaturrate";
    case "normalization_rate":
      return "Normalisierungsrate";
    case "open_book_search_observed_rate":
      return "Beobachtete Open-Book-Suche";
    case "score_probability_consistency_rate":
      return "Score/Wahrscheinlichkeit-Konsistenz";
  }
}

function formatMetricShortLabel(metric: AnalyticsMetric, locale: Locale): string {
  if (locale === "en") {
    return METRIC_DEFINITIONS[metric].shortLabel;
  }

  switch (metric) {
    case "kicktipp_points_90":
      return "Punkte";
    case "brier_90":
      return "Brier";
    case "log_loss_90":
      return "Log Loss";
    case "top_outcome_accuracy_90":
      return "Top-Gen.";
    case "exact_score_accuracy_90":
      return "Exakt";
    case "goal_difference_accuracy_90":
      return "TD-Gen.";
    case "mean_goal_difference_abs_error_90":
      return "TD-Fehler";
    case "mean_total_goals_abs_error_90":
      return "Torfehler";
    case "advancement_accuracy":
      return "Weiter";
    case "invalid_output_rate":
      return "Ungültig";
    case "repair_rate":
      return "Reparatur";
    case "normalization_rate":
      return "Norm.";
    case "open_book_search_observed_rate":
      return "Suche";
    case "score_probability_consistency_rate":
      return "Konsist.";
  }
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

function exportFullDatasetCsv(
  predictions: BenchmarkDisplayPrediction[],
  specialPredictions: DashboardSpecialPrediction[]
): void {
  const headers = [
    "Record type",
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
    "Points 90",
    "Advancement accuracy",
    "Score/prob argmax consistent 90",
    "Special question ID",
    "Special question label",
    "Special prediction type",
    "Special k",
    "Special final pick",
    "Special final picks",
    "Special is correct",
    "Special question points",
    "Special reasoning summary"
  ];
  const rows = predictions.map((prediction) => [
    "match_prediction",
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
    prediction.scoreResultMatchesProbArgmax90,
    "",
    "",
    "",
    null,
    "",
    "",
    null,
    null,
    ""
  ]);
  const specialRows = specialPredictions.map((prediction) => [
    "special_question_prediction",
    prediction.id,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    prediction.model,
    prediction.provider,
    prediction.predictorId,
    prediction.forecastHorizon,
    formatCondition(prediction.accessCondition),
    formatCondition(prediction.promptStrategy),
    prediction.sampleId,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    prediction.confidence,
    prediction.reasoningSummary,
    prediction.validationStatus,
    prediction.isValidForScoring,
    null,
    null,
    "",
    "",
    "",
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    prediction.questionId,
    prediction.questionLabel,
    prediction.predictionType,
    prediction.k,
    prediction.finalPick ?? "",
    prediction.finalPicks.join(" | "),
    prediction.isCorrect,
    prediction.questionScorePoints,
    prediction.reasoningSummary
  ]);

  downloadCsv(
    `worldcup2026-full-prediction-dataset-${new Date().toISOString().slice(0, 10)}.csv`,
    headers,
    [...rows, ...specialRows]
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
