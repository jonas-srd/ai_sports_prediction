/**
 * Purpose: Main ranking dashboard.
 * Reads local SQLite data when available and falls back to sample data.
 */
import Link from "next/link";
import type { DashboardMatch } from "@/lib/dashboard-data";
import { getDashboardMatches, getLeaderboard } from "@/lib/dashboard-data";
import { getDisplayMatch } from "@/lib/match-display";
import { InteractiveLeaderboard } from "@/components/interactive-leaderboard";
import { TeamMatchup } from "@/components/team-matchup";

export default function HomePage() {
  const leaderboard = getLeaderboard();
  const matches = getDashboardMatches();
  const displayMatches = matches.map((match) => getDisplayMatch(match, matches));
  const leader = leaderboard[0];

  return (
    <main className="shell">
      <section className="hero heroCentered">
        <p className="eyebrow">LLM Kicktipp MVP</p>
        <h1>Which model predicts football best?</h1>
        <p className="heroText">
          Daily football predictions from multiple LLMs, ranked with Kicktipp-style points.
        </p>
        <div className="heroActions">
          <Link className="primaryLink" href="/matches">View all matches</Link>
        </div>
      </section>

      <section className="leaderSpotlight">
        <div className="leaderCard">
          <span>Current leader</span>
          <strong>{leader?.model ?? "No data yet"}</strong>
          <p>{leader ? `${leader.points} points so far` : "Run predictions to start the ranking."}</p>
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
          {displayMatches.slice(0, 8).map((match) => {
            return (
              <div className="matchCard" key={match.id}>
                <TeamMatchup
                  compact
                  homeTeam={match.homeTeam}
                  awayTeam={match.awayTeam}
                  center={formatMatchCenter(match)}
                  meta={formatMatchMeta(match)}
                />
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
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
