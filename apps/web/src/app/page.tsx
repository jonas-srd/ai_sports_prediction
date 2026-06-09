/**
 * Purpose: Main ranking dashboard.
 * Replace sample data with Supabase-backed API calls once cron jobs are writing predictions and scores.
 */
import Link from "next/link";
import { getLeaderboard, sampleMatches } from "@/lib/dashboard-data";

export default function HomePage() {
  const leaderboard = getLeaderboard();
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
            <span>5 pts exact result</span>
            <span>2 pts correct goal difference</span>
            <span>1 pts correct tendency</span>
            <span>0 pts miss</span>
          </div>
          <p>
            Sample data is shown now. The same scoring logic is used by the cron job in production.
          </p>
        </div>
      </section>

      <section className="panel">
        <h2>Latest sample matches</h2>
        <div className="matchList">
          {sampleMatches.map((match) => (
            <div className="matchCard" key={match.id}>
              <span>{match.homeTeam}</span>
              <strong>
                {match.actualHome} - {match.actualAway}
              </strong>
              <span>{match.awayTeam}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
