# WorldCupForecastBench 2026: Benchmark Protocol

**Document purpose:** This document defines the scientific/source-of-truth protocol for the AI Sports Prediction FIFA World Cup 2026 forecasting benchmark. It is intended to guide the preregistered paper, the benchmark dataset, and the later engineering implementation in the existing web app.

**Working title:** *WorldCupForecastBench 2026: A Live Benchmark of LLM Football Forecasting During the FIFA World Cup 2026*

**Status:** Protocol draft v1, based on the currently agreed methodology.

---

## 1. Project Goal

The project has two related but distinct goals:

1. **Public website goal:** Build an entertaining live website that shows predictions from multiple LLMs for FIFA World Cup 2026 matches, tracks their performance over time, and allows users to compare models by probabilities, exact scores, and game-style points.

2. **Scientific benchmark goal:** Build a preregistered, timestamped benchmark evaluating how well LLM systems forecast FIFA World Cup 2026 matches before outcomes are known.

The scientific paper focuses on the controlled LLM benchmark. Public user participation is useful for website engagement but is **not part of the core paper design**, because participation volume and representativeness cannot be guaranteed.

The paper contribution should be framed as a benchmark/dataset/evaluation contribution, not as a claim that LLMs can reliably beat bookmakers, experts, or markets.

Core framing:

> We introduce a live, preregistered benchmark for evaluating LLM football forecasting during the FIFA World Cup 2026. The benchmark compares models under controlled access and prompting conditions, using timestamped predictions made before outcomes are known, and evaluates probabilistic result prediction, categorical accuracy, scoreline quality, advancement prediction, and output reliability.

---

## 2. Match Universe

The benchmark covers FIFA World Cup 2026 matches.

The existing app currently obtains fixture information from `football-data.org`. Fixture metadata from this API is sufficient for the closed-book condition as long as the prompt makes clear that the match is a current FIFA World Cup 2026 football/soccer match.

The match universe should include:

- all group-stage matches once fixtures are known;
- all knockout-stage matches once fixtures are known;
- all matches for which required fixture metadata and final results can be reliably stored.

Actual match outcomes must be stored only after they are known and must be kept separate from prediction records.

---

## 3. Core Research Questions

### RQ1: Model performance

How accurately do different LLMs forecast FIFA World Cup 2026 matches?

Evaluated using probabilistic, categorical, and soccer-specific scoreline metrics.

### RQ2: Access condition

Does open-book web-search access improve LLM forecasting compared with closed-book prediction?

Main comparison:

```text
closed_book vs open_book
```

### RQ3: Prompt strategy

Does probabilistic prompting improve forecasts compared with direct-score prompting?

Main comparison:

```text
direct_score vs probabilistic_forecast
```

### RQ4: Interaction effect

Does open-book access help more under probabilistic prompting than under direct-score prompting?

Main comparison:

```text
access_condition × prompt_strategy
```

### RQ5: Output reliability and coherence

How often do LLMs produce valid, usable, and internally coherent predictions?

Evaluated using invalid-output rates, repair/normalization rates, search-observed rates, and internal consistency flags.

### RQ6: Knockout advancement

For knockout-stage games, how well do models predict which team advances?

This is a secondary research question because it only applies to knockout matches.

---

## 4. Experimental Design

The core paper design is a 2 × 2 factorial benchmark.

| Factor | Conditions |
|---|---|
| Information access | `closed_book`, `open_book` |
| Prompt strategy | `direct_score`, `probabilistic_forecast` |

Each selected model predicts each eligible match under four conditions:

1. `closed_book` + `direct_score`
2. `closed_book` + `probabilistic_forecast`
3. `open_book` + `direct_score`
4. `open_book` + `probabilistic_forecast`

The experimental unit is:

```text
model × match × forecast_horizon × access_condition × prompt_strategy × sample_id
```

The main benchmark uses one deterministic call per experimental unit:

```text
temperature = 0
n = 1
```

No majority vote or stochastic ensemble is part of the core analysis.

Optional stochastic repeated calls may be added later as an exploratory stability analysis, but they are not part of the preregistered core benchmark.

---

## 5. Information Access Conditions

### 5.1 Closed-book condition

