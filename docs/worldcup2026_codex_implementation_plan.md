# WorldCup 2026 LLM Benchmark: Codex Implementation Plan

Status: implementation companion to `docs/worldcup2026_benchmark_protocol.md`  
Purpose: guide Codex or other coding agents to integrate the agreed benchmark protocol into the existing AI Sports Prediction web app without unnecessarily rebuilding existing functionality.

---

## 1. Core implementation principle

The existing app already contains important functionality and design work, including a basic OpenRouter integration, fixture ingestion, model prediction UI, interactive comparison of model predictions, tournament tree/bracket elements, country flags, and other frontend choices. The implementation must therefore be an incremental integration into the current codebase, not a greenfield rewrite.

Codex should:

- reuse existing fixture ingestion, OpenRouter integration, UI components, tournament-tree/bracket views, country flags, model-comparison views, routing, styling, and database structures wherever feasible;
- add migrations and typed extensions instead of replacing existing tables/components wholesale unless a refactor is clearly beneficial;
- preserve current user-facing functionality unless the benchmark protocol requires a change;
- make major changes only when they improve reliability, reproducibility, or maintainability;
- avoid breaking existing app flows while adding the paper-grade benchmark layer.

The priority order is:

1. reliable paper-grade logging and storage;
2. correct prompt generation and prediction execution;
3. validation, repair, and evaluation metrics;
4. exports for later analysis;
5. improved interactive UI/leaderboards.

Do not optimize the interface before prediction logging and evaluation are reliable enough for the paper.

---

## 2. First Codex task: audit before implementation

Codex should first inspect the repository and produce an implementation plan before modifying code.

Audit the existing app and identify:

- current fixture ingestion from football-data.org;
- current match/fixture schema and result-sync logic;
- current OpenRouter client/integration;
- current prediction prompt builder;
- current model configuration/list;
- current prediction runner/job scheduler;
- current database/schema/migrations;
- current prediction storage model;
- current frontend prediction views;
- current model-comparison UI;
- current tournament tree/bracket UI;
- current country flag handling;
- current leaderboard or scoring logic, if any;
- current environment-variable/API-key structure;
- test setup and available lint/typecheck commands.

The audit output should answer:

1. Which existing files should be extended?
2. Which new files/tables/types are needed?
3. What migrations are required?
4. What current UI components can be reused?
5. What risks could break existing behavior?
6. What staged implementation order is recommended?

Audit-only prompt for Codex:

```text
Read docs/worldcup2026_benchmark_protocol.md and docs/worldcup2026_codex_implementation_plan.md. Inspect the existing app. Do not modify code yet. Produce a concise implementation plan for integrating this benchmark protocol into the current codebase, reusing existing infrastructure wherever possible. Pay special attention to preserving the existing OpenRouter integration, interactive model-comparison UI, tournament tree/bracket, country flags, and current design choices.
```

---

## 3. Benchmark entities and enums

The app should support the following core experimental dimensions.

### 3.1 Access condition

```ts
type AccessCondition = "closed_book" | "open_book";
```

- `closed_book`: model is called without tools and instructed not to use browsing/search/APIs/external data.
- `open_book`: model is called with OpenRouter web search enabled where available and instructed to search current public information before forecasting.

### 3.2 Prompt strategy

```ts
type PromptStrategy = "direct_score" | "probabilistic_forecast";
```

- `direct_score`: model first predicts the most likely scoreline, then gives probabilities and expected goals consistent with the score.
- `probabilistic_forecast`: model first estimates calibrated result probabilities and expected goals, then derives the most likely scoreline.

### 3.3 Forecast horizon

```ts
type ForecastHorizon = "T_24H" | "T_2H" | "STAGE_OPENING";
```

- `T_24H`: primary paper horizon, approximately 24 hours before kickoff.
- `T_2H`: secondary horizon, approximately 2 hours before kickoff.
- `STAGE_OPENING`: fallback/early prediction when a fixture set becomes known.

