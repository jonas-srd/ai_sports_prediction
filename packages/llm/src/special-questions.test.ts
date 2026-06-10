/**
 * Purpose: Unit coverage for World Cup 2026 special-question definitions and validation.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSpecialPredictionPrompt,
  getSpecialQuestionById,
  SPECIAL_GROUP_NAMES,
  SPECIAL_PREDICTION_STAGE,
  SPECIAL_QUESTIONS,
  validateSpecialPredictionContent
} from "./special-questions";
import type {
  SpecialCandidate,
  SpecialPredictionChoice,
  SpecialQuestionDefinition,
  SpecialTournamentContext
} from "./special-questions";

test("defines all 15 canonical special questions", () => {
  assert.equal(SPECIAL_QUESTIONS.length, 15);
  assert.deepEqual(SPECIAL_QUESTIONS.map((question) => question.id), [
    "top_scorer_team",
    "semifinalists",
    "group_winner_A",
    "group_winner_B",
    "group_winner_C",
    "group_winner_D",
    "group_winner_E",
    "group_winner_F",
    "group_winner_G",
    "group_winner_H",
    "group_winner_I",
    "group_winner_J",
    "group_winner_K",
    "group_winner_L",
    "world_champion"
  ]);
});

test("group-winner questions map to the correct group candidates", () => {
  for (const groupName of SPECIAL_GROUP_NAMES) {
    const question = getSpecialQuestionById(`group_winner_${groupName}`);

    assert.ok(question);
    assert.equal(question.candidateScope, "group");
    assert.equal(question.groupName, groupName);
    assert.equal(question.predictionType, "single_choice");
  }
});

test("valid single-choice special prediction passes", () => {
  const question = mustQuestion("group_winner_A");
  const candidates = teamCandidates(["Germany", "Switzerland", "Hungary", "Scotland"]);
  const result = validateSpecialPredictionContent(JSON.stringify(singleChoice(question, candidates)), {
    question,
    candidates,
    stage: SPECIAL_PREDICTION_STAGE
  });

  assert.equal(result.status, "valid");
  assert.equal(result.isValidForScoring, true);
  assert.equal(result.fields?.final_pick, "Germany");
});

test("malformed special JSON is invalid_json", () => {
  const question = mustQuestion("world_champion");
  const candidates = teamCandidates(["Brazil", "France"]);
  const result = validateSpecialPredictionContent("{not json", {
    question,
    candidates,
    stage: SPECIAL_PREDICTION_STAGE
  });

  assert.equal(result.status, "invalid_json");
});

test("group winners reject candidates outside the group", () => {
  const question = mustQuestion("group_winner_A");
  const candidates = teamCandidates(["Germany", "Switzerland", "Hungary", "Scotland"]);
  const prediction = singleChoice(question, candidates);
  prediction.choices[0].team = "Brazil";
  prediction.final_pick = "Brazil";

  const result = validateSpecialPredictionContent(JSON.stringify(prediction), {
    question,
    candidates,
    stage: SPECIAL_PREDICTION_STAGE
  });

  assert.equal(result.status, "invalid_candidate");
});

test("single-choice probabilities must sum to one", () => {
  const question = mustQuestion("world_champion");
  const candidates = teamCandidates(["Brazil", "France", "Argentina"]);
  const prediction = singleChoice(question, candidates);
  prediction.choices[0].probability = 0.9;

  const result = validateSpecialPredictionContent(JSON.stringify(prediction), {
    question,
    candidates,
    stage: SPECIAL_PREDICTION_STAGE
  });

  assert.equal(result.status, "invalid_probability_sum");
});

test("semifinalists require exactly four unique final picks", () => {
  const question = mustQuestion("semifinalists");
  const candidates = teamCandidates(["Brazil", "France", "Argentina", "England", "Spain"]);
  const prediction = {
    question_id: question.id,
    prediction_type: "multi_choice_fixed_k",
    k: 4,
    stage: SPECIAL_PREDICTION_STAGE,
    choices: rankedChoices(candidates, ["Brazil", "France", "Argentina"]),
    final_picks: ["Brazil", "France", "Argentina"],
    reasoning_summary: "Three picks is invalid."
  };

  const result = validateSpecialPredictionContent(JSON.stringify(prediction), {
    question,
    candidates,
    stage: SPECIAL_PREDICTION_STAGE
  });

  assert.equal(result.status, "invalid_pick_count");
});

test("static context in special prompt contains no prior prediction table data", () => {
  const question = mustQuestion("world_champion");
  const candidates = teamCandidates(["Brazil", "France"]);
  const context: SpecialTournamentContext = {
    tournamentEdition: "FIFA World Cup 2026",
    groups: [{ groupName: "A", teams: ["Brazil", "France"] }],
    fixtures: [{
      utcDate: "2026-06-11T19:00:00Z",
      competition: "FIFA World Cup GROUP_A",
      homeTeam: "Brazil",
      awayTeam: "France",
      stage: "group_stage",
      groupName: "A",
      venue: "Test Stadium"
    }]
  };
  const prompt = buildSpecialPredictionPrompt({
    question,
    candidates,
    context,
    accessCondition: "closed_book",
    promptStrategy: "probabilistic_forecast",
    stage: SPECIAL_PREDICTION_STAGE
  });
  const staticContext = prompt.slice(prompt.indexOf("Allowed static context:"));

  assert.doesNotMatch(staticContext, /benchmark_predictions|prediction_evaluations|special_predictions|raw_response/i);
});

function mustQuestion(id: string): SpecialQuestionDefinition {
  const question = getSpecialQuestionById(id);
  assert.ok(question);
  return question;
}

function teamCandidates(teams: string[]): SpecialCandidate[] {
  return teams.map((team) => ({ id: team, label: team, type: "team" }));
}

function singleChoice(question: SpecialQuestionDefinition, candidates: SpecialCandidate[]) {
  return {
    question_id: question.id,
    prediction_type: "single_choice",
    stage: SPECIAL_PREDICTION_STAGE,
    choices: rankedChoices(candidates, [candidates[0].label]),
    final_pick: candidates[0].label,
    confidence: 0.4,
    reasoning_summary: "Brief calibrated explanation."
  };
}

function rankedChoices(candidates: SpecialCandidate[], finalPicks: string[]): SpecialPredictionChoice[] {
  const raw = candidates.map((candidate, index) => ({
    team: candidate.label,
    probability: (candidates.length - index) / candidates.reduce((total, _candidate, candidateIndex) => (
      total + candidates.length - candidateIndex
    ), 0),
    rank: index + 1,
    is_final_pick: finalPicks.includes(candidate.label)
  }));

  return raw.sort((a, b) => a.rank - b.rank);
}