Closed-book models receive only fixture-identifying information and must not use external information sources.

Implementation definition:

```json
{
  "access_condition": "closed_book",
  "tools_enabled": false,
  "internet_access": false
}
```

Closed-book prompts must explicitly forbid external tools/search:

```text
Access condition: CLOSED_BOOK.
Do not use internet search, browsing, tools, APIs, or external data sources.
Use only your internal model knowledge, general football reasoning, typical football score distributions, and the fixture information provided below.
The fixture information identifies a current FIFA World Cup 2026 football/soccer match.
```

Closed-book fixture information includes only match-identifying fields:

```text
Sport: football / soccer
Competition: FIFA World Cup
Tournament edition: FIFA World Cup 2026
Stage: group_stage / round_of_32 / round_of_16 / quarterfinal / semifinal / third_place / final
Date UTC: ...
Home/listed first team: ...
Away/listed second team: ...
Venue: ... / unknown
Is knockout match: yes/no
```

Closed-book prompts must not include manually curated current performance information such as:

- recent form;
- rankings/Elo;
- injuries;
- suspensions;
- lineups;
- odds;
- news;
- team statistics manually added by the system.

The point of the closed-book condition is to test what the model can infer from internal knowledge, general football reasoning, typical score distributions, and the fixture identity.

### 5.2 Open-book condition

Open-book models receive the same fixture block as closed-book models, but are additionally instructed and enabled to use web search.

Implementation definition:

```json
{
  "access_condition": "open_book",
  "tools_enabled": true,
  "internet_access": true
}
```

The preferred provider layer is OpenRouter wherever possible. Open-book calls should use OpenRouter's web-search server tool where available:

```json
{
  "tools": [
    {
      "type": "openrouter:web_search"
    }
  ]
}
```

Open-book prompts must explicitly instruct the model to search before forecasting:

```text
Access condition: OPEN_BOOK.
Before making the prediction, use the available web-search tool to check current public information about this match and both teams.
Relevant information may include recent form, injuries, suspensions, expected lineups, tactical news, venue, rest/travel, tournament context, and betting-market odds if available.
Base the final prediction on the retrieved public information plus your football reasoning.
```

For the paper, open-book means:

> the model was called with web/search tools enabled and explicitly instructed to retrieve current public information before forecasting.

It does **not** mean the model had perfect or exhaustive access to all public information.

Tool-use metadata must be logged. In particular, the system should store whether a web-search call was actually observed. The primary open-book analysis follows an intent-to-treat principle: predictions belong to the open-book condition if tools were enabled and the model was instructed to search. A secondary per-protocol analysis may separately evaluate only open-book predictions where search was actually observed.

---

## 6. Prompt Strategies

Both prompt strategies must return the same output schema. The manipulation is the instruction order/reasoning style, not the final output fields.

### 6.1 Direct-score strategy

The direct-score prompt mimics a consumer/public use case: first predict the score, then provide probabilities consistent with it.

Prompt instruction:

```text
Prompt strategy: DIRECT_SCORE.
First predict the most likely scoreline for the match.
Then provide probabilities, expected goals, and full-match/advancement probabilities that are consistent with that predicted scoreline.
Do not overstate certainty.
```

### 6.2 Probabilistic-forecast strategy

The probabilistic-forecast prompt mimics a formal forecasting workflow: first estimate calibrated probabilities and expected goals, then derive a scoreline.

Prompt instruction:

```text
Prompt strategy: PROBABILISTIC_FORECAST.
First estimate calibrated probabilities for the 90-minute result and expected goals.
Then derive the most likely scoreline from those probabilities and expected goals.
Do not overstate certainty.
```

---

## 7. Forecast Timing

The benchmark uses three timing categories.

### 7.1 Primary horizon: T-24h

Primary paper analyses use predictions generated approximately 24 hours before scheduled kickoff.

```json
{
  "forecast_horizon": "T_24H",
  "target_offset_minutes": -1440,
  "primary": true
}
```

The primary analysis should use only valid T-24h predictions. Stage-opening fallback predictions should not be used to impute missing T-24h predictions in the primary analysis.

### 7.2 Secondary horizon: T-1h