### 3.4 Predictor type

```ts
type PredictorType = "llm" | "baseline";
```

The MVP will primarily use `llm`. `baseline` should be supported by schema design for future historical/bookmaker/Elo/Poisson baselines, but baseline implementation is not required for the current app update.

### 3.5 Prediction uniqueness

One prediction record should correspond to:

```text
match_id × model_id × forecast_horizon × access_condition × prompt_strategy × sample_id
```

For the core benchmark:

```text
temperature = 0
sample_id = 1
n = 1
```

No majority vote and no stochastic ensembling are required for the core analysis.

---

## 4. Match/fixture data requirements

The current football-data.org fixture ingestion should be reused. The closed-book prompt should only use fixture-identifying information, not manually curated team-strength/current-form information.

Required match fields, using existing data where available:

```ts
type PromptMatch = {
  matchId: string;
  competition: string;        // e.g. FIFA World Cup
  tournamentEdition: string;  // FIFA World Cup 2026
  stage: string;              // group_stage, round_of_32, ...
  utcDate: string;
  homeTeam: string;
  awayTeam: string;
  venue?: string | null;
  group?: string | null;
  isKnockout: boolean;
};
```

The fixture block in prompts should make the context unambiguous:

```text
Sport: football / soccer
Competition: FIFA World Cup
Tournament edition: FIFA World Cup 2026
Stage: ...
Date UTC: ...
Home/listed first team: ...
Away/listed second team: ...
Venue: ... / unknown
Is knockout match: yes/no
```

Closed-book prompts must not include:

- current rankings/Elo;
- recent form;
- injuries;
- suspensions;
- lineups;
- odds;
- news snippets;
- manually curated statistics.

Open-book prompts receive the same fixture block, but are tool-enabled and instructed to search for public current information.

---

## 5. Prompt builder implementation

Replace or extend the current MVP prompt builder with a modular prompt builder.

The prompt should be composed as:

```text
access header
+
prompt strategy instruction
+
definitions block
+
fixture block
+
JSON schema block
```

Both prompt strategies and both access conditions must return the same JSON schema. Only the instructions differ.

### 5.1 Closed-book header

```ts
const CLOSED_BOOK_HEADER = [
  "Access condition: CLOSED_BOOK.",
  "Do not use internet search, browsing, tools, APIs, or external data sources.",
  "Use only your internal model knowledge, general football reasoning, typical football score distributions, and the fixture information provided below.",
  "The fixture information identifies a current FIFA World Cup 2026 football/soccer match."
].join("\n");
```

### 5.2 Open-book header

```ts
const OPEN_BOOK_HEADER = [
  "Access condition: OPEN_BOOK.",
  "Before making the prediction, use the available web-search tool to check current public information about this match and both teams.",
  "Relevant information may include recent form, injuries, suspensions, expected lineups, tactical news, venue, rest/travel, tournament context, and betting-market odds if available.",
  "Base the final prediction on the retrieved public information plus your football reasoning."
].join("\n");
```

### 5.3 Direct-score instruction

```ts
const DIRECT_SCORE_INSTRUCTION = [
  "Prompt strategy: DIRECT_SCORE.",
  "First predict the most likely scoreline for the match.",
  "Then provide probabilities, expected goals, and full-match/advancement probabilities that are consistent with that predicted scoreline.",
  "Do not overstate certainty."
].join("\n");
```

### 5.4 Probabilistic-forecast instruction

```ts
const PROBABILISTIC_FORECAST_INSTRUCTION = [
  "Prompt strategy: PROBABILISTIC_FORECAST.",
  "First estimate calibrated probabilities for the 90-minute result and expected goals.",
  "Then derive the most likely scoreline from those probabilities and expected goals.",
  "Do not overstate certainty."
].join("\n");
```

### 5.5 Definitions block

