"use client";

/**
 * Purpose: Clickable match card for the schedule page.
 * It keeps the expansion state in the browser and shows all model predictions for one fixture.
 */
import { useMemo, useState } from "react";
import type { DashboardMatch, DashboardPrediction } from "@/lib/dashboard-data";
import { formatCondition } from "@/lib/benchmark-analytics";
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
  badge
}: MatchPredictionCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rows = useMemo(() => getPredictionRows(match), [match]);
  const hasResult = match.actualHome !== null && match.actualAway !== null;
  const displayHomeTeam = homeTeamLabel ?? match.homeTeam;
  const displayAwayTeam = awayTeamLabel ?? match.awayTeam;

  return (
    <article className={`${className} predictionMatchCard${isOpen ? " isOpen" : ""}`}>
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
          <div className="matchPredictionHeader">
            <div>
              <strong>Model predictions</strong>
              <span>{rows.length} picks for this match</span>
            </div>
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
                    <strong>{row.prediction.model}</strong>
                    <span>{row.prediction.provider}</span>
                    <div className="benchmarkBadges">
                      <span>{row.prediction.forecastHorizon}</span>
                      <span>{formatCondition(row.prediction.accessCondition)}</span>
                      <span>{formatCondition(row.prediction.promptStrategy)}</span>
                      {getValidationBadge(row.prediction)}
                      {getOpenBookBadge(row.prediction)}
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

function getValidationBadge(prediction: DashboardPrediction) {
  if (
    prediction.validationStatus === null
    || prediction.validationStatus === "valid"
    || prediction.validationStatus === "legacy_adapter"
  ) {
    return null;
  }

  return <span className="statusBadge warningBadge">{prediction.validationStatus}</span>;
}

function getOpenBookBadge(prediction: DashboardPrediction) {
  if (prediction.accessCondition !== "open_book") {
    return null;
  }

  const observed = prediction.openBookCompliance === "observed_search" || prediction.toolCallsObserved === true;
  return (
    <span className={`statusBadge ${observed ? "successBadge" : "warningBadge"}`}>
      {observed ? "search observed" : "search not observed"}
    </span>
  );
}
