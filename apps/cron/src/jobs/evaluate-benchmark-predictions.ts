/**
 * Purpose: Evaluates validated benchmark predictions after match results are available.
 */
import "../load-env";
import {
  createSqliteDb,
  getDefaultDbPath,
  listFinishedBenchmarkPredictionsForEvaluation,
  upsertPredictionEvaluation
} from "@llm-kicktipp/db";
import type {
  BenchmarkPredictionRow,
  MatchRow,
  MatchResultClass,
  NewPredictionEvaluationRow
} from "@llm-kicktipp/db";
import { evaluateBenchmarkPrediction } from "@llm-kicktipp/scorer";
import type { BenchmarkPredictionForEvaluation, Scoreline } from "@llm-kicktipp/scorer";

async function main() {
  const db = createSqliteDb();
  const includeAlreadyEvaluated = process.argv.includes("--all");
  const rows = await listFinishedBenchmarkPredictionsForEvaluation(db, { includeAlreadyEvaluated });

  console.log(`Found ${rows.length} valid benchmark predictions for finished matches.`);
  console.log(includeAlreadyEvaluated ? "Mode: recalculating all evaluations." : "Mode: evaluating only unevaluated predictions.");
  console.log(`SQLite DB: ${getDefaultDbPath()}`);

  let evaluated = 0;
  let skipped = 0;

  for (const row of rows) {
    const prediction = toPredictionForEvaluation(row);
    const actualScore90 = toActualScore90(row.matches);

    if (!prediction || !actualScore90) {
      skipped += 1;
      continue;
    }

    const metrics = evaluateBenchmarkPrediction(prediction, {
      score90: actualScore90,
      actualFullResult: getActualFullResult(row.matches),
      actualAdvancer: row.matches.actual_advancer ?? null
    });

    await upsertPredictionEvaluation(db, toEvaluationRow(row.id, metrics));
    evaluated += 1;

    console.log([
      row.predictor_id,
      row.forecast_horizon,
      `${row.access_condition}/${row.prompt_strategy}`,
      `${row.matches.home_team} vs ${row.matches.away_team}`,
      `brier=${metrics.brier90.toFixed(4)}`,
      `points=${metrics.kicktippPoints90}`
    ].join(" | "));
  }

  console.log(`Evaluated ${evaluated} predictions. Skipped ${skipped}.`);
  db.close();
}

function toPredictionForEvaluation(row: BenchmarkPredictionRow): BenchmarkPredictionForEvaluation | null {
  if (
    row.home_win_90_prob === null
    || row.draw_90_prob === null
    || row.away_win_90_prob === null
    || row.expected_home_goals_90 === null
    || row.expected_away_goals_90 === null
    || row.most_likely_score_90_home === null
    || row.most_likely_score_90_away === null
    || row.home_win_full_prob === null
    || row.draw_full_prob === null
    || row.away_win_full_prob === null
    || row.most_likely_score_full_home === null
    || row.most_likely_score_full_away === null
  ) {
    return null;
  }

  return {
    homeWin90Prob: row.home_win_90_prob,
    draw90Prob: row.draw_90_prob,
    awayWin90Prob: row.away_win_90_prob,
    expectedHomeGoals90: row.expected_home_goals_90,
    expectedAwayGoals90: row.expected_away_goals_90,
    mostLikelyScore90: {
      home: row.most_likely_score_90_home,
      away: row.most_likely_score_90_away
    },
    homeWinFullProb: row.home_win_full_prob,
    drawFullProb: row.draw_full_prob,
    awayWinFullProb: row.away_win_full_prob,
    mostLikelyScoreFull: {
      home: row.most_likely_score_full_home,
      away: row.most_likely_score_full_away
    },
    homeAdvancesProb: row.home_advances_prob,
    awayAdvancesProb: row.away_advances_prob
  };
}

function toActualScore90(match: MatchRow): Scoreline | null {
  if (match.home_score_90 === null || match.home_score_90 === undefined
    || match.away_score_90 === null || match.away_score_90 === undefined) {
    return null;
  }

  return {
    home: match.home_score_90,
    away: match.away_score_90
  };
}

function getActualFullResult(match: MatchRow): MatchResultClass | null {
  if (match.result_winner) {
    return match.result_winner;
  }

  if (match.home_score_full === null || match.home_score_full === undefined
    || match.away_score_full === null || match.away_score_full === undefined) {
    return null;
  }

  return resultFromScore({
    home: match.home_score_full,
    away: match.away_score_full
  });
}

function resultFromScore(score: Scoreline): MatchResultClass {
  if (score.home > score.away) return "home";
  if (score.home < score.away) return "away";
  return "draw";
}

function toEvaluationRow(
  predictionId: string,
  metrics: ReturnType<typeof evaluateBenchmarkPrediction>
): NewPredictionEvaluationRow {
  return {
    prediction_id: predictionId,
    actual_result_90: metrics.actualResult90,
    actual_result_full: metrics.actualResultFull,
    actual_advancer: metrics.actualAdvancer,
    predicted_result_90_from_probs: metrics.predictedResult90FromProbs,
    predicted_result_90_from_score: metrics.predictedResult90FromScore,
    predicted_result_full_from_probs: metrics.predictedResultFullFromProbs,
    brier_90: metrics.brier90,
    log_loss_90: metrics.logLoss90,
    top_outcome_correct_90: metrics.topOutcomeCorrect90,
    exact_score_90_correct: metrics.exactScore90Correct,
    goal_difference_90_correct: metrics.goalDifference90Correct,
    tendency_90_correct_from_score: metrics.tendency90CorrectFromScore,
    home_goal_abs_error_90: metrics.homeGoalAbsError90,
    away_goal_abs_error_90: metrics.awayGoalAbsError90,
    total_goals_abs_error_90: metrics.totalGoalsAbsError90,
    goal_difference_abs_error_90: metrics.goalDifferenceAbsError90,
    kicktipp_points_90: metrics.kicktippPoints90,
    advancement_brier: metrics.advancementBrier,
    advancement_log_loss: metrics.advancementLogLoss,
    advancement_accuracy: metrics.advancementAccuracy,
    score_result_matches_prob_argmax_90: metrics.scoreResultMatchesProbArgmax90,
    score_result_matches_prob_argmax_full: metrics.scoreResultMatchesProbArgmaxFull,
    expected_goals_score_distance: metrics.expectedGoalsScoreDistance
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
