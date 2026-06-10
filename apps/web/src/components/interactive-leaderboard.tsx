"use client";

/**
 * Purpose: Clickable leaderboard that opens the selected model drilldown below it.
 * Model details appear inline after a model row is selected.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { DashboardLeaderboardEntry, DashboardMatch, DashboardPrediction } from "@/lib/dashboard-data";
import { formatCondition, formatStage } from "@/lib/benchmark-analytics";
import { InfoTooltip, type TooltipLine } from "@/components/info-tooltip";
import { ModelInspector } from "@/components/model-inspector";

type InteractiveLeaderboardProps = {
  leaderboard: DashboardLeaderboardEntry[];
  matches: DashboardMatch[];
  controls?: ReactNode;
};

export function InteractiveLeaderboard({ leaderboard, matches, controls }: InteractiveLeaderboardProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  return (
    <section className="contentStack">
      <div className="panel leaderboardPanel">
        <div className="panelHeader leaderboardPanelHeader">
          <div className="leaderboardHeaderTitle">
            <p className="sectionKicker">Model ranking</p>
            <h2>Leaderboard</h2>
          </div>
          {controls ? <div className="leaderboardHeaderControls">{controls}</div> : <span />}
          <Link className="leaderboardHeaderLink" href="/matches">View matches</Link>
        </div>

        {leaderboard.length === 0 ? (
          <div className="emptyState">
            <strong>No ranking yet</strong>
            <p>Run predictions first, then click a model here to inspect its details.</p>
          </div>
        ) : (
          <div className="leaderboard">
            {leaderboard.map((entry, index) => {
              const rank = getLeaderboardRank(leaderboard, index);
              return (
                <div className="leaderboardItem" key={entry.key ?? entry.model}>
                  <button
                    className={`rankRow leaderboardButton ${getPodiumClass(rank)}${selectedKey === getEntryKey(entry) ? " isSelected" : ""}`}
                    type="button"
                    onClick={() => setSelectedKey(selectedKey === getEntryKey(entry) ? null : getEntryKey(entry))}
                  >
                    <span className="rank">#{rank}</span>
                    <div>
                      <div className="leaderboardModelName">
                        <strong>{entry.model}</strong>
                        <InfoTooltip
                          label={`${entry.model} configuration`}
                          lines={buildLeaderboardConfigurationHelp(entry, matches)}
                        />
                      </div>
                      <p>{entry.provider}</p>
                    </div>
                    <span className="points">{entry.points} scores</span>
                  </button>

                  {selectedKey === getEntryKey(entry) ? (
                    <ModelInspector
                      inline
                      matches={matches}
                      selectedKey={entry.key}
                      selectedModel={entry.model}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function buildLeaderboardConfigurationHelp(
  entry: DashboardLeaderboardEntry,
  matches: DashboardMatch[]
): TooltipLine[] {
  const predictions = getEntryPredictions(entry, matches);
  const stages = sortedUnique(predictions.map((prediction) => formatStage(prediction.stage)));
  const scored = predictions.filter((prediction) => prediction.scorePoints !== null).length;
  const horizon = entry.forecastHorizon ?? predictions[0]?.forecastHorizon;
  const access = entry.accessCondition ?? predictions[0]?.accessCondition;
  const prompt = entry.promptStrategy ?? predictions[0]?.promptStrategy;

  const lines: TooltipLine[] = [];

  if (horizon) {
    lines.push({
      label: horizon,
      text: explainForecastHorizon(horizon)
    });
  }

  if (access) {
    lines.push({
      label: formatCondition(access),
      text: explainAccessCondition(access)
    });
  }

  if (prompt) {
    lines.push({
      label: formatCondition(prompt),
      text: explainPromptStrategy(prompt)
    });
  }

  lines.push(
    {
      label: "Stage coverage",
      text: stages.length > 0 ? stages.join(", ") : "No tournament stage metadata available yet."
    },
    {
      label: "Predictions",
      text: `${predictions.length} prediction(s) included in this leaderboard row.`
    },
    {
      label: "Evaluation",
      text: `${scored} scored, ${Math.max(0, predictions.length - scored)} pending.`
    },
    {
      label: "Ranking",
      text: `${entry.points} scores, ${entry.exact} exact hit(s).`
    }
  );

  return lines;
}

function getEntryPredictions(entry: DashboardLeaderboardEntry, matches: DashboardMatch[]): DashboardPrediction[] {
  return matches
    .flatMap((match) => match.predictions)
    .filter((prediction) => entry.key ? getPredictionKey(prediction) === entry.key : prediction.model === entry.model);
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

function explainForecastHorizon(value: string): string {
  if (value === "STAGE_OPENING") {
    return "Predictions generated once at the start of the tournament stage, before the relevant matches were played.";
  }

  if (value === "T_24H") {
    return "Predictions scheduled approximately 24 hours before kickoff.";
  }

  if (value === "T_1H") {
    return "Predictions scheduled approximately 1 hour before kickoff.";
  }

  return `${value} is the forecast horizon used for this leaderboard row.`;
}

function explainAccessCondition(value: string): string {
  if (value === "open_book") {
    return "Model was allowed to use configured web-search/tool access before answering.";
  }

  if (value === "closed_book") {
    return "Model had to answer from internal knowledge only, without search/tool access.";
  }

  return `${formatCondition(value)} is the access condition stored for this leaderboard row.`;
}

function explainPromptStrategy(value: string): string {
  if (value === "direct_score") {
    return "Prompt asks for the most likely scoreline plus required probabilities.";
  }

  if (value === "probabilistic_forecast") {
    return "Prompt emphasizes calibrated outcome probabilities before the scoreline.";
  }

  return `${formatCondition(value)} is the prompt strategy stored for this leaderboard row.`;
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function getEntryKey(entry: DashboardLeaderboardEntry): string {
  return entry.key ?? entry.model;
}

function getLeaderboardRank(leaderboard: DashboardLeaderboardEntry[], index: number): number {
  const entry = leaderboard[index];
  if (!entry) {
    return index + 1;
  }

  const firstSameScoreIndex = leaderboard.findIndex((candidate) => candidate.points === entry.points);
  return firstSameScoreIndex >= 0 ? firstSameScoreIndex + 1 : index + 1;
}

function getPodiumClass(rank: number): string {
  if (rank === 1) return "rankRowGold";
  if (rank === 2) return "rankRowSilver";
  if (rank === 3) return "rankRowBronze";
  return "";
}