```ts
const DEFINITIONS_BLOCK = [
  "Definitions:",
  "- 90-minute result means the score after regulation time plus stoppage time, excluding extra time and penalties.",
  "- home_win_90_prob is the probability that the listed home team leads after 90 minutes plus stoppage time.",
  "- draw_90_prob is the probability that the match is tied after 90 minutes plus stoppage time.",
  "- away_win_90_prob is the probability that the listed away team leads after 90 minutes plus stoppage time.",
  "- expected_home_goals_90 and expected_away_goals_90 are expected goals scored in regulation time plus stoppage time.",
  "- most_likely_score_90 is the single most likely score after regulation time plus stoppage time.",
  "- full-match result means the final match outcome after all applicable extra time and penalty shootout procedures.",
  "- For group-stage matches, full-match result is the same as the 90-minute result.",
  "- For knockout matches, home_advances_prob and away_advances_prob are the probabilities that each team advances or wins the tie after extra time and penalties if needed.",
  "- Probabilities must be numbers between 0 and 1.",
  "- home_win_90_prob + draw_90_prob + away_win_90_prob must sum to 1.",
  "- For knockout matches, home_advances_prob + away_advances_prob must sum to 1.",
  "- Confidence should be the model's confidence in its overall forecast, between 0 and 1."
].join("\n");
```

### 5.6 Shared JSON schema block

The model must return only valid JSON, no markdown.

```json
{
  "home_win_90_prob": number,
  "draw_90_prob": number,
  "away_win_90_prob": number,
  "expected_home_goals_90": number,
  "expected_away_goals_90": number,
  "most_likely_score_90": {
    "home": number,
    "away": number
  },
  "home_win_full_prob": number,
  "draw_full_prob": number,
  "away_win_full_prob": number,
  "most_likely_score_full": {
    "home": number,
    "away": number
  },
  "home_advances_prob": number_or_null,
  "away_advances_prob": number_or_null,
  "confidence": number,
  "reason": "short reason"
}
```

Implementation note: because JSON does not support `number_or_null` as a literal value, the prompt should describe those fields as `number or null` in prose and still require actual JSON values to be numbers or `null`.

### 5.7 Prompt builder API

Implement or adapt something like:

```ts
export function buildPredictionPrompt(args: {
  match: PromptMatch;
  accessCondition: AccessCondition;
  promptStrategy: PromptStrategy;
}): string {
  const accessHeader =
    args.accessCondition === "closed_book"
      ? CLOSED_BOOK_HEADER
      : OPEN_BOOK_HEADER;

  const strategyInstruction =
    args.promptStrategy === "direct_score"
      ? DIRECT_SCORE_INSTRUCTION
      : PROBABILISTIC_FORECAST_INSTRUCTION;

  return [
    accessHeader,
    "",
    strategyInstruction,
    "",
    DEFINITIONS_BLOCK,
    "",
    buildMatchBlock(args.match),
    "",
    JSON_SCHEMA_BLOCK
  ].join("\n");
}
```

Store `raw_prompt` and `prompt_hash` for every prediction.

---

## 6. OpenRouter implementation

The existing OpenRouter integration should be reused and extended.

### 6.1 Closed-book calls

Closed-book calls must:

- pass no tools;
- use the closed-book prompt header;
- set `access_condition = "closed_book"`;
- store `tools_enabled = false`.

### 6.2 Open-book calls

Open-book calls should use OpenRouter web search where available.

Expected OpenRouter tool configuration:

```json
{
  "tools": [
    {
      "type": "openrouter:web_search"
    }
  ]
}
```

Open-book calls must:

- use the open-book prompt header;
- set `access_condition = "open_book"`;
- pass OpenRouter web-search tooling if supported by the current OpenRouter client/model;
- store whether tool/search use was observed;
- store raw tool metadata/traces if OpenRouter returns them.

Because OpenRouter web search may be beta/model-dependent and may not guarantee actual tool use, the app must distinguish:

```ts
type OpenBookCompliance = "observed_search" | "no_observed_search" | "unknown";
```

Primary analyses may use intent-to-treat open-book records: tool enabled and prompt instructed search. Secondary diagnostics can report whether search was actually observed.

