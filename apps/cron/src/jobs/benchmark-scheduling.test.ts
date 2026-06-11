import assert from "node:assert/strict";
import { createSqliteDb, upsertBenchmarkPrediction, upsertMatches, upsertModels } from "@llm-kicktipp/db";
import type { MatchRow } from "@llm-kicktipp/db";
import { inspectBenchmarkPredictionCoverage } from "./run-benchmark-predictions";
import {
  type BenchmarkStage,
  getStageReadiness,
  selectDueBenchmarkMatches,
  STAGE_EXPECTED_MATCH_COUNTS
} from "./benchmark-scheduling";

const NOW = new Date("2026-06-11T12:00:00.000Z");
const MODEL_ID = "openai/gpt-5.5";

function match(overrides: Partial<MatchRow> & Pick<MatchRow, "id" | "utc_date">): MatchRow {
  return {
    id: overrides.id,
    utc_date: overrides.utc_date,
    competition: overrides.competition ?? "FIFA_WORLD_CUP_GROUP_STAGE",
    home_team: overrides.home_team ?? "Germany",
    away_team: overrides.away_team ?? "Brazil",
    venue: overrides.venue ?? null,
    status: overrides.status ?? "SCHEDULED",
    home_score: overrides.home_score ?? null,
    away_score: overrides.away_score ?? null,
    tournament_edition: overrides.tournament_edition ?? "FIFA World Cup 2026",
    stage: overrides.stage ?? "group_stage",
    group_name: overrides.group_name ?? "A",
    matchday: overrides.matchday ?? 1,
    is_knockout: overrides.is_knockout ?? 0
  };
}

function kickoffForTargetMinutesFromNow(targetMinutesFromNow: number, offsetMinutes: number): string {
  return new Date(NOW.getTime() + (targetMinutesFromNow + offsetMinutes) * 60_000).toISOString();
}

function stageMatches(stage: BenchmarkStage, count: number): MatchRow[] {
  return Array.from({ length: count }, (_entry, index) => match({
    id: `${stage}-${index + 1}`,
    utc_date: new Date(Date.UTC(2026, 5, 12, index % 24)).toISOString(),
    competition: `FIFA_WORLD_CUP_${stage?.toUpperCase()}`,
    stage,
    home_team: `Home ${index + 1}`,
    away_team: `Away ${index + 1}`,
    is_knockout: stage === "group_stage" ? 0 : 1
  }));
}

{
  const selected = selectDueBenchmarkMatches([
    match({ id: "not-due", utc_date: kickoffForTargetMinutesFromNow(31, 1440) })
  ], {
    horizon: "T_24H",
    now: NOW,
    windowBeforeMin: 30,
    windowAfterMin: 30
  });

  assert.deepEqual(selected.map((entry) => entry.match.id), []);
}

{
  const selected = selectDueBenchmarkMatches([
    match({ id: "exact", utc_date: kickoffForTargetMinutesFromNow(0, 1440) })
  ], {
    horizon: "T_24H",
    now: NOW,
    windowBeforeMin: 30,
    windowAfterMin: 30
  });

  assert.deepEqual(selected.map((entry) => entry.match.id), ["exact"]);
}

{
  const selected = selectDueBenchmarkMatches([
    match({ id: "late-inside", utc_date: kickoffForTargetMinutesFromNow(-29, 1440) })
  ], {
    horizon: "T_24H",
    now: NOW,
    windowBeforeMin: 30,
    windowAfterMin: 30
  });

  assert.deepEqual(selected.map((entry) => entry.match.id), ["late-inside"]);
}

{
  const selected = selectDueBenchmarkMatches([
    match({ id: "too-late", utc_date: kickoffForTargetMinutesFromNow(-31, 1440) })
  ], {
    horizon: "T_24H",
    now: NOW,
    windowBeforeMin: 30,
    windowAfterMin: 30
  });

  assert.deepEqual(selected.map((entry) => entry.match.id), []);
}

{
  const db = createSqliteDb(":memory:");
  const selectedMatch = match({ id: "valid-existing", utc_date: kickoffForTargetMinutesFromNow(0, 1440) });
  await upsertMatches(db, [selectedMatch]);
  await upsertModels(db, [{
    id: MODEL_ID,
    name: "GPT-5.5",
    provider: "OpenAI",
    active: true,
    model_version: "test",
    model_family: "OpenAI"
  }]);
  await upsertBenchmarkPrediction(db, {
    match_id: selectedMatch.id,
    predictor_type: "llm",
    predictor_id: MODEL_ID,
    provider: "openrouter",
    model_id: MODEL_ID,
    model_version: "test",
    access_condition: "closed_book",
    prompt_strategy: "direct_score",
    forecast_horizon: "T_24H",
    sample_id: 1,
    raw_response: { ok: true },
    validation_status: "valid",
    is_valid_for_scoring: true,
    tools_enabled: false,
    tool_trace_available: false,
    open_book_compliance: "not_applicable"
  });

  const coverage = await inspectBenchmarkPredictionCoverage(db, {
    horizon: "T_24H",
    matches: [selectedMatch],
    modelIds: [MODEL_ID],
    sampleId: 1,
    accessConditions: ["closed_book"],
    promptStrategies: ["direct_score"]
  });

  assert.equal(coverage.valid, 1);
  assert.equal(coverage.invalid, 0);
  assert.equal(coverage.missing, 0);
  db.close();
}

{
  const db = createSqliteDb(":memory:");
  const selectedMatch = match({ id: "invalid-existing", utc_date: kickoffForTargetMinutesFromNow(0, 120) });
  await upsertMatches(db, [selectedMatch]);
  await upsertModels(db, [{
    id: MODEL_ID,
    name: "GPT-5.5",
    provider: "OpenAI",
    active: true,
    model_version: "test",
    model_family: "OpenAI"
  }]);
  await upsertBenchmarkPrediction(db, {
    match_id: selectedMatch.id,
    predictor_type: "llm",
    predictor_id: MODEL_ID,
    provider: "openrouter",
    model_id: MODEL_ID,
    model_version: "test",
    access_condition: "closed_book",
    prompt_strategy: "direct_score",
    forecast_horizon: "T_2H",
    sample_id: 1,
    raw_response: { ok: false },
    validation_status: "invalid_schema",
    is_valid_for_scoring: false,
    tools_enabled: false,
    tool_trace_available: false,
    open_book_compliance: "not_applicable"
  });

  const coverage = await inspectBenchmarkPredictionCoverage(db, {
    horizon: "T_2H",
    matches: [selectedMatch],
    modelIds: [MODEL_ID],
    sampleId: 1,
    accessConditions: ["closed_book"],
    promptStrategies: ["direct_score"]
  });

  assert.equal(coverage.valid, 0);
  assert.equal(coverage.invalid, 1);
  assert.equal(coverage.missing, 0);
  db.close();
}

{
  const complete = getStageReadiness(
    stageMatches("round_of_16", STAGE_EXPECTED_MATCH_COUNTS.round_of_16),
    "round_of_16"
  );

  assert.equal(complete.ready, true);
}

{
  const incomplete = getStageReadiness(
    stageMatches("round_of_16", STAGE_EXPECTED_MATCH_COUNTS.round_of_16 - 1),
    "round_of_16"
  );

  assert.equal(incomplete.ready, false);
  assert.match(incomplete.reason ?? "", /expected 8 matches, found 7/);
}

{
  const groupStage = getStageReadiness(
    stageMatches("group_stage", STAGE_EXPECTED_MATCH_COUNTS.group_stage),
    "group_stage"
  );

  assert.equal(groupStage.ready, true);
}

console.log("benchmark scheduling tests passed");
