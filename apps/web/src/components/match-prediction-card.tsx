"use client";

/**
 * Purpose: Clickable match card for the schedule page.
 * It keeps the expansion state in the browser and shows all model predictions for one fixture.
 */
import { useMemo, useState } from "react";
import type { DashboardMatch, DashboardPrediction } from "@/lib/dashboard-data";
import { calculatePredictionScore, type ScoreResult } from "@/lib/scorer";
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
  score: ScoreResult | null;
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
                <div className="matchPredictionRow" key={row.prediction.model}>
                  <div className="matchPredictionModel">
                    <strong>{row.prediction.model}</strong>
                    <span>{row.prediction.provider}</span>
                  </div>

                  <span className="predictedScorePill">
                    {row.prediction.predictedHome} - {row.prediction.predictedAway}
                  </span>

                  <div className="predictionPoints">
                    <strong>{row.score ? `${row.score.points} pts` : "pending"}</strong>
                    <span>{row.score ? formatReason(row.score.reason) : getPendingLabel(hasResult)}</span>
                  </div>
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
  const rows = match.predictions.map((prediction) => ({
    prediction,
    score: getPredictionScore(match, prediction)
  }));

  return rows.sort((a, b) => {
    const pointsDiff = (b.score?.points ?? -1) - (a.score?.points ?? -1);
    return pointsDiff || a.prediction.model.localeCompare(b.prediction.model);
  });
}

function getPredictionScore(
  match: DashboardMatch,
  prediction: DashboardPrediction
): ScoreResult | null {
  if (match.actualHome === null || match.actualAway === null) {
    return null;
  }

  return calculatePredictionScore(
    { home: prediction.predictedHome, away: prediction.predictedAway },
    { home: match.actualHome, away: match.actualAway }
  );
}

function formatActualScore(match: DashboardMatch): string {
  if (match.actualHome === null || match.actualAway === null) {
    return "open";
  }

  return `${match.actualHome} - ${match.actualAway}`;
}

function getPendingLabel(hasResult: boolean): string {
  return hasResult ? "not scored" : "waiting for result";
}

function formatReason(reason: ScoreResult["reason"]): string {
  switch (reason) {
    case "exact":
      return "exact score";
    case "goal_difference":
      return "goal difference";
    case "tendency":
      return "tendency";
    case "miss":
      return "miss";
  }
}