A secondary/add-on horizon may generate predictions approximately 2 hours before kickoff.

```json
{
  "forecast_horizon": "T_2H",
  "target_offset_minutes": -60,
  "primary": false
}
```

This is especially relevant for open-book models because public information close to kickoff may include lineups, late injuries, tactical news, and market movement.

T-1h predictions are secondary because they are operationally more fragile.

### 7.3 Fallback/early horizon: stage-opening predictions

Instead of T-7d forecasts, the benchmark uses stage-opening predictions as a robust fallback and early forecast layer.

Group stage:

```text
Generate predictions for all known group-stage fixtures once before the tournament starts.
```

Knockout stage:

```text
Generate predictions for each knockout match once shortly after the fixture becomes known.
```

Stage labels may include:

```text
group_stage
round_of_32
round_of_16
quarterfinal
semifinal
third_place
final
```

Stage-opening predictions are used for website robustness and secondary analyses. They are not used to replace missing T-24h predictions in the primary paper analysis.

### 7.4 Timing metadata

Every prediction must store timing metadata, including:

```json
{
  "forecast_horizon": "T_24H | T_2H | STAGE_OPENING",
  "stage_context": "group_stage | round_of_32 | round_of_16 | quarterfinal | semifinal | third_place | final",
  "scheduled_prediction_time_utc": "...",
  "actual_prediction_time_utc": "...",
  "kickoff_time_utc": "...",
  "minutes_before_kickoff": 1438,
  "timing_status": "on_time | early | late | missed | fallback"
}
```

---

## 8. Prediction Targets

The benchmark records multiple forecast targets.

### 8.1 Primary target: 90-minute result probabilities

For every match, models predict the result after regulation time plus stoppage time, excluding extra time and penalties.

Fields:

```json
{
  "home_win_90_prob": 0.42,
  "draw_90_prob": 0.28,
  "away_win_90_prob": 0.30
}
```

Definitions:

- `home_win_90_prob`: probability that the listed home/first team leads after 90 minutes plus stoppage time.
- `draw_90_prob`: probability that the match is tied after 90 minutes plus stoppage time.
- `away_win_90_prob`: probability that the listed away/second team leads after 90 minutes plus stoppage time.

These three probabilities must be numbers between 0 and 1 and must sum to 1, subject to validation/normalization rules.

### 8.2 Expected goals

For every match, models predict expected 90-minute goals:

```json
{
  "expected_home_goals_90": 1.4,
  "expected_away_goals_90": 1.1
}
```

These refer to goals in regulation time plus stoppage time only.

### 8.3 Exact score

For every match, models predict the single most likely 90-minute scoreline:

```json
{
  "most_likely_score_90": {
    "home": 1,
    "away": 1
  }
}
```

This supports soccer-specific evaluation and website/game-style scoring.

### 8.4 Full-match probabilities and score

Models also provide full-match probabilities and a full-match score field:

```json
{
  "home_win_full_prob": 0.44,
  "draw_full_prob": 0.26,
  "away_win_full_prob": 0.30,
  "most_likely_score_full": {
    "home": 1,
    "away": 1
  }
}
```

For group-stage matches, full-match result is the same as the 90-minute result.

For knockout matches, the concept of final score after penalties can be ambiguous because penalty shootout goals are not normally counted in the official match score. Therefore, knockout-stage evaluation should rely primarily on 90-minute result metrics and advancement probabilities. Full-match score fields may still be stored for website display and secondary analysis, but must be interpreted carefully.

### 8.5 Knockout advancement probabilities

For knockout matches, models predict which team advances/wins the tie after extra time and penalties if needed:

```json
{
  "home_advances_prob": 0.58,
  "away_advances_prob": 0.42
}
```

For group-stage matches:

```json
{
  "home_advances_prob": null,
  "away_advances_prob": null
}
```

For knockout matches, advancement probabilities must be numbers between 0 and 1 and must sum to 1.

### 8.6 Optional scoreline probability grid

A scoreline probability grid is scientifically useful but not required for the MVP/core benchmark.

If implemented later, it should be treated as an add-on and preferably use a fixed grid such as 0-5 goals for each team plus an `other` category.

