/**
 * Purpose: Match detail page for inspecting per-model predictions.
 * This page makes bad JSON, model drift, and scoring differences easy to spot during the MVP phase.
 */
import Link from "next/link";
import { calculatePredictionScore } from "@llm-kicktipp/scorer";
import { sampleMatches } from "@/lib/dashboard-data";

export default function MatchesPage() {
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
        {sampleMatches.map((match) => (
          <article className="panel" key={match.id}>
            <div className="matchHeader">
              <h2>
                {match.homeTeam} vs {match.awayTeam}
              </h2>
              <strong>
                {match.actualHome} - {match.actualAway}
              </strong>
            </div>

            <div className="predictionTable">
              {match.predictions.map((prediction) => {
                const score = calculatePredictionScore(
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
                    <span className="points">{score.points} pts</span>
                    <span className="reason">{score.reason}</span>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
