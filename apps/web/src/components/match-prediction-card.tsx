"use client";

/**
 * Purpose: Clickable match card for the schedule page.
 * It keeps the expansion state in the browser and shows all model predictions for one fixture.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { DashboardMatch, DashboardPrediction } from "@/lib/dashboard-data";
import { formatCondition, formatStage } from "@/lib/benchmark-analytics";
import { InfoTooltip, type TooltipLine } from "@/components/info-tooltip";
import { TeamMatchup } from "@/components/team-matchup";

type MatchPredictionCardProps = {
  match: DashboardMatch;
  center: string;
  meta?: string | null;
  compact?: boolean;
  className: string;
  homeTeamLabel?: string;
  awayTeamLabel?: string;
  badge?: string;
  predictionControls?: ReactNode;
};

type PredictionRow = {
  prediction: DashboardPrediction;
};

export function MatchPredictionCard({
  match,
  center,
  meta,
  compact = false,
  className,
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
        aria-label={`${isOpen ? "Hide" : "Show"} predictions for ${displayHomeTeam} vs ${displayAwayTeam}`}
        className="predictionMatchButton"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <TeamMatchup
          compact={compact}
          homeTeam={displayHomeTeam}
          awayTeam={displayAwayTeam}
          center={center}
          meta={meta}
        />
        <span className="matchDisclosure">{isOpen ? "Hide predictions" : "Show predictions"}</span>
      </button>

      {isOpen ? (
        <div className="matchPredictionPanel">
          <div className={`matchPredictionHeader${predictionControls ? " hasControls" : ""}`}>
            <div className="matchPredictionSummary">
              <span>Predictions</span>
              <strong>{rows.length} model picks</strong>
            </div>
            {predictionControls ? (
              <div className="matchPredictionControls">
                {predictionControls}
              </div>
            ) : null}
            <span className="finalScoreBadge">Result {formatActualScore(match)}</span>
          </div>

          {rows.length === 0 ? (
            <div className="emptyPredictionPanel">
              <strong>No predictions yet</strong>
              <p>Run the prediction script for this match to show model picks here.</p>
            </div>
          ) : (
            <div className="matchPredictionGrid">
              {rows.map((row) => (
                <div className="matchPredictionRow benchmarkPredictionRow" key={row.prediction.id}>
                  <div className="matchPredictionModel">
                    <div className="matchPredictionModelName">
                      <strong>{row.prediction.model}</strong>
                      <InfoTooltip
                        label={`${row.prediction.model} configuration`}
                        lines={buildPredictionConfigurationHelp(row.prediction)}
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
                    <span>90' {formatProbabilities(row.prediction.homeWin90Prob, row.prediction.draw90Prob, row.prediction.awayWin90Prob)}</span>
                    {hasAdvancement(row.prediction) ? (
                      <span>Adv {formatAdvancement(row.prediction)}</span>
                    ) : (
                      <span>Full {formatProbabilities(row.prediction.homeWinFullProb, row.prediction.drawFullProb, row.prediction.awayWinFullProb)}</span>
                    )}
                  </div>

                  <div className="predictionPoints">
                    <strong>{row.prediction.scorePoints !== null ? `${row.prediction.scorePoints} pts` : "pending"}</strong>
                    <span>{row.prediction.scoreReason ?? getPendingLabel(hasResult, row.prediction)}</span>
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

function buildPredictionConfigurationHelp(prediction: DashboardPrediction): TooltipLine[] {
  return [
    {
      label: prediction.forecastHorizon,
      text: explainForecastHorizon(prediction.forecastHorizon)
    },
    {
      label: formatCondition(prediction.accessCondition),
      text: explainAccessCondition(prediction.accessCondition)
    },
    {
      label: formatCondition(prediction.promptStrategy),
      text: explainPromptStrategy(prediction.promptStrategy)
    },
    {
      label: formatStage(prediction.stage),
      text: "Tournament phase this prediction belongs to."
    },
    {
      label: "Pick",
      text: `${formatPredictionScore(prediction)} after 90 minutes.`
    },
    {
      label: "Validation",
      text: prediction.isValidForScoring
        ? "Output is valid for scoring."
        : `Output is not valid for scoring (${prediction.validationStatus ?? "invalid"}).`
    },
    {
      label: "Evaluation",
      text: prediction.scorePoints === null
        ? "Still pending for this match."
        : `${prediction.scorePoints} Kicktipp point(s), reason: ${prediction.scoreReason ?? "scored"}.`
    }
  ];
}

function explainForecastHorizon(value: string): string {
  if (value === "STAGE_OPENING") {
    return "Prediction generated once at the start of the tournament stage, before the relevant matches were played.";
  }

  if (value === "T_24H") {
    return "Prediction scheduled approximately 24 hours before kickoff.";
  }

  if (value === "T_1H") {
    return "Prediction scheduled approximately 1 hour before kickoff.";
  }

  return `${value} is the forecast horizon used for this prediction.`;
}

function explainAccessCondition(value: string): string {
  if (value === "open_book") {
    return "Model was allowed to use configured web-search/tool access before answering.";
  }

  if (value === "closed_book") {
    return "Model had to answer from internal knowledge only, without search/tool access.";
  }

  return `${formatCondition(value)} is the access condition stored for this prediction.`;
}

function explainPromptStrategy(value: string): string {
  if (value === "direct_score") {
    return "Prompt asks for the most likely scoreline plus required probabilities.";
  }

  if (value === "probabilistic_forecast") {
    return "Prompt emphasizes calibrated outcome probabilities before the scoreline.";
  }

  return `${formatCondition(value)} is the prompt strategy stored for this prediction.`;
}

function formatActualScore(match: DashboardMatch): string {
  if (match.actualHome === null || match.actualAway === null) {
    return "open";
  }

  return `${match.actualHome} - ${match.actualAway}`;
}

function getPendingLabel(hasResult: boolean, prediction: DashboardPrediction): string {
  if (!prediction.isValidForScoring) {
    return prediction.validationStatus ?? "invalid";
  }

  return hasResult ? "awaiting evaluation" : "waiting for result";
}

function formatPredictionScore(prediction: DashboardPrediction): string {
  if (prediction.predictedHome === null || prediction.predictedAway === null) {
    return "-";
  }

  return `${prediction.predictedHome} - ${prediction.predictedAway}`;
}

function formatProbabilities(home: number | null, draw: number | null, away: number | null): string {
  if (home === null || draw === null || away === null) {
    return "probabilities pending";
  }

  return `H ${formatPercent(home)} / D ${formatPercent(draw)} / A ${formatPercent(away)}`;
}

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
