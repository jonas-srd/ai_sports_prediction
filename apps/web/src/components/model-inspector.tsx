"use client";

/**
 * Purpose: Browser-side drilldown for the model selected from the leaderboard.
 * SQLite data is still loaded by the server page; this component only filters and scores it interactively.
 */
import { useMemo } from "react";
import type { DashboardMatch } from "@/lib/dashboard-data";
import type { DashboardPrediction } from "@/lib/dashboard-data";
import { formatCondition } from "@/lib/benchmark-analytics";
import { getMatchupLabels } from "@/lib/match-display";
import { TeamMatchup } from "@/components/team-matchup";
import { formatMatchTime, formatShortDateTime } from "@/lib/timezone";
import { useTimeZone } from "@/components/time-zone-provider";

type ModelInspectorProps = {
  matches: DashboardMatch[];
  selectedModel: string;
  selectedKey?: string;
  inline?: boolean;
};

type ModelOption = {
  model: string;
  provider: string;
};

type FocusRow = {
  match: DashboardMatch;
  prediction: DashboardMatch["predictions"][number] | undefined;
};

export function ModelInspector({ matches, selectedModel, selectedKey, inline = false }: ModelInspectorProps) {
  const { timeZone } = useTimeZone();
  const models = useMemo(() => getModels(matches), [matches]);
  const inspectorClassName = `panel interactivePanel${inline ? " inlineInspector" : ""}`;
  const activeModel = models.some((entry) => entry.model === selectedModel)
    ? selectedModel
    : models[0]?.model ?? "";

  const rows = useMemo(
    () => getFocusRows(matches, activeModel, selectedKey),
    [matches, activeModel, selectedKey]
  );

  const pickedRows = rows.filter((row) => row.prediction);
  const scoredRows = rows.filter((row) => row.prediction?.scorePoints !== null && row.prediction?.scorePoints !== undefined);
  const totalScores = scoredRows.reduce((sum, row) => sum + (row.prediction?.scorePoints ?? 0), 0);
  const exactHits = scoredRows.filter((row) => row.prediction?.exactScore90Correct).length;
  const pendingPicks = pickedRows.length - scoredRows.length;

  if (models.length === 0) {
    return (
      <section className={inspectorClassName}>
        <div className="emptyState">
          <strong>No model predictions yet</strong>
          <p>Run `npm run predict:next` after syncing matches to unlock model details.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={inspectorClassName}>
      <div className="focusStats">
        <div className="focusStat">
          <span>Scores</span>
          <strong>{totalScores}</strong>
        </div>
        <div className="focusStat">
          <span>Exact hits</span>
          <strong>{exactHits}</strong>
        </div>
        <div className="focusStat">
          <span>Scored picks</span>
          <strong>{scoredRows.length}</strong>
        </div>
        <div className="focusStat">
          <span>Pending</span>
          <strong>{pendingPicks}</strong>
        </div>
      </div>

      <div className="modelMatchList">
        {rows.length === 0 ? (
          <div className="emptyState">
            <strong>No matches for this model</strong>
            <p>Sync more fixtures or run predictions for this model.</p>
          </div>
        ) : (
          rows.map((row) => {
            const labels = getMatchupLabels(row.match, matches);
            return (
              <div className="modelMatchRow" key={row.match.id}>
                <div className="modelMatchTeams">
                  <TeamMatchup
                    compact
                    homeTeam={labels.homeTeamLabel}
                    awayTeam={labels.awayTeamLabel}
                    center={formatMatchCenter(row.match, timeZone)}
                    meta={formatMatchMeta(row.match, timeZone)}
                  />
                </div>

                <div className="modelPredictionDetails">
                  <div className="modelScoreLine">
                    <span>Pick {formatPrediction(row.prediction)}</span>
                    <span>Final {formatScore(row.match.actualHome, row.match.actualAway)}</span>
                    {row.prediction ? <span>{formatPredictionContext(row.prediction)}</span> : null}
                  </div>

                  {row.prediction?.reason ? (
                    <p className="modelPredictionReason">
                      <strong>Reasoning:</strong> {row.prediction.reason}
                    </p>
                  ) : null}
                </div>

                <div className="resultTag">
                  <strong>{formatPoints(row.prediction)}</strong>
                  <span>{row.prediction?.scoreReason ?? getPendingLabel(row.prediction)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function getModels(matches: DashboardMatch[]): ModelOption[] {
  const models = new Map<string, ModelOption>();

  for (const match of matches) {
    for (const prediction of match.predictions) {
      models.set(prediction.model, {
        model: prediction.model,
        provider: prediction.provider
      });
    }
  }

  return [...models.values()].sort((a, b) => a.model.localeCompare(b.model));
}

function getFocusRows(matches: DashboardMatch[], selectedModel: string, selectedKey?: string): FocusRow[] {
  return matches.map((match) => {
    const prediction = match.predictions.find((entry) =>
      selectedKey ? getPredictionKey(entry) === selectedKey : entry.model === selectedModel
    );
    return { match, prediction };
  });
}

function formatMatchCenter(match: DashboardMatch, timeZone: string): string {
  if (match.actualHome !== null && match.actualAway !== null) {
    return `${match.actualHome} - ${match.actualAway}`;
  }

  return formatMatchTime(match.utcDate, timeZone);
}

function formatMatchMeta(match: DashboardMatch, timeZone: string): string | null {
  const details = [formatCompetition(match.competition), match.venue, formatShortDateTime(match.utcDate, timeZone)].filter(Boolean);
  return details.length > 0 ? details.join(" / ") : null;
}

function formatCompetition(value?: string): string | null {
  if (!value) {
    return null;
  }

  return value
    .replace("FIFA World Cup", "World Cup")
    .replace("GROUP_STAGE", "Group stage")
    .replace(/GROUP_([A-Z])/g, "Group $1")
    .replaceAll(" - ", " / ");
}

function formatPrediction(prediction: DashboardMatch["predictions"][number] | undefined): string {
  if (!prediction || prediction.predictedHome === null || prediction.predictedAway === null) {
    return "-";
  }

  return `${prediction.predictedHome} - ${prediction.predictedAway}`;
}

function formatScore(home: number | null, away: number | null): string {
  if (home === null || away === null) {
    return "open";
  }

  return `${home} - ${away}`;
}

function formatPredictionContext(prediction: DashboardPrediction): string {
  return `${prediction.forecastHorizon} / ${formatCondition(prediction.accessCondition)} / ${formatCondition(prediction.promptStrategy)}`;
}

function getPendingLabel(prediction: DashboardPrediction | undefined): string {
  if (!prediction) {
    return "not scored";
  }

  if (!prediction.isValidForScoring) {
    return prediction.validationStatus ?? "invalid";
  }

  return "awaiting evaluation";
}

function formatPoints(prediction: DashboardPrediction | undefined): string {
  if (!prediction) {
    return "no pick";
  }

  return prediction.scorePoints !== null ? `${prediction.scorePoints} scores` : "pending";
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