### 8.7 Betting recommendations

Betting recommendations are not part of the core prediction prompt. Betting-style analyses may later be derived from model probabilities and bookmaker-implied probabilities if odds data can be collected.

This separation keeps forecasting ability distinct from betting decision rules.

---

## 9. Shared Output JSON Schema

All four experimental conditions must return the same JSON structure.

Required model output:

```json
{
  "home_win_90_prob": 0.42,
  "draw_90_prob": 0.28,
  "away_win_90_prob": 0.30,

  "expected_home_goals_90": 1.4,
  "expected_away_goals_90": 1.1,

  "most_likely_score_90": {
    "home": 1,
    "away": 1
  },

  "home_win_full_prob": 0.44,
  "draw_full_prob": 0.26,
  "away_win_full_prob": 0.30,

  "most_likely_score_full": {
    "home": 1,
    "away": 1
  },

  "home_advances_prob": null,
  "away_advances_prob": null,

  "confidence": 0.42,
  "reason": "Short reason."
}
```

The prompt should say:

```text
Return only valid JSON. Do not include markdown or explanation outside JSON.
```

`confidence` is a number between 0 and 1 representing the model's overall confidence in its forecast. It is stored for display/analysis but is not a primary metric.

`reason` is a short reason string. It is useful for the website and possible exploratory analysis but is not used for primary scoring.

---

## 10. Prompt Template Structure

The prompt should be assembled from reusable blocks:

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

### 10.1 Definitions block

The definitions block should be shared across all conditions:

```text
Definitions:
- 90-minute result means the score after regulation time plus stoppage time, excluding extra time and penalties.
- home_win_90_prob is the probability that the listed home team leads after 90 minutes plus stoppage time.
- draw_90_prob is the probability that the match is tied after 90 minutes plus stoppage time.
- away_win_90_prob is the probability that the listed away team leads after 90 minutes plus stoppage time.
- expected_home_goals_90 and expected_away_goals_90 are expected goals scored in regulation time plus stoppage time.
- most_likely_score_90 is the single most likely score after regulation time plus stoppage time.
- full-match result means the final match outcome after all applicable extra time and penalty shootout procedures.
- For group-stage matches, full-match result is the same as the 90-minute result.
- For knockout matches, home_advances_prob and away_advances_prob are the probabilities that each team advances or wins the tie after extra time and penalties if needed.
- Probabilities must be numbers between 0 and 1.
- home_win_90_prob + draw_90_prob + away_win_90_prob must sum to 1.
- For knockout matches, home_advances_prob + away_advances_prob must sum to 1.
- Confidence should be the model's confidence in its overall forecast, between 0 and 1.
```

### 10.2 Fixture block

The fixture block should identify the match clearly without adding curated performance data:

```text
Match:
Sport: football / soccer
Competition: FIFA World Cup
Tournament edition: FIFA World Cup 2026
Stage: {stage}
Date UTC: {utcDate}
Home/listed first team: {homeTeam}
Away/listed second team: {awayTeam}
Venue: {venue or unknown}
Is knockout match: {yes/no}
```

---

## 11. Model and API Setup

### 11.1 Preferred provider setup

Use OpenRouter wherever possible for both closed-book and open-book calls.

Closed-book:

- OpenRouter model call without tools.
- Prompt explicitly forbids external tools/search.

Open-book:

- OpenRouter model call with `openrouter:web_search` where available.
- Prompt explicitly instructs the model to use web search before forecasting.
- Store whether search was actually observed.

Direct provider APIs may be used as fallback if necessary, but the primary plan is to use OpenRouter wherever feasible.

### 11.2 Main model set

The exact model list may be finalized closer to deployment because model availability may change before the World Cup.

For each model, store:

```json
{
  "model_id": "provider/model-name",
  "provider": "openrouter | direct_provider | ...",
  "model_version": "exact version if available",
  "model_family": "GPT | Claude | Gemini | Llama | Qwen | DeepSeek | Mistral | ...",
  "supports_tool_access": true,
  "is_open_weight": true
}
```

The primary 2 × 2 access comparison should include models for which both closed-book and open-book modes work reliably.

Models that only support closed-book prediction can still be included in secondary closed-book-only analyses and the website leaderboard.

