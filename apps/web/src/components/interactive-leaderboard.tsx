"use client";

/**
 * Purpose: Clickable leaderboard that opens the selected model drilldown below it.
 * Model details appear inline after a model row is selected.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { DashboardLeaderboardEntry, DashboardMatch, DashboardPrediction } from "@/lib/dashboard-data";
import { formatCondition, formatStage } from "@/lib/benchmark-analytics";
import { InfoTooltip, type TooltipLine } from "@/components/info-tooltip";
import { ModelInspector } from "@/components/model-inspector";
import { commonText, localizePath, type Locale } from "@/lib/i18n";

type InteractiveLeaderboardProps = {
  locale: Locale;
  leaderboard: DashboardLeaderboardEntry[];
  matches: DashboardMatch[];
  controls?: ReactNode;
};

const LEADERBOARD_TEXT = {
  en: {
    kicker: "Model ranking",
    title: "Leaderboard",
    description: "Match-prediction ranking after applying the active filters.",
    viewMatches: "View matches",
    noRanking: "No ranking yet",
    noRankingDescription: "Run predictions first, then click a model here to inspect its details.",
    hidePredictions: "Hide model predictions",
    showPredictions: "Show model predictions",
    stageCoverageEmpty: "No tournament stage metadata available yet.",
    predictionsIncluded: "prediction(s) included in this leaderboard row.",
    scored: "scored",
    exactHits: "exact hit(s)",
    config: "configuration",
    forecastFallback: "is the forecast horizon used for this leaderboard row.",
    stageOpening: "Predictions generated once at the start of the tournament stage, before the relevant matches were played.",
    t24h: "Predictions scheduled approximately 24 hours before kickoff.",
    t2h: "Predictions scheduled approximately 2 hours before kickoff.",
    openBook: "Model was allowed to use configured web-search/tool access before answering.",
    closedBook: "Model had to answer from internal knowledge only, without search/tool access.",
    accessFallback: "is the access condition stored for this leaderboard row.",
    directScore: "Prompt asks for the most likely scoreline plus required probabilities.",
    probabilistic: "Prompt emphasizes calibrated outcome probabilities before the scoreline.",
    promptFallback: "is the prompt strategy stored for this leaderboard row."
  },
  de: {
    kicker: "Modellranking",
    title: "Leaderboard",
    description: "Ranking der Match-Prognosen nach Anwendung der aktiven Filter.",
    viewMatches: "Spiele ansehen",
    noRanking: "Noch kein Ranking",
    noRankingDescription: "Starte zuerst Vorhersagen. Danach kannst du hier ein Modell anklicken und Details ansehen.",
    hidePredictions: "Modellprognosen ausblenden",
    showPredictions: "Modellprognosen anzeigen",
    stageCoverageEmpty: "Noch keine Metadaten zur Turnierphase verfügbar.",
    predictionsIncluded: "Prognose(n) in dieser Leaderboard-Zeile.",
    scored: "gewertet",
    exactHits: "exakte Treffer",
    config: "Konfiguration",
    forecastFallback: "ist der Prognosehorizont dieser Leaderboard-Zeile.",
    stageOpening: "Prognosen wurden einmal zu Beginn der Turnierphase erstellt, bevor die relevanten Spiele gespielt wurden.",
    t24h: "Prognosen wurden ungefähr 24 Stunden vor Anpfiff geplant.",
    t2h: "Prognosen wurden ungefähr 2 Stunden vor Anpfiff geplant.",
    openBook: "Das Modell durfte vor der Antwort konfigurierte Websuche/Tools verwenden.",
    closedBook: "Das Modell musste ohne Suche/Tools aus internem Wissen antworten.",
    accessFallback: "ist die gespeicherte Zugriffsbedingung dieser Leaderboard-Zeile.",
    directScore: "Der Prompt fragt nach dem wahrscheinlichsten Ergebnis plus den benötigten Wahrscheinlichkeiten.",
    probabilistic: "Der Prompt betont kalibrierte Ergebniswahrscheinlichkeiten vor dem Ergebnis-Tipp.",
    promptFallback: "ist die gespeicherte Prompt-Strategie dieser Leaderboard-Zeile."
  }
} as const;

export function InteractiveLeaderboard({ locale, leaderboard, matches, controls }: InteractiveLeaderboardProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const text = LEADERBOARD_TEXT[locale];
  const common = commonText[locale];

  return (
    <section className="contentStack">
      <div className="panel leaderboardPanel">
        <div className="panelHeader leaderboardPanelHeader">
          <div className="leaderboardHeaderTitle">
            <p className="sectionKicker">{text.kicker}</p>
            <h2>{text.title}</h2>
            <p className="panelDescription">
              {text.description}
            </p>
          </div>
          {controls ? <div className="leaderboardHeaderControls">{controls}</div> : <span className="leaderboardHeaderControls" />}
          <Link className="leaderboardHeaderLink" href={localizePath("/matches", locale)}>{text.viewMatches}</Link>
        </div>

        {leaderboard.length === 0 ? (
          <div className="emptyState">
            <strong>{text.noRanking}</strong>
            <p>{text.noRankingDescription}</p>
          </div>
        ) : (
          <div className="leaderboard">
            {leaderboard.map((entry, index) => {
              const rank = getLeaderboardRank(leaderboard, index);
              return (
                <div className="leaderboardItem" key={entry.key ?? entry.model}>
                  <button
                    className={`rankRow leaderboardButton ${getPodiumClass(rank)}${selectedKey === getEntryKey(entry) ? " isSelected" : ""}`}
                    aria-expanded={selectedKey === getEntryKey(entry)}
                    type="button"
                    onClick={() => setSelectedKey(selectedKey === getEntryKey(entry) ? null : getEntryKey(entry))}
                  >
                    <span className="rank">#{rank}</span>
                    <div>
                      <div className="leaderboardModelName">
                        <strong>{entry.model}</strong>
                        <InfoTooltip
                          label={`${entry.model} ${text.config}`}
                          lines={buildLeaderboardConfigurationHelp(entry, matches, locale)}
                        />
                      </div>
                      <p>{entry.provider}</p>
                    </div>
                    <span className="leaderboardDisclosureText">
                      {selectedKey === getEntryKey(entry) ? text.hidePredictions : text.showPredictions}
                    </span>
                    <span className="points">{entry.points} {common.scores}</span>
                  </button>

                  {selectedKey === getEntryKey(entry) ? (
                    <ModelInspector
                      inline
                      locale={locale}
                      matches={matches}
                      selectedKey={entry.key}
                      selectedModel={entry.model}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function buildLeaderboardConfigurationHelp(
  entry: DashboardLeaderboardEntry,
  matches: DashboardMatch[],
  locale: Locale
): TooltipLine[] {
  const text = LEADERBOARD_TEXT[locale];
  const common = commonText[locale];
  const predictions = getEntryPredictions(entry, matches);
  const stages = sortedUnique(predictions.map((prediction) => formatStage(prediction.stage)));
  const scored = predictions.filter((prediction) => prediction.scorePoints !== null).length;
  const horizon = entry.forecastHorizon ?? predictions[0]?.forecastHorizon;
  const access = entry.accessCondition ?? predictions[0]?.accessCondition;
  const prompt = entry.promptStrategy ?? predictions[0]?.promptStrategy;

  const lines: TooltipLine[] = [];

  if (horizon) {
    lines.push({
      label: horizon,
      text: explainForecastHorizon(horizon, locale)
    });
  }

  if (access) {
    lines.push({
      label: formatCondition(access),
      text: explainAccessCondition(access, locale)
    });
  }

  if (prompt) {
    lines.push({
      label: formatCondition(prompt),
      text: explainPromptStrategy(prompt, locale)
    });
  }

  lines.push(
    {
      label: common.stageCoverage,
      text: stages.length > 0 ? stages.join(", ") : text.stageCoverageEmpty
    },
    {
      label: common.predictions,
      text: `${predictions.length} ${text.predictionsIncluded}`
    },
    {
      label: common.evaluation,
      text: `${scored} ${text.scored}, ${Math.max(0, predictions.length - scored)} ${common.pending}.`
    },
    {
      label: "Ranking",
      text: `${entry.points} ${common.scores}, ${entry.exact} ${text.exactHits}.`
    }
  );

  return lines;
}

function getEntryPredictions(entry: DashboardLeaderboardEntry, matches: DashboardMatch[]): DashboardPrediction[] {
  return matches
    .flatMap((match) => match.predictions)
    .filter((prediction) => entry.key ? getPredictionKey(prediction) === entry.key : prediction.model === entry.model);
}

function getPredictionKey(prediction: DashboardPrediction): string {
  return [
    prediction.predictorId,
    prediction.provider,
    prediction.forecastHorizon,
    prediction.accessCondition,
    prediction.promptStrategy
  ].join("::");
}

function explainForecastHorizon(value: string, locale: Locale): string {
  const text = LEADERBOARD_TEXT[locale];
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
  const text = LEADERBOARD_TEXT[locale];
  if (value === "open_book") {
    return text.openBook;
  }

  if (value === "closed_book") {
    return text.closedBook;
  }

  return `${formatCondition(value)} ${text.accessFallback}`;
}

function explainPromptStrategy(value: string, locale: Locale): string {
  const text = LEADERBOARD_TEXT[locale];
  if (value === "direct_score") {
    return text.directScore;
  }

  if (value === "probabilistic_forecast") {
    return text.probabilistic;
  }

  return `${formatCondition(value)} ${text.promptFallback}`;
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function getEntryKey(entry: DashboardLeaderboardEntry): string {
  return entry.key ?? entry.model;
}

function getLeaderboardRank(leaderboard: DashboardLeaderboardEntry[], index: number): number {
  const entry = leaderboard[index];
  if (!entry) {
    return index + 1;
  }

  const firstSameScoreIndex = leaderboard.findIndex((candidate) => candidate.points === entry.points);
  return firstSameScoreIndex >= 0 ? firstSameScoreIndex + 1 : index + 1;
}

function getPodiumClass(rank: number): string {
  if (rank === 1) return "rankRowGold";
  if (rank === 2) return "rankRowSilver";
  if (rank === 3) return "rankRowBronze";
  return "";
}
