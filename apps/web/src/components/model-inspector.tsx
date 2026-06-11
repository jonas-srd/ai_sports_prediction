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
import { commonText, type Locale } from "@/lib/i18n";

type ModelInspectorProps = {
  locale: Locale;
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

const INSPECTOR_TEXT = {
  en: {
    noPredictions: "No model predictions yet",
    noPredictionsDescription: "Run `npm run predict:next` after syncing matches to unlock model details.",
    scores: "Scores",
    exactHits: "Exact hits",
    scoredPicks: "Scored picks",
    pending: "Pending",
    noMatches: "No matches for this model",
    noMatchesDescription: "Sync more fixtures or run predictions for this model.",
    final: "Final",
    reasoning: "Reasoning:",
    notScored: "not scored",
    invalid: "invalid",
    awaitingEvaluation: "awaiting evaluation",
    groupStage: "Group stage"
  },
  de: {
    noPredictions: "Noch keine Modellprognosen",
    noPredictionsDescription: "Fuhre nach dem Synchronisieren der Spiele `npm run predict:next` aus, um Modelldetails zu sehen.",
    scores: "Punkte",
    exactHits: "Exakte Treffer",
    scoredPicks: "Gewertete Tipps",
    pending: "Offen",
    noMatches: "Keine Spiele fur dieses Modell",
    noMatchesDescription: "Synchronisiere weitere Spiele oder starte Prognosen fur dieses Modell.",
    final: "Endstand",
    reasoning: "Begrundung:",
    notScored: "nicht gewertet",
    invalid: "ungultig",
    awaitingEvaluation: "wartet auf Auswertung",
    groupStage: "Gruppenphase"
  }
} as const;

export function ModelInspector({ locale, matches, selectedModel, selectedKey, inline = false }: ModelInspectorProps) {
  const { timeZone } = useTimeZone();
  const text = INSPECTOR_TEXT[locale];
  const common = commonText[locale];
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
          <strong>{text.noPredictions}</strong>
          <p>{text.noPredictionsDescription}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={inspectorClassName}>
      <div className="focusStats">
        <div className="focusStat">
          <span>{text.scores}</span>
          <strong>{totalScores}</strong>
        </div>
        <div className="focusStat">
          <span>{text.exactHits}</span>
          <strong>{exactHits}</strong>
        </div>
        <div className="focusStat">
          <span>{text.scoredPicks}</span>
          <strong>{scoredRows.length}</strong>
        </div>
        <div className="focusStat">
          <span>{text.pending}</span>
          <strong>{pendingPicks}</strong>
        </div>
      </div>

      <div className="modelMatchList">
        {rows.length === 0 ? (
          <div className="emptyState">
            <strong>{text.noMatches}</strong>
            <p>{text.noMatchesDescription}</p>
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
                    locale={locale}
                    meta={formatMatchMeta(row.match, timeZone, locale)}
                  />
                </div>

                <div className="modelPredictionDetails">
                  <div className="modelScoreLine">
                    <span>{common.pick} {formatPrediction(row.prediction)}</span>
                    <span>{text.final} {formatScore(row.match.actualHome, row.match.actualAway, locale)}</span>
                    {row.prediction ? <span>{formatPredictionContext(row.prediction)}</span> : null}
                  </div>

                  {row.prediction?.reason ? (
                    <p className="modelPredictionReason">
                      <strong>{text.reasoning}</strong> {row.prediction.reason}
                    </p>
                  ) : null}
                </div>

                <div className="resultTag">
                  <strong>{formatPoints(row.prediction, locale)}</strong>
                  <span>{formatScoreReason(row.prediction?.scoreReason ?? null, locale) ?? getPendingLabel(row.prediction, locale)}</span>
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

function formatMatchMeta(match: DashboardMatch, timeZone: string, locale: Locale): string | null {
  const details = [formatCompetition(match.competition, locale), match.venue, formatShortDateTime(match.utcDate, timeZone, getIntlLocale(locale))].filter(Boolean);
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
    .replace(/GROUP_([A-Z])/g, `${groupLabel} $1`)
    .replaceAll(" - ", " / ");
}

function formatPrediction(prediction: DashboardMatch["predictions"][number] | undefined): string {
  if (!prediction || prediction.predictedHome === null || prediction.predictedAway === null) {
    return "-";
  }

  return `${prediction.predictedHome} - ${prediction.predictedAway}`;
}

function formatScore(home: number | null, away: number | null, locale: Locale): string {
  if (home === null || away === null) {
    return commonText[locale].open;
  }

  return `${home} - ${away}`;
}

function formatPredictionContext(prediction: DashboardPrediction): string {
  return `${prediction.forecastHorizon} / ${formatCondition(prediction.accessCondition)} / ${formatCondition(prediction.promptStrategy)}`;
}

function getPendingLabel(prediction: DashboardPrediction | undefined, locale: Locale): string {
  const text = INSPECTOR_TEXT[locale];
  if (!prediction) {
    return text.notScored;
  }

  if (!prediction.isValidForScoring) {
    return prediction.validationStatus ?? text.invalid;
  }

  return text.awaitingEvaluation;
}

function formatPoints(prediction: DashboardPrediction | undefined, locale: Locale): string {
  const common = commonText[locale];
  if (!prediction) {
    return common.noPick;
  }

  return prediction.scorePoints !== null ? `${prediction.scorePoints} ${common.scores}` : common.pending;
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

function formatScoreReason(value: string | null, locale: Locale): string | null {
  if (!value || locale === "en") {
    return value;
  }

  const normalized = value.toLowerCase();
  if (normalized.includes("exact")) return "exaktes Ergebnis";
  if (normalized.includes("goal difference")) return "richtige Tordifferenz";
  if (normalized.includes("tendency")) return "richtige Tendenz";
  if (normalized.includes("miss")) return "Fehltipp";
  if (normalized.includes("invalid")) return "ungultig";
  return value;
}
