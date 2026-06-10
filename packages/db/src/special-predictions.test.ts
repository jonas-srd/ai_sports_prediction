/**
 * Purpose: Unit coverage for special-question prediction storage.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createSpecialPredictionRun,
  createSqliteDb,
  getExistingSpecialPredictionStatus,
  getSpecialPredictionById,
  upsertModels,
  upsertSpecialPrediction
} from "./index";

test("stores special prediction parent row and candidate options", async () => {
  const dir = mkdtempSync(join(tmpdir(), "special-prediction-db-"));
  const dbPath = join(dir, "world-cup.db");
  const db = createSqliteDb(dbPath);

  try {
    await upsertModels(db, [{
      id: "test/model",
      name: "Test Model",
      provider: "Test",
      active: true,
      model_version: "test-v1",
      model_family: "Test"
    }]);

    const runId = createSpecialPredictionRun(db, {
      forecast_horizon: "STAGE_OPENING",
      sample_id: 1,
      started_at_utc: "2026-06-10T00:00:00.000Z"
    });
    const predictionId = await upsertSpecialPrediction(db, {
      run_id: runId,
      question_id: "group_winner_A",
      question_label: "Wer gewinnt die Gruppe A?",
      prediction_type: "single_choice",
      predictor_type: "llm",
      predictor_id: "test/model",
      provider: "openrouter",
      model_id: "test/model",
      model_version: "test-v1",
      access_condition: "closed_book",
      prompt_strategy: "probabilistic_forecast",
      forecast_horizon: "STAGE_OPENING",
      sample_id: 1,
      actual_prediction_time_utc: "2026-06-10T00:00:01.000Z",
      prompt_template_id: "wc2026_special_v1",
      prompt_hash: "abc",
      raw_prompt: "prompt",
      raw_response: { ok: true },
      parsed_response: { final_pick: "Germany" },
      final_pick: "Germany",
      final_picks: [],
      confidence: 0.5,
      reasoning_summary: "Germany has the highest chance.",
      validation_status: "valid",
      is_valid_for_scoring: true,
      options: [
        {
          question_id: "group_winner_A",
          candidate_id: "Germany",
          candidate_label: "Germany",
          candidate_type: "team",
          probability: 0.55,
          rank: 1,
          is_final_pick: true
        },
        {
          question_id: "group_winner_A",
          candidate_id: "Switzerland",
          candidate_label: "Switzerland",
          candidate_type: "team",
          probability: 0.45,
          rank: 2,
          is_final_pick: false
        }
      ]
    });

    const stored = await getSpecialPredictionById(db, predictionId);
    assert.ok(stored);
    assert.equal(stored.question_id, "group_winner_A");
    assert.equal(stored.forecast_horizon, "STAGE_OPENING");
    assert.equal(stored.final_pick, "Germany");
    assert.equal(stored.options?.length, 2);
    assert.equal(stored.options?.[0].candidate_label, "Germany");

    const status = getExistingSpecialPredictionStatus(db, {
      question_id: "group_winner_A",
      predictor_type: "llm",
      predictor_id: "test/model",
      forecast_horizon: "STAGE_OPENING",
      access_condition: "closed_book",
      prompt_strategy: "probabilistic_forecast",
      sample_id: 1
    });
    assert.equal(status?.is_valid_for_scoring, 1);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
