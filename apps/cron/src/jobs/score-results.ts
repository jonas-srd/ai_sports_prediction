/**
 * Purpose: Result scoring job.
 * It finds finished matches with predictions, applies Kicktipp-style scoring, and upserts points into the scores table.
 */
import "../load-env";
import { createSqliteDb, getDefaultDbPath, listFinishedPredictions, upsertScore } from "@llm-kicktipp/db";
import { calculatePredictionScore } from "@llm-kicktipp/scorer";

async function main() {
  const db = createSqliteDb();
  const includeAlreadyScored = process.argv.includes("--all");
  const predictions = await listFinishedPredictions(db, { includeAlreadyScored });

  console.log(`Found ${predictions.length} predictions for finished matches.`);
  console.log(includeAlreadyScored ? "Mode: recalculating all finished predictions." : "Mode: scoring only unscored predictions.");
  console.log(`SQLite DB: ${getDefaultDbPath()}`);

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

  db.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
