"use client";

/**
 * Purpose: Client-side Home engagement layer.
 * It keeps leaderboard filtering interactive while SQLite data remains server-loaded.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import type { DashboardMatch } from "@/lib/dashboard-data";
import { getDisplayMatch } from "@/lib/match-display";
import {
  buildPredictionViewLeaderboard,
  filterMatchesForPredictionView,
  getDefaultPredictionViewState,
  getPredictionViewOptions,
  getPredictionViewSummary,
  type PredictionViewState
} from "@/lib/prediction-view";
import { InteractiveLeaderboard } from "@/components/interactive-leaderboard";
import { PredictionViewControls } from "@/components/prediction-view-controls";
import { TeamMatchup } from "@/components/team-matchup";

type HomeDashboardProps = {
  matches: DashboardMatch[];
};

export function HomeDashboard({ matches }: HomeDashboardProps) {
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
          <p>{leader ? `${leader.points} points in this view` : "Run predictions to start the ranking."}</p>
        </div>

        <aside className="rulesCard" aria-label="Scoring rules">
          <p className="sectionKicker">Rules</p>
          <h2>Scoring</h2>
          <div className="ruleList">
            <div className="ruleItem">
              <strong>5 pts</strong>
              <span>Exact score</span>
            </div>
            <div className="ruleItem">
              <strong>2 pts</strong>
              <span>Correct goal difference</span>
            </div>
            <div className="ruleItem">
              <strong>1 pt</strong>
              <span>Correct tendency</span>
            </div>
            <div className="ruleItem">
              <strong>0 pts</strong>
              <span>Miss</span>
            </div>
          </div>
        </aside>
      </section>

      <PredictionViewControls
        options={options}
        state={viewState}
        summary={summary}
        onChange={setViewState}
      />

      <InteractiveLeaderboard leaderboard={leaderboard} matches={displayMatches} />

      <section className="panel matchesPanel">
        <div className="panelHeader">
          <div>
            <p className="sectionKicker">Schedule</p>
            <h2>Latest matches</h2>
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