### 11.3 Generation settings

Core benchmark:

```json
{
  "temperature": 0,
  "top_p": 1,
  "n": 1
}
```

No majority voting or stochastic ensembling is part of the core benchmark.

Optional exploratory extension:

```text
Run multiple stochastic calls for a subset of models/matches to study output stability and whether averaging improves performance.
```

---

## 12. Parsing, Validation, Repair, and Normalization

### 12.1 Core storage principle

Always store:

```text
raw_response → parsed_json → validated_prediction
```

Never overwrite the raw response.

### 12.2 Validation checks

The system must validate:

1. Response is valid JSON.
2. JSON parses into an object.
3. All required fields are present.
4. Numeric fields are numbers.
5. Probabilities are within `[0, 1]`.
6. Probability vectors sum to 1 within tolerance.
7. Scores are non-negative integers.
8. `reason` is a string, preferably short.

Probability sum checks:

```text
home_win_90_prob + draw_90_prob + away_win_90_prob ≈ 1
home_win_full_prob + draw_full_prob + away_win_full_prob ≈ 1
home_advances_prob + away_advances_prob ≈ 1, for knockout matches
```

Suggested tolerance for valid sums:

```text
absolute difference <= 0.01
```

### 12.3 Normalization policy

Small probability-sum errors may be fixed deterministically.

If a probability vector sum is between 0.98 and 1.02, normalize:

```text
p_i_normalized = p_i / sum(p)
```

Mark the prediction as normalized.

Also allow numeric integer scores such as `1.0` to be converted to integer `1` if they are exactly integer-valued.

Do not silently fix major errors such as:

- negative probabilities;
- probabilities far outside `[0,1]`;
- probability sums far from 1;
- missing required fields;
- non-numeric scores.

### 12.4 Repair policy

Allow at most one repair attempt.

If the first response is invalid, ask the same model to convert/fix the response into valid JSON without changing the substantive forecast unless necessary to satisfy schema/probability constraints.

Repair instruction:

```text
Your previous response could not be parsed or validated.
Convert it into valid JSON matching the required schema.
Do not change the substantive forecast unless required to satisfy probability constraints.
Return only valid JSON.
```

If the repair attempt also fails, mark the prediction invalid.

### 12.5 Validation status labels

Use finite status labels such as:

```text
valid
normalized
repaired
repaired_and_normalized
invalid_json
invalid_schema
invalid_probability_range
invalid_probability_sum
invalid_score
invalid_after_repair
api_error
timeout
```

Primary scoring uses valid/normalized/repaired predictions that pass final validation. Invalid predictions are excluded from primary metric calculations but invalid/missing rates are reported separately.

Sensitivity analyses may assign invalid predictions a preregistered penalty, but this is not part of the primary analysis.

---

## 13. Evaluation Metrics

The benchmark uses a multi-metric evaluation family rather than a single primary metric. This is important because soccer forecasts can be evaluated not only as probabilities, but also as categorical results and exact scorelines.

### 13.1 Probabilistic result forecasting

Evaluated on 90-minute home/draw/away probabilities.

Metrics:

- 90-minute Brier score;
- 90-minute multiclass log loss.

Brier score for three classes:

```text
Brier = (p_home - y_home)^2 + (p_draw - y_draw)^2 + (p_away - y_away)^2
```

Log loss for realized class `y`:

```text
-log(p_y)
```

### 13.2 Categorical result accuracy

Metrics:

- 90-minute top-outcome accuracy from probabilities;
- 90-minute tendency/result accuracy from predicted score;
- knockout advancement accuracy for knockout games.

### 13.3 Soccer-specific scoreline quality

These metrics differentiate the benchmark from generic forecasting benchmarks.

Metrics:

- exact-score accuracy;
- goal-difference accuracy;
- goal-difference absolute error;
- total-goals absolute error;
- home-goals absolute error;
- away-goals absolute error;
- Kicktipp-style points.

A possible Kicktipp-style point scheme:

| Prediction quality | Points |
|---|---:|
| exact score | 4 |
| correct goal difference | 3 |
| correct tendency/result | 2 |
| otherwise | 0 |