### 6.3 Model inclusion

Use OpenRouter wherever possible for both closed-book and open-book calls. The primary 2x2 analysis should use models for which both modes work reliably. Models that only work closed-book may remain in the website and secondary closed-book-only analyses.

Main generation settings:

```json
{
  "temperature": 0,
  "top_p": 1,
  "n": 1
}
```

No majority vote and no stochastic ensembling are required for the core benchmark.

---

## 7. Prediction scheduling and horizons

The app should support these horizons:

### 7.1 T_24H

Primary paper horizon. Run predictions approximately 24 hours before kickoff.

Suggested fields:

```ts
forecast_horizon = "T_24H"
is_primary_horizon = true
```

### 7.2 T_2H

Secondary horizon. Run approximately 2 hours before kickoff if operationally feasible.

```ts
forecast_horizon = "T_2H"
is_primary_horizon = false
```

### 7.3 STAGE_OPENING

Fallback/early horizon.

- Group stage: predict all known group-stage matches once before the tournament starts.
- Knockout stage: predict each fixture once shortly after the fixture becomes known.

Stage-opening predictions are useful for website robustness and secondary analyses. They should not replace missing T_24H predictions in the primary paper analysis.

### 7.4 Timing metadata

Each prediction should store:

```ts
scheduled_prediction_time_utc
actual_prediction_time_utc
kickoff_time_utc
minutes_before_kickoff
timing_status // on_time | early | late | missed | fallback
forecast_horizon
stage_context
```

---

## 8. Required storage/logging changes

Codex should adapt the current database/schema rather than replacing it wholesale. Add columns/tables as appropriate.

### 8.1 Prediction metadata

Each prediction should store:

```ts
prediction_id
run_id
match_id
predictor_type // llm | baseline
predictor_id
provider
model_id
model_version
access_condition
prompt_strategy
forecast_horizon
sample_id
scheduled_prediction_time_utc
actual_prediction_time_utc
kickoff_time_utc
minutes_before_kickoff
timing_status
temperature
top_p
max_tokens
prompt_template_id
prompt_hash
raw_prompt
raw_response
response_id
latency_ms
input_tokens
output_tokens
cost_usd
created_at_utc
```

Some token/cost fields may be nullable if the provider does not return them.

### 8.2 Parsed prediction fields

Store parsed model outputs as queryable fields:

```ts
home_win_90_prob
draw_90_prob
away_win_90_prob
expected_home_goals_90
expected_away_goals_90
most_likely_score_90_home
most_likely_score_90_away
home_win_full_prob
draw_full_prob
away_win_full_prob
most_likely_score_full_home
most_likely_score_full_away
home_advances_prob
away_advances_prob
confidence
reason
```

### 8.3 Validation fields

```ts
validation_status
is_valid_for_scoring
repair_attempted
repair_raw_response
normalization_applied
normalized_fields
validation_errors
prob_sum_90_original
prob_sum_90_final
prob_sum_full_original
prob_sum_full_final
prob_sum_advancement_original
prob_sum_advancement_final
```

### 8.4 Tool-use fields

Either store these on the prediction row or in a separate tool log table:

```ts
tools_enabled
tool_type // none | openrouter:web_search | other
tool_calls_observed
num_tool_calls
tool_trace_available
tool_trace_raw
open_book_compliance // observed_search | no_observed_search | unknown
```

### 8.5 Evaluation fields/table

After results are known, compute and store:

```ts
actual_result_90 // home | draw | away
actual_result_full // home | draw | away
actual_advancer // home | away | null
predicted_result_90_from_probs
predicted_result_90_from_score
predicted_result_full_from_probs
brier_90
log_loss_90
top_outcome_correct_90
exact_score_90_correct
goal_difference_90_correct
tendency_90_correct_from_score
home_goal_abs_error_90
away_goal_abs_error_90
total_goals_abs_error_90
goal_difference_abs_error_90
kicktipp_points_90
advancement_brier
advancement_log_loss
advancement_accuracy
score_result_matches_prob_argmax_90
score_result_matches_prob_argmax_full
expected_goals_score_distance
evaluated_at_utc
```

