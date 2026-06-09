"use client";

/**
 * Purpose: Browser-side drilldown for the model selected from the leaderboard.
 * SQLite data is still loaded by the server page; this component only filters and scores it interactively.
 */
import { useMemo } from "react";
import type { DashboardMatch } from "@/lib/dashboard-data";
import { calculatePredictionScore, type ScoreResult } from "@/lib/scorer";
import { TeamMatchup } from "@/components/team-matchup";

type ModelInspectorProps = {
  matches: DashboardMatch[];
  selectedModel: string;
  inline?: boolean;
};

type ModelOption = {
  model: string;
  provider: string;
};

type FocusRow = {
  match: DashboardMatch;
  prediction: DashboardMatch["predictions"][number] | undefined;
  score: ScoreResult | null;
};

export function ModelInspector({ matches, selectedModel, inline = false }: ModelInspectorProps) {
  const models = useMemo(() => getModels(matches), [matches]);
  const inspectorClassName = `panel interactivePanel${inline ? " inlineInspector" : ""}`;
  const activeModel = models.some((entry) => entry.model === selectedModel)
    ? selectedModel
    : models[0]?.model ?? "";

  const rows = useMemo(
    () => getFocusRows(matches, activeModel),
    [matches, activeModel]
  );

  const pickedRows = rows.filter((row) => row.prediction);
  const scoredRows = rows.filter((row) => row.score);
  const totalPoints = scoredRows.reduce((sum, row) => sum + (row.score?.points ?? 0), 0);
  const exactHits = scoredRows.filter((row) => row.score?.reason === "exact").length;
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
          <span>Points</span>
          <strong>{totalPoints}</strong>
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
          rows.map((row) => (
            <div className="modelMatchRow" key={row.match.id}>
              <div className="modelMatchTeams">
                <TeamMatchup
                  compact
                  homeTeam={row.match.homeTeam}
                  awayTeam={row.match.awayTeam}
                  center={formatMatchCenter(row.match)}
                  meta={formatMatchMeta(row.match)}
                />
              </div>

              <div className="modelScoreLine">
                <span>Pick {formatPrediction(row.prediction)}</span>
                <span>Final {formatScore(row.match.actualHome, row.match.actualAway)}</span>
              </div>

              <div className="resultTag">
                <strong>{row.score ? `${row.score.points} pts` : row.prediction ? "pending" : "no pick"}</strong>
                <span>{row.score ? formatReason(row.score.reason) : "not scored"}</span>
              </div>
            </div>
          ))
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

function getFocusRows(matches: DashboardMatch[], selectedModel: string): FocusRow[] {
  return matches.map((match) => {
    const prediction = match.predictions.find((entry) => entry.model === selectedModel);
    const score = prediction && match.actualHome !== null && match.actualAway !== null
      ? calculatePredictionScore(
          { home: prediction.predictedHome, away: prediction.predictedAway },
          { home: match.actualHome, away: match.actualAway }
        )
      : null;

    return { match, prediction, score };
  });
}

function formatMatchCenter(match: DashboardMatch): string {
  if (match.actualHome !== null && match.actualAway !== null) {
    return `${match.actualHome} - ${match.actualAway}`;
  }

  if (!match.utcDate) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin"
  }).format(new Date(match.utcDate));
}

function formatMatchMeta(match: DashboardMatch): string | null {
  const details = [formatCompetition(match.competition), match.venue, formatMatchDate(match.utcDate)].filter(Boolean);
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

function formatMatchDate(value?: string): string {
  if (!value) {
    return "Date TBD";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date TBD";
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin"
  }).format(date);
}

function formatPrediction(prediction: DashboardMatch["predictions"][number] | undefined): string {
  if (!prediction) {
    return "-";
  }

  return `${prediction.predictedHome} - ${prediction.predictedAway}`;
}

function formatScore(home: number | null, away: number | null): string {
  if (home === null || away === null) {
    return "TBD";
  }

  return `${home} - ${away}`;
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
