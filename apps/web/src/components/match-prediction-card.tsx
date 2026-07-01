"use client";

/**
 * Purpose: Clickable match card for the schedule page.
 * It keeps the expansion state in the browser and shows all model predictions for one fixture.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { DashboardMatch, DashboardPrediction } from "@/lib/dashboard-types";
import { formatCondition, formatStage } from "@/lib/benchmark-analytics";
import { InfoTooltip, type TooltipLine } from "@/components/info-tooltip";
import { TeamMatchup } from "@/components/team-matchup";
import { commonText, type Locale } from "@/lib/i18n";
import { getModelWarning } from "@/lib/model-warnings";

type MatchPredictionCardProps = {
  locale: Locale;
  match: DashboardMatch;
  center: string;
  meta?: string | null;
  compact?: boolean;
  className: string;
  dateLabel?: string | null;
  homeTeamLabel?: string;
  awayTeamLabel?: string;
  badge?: string;
  predictionControls?: ReactNode;
};

type PredictionRow = {
  prediction: DashboardPrediction;
};

export function MatchPredictionCard({
  locale,
  match,
  center,
  meta,
  compact = false,
  className,
  dateLabel,
  homeTeamLabel,
  awayTeamLabel,
  badge,
  predictionControls
}: MatchPredictionCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const rows = useMemo(() => getPredictionRows(match), [match]);
  const hasResult = match.actualHome !== null && match.actualAway !== null;
  const displayHomeTeam = homeTeamLabel ?? match.homeTeam;
  const displayAwayTeam = awayTeamLabel ?? match.awayTeam;
  const anchorId = getMatchAnchorId(match.id);
  const text = MATCH_CARD_TEXT[locale];
  const common = commonText[locale];

  useEffect(() => {
    const openIfTargeted = () => {
      const activeHash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (activeHash !== anchorId) {
        return;
      }

      setIsOpen(true);
      window.setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    };

    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);

    return () => window.removeEventListener("hashchange", openIfTargeted);
  }, [anchorId]);

  return (
    <article className={`${className} predictionMatchCard${isOpen ? " isOpen" : ""}`} id={anchorId} ref={cardRef}>
      {badge ? <span className="matchNumberBadge">{badge}</span> : null}
      <button
        aria-expanded={isOpen}
        aria-label={`${isOpen ? text.hide : text.show} ${text.predictionsFor} ${displayHomeTeam} vs ${displayAwayTeam}`}
        className="predictionMatchButton"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <TeamMatchup
          compact={compact}
          homeTeam={displayHomeTeam}
          awayTeam={displayAwayTeam}
          center={center}
          dateLabel={dateLabel}
          locale={locale}
          meta={meta}
        />
        <span className="matchDisclosure">{isOpen ? text.hidePredictions : text.showPredictions}</span>
      </button>

      {isOpen ? (
        <div className="matchPredictionPanel">
          <div className={`matchPredictionHeader${predictionControls ? " hasControls" : ""}`}>
            <div className="matchPredictionSummary">
              <span>{common.predictions}</span>
              <strong>{rows.length} {text.modelPicks}</strong>
            </div>
            {predictionControls ? (
              <div className="matchPredictionControls">
                {predictionControls}
              </div>
            ) : null}
            <span className="finalScoreBadge">{common.result} {formatActualScore(match, locale)}</span>
          </div>

          {rows.length === 0 ? (
            <div className="emptyPredictionPanel">
              <strong>{text.noPredictions}</strong>
              <p>{text.noPredictionsDescription}</p>
            </div>
          ) : (
            <div className="matchPredictionGrid">
              {rows.map((row) => (
                <div className="matchPredictionRow benchmarkPredictionRow" key={row.prediction.id}>
                  <div className="matchPredictionModel">
                    <div className="matchPredictionModelName">
                      <strong>{row.prediction.model}</strong>
                      {getModelWarning(row.prediction, locale) ? (
                        <span className="modelWarningBadge" title={getModelWarning(row.prediction, locale)?.text}>
                          {getModelWarning(row.prediction, locale)?.label}
                        </span>
                      ) : null}
                      <InfoTooltip
                        label={`${row.prediction.model} ${text.configuration}`}
                        lines={buildPredictionConfigurationHelp(row.prediction, locale)}
                      />
                    </div>
                    <span>{row.prediction.provider}</span>
                    <div className="benchmarkBadges">
                      <span>{row.prediction.forecastHorizon}</span>
                      <span>{formatCondition(row.prediction.accessCondition)}</span>
                      <span>{formatCondition(row.prediction.promptStrategy)}</span>
                      <span>{formatStage(row.prediction.stage)}</span>
                    </div>
                  </div>

                  <span className="predictedScorePill">
                    90' {formatPredictionScore(row.prediction)}
                  </span>

                  <div className="probabilityStack">
                    <span>90' {formatProbabilities(row.prediction.homeWin90Prob, row.prediction.draw90Prob, row.prediction.awayWin90Prob, locale)}</span>
                    {hasAdvancement(row.prediction) ? (
                      <span>{text.advancementShort} {formatAdvancement(row.prediction)}</span>
                    ) : (
                      <span>{text.fullShort} {formatProbabilities(row.prediction.homeWinFullProb, row.prediction.drawFullProb, row.prediction.awayWinFullProb, locale)}</span>
                    )}
                  </div>

                  <div className="predictionPoints">
                    <strong>{row.prediction.scorePoints !== null ? `${row.prediction.scorePoints} ${common.scores}` : common.pending}</strong>
                    <span>{formatScoreReason(row.prediction.scoreReason, locale) ?? getPendingLabel(hasResult, row.prediction, locale)}</span>
                  </div>

                  {row.prediction.reason ? (
                    <p className="predictionReason">{row.prediction.reason}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}

function getPredictionRows(match: DashboardMatch): PredictionRow[] {
  const rows = match.predictions.map((prediction) => ({ prediction }));

  return rows.sort((a, b) => {
    const pointsDiff = (b.prediction.scorePoints ?? -1) - (a.prediction.scorePoints ?? -1);
    return pointsDiff || a.prediction.model.localeCompare(b.prediction.model);
  });
}

function getMatchAnchorId(matchId: string): string {
  return `match-${matchId}`;
}

function buildPredictionConfigurationHelp(prediction: DashboardPrediction, locale: Locale): TooltipLine[] {
  const text = MATCH_CARD_TEXT[locale];
  const common = commonText[locale];
  const warning = getModelWarning(prediction, locale);
  const lines: TooltipLine[] = [
    {
      label: prediction.forecastHorizon,
      text: explainForecastHorizon(prediction.forecastHorizon, locale)
    },
    {
      label: formatCondition(prediction.accessCondition),
      text: explainAccessCondition(prediction.accessCondition, locale)
    },
    {
      label: formatCondition(prediction.promptStrategy),
      text: explainPromptStrategy(prediction.promptStrategy, locale)
    },
    {
      label: formatStage(prediction.stage),
      text: text.stageHelp
    },
    {
      label: common.pick,
      text: `${formatPredictionScore(prediction)} after 90 minutes.`
    },
    {
      label: common.validation,
      text: prediction.isValidForScoring
        ? text.validOutput
        : `${text.invalidOutput} (${prediction.validationStatus ?? text.invalid}).`
    },
    {
      label: common.evaluation,
      text: prediction.scorePoints === null
        ? text.stillPending
        : `${prediction.scorePoints} ${common.scores}, ${common.reason}: ${formatScoreReason(prediction.scoreReason, locale) ?? text.scored}.`
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
  const text = MATCH_CARD_TEXT[locale];
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
  const text = MATCH_CARD_TEXT[locale];
  if (value === "open_book") {
    return text.openBook;
  }

  if (value === "closed_book") {
    return text.closedBook;
  }

  return `${formatCondition(value)} ${text.accessFallback}`;
}

function explainPromptStrategy(value: string, locale: Locale): string {
  const text = MATCH_CARD_TEXT[locale];
  if (value === "direct_score") {
    return text.directScore;
  }

  if (value === "probabilistic_forecast") {
    return text.probabilistic;
  }

  return `${formatCondition(value)} ${text.promptFallback}`;
}

function formatActualScore(match: DashboardMatch, locale: Locale): string {
  if (match.actualHome === null || match.actualAway === null) {
    return commonText[locale].open;
  }

  return `${match.actualHome} - ${match.actualAway}`;
}

function getPendingLabel(hasResult: boolean, prediction: DashboardPrediction, locale: Locale): string {
  const text = MATCH_CARD_TEXT[locale];
  if (!prediction.isValidForScoring) {
    return prediction.validationStatus ?? text.invalid;
  }

  return hasResult ? text.awaitingEvaluation : text.waitingForResult;
}

function formatPredictionScore(prediction: DashboardPrediction): string {
  if (prediction.predictedHome === null || prediction.predictedAway === null) {
    return "-";
  }

  return `${prediction.predictedHome} - ${prediction.predictedAway}`;
}

function formatProbabilities(home: number | null, draw: number | null, away: number | null, locale: Locale): string {
  if (home === null || draw === null || away === null) {
    return MATCH_CARD_TEXT[locale].probabilitiesPending;
  }

  return `H ${formatPercent(home)} / D ${formatPercent(draw)} / A ${formatPercent(away)}`;
}

const MATCH_CARD_TEXT = {
  en: {
    show: "Show",
    hide: "Hide",
    predictionsFor: "predictions for",
    hidePredictions: "Hide predictions",
    showPredictions: "Show predictions",
    modelPicks: "model picks",
    noPredictions: "No predictions yet",
    noPredictionsDescription: "Run the prediction script for this match to show model picks here.",
    configuration: "configuration",
    advancementShort: "Adv",
    fullShort: "Full",
    stageHelp: "Tournament phase this prediction belongs to.",
    validOutput: "Output is valid for scoring.",
    invalidOutput: "Output is not valid for scoring",
    invalid: "invalid",
    stillPending: "Still pending for this match.",
    scored: "scored",
    stageOpening: "Prediction generated once at the start of the tournament stage, before the relevant matches were played.",
    t24h: "Prediction scheduled approximately 24 hours before kickoff.",
    t2h: "Prediction scheduled approximately 2 hours before kickoff.",
    forecastFallback: "is the forecast horizon used for this prediction.",
    openBook: "Model was allowed to use configured web-search/tool access before answering.",
    closedBook: "Model had to answer from internal knowledge only, without search/tool access.",
    accessFallback: "is the access condition stored for this prediction.",
    directScore: "Prompt asks for the most likely scoreline plus required probabilities.",
    probabilistic: "Prompt emphasizes calibrated outcome probabilities before the scoreline.",
    promptFallback: "is the prompt strategy stored for this prediction.",
    awaitingEvaluation: "awaiting evaluation",
    waitingForResult: "waiting for result",
    probabilitiesPending: "probabilities pending"
  },
  de: {
    show: "Zeige",
    hide: "Verberge",
    predictionsFor: "Vorhersagen für",
    hidePredictions: "Vorhersagen ausblenden",
    showPredictions: "Vorhersagen anzeigen",
    modelPicks: "Modelltipps",
    noPredictions: "Noch keine Vorhersagen",
    noPredictionsDescription: "Starte das Vorhersage-Skript für dieses Spiel, um Modelltipps anzuzeigen.",
    configuration: "Konfiguration",
    advancementShort: "Weiter",
    fullShort: "Vollzeit",
    stageHelp: "Turnierphase, zu der diese Prognose gehört.",
    validOutput: "Ausgabe ist für die Wertung gültig.",
    invalidOutput: "Ausgabe ist nicht für die Wertung gültig",
    invalid: "ungültig",
    stillPending: "Für dieses Spiel noch offen.",
    scored: "gewertet",
    stageOpening: "Prognose wurde einmal zu Beginn der Turnierphase erstellt, bevor die relevanten Spiele gespielt wurden.",
    t24h: "Prognose wurde ungefähr 24 Stunden vor Anpfiff geplant.",
    t2h: "Prognose wurde ungefähr 2 Stunden vor Anpfiff geplant.",
    forecastFallback: "ist der Prognosehorizont dieser Prognose.",
    openBook: "Das Modell durfte vor der Antwort konfigurierte Websuche/Tools verwenden.",
    closedBook: "Das Modell musste ohne Suche/Tools aus internem Wissen antworten.",
    accessFallback: "ist die gespeicherte Zugriffsbedingung dieser Prognose.",
    directScore: "Der Prompt fragt nach dem wahrscheinlichsten Ergebnis plus den benötigten Wahrscheinlichkeiten.",
    probabilistic: "Der Prompt betont kalibrierte Ergebniswahrscheinlichkeiten vor dem Ergebnis-Tipp.",
    promptFallback: "ist die gespeicherte Prompt-Strategie dieser Prognose.",
    awaitingEvaluation: "wartet auf Auswertung",
    waitingForResult: "wartet auf Ergebnis",
    probabilitiesPending: "Wahrscheinlichkeiten offen"
  }
} as const;

function formatAdvancement(prediction: DashboardPrediction): string {
  return `H ${formatPercent(prediction.homeAdvancesProb)} / A ${formatPercent(prediction.awayAdvancesProb)}`;
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return `${Math.round(value * 100)}%`;
}

function hasAdvancement(prediction: DashboardPrediction): boolean {
  return prediction.homeAdvancesProb !== null || prediction.awayAdvancesProb !== null;
}

function formatScoreReason(value: string | null, locale: Locale): string | null {
  if (!value || locale === "en") {
    return value;
  }

  const normalized = value.toLowerCase();
  if (normalized.includes("exact")) return "exaktes Ergebnis";
  if (normalized.includes("goal difference")) return "richtige Tordifferenz";
  if (normalized.includes("tendency")) return "richtige Tendenz";
  if (normalized.includes("miss")) return "Fehltipp";
  if (normalized.includes("invalid")) return "ungültig";
  return value;
}
