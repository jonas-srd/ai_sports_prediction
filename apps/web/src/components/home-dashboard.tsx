"use client";

/**
 * Purpose: Client-side Home engagement layer.
 * It keeps leaderboard filtering interactive while SQLite data remains server-loaded.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import type { DashboardMatch, DashboardSpecialPrediction } from "@/lib/dashboard-data";
import { getDisplayMatch, getGroupRankings } from "@/lib/match-display";
import {
  buildPredictionViewLeaderboard,
  filterMatchesForPredictionView,
  getDefaultPredictionViewState,
  getPredictionConfigurationKey,
  getPredictionViewOptions,
  getPredictionViewSummary,
  type PredictionViewState
} from "@/lib/prediction-view";
import { InteractiveLeaderboard } from "@/components/interactive-leaderboard";
import { PredictionViewControls } from "@/components/prediction-view-controls";
import { TeamMatchup } from "@/components/team-matchup";
import { InfoTooltip, type TooltipLine } from "@/components/info-tooltip";
import { getTeamFlag } from "@/lib/country-flags";

type HomeDashboardProps = {
  matches: DashboardMatch[];
  specialPredictions: DashboardSpecialPrediction[];
};

type SpecialQuestionTableRow = {
  key: string;
  model: string;
  provider: string;
  points: number;
  correct: number;
  answered: number;
  predictionsByQuestion: Map<string, DashboardSpecialPrediction>;
};

type SpecialQuestionColumn = {
  id: string;
  label: string;
};

export function HomeDashboard({ matches, specialPredictions }: HomeDashboardProps) {
  const options = useMemo(() => getPredictionViewOptions(matches), [matches]);
  const [viewState, setViewState] = useState<PredictionViewState>(() => getDefaultPredictionViewState(options));
  const filteredMatches = useMemo(
    () => filterMatchesForPredictionView(matches, viewState),
    [matches, viewState]
  );
  const leaderboard = useMemo(
    () => buildPredictionViewLeaderboard(filteredMatches, { conciseProvider: viewState.mode === "best" }),
    [filteredMatches, viewState.mode]
  );
  const filteredSpecialPredictions = useMemo(
    () => filterSpecialPredictionsForPredictionView(specialPredictions, viewState, filteredMatches),
    [specialPredictions, viewState, filteredMatches]
  );
  const specialQuestionColumns = useMemo(
    () => buildSpecialQuestionColumns(filteredSpecialPredictions),
    [filteredSpecialPredictions]
  );
  const specialQuestionRows = useMemo(
    () => buildSpecialQuestionTableRows(filteredSpecialPredictions),
    [filteredSpecialPredictions]
  );
  const displayMatches = useMemo(
    () => filteredMatches.map((match) => getDisplayMatch(match, filteredMatches)),
    [filteredMatches]
  );
  const summary = useMemo(() => getPredictionViewSummary(viewState, matches), [viewState, matches]);
  const leader = leaderboard[0];

  return (
    <>
      <section className="leaderSpotlight">
        <div className="leaderCard">
          <span>Current leader</span>
          <strong>{leader?.model ?? "No data yet"}</strong>
          <p className="panelDescription">
            Top model for the active filters.
          </p>
          <p>{leader ? `${leader.points} scores in this view` : "Run predictions to start the ranking."}</p>
        </div>

        <aside className="rulesCard" aria-label="Scoring rules">
          <p className="sectionKicker">Rules</p>
          <h2>Scoring</h2>
          <p className="panelDescription">
            Exact scores, goal difference, and tendencies decide match points.
          </p>
          <div className="ruleList">
            <div className="ruleItem">
              <strong>5 scores</strong>
              <span>Exact score</span>
            </div>
            <div className="ruleItem">
              <strong>2 scores</strong>
              <span>Correct goal difference</span>
            </div>
            <div className="ruleItem">
              <strong>1 score</strong>
              <span>Correct tendency</span>
            </div>
            <div className="ruleItem">
              <strong>0 scores</strong>
              <span>Miss</span>
            </div>
          </div>
        </aside>
      </section>

      <InteractiveLeaderboard
        controls={
          <PredictionViewControls
            options={options}
            state={viewState}
            summary={summary}
            variant="embedded"
            onChange={setViewState}
          />
        }
        leaderboard={leaderboard}
        matches={displayMatches}
      />

      <SpecialQuestionPredictionsTable
        columns={specialQuestionColumns}
        matches={matches}
        rows={specialQuestionRows}
      />

      <section className="panel matchesPanel">
        <div className="panelHeader">
          <div>
            <p className="sectionKicker">Schedule</p>
            <h2>Latest matches</h2>
            <p className="panelDescription">
              Fixture and result preview for the current view.
            </p>
          </div>
          <Link href="/matches">Open details</Link>
        </div>
        <div className="matchList matchPreviewGrid">
          {displayMatches.slice(0, 8).map((match) => (
            <Link className="matchCard" href={`/matches#${getMatchAnchorId(match.id)}`} key={match.id}>
              <TeamMatchup
                compact
                homeTeam={match.homeTeam}
                awayTeam={match.awayTeam}
                center={formatMatchCenter(match)}
                meta={formatMatchMeta(match)}
              />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function SpecialQuestionPredictionsTable({
  columns,
  matches,
  rows
}: {
  columns: SpecialQuestionColumn[];
  matches: DashboardMatch[];
  rows: SpecialQuestionTableRow[];
}) {
  const actualAnswers = buildActualSpecialQuestionAnswers(matches);

  return (
    <section className="panel specialQuestionsPanel">
      <div className="panelHeader">
        <div>
          <p className="sectionKicker">Extra questions</p>
          <h2>Question predictions</h2>
          <p className="panelDescription">
            Tournament-long picks for group winners, semifinalists, top scorer team, and champion.
          </p>
        </div>
        <span className="tableSummary">{rows.length} model setups / {columns.length} questions</span>
      </div>

      {rows.length === 0 || columns.length === 0 ? (
        <div className="emptyState">
          <strong>No question predictions yet</strong>
          <p>Run special predictions first, then this table will show all 15 question picks.</p>
        </div>
      ) : (
        <>
          <p className="specialQuestionsHint">
            This table has its own score. Correct question tips get 5 points; wrong or unresolved tips get 0.
          </p>
          <div className="specialQuestionsScroll">
            <table className="specialQuestionsTable">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Model</th>
                  <th>Score</th>
                  {columns.map((column) => (
                    <th className={getSpecialQuestionColumnClass(column.id)} title={column.label} key={column.id}>
                      {formatQuestionHeader(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="specialQuestionsActualRow">
                  <td>Actual</td>
                  <td>
                    <strong>Official results</strong>
                    <span>Updated when known</span>
                  </td>
                  <td>
                    <strong>-</strong>
                    <span>reference</span>
                  </td>
                  {columns.map((column) => (
                    <td className={getSpecialQuestionColumnClass(column.id)} key={column.id}>
                      <ActualSpecialQuestionCell teams={actualAnswers.get(column.id) ?? []} />
                    </td>
                  ))}
                </tr>
                {rows.map((row, index) => {
                  const rank = getSpecialQuestionRank(rows, index);

                  return (
                    <tr key={row.key}>
                      <td>#{rank}</td>
                      <td>
                        <strong>{row.model}</strong>
                        <span>{row.provider}</span>
                      </td>
                      <td>
                        <strong>{row.points}</strong>
                        <span>{row.correct}/{columns.length}</span>
                      </td>
                      {columns.map((column) => (
                        <td className={getSpecialQuestionColumnClass(column.id)} key={column.id}>
                          <SpecialQuestionCell prediction={row.predictionsByQuestion.get(column.id)} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function ActualSpecialQuestionCell({ teams }: { teams: string[] }) {
  if (teams.length === 0) {
    return <span className="specialQuestionActualPending">TBD</span>;
  }

  return (
    <span
      aria-label={teams.join(", ")}
      className={`specialQuestionFlagList${teams.length > 1 ? " isMulti" : ""} isActual`}
      title={teams.join(", ")}
    >
      {teams.map((team) => (
        <TeamPickFlag key={team} teamName={team} />
      ))}
    </span>
  );
}

function SpecialQuestionCell({ prediction }: { prediction?: DashboardSpecialPrediction }) {
  if (!prediction) {
    return <span className="specialQuestionEmpty">-</span>;
  }

  const value = formatSpecialPredictionValue(prediction);
  const tooltipLines = buildSpecialQuestionReasonLines(prediction, value);

  return (
    <span className="specialQuestionCell">
      <SpecialQuestionPick prediction={prediction} />
      <InfoTooltip
        label={`${prediction.model} reason for ${prediction.questionLabel}`}
        lines={tooltipLines}
      />
    </span>
  );
}

function SpecialQuestionPick({ prediction }: { prediction: DashboardSpecialPrediction }) {
  const teams = prediction.predictionType === "multi_choice_fixed_k"
    ? prediction.finalPicks
    : prediction.finalPick ? [prediction.finalPick] : [];
  const correctnessClass = prediction.isCorrect === true ? " isCorrect" : prediction.isCorrect === false ? " isWrong" : "";

  if (teams.length === 0) {
    return <span className={`specialQuestionPick${correctnessClass}`}>-</span>;
  }

  return (
    <span
      aria-label={teams.join(", ")}
      className={`specialQuestionFlagList${teams.length > 1 ? " isMulti" : ""}${correctnessClass}`}
      title={teams.join(", ")}
    >
      {teams.map((team) => (
        <TeamPickFlag key={team} teamName={team} />
      ))}
    </span>
  );
}

function TeamPickFlag({ teamName }: { teamName: string }) {
  const flag = getTeamFlag(teamName);

  if (!flag) {
    return (
      <span className="specialQuestionFlag specialQuestionFlagFallback" title={teamName}>
        {getTeamInitials(teamName)}
      </span>
    );
  }

  return (
    <img
      alt={flag.alt}
      className="specialQuestionFlag"
      loading="lazy"
      src={flag.src}
      srcSet={flag.srcSet}
      title={teamName}
    />
  );
}

function buildActualSpecialQuestionAnswers(matches: DashboardMatch[]): Map<string, string[]> {
  const answers: Record<string, string[]> = {
    group_winner_A: [],
    group_winner_B: [],
    group_winner_C: [],
    group_winner_D: [],
    group_winner_E: [],
    group_winner_F: [],
    group_winner_G: [],
    group_winner_H: [],
    group_winner_I: [],
    group_winner_J: [],
    group_winner_K: [],
    group_winner_L: [],
    top_scorer_team: [],
    semifinalists: [],
    world_champion: []
  };

  const rankings = getGroupRankings(matches);
  for (const group of "ABCDEFGHIJKL") {
    const ranking = rankings.get(group);
    if (ranking?.complete && ranking.standings[0]) {
      answers[`group_winner_${group}`] = [ranking.standings[0].team];
    }
  }

  return new Map(Object.entries(answers));
}

function filterSpecialPredictionsForPredictionView(
  predictions: DashboardSpecialPrediction[],
  state: PredictionViewState,
  filteredMatches: DashboardMatch[]
): DashboardSpecialPrediction[] {
  const allowedKeys = state.mode === "best"
    ? new Set(filteredMatches.flatMap((match) => match.predictions.map(getPredictionConfigurationKey)))
    : null;

  return predictions.filter((prediction) => {
    if (allowedKeys) {
      return allowedKeys.has(getSpecialPredictionConfigurationKey(prediction));
    }

    if (state.customMode === "all") {
      return true;
    }

    return state.models.includes(prediction.model)
      && state.accessConditions.includes(prediction.accessCondition)
      && state.promptStrategies.includes(prediction.promptStrategy)
      && state.forecastHorizons.includes(prediction.forecastHorizon);
  });
}

function buildSpecialQuestionColumns(predictions: DashboardSpecialPrediction[]): SpecialQuestionColumn[] {
  const byQuestion = new Map<string, SpecialQuestionColumn>();

  for (const prediction of predictions) {
    byQuestion.set(prediction.questionId, {
      id: prediction.questionId,
      label: prediction.questionLabel
    });
  }

  return [...byQuestion.values()].sort(compareSpecialQuestionColumns);
}

function buildSpecialQuestionTableRows(predictions: DashboardSpecialPrediction[]): SpecialQuestionTableRow[] {
  const rows = new Map<string, SpecialQuestionTableRow>();

  for (const prediction of predictions) {
    const key = getSpecialPredictionConfigurationKey(prediction);
    const current = rows.get(key) ?? {
      key,
      model: prediction.model,
      provider: formatSpecialProvider(prediction),
      points: 0,
      correct: 0,
      answered: 0,
      predictionsByQuestion: new Map<string, DashboardSpecialPrediction>()
    };

    current.points += prediction.questionScorePoints;
    current.correct += prediction.isCorrect === true ? 1 : 0;
    current.answered += 1;
    current.predictionsByQuestion.set(prediction.questionId, prediction);
    rows.set(key, current);
  }

  return [...rows.values()].sort((a, b) =>
    b.points - a.points
    || b.correct - a.correct
    || b.answered - a.answered
    || a.model.localeCompare(b.model)
    || a.provider.localeCompare(b.provider)
  );
}

function getSpecialPredictionConfigurationKey(prediction: DashboardSpecialPrediction): string {
  return [
    prediction.predictorId,
    prediction.provider,
    prediction.forecastHorizon,
    prediction.accessCondition,
    prediction.promptStrategy
  ].join("::");
}

function formatSpecialProvider(prediction: DashboardSpecialPrediction): string {
  return `${prediction.provider} / ${prediction.accessCondition.replaceAll("_", " ")} / ${prediction.promptStrategy.replaceAll("_", " ")} / ${prediction.forecastHorizon}`;
}

function formatSpecialPredictionValue(prediction: DashboardSpecialPrediction): string {
  if (prediction.predictionType === "multi_choice_fixed_k") {
    return prediction.finalPicks.length > 0 ? prediction.finalPicks.join(", ") : "-";
  }

  return prediction.finalPick ?? "-";
}

function buildSpecialQuestionReasonLines(
  prediction: DashboardSpecialPrediction,
  value: string
): TooltipLine[] {
  const lines: TooltipLine[] = [
    {
      label: "Question",
      text: prediction.questionLabel
    },
    {
      label: "Pick",
      text: value
    },
    {
      label: "Reason",
      text: prediction.reasoningSummary ?? "No reasoning summary stored for this prediction."
    }
  ];

  if (prediction.confidence !== null) {
    lines.push({
      label: "Confidence",
      text: `${Math.round(prediction.confidence * 100)}%`
    });
  }

  lines.push({
    label: "Setup",
    text: `${prediction.accessCondition.replaceAll("_", " ")} / ${prediction.promptStrategy.replaceAll("_", " ")} / ${prediction.forecastHorizon}`
  });

  return lines;
}

function formatQuestionHeader(column: SpecialQuestionColumn): string {
  if (column.id.startsWith("group_winner_")) {
    return column.id.replace("group_winner_", "Group ");
  }

  if (column.id === "world_champion") {
    return "Champion";
  }

  if (column.id === "top_scorer_team") {
    return "Top scorer";
  }

  if (column.id === "semifinalists") {
    return "Semis";
  }

  return column.label;
}

function getSpecialQuestionColumnClass(questionId: string): string {
  return questionId === "semifinalists" ? "specialQuestionSemisColumn" : "";
}

function getTeamInitials(teamName: string): string {
  return teamName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function compareSpecialQuestionColumns(a: SpecialQuestionColumn, b: SpecialQuestionColumn): number {
  return getSpecialQuestionOrder(a.id) - getSpecialQuestionOrder(b.id) || a.label.localeCompare(b.label);
}

function getSpecialQuestionOrder(questionId: string): number {
  const groupMatch = questionId.match(/^group_winner_([A-L])$/);
  if (groupMatch) {
    return groupMatch[1].charCodeAt(0) - "A".charCodeAt(0);
  }

  if (questionId === "top_scorer_team") return 12;
  if (questionId === "semifinalists") return 13;
  if (questionId === "world_champion") return 14;
  return 100;
}

function getSpecialQuestionRank(rows: SpecialQuestionTableRow[], index: number): number {
  const row = rows[index];
  if (!row) {
    return index + 1;
  }

  const firstSameScoreIndex = rows.findIndex((candidate) => candidate.points === row.points);
  return firstSameScoreIndex >= 0 ? firstSameScoreIndex + 1 : index + 1;
}

function getMatchAnchorId(matchId: string): string {
  return `match-${matchId}`;
}

function formatMatchCenter(match: DashboardMatch): string {
  if (match.actualHome !== null && match.actualAway !== null) {
    return `${match.actualHome} - ${match.actualAway}`;
  }

  if (!match.utcDate) {
    return "Open";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin"
  }).format(new Date(match.utcDate));
}

function formatMatchMeta(match: DashboardMatch): string | null {
  const details = [formatCompetition(match.competition), match.venue, formatDate(match.utcDate)].filter(Boolean);
  return details.length > 0 ? details.join(" / ") : null;
}

function formatCompetition(value?: string): string | null {
  if (!value) {
    return null;
  }

  return value
    .replace("FIFA World Cup", "World Cup")
    .replace("GROUP_STAGE", "Group stage")
    .replace(/GROUP_([A-L])/g, "Group $1")
    .replaceAll(" - ", " / ");
}

function formatDate(value?: string): string | null {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    timeZone: "Europe/Berlin"
  }).format(new Date(value));
}