The exact point scheme should be finalized and kept fixed before official evaluation.

### 13.4 Knockout advancement metrics

For knockout matches only:

- binary Brier score for actual advancer;
- binary log loss for actual advancer;
- advancement accuracy.

### 13.5 Diagnostic reliability and coherence metrics

Internal consistency is not a main forecast-performance metric, but it is an important diagnostic metric family.

Report:

- invalid JSON rate;
- repair rate;
- normalization rate;
- missing prediction rate;
- API error/timeout rate;
- open-book search-observed rate;
- score/probability consistency violations;
- expected-goals/score distance.

Most important coherence check:

```text
Does the most likely score imply the same 90-minute result as the highest 90-minute result probability?
```

Example inconsistency:

```json
{
  "home_win_90_prob": 0.60,
  "draw_90_prob": 0.20,
  "away_win_90_prob": 0.20,
  "most_likely_score_90": {
    "home": 1,
    "away": 1
  }
}
```

This would be a score/probability inconsistency because the probability argmax is home win but the predicted score is a draw.

### 13.6 Calibration

Calibration/reliability diagrams may be reported descriptively. Calibration is useful but is not the central benchmark objective.

Because the World Cup has a limited number of matches, calibration estimates may be noisy.

### 13.7 Betting metrics

Betting metrics are not part of the core MVP benchmark. If bookmaker odds are collected later, betting-style analyses may be derived from model probabilities.

Potential metrics:

- derived edge versus bookmaker-implied probabilities;
- flat-stake ROI;
- Kelly-style ROI;
- number of bets;
- max drawdown.

These analyses are exploratory/post-hoc unless implemented and preregistered later.

---

## 14. Baselines

The core MVP and primary paper design focus on LLM-vs-LLM comparisons and the effects of access condition and prompt strategy.

Baselines are **not required for the initial app implementation** and should not block the MVP.

### 14.1 Planned secondary/future baselines

Potential baselines include:

- uniform baseline;
- historical World Cup base-rate baseline;
- recent international-match base-rate baseline;
- FIFA-ranking or Elo baseline;
- simple Poisson score model;
- bookmaker-implied probability baseline.

The bookmaker-implied baseline is valuable but requires reliable odds collection and timestamp alignment. The plan is to attempt odds collection later if time allows, not to require live odds ingestion for the MVP.

### 14.2 Paper framing for baselines

The preregistered core benchmark does not depend on baselines.

Controlled non-LLM baselines may be added in secondary or post-hoc analyses if reliable data can be collected and aligned with prediction timestamps.

### 14.3 Storage support

Even if baselines are not implemented initially, the data model should leave room for them by supporting:

```json
{
  "predictor_type": "llm | baseline",
  "predictor_id": "model_id_or_baseline_id"
}
```

---

## 15. Statistical Analysis Plan

### 15.1 Core deterministic benchmark

The main benchmark uses:

```text
one deterministic call per model × match × horizon × access condition × prompt strategy
temperature = 0
n = 1
```

No majority vote or model ensembling is used in the core analysis.

### 15.2 Bootstrap uncertainty over matches

Bootstrap uncertainty does not require multiple model calls.

To estimate uncertainty for aggregate metrics:

1. Sample matches with replacement from the match set.
2. Recompute each metric on the resampled match set.
3. Repeat many times, e.g. 1,000 or 10,000 bootstrap iterations.
4. Report percentile confidence intervals.

Example output:

```text
Model A Brier score: 0.56 [95% CI: 0.49, 0.64]
```

### 15.3 Paired bootstrap comparisons

For comparisons such as open-book vs closed-book or probabilistic vs direct prompting, use paired bootstrap over matches.

For each bootstrap sample, compute the metric difference on the same resampled matches:

```text
delta = mean_metric(condition_A) - mean_metric(condition_B)
```

Report bootstrap confidence intervals for the difference.

Use paired bootstrap for:

- open-book vs closed-book;
- probabilistic-forecast vs direct-score;
- model A vs model B;
- T-1h vs T-24h, if T-1h is implemented;
- interaction summaries.

### 15.4 Limited sample-size caution

