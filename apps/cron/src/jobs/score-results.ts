/**
 * Purpose: Result scoring job.
 * It finds finished matches with predictions, applies Kicktipp-style scoring, and upserts points into the scores table.
 */
import { createSupabaseServiceClient, listUnscoredFinishedPredictions, upsertScore } from "@llm-kicktipp/db";
import { calculatePredictionScore } from "@llm-kicktipp/scorer";

async function main() {
  const db = createSupabaseServiceClient();
  const predictions = await listUnscoredFinishedPredictions(db);

  console.log(`Found ${predictions.length} predictions for finished matches.`);

  for (const prediction of predictions) {
    if (prediction.matches.home_score === null || prediction.matches.away_score === null) {
      continue;
    }

    const result = calculatePredictionScore(
      { home: prediction.predicted_home, away: prediction.predicted_away },
      { home: prediction.matches.home_score, away: prediction.matches.away_score }
    );

    await upsertScore(db, {
      prediction_id: prediction.id,
      points: result.points,
      reason: result.reason
    });

    console.log(`${prediction.model_id} -> ${result.points} points (${result.reason})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
