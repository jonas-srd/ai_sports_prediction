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
import { formatTeamName, getTeamFlag } from "@/lib/country-flags";
import { formatMatchTime, formatShortDate } from "@/lib/timezone";
import { useTimeZone } from "@/components/time-zone-provider";
import { commonText, localizePath, type Locale } from "@/lib/i18n";

type HomeDashboardProps = {
  locale: Locale;
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

const DASHBOARD_TEXT = {
  en: {
    currentLeader: "Current leader",
    topModel: "Top model for the active filters.",
    scoresInView: "points in this view",
    startRanking: "Run predictions to start the ranking.",
    rulesLabel: "Scoring rules",
    rules: "Rules",
    scoring: "Scoring",
    scoringDescription: "Exact scores, goal difference, and tendencies decide match points.",
    exactScore: "Exact score",
    correctGoalDifference: "Correct goal difference",
    correctTendency: "Correct tendency",
    miss: "Miss",
    schedule: "Schedule",
    latestMatches: "Latest matches",
    latestDescription: "Fixture and result preview for the current view.",
    openDetails: "Open details",
    extraQuestions: "Extra questions",
    questionPredictions: "Question predictions",
    questionDescription: "Tournament-long picks for group winners, semifinalists, top scorer team, and champion.",
    modelSetups: "model setups",
    questions: "questions",
    noQuestions: "No question predictions yet",
    noQuestionsDescription: "Run special predictions first, then this table will show all 15 question picks.",
    questionHint: "This table has its own score. Correct question tips get 5 points; wrong or unresolved tips get 0.",
    rank: "Rank",
    model: "Model",
    score: "Score",
    actual: "Actual",
    officialResults: "Official results",
    updatedWhenKnown: "Updated when known",
    reference: "reference",
    noReasoning: "No reasoning summary stored for this prediction.",
    groupWinner: "Group winner",
    worldCup: "World Cup",
    finalFour: "Final four",
    scoringKicker: "Scoring",
    winner: "Winner",
    topScorerTeam: "Top scorer team",
    semifinalists: "Semi-finalists",
    group: "Group",
    reasonFor: "reason for",
    groupStage: "Group stage"
  },
  de: {
    currentLeader: "Aktueller Spitzenreiter",
    topModel: "Bestes Modell fur die aktiven Filter.",
    scoresInView: "Punkte in dieser Ansicht",
    startRanking: "Starte Vorhersagen, um das Ranking zu erstellen.",
    rulesLabel: "Punkteregeln",
    rules: "Regeln",
    scoring: "Punktevergabe",
    scoringDescription: "Exakte Ergebnisse, Tordifferenz und Tendenz bestimmen die Match-Punkte.",
    exactScore: "Exaktes Ergebnis",
    correctGoalDifference: "Richtige Tordifferenz",
    correctTendency: "Richtige Tendenz",
    miss: "Fehltipp",
    schedule: "Spielplan",
    latestMatches: "Neueste Spiele",
    latestDescription: "Spiel- und Ergebnisvorschau fur die aktuelle Ansicht.",
    openDetails: "Details offnen",
    extraQuestions: "Zusatzfragen",
    questionPredictions: "Fragen-Prognosen",
    questionDescription: "Turnierweite Tipps fur Gruppensieger, Halbfinalisten, Top-Torschutzen-Team und Weltmeister.",
    modelSetups: "Modell-Setups",
    questions: "Fragen",
    noQuestions: "Noch keine Fragen-Prognosen",
    noQuestionsDescription: "Starte zuerst die Zusatzprognosen, dann zeigt diese Tabelle alle 15 Tipps.",
    questionHint: "Diese Tabelle hat eine eigene Wertung. Richtige Tipps erhalten 5 Punkte; falsche oder offene Tipps erhalten 0.",
    rank: "Rang",
    model: "Modell",
    score: "Punkte",
    actual: "Aktuell",
    officialResults: "Offizielle Ergebnisse",
    updatedWhenKnown: "Aktualisiert, sobald bekannt",
    reference: "Referenz",
    noReasoning: "Fur diese Prognose ist keine Begrundungszusammenfassung gespeichert.",
    groupWinner: "Gruppensieger",
    worldCup: "Weltmeisterschaft",
    finalFour: "Final Four",
    scoringKicker: "Tore",
    winner: "Sieger",
    topScorerTeam: "Top-Torschutzen-Team",
    semifinalists: "Halbfinalisten",
    group: "Gruppe",
    reasonFor: "Begrundung fur",
    groupStage: "Gruppenphase"
  }
} as const;

export function HomeDashboard({ locale, matches, specialPredictions }: HomeDashboardProps) {
  const { timeZone } = useTimeZone();
  const text = DASHBOARD_TEXT[locale];
  const common = commonText[locale];
  const options = useMemo(() => getPredictionViewOptions(matches), [matches]);
  const [viewState, setViewState] = useState<PredictionViewState>(() => getDefaultPredictionViewState(options));
  const filteredMatches = useMemo(
    () => filterMatchesForPredictionView(matches, viewState),
    [matches, viewState]
  );
  const leaderboard = useMemo(
    () => buildPredictionViewLeaderboard(filteredMatches, { conciseProvider: viewState.mode === "best", locale }),
    [filteredMatches, locale, viewState.mode]
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
  const summary = useMemo(() => getPredictionViewSummary(viewState, matches, locale), [viewState, matches, locale]);
  const leader = leaderboard[0];

  return (
    <>
      <section className="leaderSpotlight">
        <div className="leaderCard">
          <span>{text.currentLeader}</span>
          <strong>{leader?.model ?? common.noDataYet}</strong>
          <p className="panelDescription">
            {text.topModel}
          </p>
          <p>{leader ? `${leader.points} ${text.scoresInView}` : text.startRanking}</p>
        </div>

        <aside className="rulesCard" aria-label={text.rulesLabel}>
          <p className="sectionKicker">{text.rules}</p>
          <h2>{text.scoring}</h2>
          <p className="panelDescription">
            {text.scoringDescription}
          </p>
          <div className="ruleList">
            <div className="ruleItem">
              <strong>5 {common.scores}</strong>
              <span>{text.exactScore}</span>
            </div>
            <div className="ruleItem">
              <strong>2 {common.scores}</strong>
              <span>{text.correctGoalDifference}</span>
            </div>
            <div className="ruleItem">
              <strong>1 {common.score}</strong>
              <span>{text.correctTendency}</span>
            </div>
            <div className="ruleItem">
              <strong>0 {common.scores}</strong>
              <span>{text.miss}</span>
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
            locale={locale}
            variant="embedded"
            onChange={setViewState}
          />
        }
        locale={locale}
        leaderboard={leaderboard}
        matches={displayMatches}
      />

      <SpecialQuestionPredictionsTable
        columns={specialQuestionColumns}
        locale={locale}
        matches={matches}
        rows={specialQuestionRows}
      />

      <section className="panel matchesPanel">
        <div className="panelHeader">
          <div>
            <p className="sectionKicker">{text.schedule}</p>
            <h2>{text.latestMatches}</h2>
            <p className="panelDescription">
              {text.latestDescription}
            </p>
          </div>
          <Link href={localizePath("/matches", locale)}>{text.openDetails}</Link>
        </div>
        <div className="matchList matchPreviewGrid">
          {displayMatches.slice(0, 8).map((match) => (
            <Link className="matchCard" href={`${localizePath("/matches", locale)}#${getMatchAnchorId(match.id)}`} key={match.id}>
              <TeamMatchup
                compact
                homeTeam={match.homeTeam}
                awayTeam={match.awayTeam}
                center={formatMatchCenter(match, timeZone)}
                locale={locale}
                meta={formatMatchMeta(match, timeZone, locale)}
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
  locale,
  matches,
  rows
}: {
  columns: SpecialQuestionColumn[];
  locale: Locale;
  matches: DashboardMatch[];
  rows: SpecialQuestionTableRow[];
}) {
  const actualAnswers = buildActualSpecialQuestionAnswers(matches);
  const text = DASHBOARD_TEXT[locale];

  return (
    <section className="panel specialQuestionsPanel">
      <div className="panelHeader">
        <div>
          <p className="sectionKicker">{text.extraQuestions}</p>
          <h2>{text.questionPredictions}</h2>
          <p className="panelDescription">
            {text.questionDescription}
          </p>
        </div>
        <span className="tableSummary">{rows.length} {text.modelSetups} / {columns.length} {text.questions}</span>
      </div>

      {rows.length === 0 || columns.length === 0 ? (
        <div className="emptyState">
          <strong>{text.noQuestions}</strong>
          <p>{text.noQuestionsDescription}</p>
        </div>
      ) : (
        <>
          <p className="specialQuestionsHint">
            {text.questionHint}
          </p>
          <div className="specialQuestionsScroll">
            <table className="specialQuestionsTable">
              <thead>
                <tr>
                  <th>{text.rank}</th>
                  <th>{text.model}</th>
                  <th>{text.score}</th>
                  {columns.map((column) => (
                    <th className={getSpecialQuestionColumnClass(column.id)} title={column.label} key={column.id}>
                      <SpecialQuestionHeader column={column} locale={locale} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="specialQuestionsActualRow">
                  <td>{text.actual}</td>
                  <td>
                    <strong>{text.officialResults}</strong>
                    <span>{text.updatedWhenKnown}</span>
                  </td>
                  <td>
                    <strong>-</strong>
                    <span>{text.reference}</span>
                  </td>
                  {columns.map((column) => (
                    <td className={getSpecialQuestionColumnClass(column.id)} key={column.id}>
                      <ActualSpecialQuestionCell locale={locale} teams={actualAnswers.get(column.id) ?? []} />
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
                          <SpecialQuestionCell locale={locale} prediction={row.predictionsByQuestion.get(column.id)} />
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

function SpecialQuestionHeader({ column, locale }: { column: SpecialQuestionColumn; locale: Locale }) {
  return (
    <span className={`specialQuestionHeaderPill ${getSpecialQuestionHeaderTone(column.id)}`}>
      <span>{formatQuestionHeaderKicker(column.id, locale)}</span>
      <strong>{formatQuestionHeader(column, locale)}</strong>
    </span>
  );
}

function SpecialQuestionCell({ locale, prediction }: { locale: Locale; prediction?: DashboardSpecialPrediction }) {
  if (!prediction) {
    return <span className="specialQuestionEmpty">-</span>;
  }

  const value = formatSpecialPredictionValue(prediction);
  const tooltipLines = buildSpecialQuestionReasonLines(prediction, value, locale);

  return (
    <span className="specialQuestionCell">
      <SpecialQuestionPick locale={locale} prediction={prediction} />
      <InfoTooltip
        label={`${prediction.model} ${DASHBOARD_TEXT[locale].reasonFor} ${formatSpecialQuestionLabel(prediction, locale)}`}
        lines={tooltipLines}
      />
    </span>
  );
}

function ActualSpecialQuestionCell({ locale, teams }: { locale: Locale; teams: string[] }) {
  const displayTeams = teams.map((team) => formatTeamName(team, locale));
  if (teams.length === 0) {
    return <span className="specialQuestionActualPending">TBD</span>;
  }

  return (
    <span
      aria-label={displayTeams.join(", ")}
      className={`specialQuestionFlagList${teams.length > 1 ? " isMulti" : ""} isActual`}
      title={displayTeams.join(", ")}
    >
      {teams.map((team) => (
        <TeamPickFlag key={team} locale={locale} teamName={team} />
      ))}
    </span>
  );
}

function SpecialQuestionPick({ locale, prediction }: { locale: Locale; prediction: DashboardSpecialPrediction }) {
  const teams = prediction.predictionType === "multi_choice_fixed_k"
    ? prediction.finalPicks
    : prediction.finalPick ? [prediction.finalPick] : [];
  const displayTeams = teams.map((team) => formatTeamName(team, locale));
  const correctnessClass = prediction.isCorrect === true ? " isCorrect" : prediction.isCorrect === false ? " isWrong" : "";

  if (teams.length === 0) {
    return <span className={`specialQuestionPick${correctnessClass}`}>-</span>;
  }

  return (
    <span
      aria-label={displayTeams.join(", ")}
      className={`specialQuestionFlagList${teams.length > 1 ? " isMulti" : ""}${correctnessClass}`}
      title={displayTeams.join(", ")}
    >
      {teams.map((team) => (
        <TeamPickFlag key={team} locale={locale} teamName={team} />
      ))}
    </span>
  );
}

function TeamPickFlag({ locale, teamName }: { locale: Locale; teamName: string }) {
  const flag = getTeamFlag(teamName);
  const displayTeamName = formatTeamName(teamName, locale);

  if (!flag) {
    return (
      <span className="specialQuestionFlag specialQuestionFlagFallback" title={displayTeamName}>
        {getTeamInitials(displayTeamName)}
      </span>
    );
  }

  return (
    <img
      alt={locale === "de" ? `Flagge ${displayTeamName}` : flag.alt}
      className="specialQuestionFlag"
      loading="lazy"
      src={flag.src}
      srcSet={flag.srcSet}
      title={displayTeamName}
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
  value: string,
  locale: Locale
): TooltipLine[] {
  const common = commonText[locale];
  const text = DASHBOARD_TEXT[locale];
  const lines: TooltipLine[] = [
    {
      label: common.question,
      text: formatSpecialQuestionLabel(prediction, locale)
    },
    {
      label: common.pick,
      text: value
    },
    {
      label: common.reason,
      text: prediction.reasoningSummary ?? text.noReasoning
    }
  ];

  if (prediction.confidence !== null) {
    lines.push({
      label: common.confidence,
      text: `${Math.round(prediction.confidence * 100)}%`
    });
  }

  lines.push({
    label: common.setup,
    text: `${prediction.accessCondition.replaceAll("_", " ")} / ${prediction.promptStrategy.replaceAll("_", " ")} / ${prediction.forecastHorizon}`
  });

  return lines;
}

function formatSpecialQuestionLabel(prediction: DashboardSpecialPrediction, locale: Locale): string {
  return formatQuestionHeader({ id: prediction.questionId, label: prediction.questionLabel }, locale);
}

function formatQuestionHeader(column: SpecialQuestionColumn, locale: Locale): string {
  const text = DASHBOARD_TEXT[locale];
  if (column.id.startsWith("group_winner_")) {
    return column.id.replace("group_winner_", `${text.group} `);
  }

  if (column.id === "world_champion") {
    return text.winner;
  }

  if (column.id === "top_scorer_team") {
    return text.topScorerTeam;
  }

  if (column.id === "semifinalists") {
    return text.semifinalists;
  }

  return column.label;
}

function formatQuestionHeaderKicker(questionId: string, locale: Locale): string {
  const text = DASHBOARD_TEXT[locale];
  if (questionId === "world_champion") return text.worldCup;
  if (questionId === "semifinalists") return text.finalFour;
  if (questionId === "top_scorer_team") return text.scoringKicker;
  if (questionId.startsWith("group_winner_")) return text.groupWinner;
  return commonText[locale].question;
}

function getSpecialQuestionHeaderTone(questionId: string): string {
  if (questionId === "world_champion") return "isChampion";
  if (questionId === "semifinalists") return "isKnockout";
  if (questionId === "top_scorer_team") return "isScoring";
  return "isGroup";
}

function getSpecialQuestionColumnClass(questionId: string): string {
  const classes = [];

  if (questionId === "semifinalists") {
    classes.push("specialQuestionSemisColumn");
  }

  if (questionId === "world_champion" || questionId === "semifinalists" || questionId === "top_scorer_team") {
    classes.push("specialQuestionFeatureColumn");
  }

  if (questionId === "group_winner_A") {
    classes.push("specialQuestionGroupStartColumn");
  }

  return classes.join(" ");
}

function getGroupWinnerIndex(questionId: string): number | null {
  const groupMatch = questionId.match(/^group_winner_([A-L])$/);
  return groupMatch ? groupMatch[1].charCodeAt(0) - "A".charCodeAt(0) : null;
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
  if (questionId === "world_champion") return 0;
  if (questionId === "semifinalists") return 1;
  if (questionId === "top_scorer_team") return 2;

  const groupWinnerIndex = getGroupWinnerIndex(questionId);
  if (groupWinnerIndex !== null) {
    return 10 + groupWinnerIndex;
  }

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

function formatMatchCenter(match: DashboardMatch, timeZone: string): string {
  if (match.actualHome !== null && match.actualAway !== null) {
    return `${match.actualHome} - ${match.actualAway}`;
  }

  return formatMatchTime(match.utcDate, timeZone);
}

function formatMatchMeta(match: DashboardMatch, timeZone: string, locale: Locale): string | null {
  const details = [formatCompetition(match.competition, locale), match.venue, formatShortDate(match.utcDate, timeZone, getIntlLocale(locale))].filter(Boolean);
  return details.length > 0 ? details.join(" / ") : null;
}

function getIntlLocale(locale: Locale): string {
  return locale === "de" ? "de-DE" : "en-GB";
}

function formatCompetition(value: string | undefined, locale: Locale): string | null {
  if (!value) {
    return null;
  }

  const groupLabel = locale === "de" ? "Gruppe" : "Group";
  const groupStageLabel = locale === "de" ? "Gruppenphase" : "Group stage";
  return value
    .replace("FIFA World Cup", "World Cup")
    .replace("GROUP_STAGE", groupStageLabel)
    .replace(/GROUP_([A-L])/g, `${groupLabel} $1`)
    .replaceAll(" - ", " / ");
}