The FIFA World Cup has a limited number of matches. Results should be reported with uncertainty intervals and interpreted cautiously. Small differences between models should not be overclaimed.

---

## 16. Logging and Reproducibility Requirements

Every prediction must be reconstructable and auditable.

### 16.1 Required prediction metadata

For each prediction, store:

```json
{
  "prediction_id": "uuid",
  "run_id": "uuid",
  "match_id": "uuid_or_external_id",

  "predictor_type": "llm | baseline",
  "predictor_id": "openrouter/model-or-baseline-id",
  "provider": "openrouter",
  "model_id": "model-name",
  "model_version": null,

  "access_condition": "closed_book | open_book",
  "prompt_strategy": "direct_score | probabilistic_forecast",
  "forecast_horizon": "T_24H | T_2H | STAGE_OPENING",
  "sample_id": 1,

  "scheduled_prediction_time_utc": "...",
  "actual_prediction_time_utc": "...",
  "kickoff_time_utc": "...",
  "minutes_before_kickoff": 1438,
  "timing_status": "on_time | early | late | missed | fallback",

  "temperature": 0,
  "top_p": 1,
  "max_tokens": 1000,

  "prompt_template_id": "wc2026_v1",
  "prompt_hash": "sha256(raw_prompt)",
  "raw_prompt": "...",

  "raw_response": "...",
  "response_id": "provider_response_id_or_null",
  "latency_ms": 3200,
  "input_tokens": 900,
  "output_tokens": 350,
  "cost_usd": 0.0042,

  "created_at_utc": "..."
}
```

### 16.2 Parsed prediction fields

Store parsed fields in columns or a structured prediction-output table:

```json
{
  "home_win_90_prob": 0.42,
  "draw_90_prob": 0.28,
  "away_win_90_prob": 0.30,
  "expected_home_goals_90": 1.4,
  "expected_away_goals_90": 1.1,
  "most_likely_score_90_home": 1,
  "most_likely_score_90_away": 1,
  "home_win_full_prob": 0.44,
  "draw_full_prob": 0.26,
  "away_win_full_prob": 0.30,
  "most_likely_score_full_home": 1,
  "most_likely_score_full_away": 1,
  "home_advances_prob": null,
  "away_advances_prob": null,
  "confidence": 0.42,
  "reason": "Short reason."
}
```

### 16.3 Validation metadata

Store:

```json
{
  "validation_status": "valid | normalized | repaired | repaired_and_normalized | invalid_after_repair | api_error | timeout",
  "is_valid_for_scoring": true,
  "repair_attempted": false,
  "repair_raw_response": null,
  "normalization_applied": false,
  "normalized_fields": [],
  "validation_errors": [],
  "prob_sum_90_original": 1.0,
  "prob_sum_90_final": 1.0,
  "prob_sum_full_original": 1.0,
  "prob_sum_full_final": 1.0,
  "prob_sum_advancement_original": null,
  "prob_sum_advancement_final": null
}
```

### 16.4 Open-book tool logs

For open-book predictions, store:

```json
{
  "tools_enabled": true,
  "tool_type": "openrouter:web_search",
  "tool_calls_observed": true,
  "num_tool_calls": 2,
  "tool_trace_available": true,
  "tool_trace": {},
  "open_book_compliance": "observed_search | no_observed_search | unknown"
}
```

If OpenRouter returns citations, search traces, or tool metadata, store the raw object as JSON.

### 16.5 Evaluation output

After match results are known, store derived evaluation fields, including:

```json
{
  "actual_result_90": "home | draw | away",
  "actual_result_full": "home | draw | away",
  "actual_advancer": "home | away | null",

  "predicted_result_90_from_probs": "home | draw | away",
  "predicted_result_90_from_score": "home | draw | away",
  "predicted_result_full_from_probs": "home | draw | away",

  "brier_90": 0.42,
  "log_loss_90": 0.87,
  "top_outcome_correct_90": true,

  "exact_score_90_correct": false,
  "goal_difference_90_correct": true,
  "tendency_90_correct_from_score": true,

  "home_goal_abs_error_90": 0,
  "away_goal_abs_error_90": 1,
  "total_goals_abs_error_90": 1,
  "goal_difference_abs_error_90": 1,

  "kicktipp_points_90": 3,

  "advancement_brier": null,
  "advancement_log_loss": null,
  "advancement_accuracy": null,

  "score_result_matches_prob_argmax_90": true,
  "score_result_matches_prob_argmax_full": true,
  "expected_goals_score_distance": 0.5,

  "evaluated_at_utc": "..."
}
```

