"use client";

/**
 * Purpose: Clickable match card for the schedule page.
 * It keeps the expansion state in the browser and shows all model predictions for one fixture.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DashboardMatch, DashboardPrediction } from "@/lib/dashboard-data";
import { formatCondition, formatStage } from "@/lib/benchmark-analytics";
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
                    <div className="matchPredictionModelName">
                      <strong>{row.prediction.model}</strong>
                      <InfoTooltip
                        label={`${row.prediction.model} configuration`}
                        text={buildPredictionConfigurationHelp(row.prediction)}
                      />
                    </div>
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

function InfoTooltip({ label = "Info", text }: { label?: string; text: string }) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const tooltipHalfWidth = 180;
    const left = Math.min(
      window.innerWidth - tooltipHalfWidth - 22,
      Math.max(tooltipHalfWidth + 22, rect.left + rect.width / 2)
    );

    setPosition({
      left,
      top: rect.top - 9
    });
  }, []);

  const showTooltip = () => {
    updatePosition();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <span
        aria-label={`${label}: ${text}`}
        className="filterInfo"
        onBlur={() => setIsOpen(false)}
        onClick={(event) => event.stopPropagation()}
        onFocus={showTooltip}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setIsOpen(false)}
        ref={triggerRef}
        tabIndex={0}
        title={text}
      >
        i
      </span>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
          <span
            className="floatingTooltip"
            role="tooltip"
            style={{ left: `${position.left}px`, top: `${position.top}px` }}
          >
            {text}
          </span>,
          document.body
        )
        : null}
    </>
  );
}

function buildPredictionConfigurationHelp(prediction: DashboardPrediction): string {
  const horizon = explainForecastHorizon(prediction.forecastHorizon);
  const access = explainAccessCondition(prediction.accessCondition);
  const prompt = explainPromptStrategy(prediction.promptStrategy);
  const stage = `Stage ${formatStage(prediction.stage)} means this prediction belongs to that tournament phase.`;
  const search = explainSearchStatus(prediction);
  const score = `The displayed pick is ${formatPredictionScore(prediction)} for 90 minutes.`;
  const validation = prediction.isValidForScoring
    ? "The output is valid for scoring."
    : `The output is not valid for scoring (${prediction.validationStatus ?? "invalid"}).`;
  const scoring = prediction.scorePoints === null
    ? "Evaluation is still pending for this match."
    : `Current evaluation: ${prediction.scorePoints} Kicktipp point(s), reason: ${prediction.scoreReason ?? "scored"}.`;

  return `${prediction.model} by ${prediction.provider}. ${horizon} ${access} ${prompt} ${stage} ${search} ${score} ${validation} ${scoring}`;
}

function explainForecastHorizon(value: string): string {
  if (value === "STAGE_OPENING") {
    return "Stage opening means this prediction was generated once at the start of the tournament stage, before the relevant matches were played.";
  }

  if (value === "T_24H") {
    return "T_24H means this prediction was scheduled approximately 24 hours before kickoff.";
  }

  if (value === "T_1H") {
    return "T_1H means this prediction was scheduled approximately 1 hour before kickoff.";
  }

  return `${value} is the forecast horizon used for this prediction.`;
}

function explainAccessCondition(value: string): string {
  if (value === "open_book") {
    return "Open book means the model was allowed to use configured web-search/tool access before answering.";
  }

  if (value === "closed_book") {
    return "Closed book means the model had to answer from internal knowledge only, without search/tool access.";
  }

  return `${formatCondition(value)} is the access condition stored for this prediction.`;
}

function explainPromptStrategy(value: string): string {
  if (value === "direct_score") {
    return "Direct score asks the model for the most likely scoreline plus required probabilities.";
  }

  if (value === "probabilistic_forecast") {
    return "Probabilistic forecast emphasizes calibrated outcome probabilities before the scoreline.";
  }

  return `${formatCondition(value)} is the prompt strategy stored for this prediction.`;
}

function explainSearchStatus(prediction: DashboardPrediction): string {
  if (prediction.accessCondition !== "open_book") {
    return "Search observed is not applicable because this is not an open-book prediction.";
  }

  const observed = prediction.openBookCompliance === "observed_search" || prediction.toolCallsObserved === true;
  const callCount = prediction.numToolCalls === null ? "no" : `${prediction.numToolCalls}`;

  return observed
    ? `Search observed means the run actually used web/tool access; ${callCount} tool call(s) were recorded.`
    : "Search not observed means open-book access was allowed, but no web/tool call was detected in the stored run.";
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
