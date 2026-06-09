/**
 * Purpose: Match detail page for inspecting per-model predictions.
 * This page makes bad JSON, model drift, and scoring differences easy to spot during the MVP phase.
 */
import Link from "next/link";
import { getDashboardMatches } from "@/lib/dashboard-data";
import { calculatePredictionScore } from "@/lib/scorer";

export default function MatchesPage() {
  const matches = getDashboardMatches();

  return (
    <main className="shell">
      <nav className="topNav">
        <Link href="/">Back to ranking</Link>
      </nav>

      <section className="hero compactHero">
        <div>
          <p className="eyebrow">Daily predictions</p>
          <h1>Matches and model picks</h1>
        </div>
      </section>

      <section className="matchDetailList">
        {matches.map((match) => (
          <article className="panel" key={match.id}>
            <div className="matchHeader">
              <h2>
                {match.homeTeam} vs {match.awayTeam}
              </h2>
              <strong>
                {formatScore(match.actualHome, match.actualAway)}
              </strong>
            </div>

            <div className="predictionTable">
              {match.predictions.length === 0 ? (
                <div className="predictionRow">
                  <div>
                    <strong>No predictions yet</strong>
                    <p>Run the daily prediction script after syncing matches.</p>
                  </div>
                </div>
              ) : (
                match.predictions.map((prediction) => {
                  const score = match.actualHome === null || match.actualAway === null
                    ? null
                    : calculatePredictionScore(
                        { home: prediction.predictedHome, away: prediction.predictedAway },
                        { home: match.actualHome, away: match.actualAway }
                      );

                  return (
                    <div className="predictionRow" key={`${match.id}-${prediction.model}`}>
                      <div>
                        <strong>{prediction.model}</strong>
                        <p>{prediction.provider}</p>
                      </div>
                      <span>
                        {prediction.predictedHome} - {prediction.predictedAway}
                      </span>
                      <span className="points">{score ? `${score.points} pts` : "pending"}</span>
                      <span className="reason">{score?.reason ?? "not scored"}</span>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function formatScore(home: number | null, away: number | null): string {
  if (home === null || away === null) {
    return "TBD";
  }

  return `${home} - ${away}`;
}