---

## 9. Validation, normalization, and repair

Validation should happen for every LLM response.

### 9.1 Store three layers

Do not overwrite raw outputs.

```text
raw_response -> parsed_json -> validated_prediction
```

### 9.2 Required checks

Validate:

- response is valid JSON;
- response is a JSON object;
- all required fields are present;
- numeric fields are numbers;
- probabilities are in `[0, 1]`;
- 90-minute probability sum is close to 1;
- full-match probability sum is close to 1;
- advancement probabilities sum to 1 for knockout matches;
- score fields are non-negative integers;
- reason is a string and not excessively long.

### 9.3 Normalization rule

If a probability vector sums to between 0.98 and 1.02, normalize it deterministically and mark `validation_status = "normalized"` or `"repaired_and_normalized"` as applicable.

Do not silently fix major errors such as negative probabilities, missing fields, non-numeric values, or probability sums far from 1.

### 9.4 Repair policy

Allow exactly one repair attempt for invalid outputs.

Repair prompt should:

- include the previous raw response;
- include the required schema;
- ask the model to return valid JSON only;
- instruct it not to change the substantive forecast unless required to satisfy probability constraints.

If the repair still fails, mark the prediction invalid and exclude it from primary scoring while retaining the raw data.

### 9.5 Validation status enum

Use a finite status enum such as:

```ts
type ValidationStatus =
  | "valid"
  | "normalized"
  | "repaired"
  | "repaired_and_normalized"
  | "invalid_json"
  | "invalid_schema"
  | "invalid_probability_range"
  | "invalid_probability_sum"
  | "invalid_score"
  | "invalid_after_repair"
  | "api_error"
  | "timeout";
```

---

## 10. Evaluation metrics implementation

Metrics should be computed after match results are known. They should be stored, not only calculated in the frontend.

### 10.1 Probabilistic result metrics

For the 90-minute home/draw/away vector:

- Brier score;
- multiclass log loss.

### 10.2 Categorical result metrics

- top-outcome accuracy from probabilities;
- tendency accuracy from predicted score;
- knockout advancement accuracy for knockout matches.

### 10.3 Scoreline metrics

- exact-score accuracy;
- goal-difference accuracy;
- home-goal absolute error;
- away-goal absolute error;
- total-goals absolute error;
- goal-difference absolute error.

### 10.4 Kicktipp-style points

Implement a configurable point scheme. Initial default:

```text
exact score: 4 points
correct goal difference: 3 points
correct tendency/result: 2 points
otherwise: 0 points
```

If the existing app already has a point system, do not replace it blindly. Either map it to this benchmark scoring or make the scheme configurable.

### 10.5 Advancement metrics

For knockout matches:

- advancement Brier score;
- advancement log loss;
- advancement accuracy.

### 10.6 Coherence/reliability diagnostics

Store diagnostic flags/metrics separately from main performance metrics:

- score result matches probability argmax for 90-minute result;
- score result matches probability argmax for full result;
- expected-goals-to-score distance;
- invalid-output rate;
- repair rate;
- normalization rate;
- open-book search-observed rate.

Internal consistency should not be used as a primary performance ranking metric; it should be shown as a diagnostic/reliability metric family.

---

## 11. Baselines and odds

Baselines are not required for the current app implementation.

The schema should leave room for:

- uniform baseline;
- historical base-rate baseline;
- FIFA/Elo baseline;
- Poisson score model;
- bookmaker-implied probability baseline;
- betting simulations.

Do not implement live odds ingestion unless explicitly requested later. If baseline rows are later added, they should use the same prediction/evaluation schema with `predictor_type = "baseline"`.

The core app update should focus on LLM comparison across:

```text
model × access_condition × prompt_strategy × forecast_horizon
```

---

## 12. Paper-analysis exports