---

## 17. Core, Secondary, and Exploratory Analyses

### 17.1 Core preregistered benchmark

Core:

- T-24h predictions;
- selected LLMs;
- 2 × 2 design: `closed_book` vs `open_book`, `direct_score` vs `probabilistic_forecast`;
- shared output schema;
- 90-minute result probabilities;
- 90-minute exact score;
- full-match/advancement probabilities;
- multi-metric football evaluation.

### 17.2 Secondary preregistered analyses

Secondary:

- T-1h predictions;
- stage-opening fallback predictions;
- knockout advancement metrics;
- internal consistency diagnostics;
- invalid-output and operational reliability;
- website/game-style Kicktipp points.

### 17.3 Exploratory/post-hoc analyses

Exploratory/post-hoc:

- bookmaker-implied baselines, if odds can be collected;
- historical base-rate, Elo/FIFA, or Poisson baselines;
- betting-strategy simulations;
- public-user comparisons from the website;
- qualitative analysis of model reasons;
- scoreline probability grid analysis, if implemented later;
- stochastic repeated-call stability analysis.

---

## 18. Explicit Exclusions and Limitations

The core paper does not depend on:

- public user participation;
- live odds ingestion;
- bookmaker baselines;
- historical/Elo/Poisson baselines;
- scoreline probability grids;
- betting recommendations;
- stochastic model ensembles.

The benchmark does not claim:

- that LLMs will beat bookmakers;
- that open-book systems retrieve all relevant public information;
- that closed-book systems have current information beyond their internal model knowledge and fixture metadata;
- that small differences between models are meaningful without uncertainty analysis.

---

## 19. App vs Paper Boundary

The website may display entertainment-oriented features such as:

- model leaderboards;
- exact score predictions;
- Kicktipp-style points;
- public user comparison;
- model reasons;
- model-vs-model match cards;
- open-book search-used indicators.

The paper should focus on controlled LLM predictions and should not rely on public-user data.

---

## 20. Implementation Principle for Existing App

The protocol should be integrated into the existing AI Sports Prediction/web app infrastructure rather than treated as a full rebuild.

Reuse existing components where possible, including:

- fixture ingestion from football-data.org;
- current prediction pipeline;
- existing OpenRouter integration;
- existing database and leaderboard components.

However, major migrations/refactors are acceptable if they are necessary to make the benchmark reliable, reproducible, and suitable for later paper analysis.

The most important implementation priority is paper-grade logging and evaluation reliability before interface polish.

---

## 21. Summary of Locked Decisions

Locked core decisions:

```text
Benchmark type:
- live, preregistered LLM football forecasting benchmark

Main design:
- 2 × 2 factorial design
- closed_book vs open_book
- direct_score vs probabilistic_forecast

Main horizon:
- T-24h primary

Secondary horizons:
- T-1h
- stage-opening fallback predictions

Primary prediction target:
- 90-minute home/draw/away probabilities

Secondary targets:
- expected goals
- exact score
- full-match probabilities
- knockout advancement probabilities

Core model-call setup:
- one deterministic call
- temperature = 0
- n = 1

Provider plan:
- OpenRouter wherever possible
- closed-book = no tools
- open-book = OpenRouter web search if available

Prompting:
- same JSON schema for all conditions
- modular prompt builder

Validation:
- parse JSON
- validate required fields
- normalize small probability-sum errors
- one repair attempt
- report invalid-output rates

Evaluation:
- multi-metric benchmark
- Brier score
- log loss
- top-outcome accuracy
- exact-score accuracy
- goal-difference/total-goals metrics
- Kicktipp-style points
- advancement metrics for knockout games
- diagnostic coherence/reliability metrics

Baselines:
- not required for MVP
- may be added later as secondary/post-hoc analyses

Users:
- website engagement only
- not part of the core paper
```

