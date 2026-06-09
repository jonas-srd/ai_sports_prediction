/**
 * Purpose: Main ranking dashboard.
 * Reads local SQLite data when available and falls back to sample data.
 */
import Link from "next/link";
import { getDashboardMatches, getLeaderboard } from "@/lib/dashboard-data";

export default function HomePage() {
  const leaderboard = getLeaderboard();
  const matches = getDashboardMatches();
  const leader = leaderboard[0];

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">LLM Kicktipp MVP</p>
          <h1>Which model predicts football best?</h1>
          <p className="heroText">
            Eight models predict daily match scores. The dashboard ranks them with Kicktipp-style points.
          </p>
        </div>
        <div className="leaderCard">
          <span>Current leader</span>
          <strong>{leader?.model ?? "No data yet"}</strong>
          <p>{leader ? `${leader.points} points` : "Run the prediction and scoring jobs first."}</p>
        </div>
      </section>

      <section className="grid twoColumns">
        <div className="panel">
          <div className="panelHeader">
            <h2>Leaderboard</h2>
            <Link href="/matches">View matches</Link>
          </div>
          <div className="leaderboard">
            {leaderboard.map((entry, index) => (
              <div className="rankRow" key={entry.model}>
                <span className="rank">#{index + 1}</span>
                <div>
                  <strong>{entry.model}</strong>
                  <p>{entry.provider}</p>
                </div>
                <span className="points">{entry.points} pts</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel accentPanel">
          <h2>Scoring</h2>
          <div className="rules">
            <span>4 pts exact result</span>
            <span>3 pts correct goal difference</span>
            <span>2 pts correct tendency</span>
            <span>0 pts miss</span>
          </div>
          <p>
            Local SQLite data is shown when available. Otherwise the page falls back to sample data.
          </p>
        </div>
      </section>

      <section className="panel">
        <h2>Latest sample matches</h2>
        <div className="matchList">
          {matches.slice(0, 8).map((match) => (
            <div className="matchCard" key={match.id}>
              <span>{match.homeTeam}</span>
              <strong>
                {formatScore(match.actualHome, match.actualAway)}
              </strong>
              <span>{match.awayTeam}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function formatScore(home: number | null, away: number | null): string {
  if (home === null || away === null) {
    return "TBD";
  }

<<<<<<< Updated upstream
  return `${home} - ${away}`;
=======
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
    .replace(/GROUP_([A-L])\b/g, "Group $1")
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
>>>>>>> Stashed changes
}