Add scripts or endpoints to export paper-ready data.

Suggested exports:

```text
exports/worldcup2026_matches.csv
exports/worldcup2026_predictions_raw.jsonl
exports/worldcup2026_predictions_validated.csv
exports/worldcup2026_evaluations.csv
exports/worldcup2026_tool_logs.jsonl
```

Exports should include invalid predictions and repair status, not only valid/scored rows.

Minimum export fields:

- match metadata;
- prediction metadata;
- model/provider metadata;
- access condition;
- prompt strategy;
- forecast horizon;
- raw prompt hash;
- raw response or response reference;
- parsed fields;
- validation status;
- tool-use metadata;
- evaluation metrics after results are known.

---

## 13. Frontend integration and UI improvements

Frontend changes should preserve existing UI work wherever possible, including model-comparison views, tournament tree/bracket, country flags, styling, and existing prediction cards.

### 13.1 Match page

Extend existing match-level views to show:

- model predictions by condition;
- predicted 90-minute score;
- predicted full score;
- 90-minute win/draw/loss probabilities;
- advancement probabilities for knockout matches;
- confidence;
- short reason;
- access condition badge: closed-book/open-book;
- prompt strategy badge: direct/probabilistic;
- forecast horizon badge: T_24H/T_2H/STAGE_OPENING;
- search-used indicator for open-book predictions.

### 13.2 Leaderboards

Add filters for:

- model;
- access condition;
- prompt strategy;
- forecast horizon;
- stage;
- metric.

Leaderboard metrics:

- Brier score;
- log loss;
- top-outcome accuracy;
- exact-score accuracy;
- goal-difference absolute error;
- total-goals absolute error;
- Kicktipp-style points;
- invalid-output rate;
- open-book search-observed rate.

### 13.3 Comparison views

Reuse current interactive comparison UI and extend it to compare:

- closed-book vs open-book;
- direct-score vs probabilistic-forecast;
- models within a condition;
- T_24H vs T_2H;
- match-level model disagreement.

### 13.4 Tournament tree/bracket

Preserve the existing tournament tree/bracket. Extend it only if useful to show:

- model predicted advancers;
- probability of advancement;
- actual advancer after result;
- per-model bracket accuracy.

Do not rewrite the bracket/tree unless the current implementation cannot support the required data.

### 13.5 Country flags

Preserve existing flag handling. Ensure any new components use the existing country/team mapping rather than creating a second incompatible mapping.

---

## 14. Testing requirements

Add or update tests for:

### 14.1 Prompt builder

- closed-book prompt contains no web-search instruction;
- open-book prompt instructs web search;
- direct-score and probabilistic prompts differ only in strategy instruction;
- all prompts include the shared JSON schema;
- match block includes sport, tournament edition, stage, date, teams, venue, knockout flag.

### 14.2 Validation

- valid JSON passes;
- malformed JSON triggers repair;
- probability sums between 0.98 and 1.02 normalize;
- invalid probability ranges fail;
- missing fields fail;
- non-integer scores fail or normalize only if numeric integers like `1.0`;
- knockout advancement probabilities are required for knockout matches.

### 14.3 Evaluation metrics

- Brier score;
- log loss;
- top-outcome accuracy;
- exact-score accuracy;
- goal-difference accuracy/error;
- total-goals error;
- Kicktipp points;
- advancement metrics;
- coherence flags.

### 14.4 OpenRouter integration

- closed-book calls pass no tools;
- open-book calls pass OpenRouter web-search tool configuration;
- raw prompt and raw response are stored;
- tool-use metadata is stored when available.

### 14.5 Regression/UI

Where possible, add smoke tests or checks to ensure existing pages still render:

- model comparison page;
- match page;
- tournament tree/bracket;
- country flag display;
- leaderboard page.

---

## 15. Suggested staged Codex prompts

### Stage 1: audit only

