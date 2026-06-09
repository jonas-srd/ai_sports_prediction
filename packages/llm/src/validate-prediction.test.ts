/**
 * Purpose: Unit coverage for benchmark prediction validation rules.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  markRepairedValidation,
  validatePredictionContent
} from "./validate-prediction";

type PredictionFixture = {
  home_win_90_prob: number;
  draw_90_prob: number;
  away_win_90_prob: number;
  expected_home_goals_90: number;
  expected_away_goals_90: number;
  most_likely_score_90: {
    home: number;
    away: number;
  };
  home_win_full_prob: number;
  draw_full_prob: number;
  away_win_full_prob: number;
  most_likely_score_full: {
    home: number;
    away: number;
  };
  home_advances_prob: number | null;
  away_advances_prob: number | null;
  confidence: number;
  reason: string;
};

test("valid JSON passes validation", () => {
  const result = validatePredictionContent(JSON.stringify(validPrediction()), { isKnockout: false });

  assert.equal(result.status, "valid");
  assert.equal(result.isValidForScoring, true);
  assert.equal(result.fields?.most_likely_score_90_home, 1);
});

test("malformed JSON is invalid_json", () => {
  const result = validatePredictionContent("{not json", { isKnockout: false });

  assert.equal(result.status, "invalid_json");
  assert.equal(result.isValidForScoring, false);
});

test("missing required fields are invalid_schema", () => {
  const prediction = validPrediction();
  delete (prediction as Partial<typeof prediction>).confidence;

  const result = validatePredictionContent(JSON.stringify(prediction), { isKnockout: false });

  assert.equal(result.status, "invalid_schema");
  assert.match(result.validationErrors.join("\n"), /confidence/);
});

test("small probability sum errors are normalized", () => {
  const prediction = validPrediction({
    home_win_90_prob: 0.4,
    draw_90_prob: 0.3,
    away_win_90_prob: 0.31
  });

  const result = validatePredictionContent(JSON.stringify(prediction), { isKnockout: false });

  assert.equal(result.status, "normalized");
  assert.equal(result.normalizationApplied, true);
  assert.equal(result.probSum90Original, 1.01);
  assert.equal(result.probSum90Final, 1);
});

test("large probability sum errors are invalid_probability_sum", () => {
  const prediction = validPrediction({
    home_win_full_prob: 0.8,
    draw_full_prob: 0.2,
    away_win_full_prob: 0.2
  });

  const result = validatePredictionContent(JSON.stringify(prediction), { isKnockout: false });

  assert.equal(result.status, "invalid_probability_sum");
  assert.equal(result.isValidForScoring, false);
});

test("probabilities outside range are invalid_probability_range", () => {
  const prediction = validPrediction({ home_win_90_prob: 1.2 });

  const result = validatePredictionContent(JSON.stringify(prediction), { isKnockout: false });

  assert.equal(result.status, "invalid_probability_range");
});

test("negative or fractional scores are invalid_score", () => {
  const prediction = validPrediction({
    most_likely_score_90: {
      home: 1.5,
      away: 0
    }
  });

  const result = validatePredictionContent(JSON.stringify(prediction), { isKnockout: false });

  assert.equal(result.status, "invalid_score");
});

test("valid repaired output is marked repaired", () => {
  const result = markRepairedValidation(validatePredictionContent(JSON.stringify(validPrediction()), {
    isKnockout: false
  }));

  assert.equal(result.status, "repaired");
  assert.equal(result.isValidForScoring, true);
});

test("invalid repaired output is marked invalid_after_repair", () => {
  const result = markRepairedValidation(validatePredictionContent("not json", { isKnockout: false }));

  assert.equal(result.status, "invalid_after_repair");
  assert.equal(result.isValidForScoring, false);
});

test("knockout matches require advancement probabilities that sum to 1", () => {
  const prediction = validPrediction({
    home_advances_prob: null,
    away_advances_prob: null
  });

  const result = validatePredictionContent(JSON.stringify(prediction), { isKnockout: true });

  assert.equal(result.status, "invalid_probability_sum");
});

function validPrediction(overrides: Partial<PredictionFixture> = {}): PredictionFixture {
  return {
    home_win_90_prob: 0.4,
    draw_90_prob: 0.3,
    away_win_90_prob: 0.3,
    expected_home_goals_90: 1.4,
    expected_away_goals_90: 1.1,
    most_likely_score_90: {
      home: 1,
      away: 1
    },
    home_win_full_prob: 0.4,
    draw_full_prob: 0.3,
    away_win_full_prob: 0.3,
    most_likely_score_full: {
      home: 1,
      away: 1
    },
    home_advances_prob: null,
    away_advances_prob: null,
    confidence: 0.5,
    reason: "Balanced match.",
    ...overrides
  };
}