```text
Read docs/worldcup2026_benchmark_protocol.md and docs/worldcup2026_codex_implementation_plan.md. Inspect the existing app. Do not modify code yet. Produce a concise implementation plan for integrating this benchmark protocol into the current codebase. Reuse existing infrastructure wherever possible, especially the existing OpenRouter integration, interactive model-comparison UI, tournament tree/bracket, country flags, and current design choices.
```

### Stage 2: schema and types

```text
Implement the schema/type changes required by the World Cup 2026 benchmark protocol. Preserve existing app behavior. Add migrations or typed fields for access_condition, prompt_strategy, forecast_horizon, raw_prompt, raw_response, parsed prediction fields, validation status, timing metadata, OpenRouter tool metadata, and evaluation metrics. Do not remove or rewrite existing UI features.
```

### Stage 3: prompt builder and prediction runner

```text
Replace or extend the current MVP prediction prompt with the modular benchmark prompt builder. Implement all four conditions: closed_book/direct_score, closed_book/probabilistic_forecast, open_book/direct_score, open_book/probabilistic_forecast. Closed-book calls must pass no tools. Open-book calls should pass OpenRouter openrouter:web_search where available. Store raw prompts, raw responses, prompt hashes, timing metadata, and tool-use metadata.
```

### Stage 4: validation and repair

```text
Implement JSON parsing, validation, deterministic probability normalization, one repair attempt, and invalid-output logging according to the benchmark protocol. Store raw_response, repair_raw_response, parsed fields, validation_status, validation_errors, and is_valid_for_scoring. Add tests for valid outputs, malformed JSON, missing fields, probability normalization, invalid probabilities, and score validation.
```

### Stage 5: evaluation metrics

```text
Implement post-result evaluation metrics according to the protocol: Brier score, multiclass log loss, top-outcome accuracy, exact-score accuracy, goal-difference accuracy/error, total-goals error, home/away goal errors, Kicktipp-style points, advancement metrics for knockout games, and coherence diagnostics. Store metrics in the database, not only in frontend state. Add tests for each metric.
```

### Stage 6: exports

```text
Add paper-analysis exports for matches, raw predictions, validated predictions, evaluations, and tool logs. Exports must include invalid predictions and validation/repair metadata, not only valid predictions. Ensure the export can be regenerated from the database.
```

### Stage 7: frontend integration

```text
Update the existing interface to display the new benchmark conditions and metrics. Preserve existing visual design, model-comparison UI, tournament tree/bracket, country flags, and other current features. Add filters for model, access condition, prompt strategy, forecast horizon, stage, and metric. Add leaderboards for Brier score, log loss, top-outcome accuracy, exact-score accuracy, goal-difference error, total-goals error, Kicktipp points, invalid-output rate, and search-observed rate.
```

---

## 16. Acceptance criteria

The implementation is acceptable when:

1. Existing core app functionality still works.
2. Existing OpenRouter integration is reused or cleanly extended.
3. Existing model-comparison UI, tournament tree/bracket, and flags are preserved unless explicitly refactored for a documented reason.
4. The app can generate predictions for all four 2x2 conditions.
5. Closed-book calls pass no tools.
6. Open-book calls pass OpenRouter web search where available.
7. Every prediction stores raw prompt, raw response, parsed fields, validation status, timing metadata, and condition metadata.
8. Invalid predictions are retained and reported, not silently dropped.
9. Evaluation metrics are computed and stored after results are known.
10. The frontend can filter/display predictions by model, access condition, prompt strategy, and horizon.
11. Paper-analysis exports can be generated.
12. Tests cover prompt generation, validation, evaluation metrics, and critical integration behavior.

---

## 17. Non-goals for the current implementation

Do not implement unless explicitly requested later:

- full app rebuild;
- live bookmaker odds ingestion;
- historical/Elo/Poisson baselines;
- betting-strategy simulation;
- public-user analysis for the paper;
- stochastic multi-sample ensembling;
- scoreline probability grids;
- custom web-search/RAG wrapper outside OpenRouter.

These remain possible future extensions.

