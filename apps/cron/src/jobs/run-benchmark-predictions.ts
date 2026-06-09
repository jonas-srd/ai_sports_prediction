/**
 * Purpose: Runs World Cup 2026 benchmark predictions for the 2x2 access x prompt design.
 * This writes paper-grade records to benchmark_predictions and leaves the legacy prediction
 * scripts/tables untouched for the current website.
 */
import "../load-env";
import { createHash, randomUUID } from "node:crypto";
import {
  createSqliteDb,
  getDefaultDbPath,
  listMatches,
  upsertBenchmarkPrediction,
  upsertModels
} from "@llm-kicktipp/db";
import type {
  ForecastHorizon,
  MatchRow,
  NewBenchmarkPredictionRow,
  TimingStatus
} from "@llm-kicktipp/db";
import {
  buildPredictionPrompt,
  getConfiguredLlmModels,
  OpenRouterClient,
  PREDICTION_PROMPT_TEMPLATE_ID
} from "@llm-kicktipp/llm";

type BenchmarkAccessCondition = "closed_book" | "open_book";

type BenchmarkPromptStrategy = "direct_score" | "probabilistic_forecast";

type BenchmarkCondition = {
  accessCondition: BenchmarkAccessCondition;
  promptStrategy: BenchmarkPromptStrategy;
};

const CONDITIONS: BenchmarkCondition[] = [
  { accessCondition: "closed_book", promptStrategy: "direct_score" },
  { accessCondition: "closed_book", promptStrategy: "probabilistic_forecast" },
  { accessCondition: "open_book", promptStrategy: "direct_score" },
  { accessCondition: "open_book", promptStrategy: "probabilistic_forecast" }
];

const OPENROUTER_WEB_SEARCH_TOOLS = [{ type: "openrouter:web_search" }];
const BENCHMARK_TEMPERATURE = 0;
const BENCHMARK_TOP_P = 1;
const BENCHMARK_N = 1;
const BENCHMARK_MAX_TOKENS = 1000;

type CliArgs = {
  horizon: ForecastHorizon;
  limit: number | null;
  matchId: string | null;
  modelIds: string[] | null;
  sampleId: number;
};

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY. Add it to .env, not to frontend code.");
  }

  const args = parseCliArgs(process.argv.slice(2));
  const db = createSqliteDb();
  const allModels = getConfiguredLlmModels();
  const activeModels = allModels
    .filter((model) => model.active)
    .filter((model) => !args.modelIds || args.modelIds.includes(model.id));

  if (args.modelIds && activeModels.length === 0) {
    throw new Error(`No configured active models matched: ${args.modelIds.join(", ")}`);
  }

  await upsertModels(db, allModels);

  const matches = selectMatches(await listMatches(db), args);
  const openRouter = new OpenRouterClient({
    apiKey,
    siteUrl: process.env.OPENROUTER_SITE_URL,
    siteName: process.env.OPENROUTER_SITE_NAME
  });
  const runId = randomUUID();

  console.log(`Benchmark run: ${runId}`);
  console.log(`Horizon: ${args.horizon}`);
  console.log(`Found ${matches.length} matches and ${activeModels.length} active models.`);
  console.log(`SQLite DB: ${getDefaultDbPath()}`);

  for (const match of matches) {
    for (const model of activeModels) {
      for (const condition of CONDITIONS) {
        const prompt = buildPredictionPrompt({
          match: toPromptMatch(match),
          accessCondition: condition.accessCondition,
          promptStrategy: condition.promptStrategy
        });
        const promptHash = hashPrompt(prompt);
        const scheduledPredictionTimeUtc = getScheduledPredictionTimeUtc(match, args.horizon);
        const tools = condition.accessCondition === "open_book" ? OPENROUTER_WEB_SEARCH_TOOLS : undefined;

        try {
          const completion = await openRouter.createChatCompletion(model.id, prompt, {
            temperature: BENCHMARK_TEMPERATURE,
            topP: BENCHMARK_TOP_P,
            n: BENCHMARK_N,
            maxTokens: BENCHMARK_MAX_TOKENS,
            tools
          });
          const actualPredictionTimeUtc = new Date().toISOString();
          const timing = getTimingMetadata(match, args.horizon, actualPredictionTimeUtc);
          const parsedFields = parseBenchmarkPredictionContent(completion.content);

          await upsertBenchmarkPrediction(db, {
            run_id: runId,
            match_id: match.id,
            predictor_type: "llm",
            predictor_id: model.id,
            provider: "openrouter",
            model_id: model.id,
            model_version: null,
            access_condition: condition.accessCondition,
            prompt_strategy: condition.promptStrategy,
            forecast_horizon: args.horizon,
            sample_id: args.sampleId,
            scheduled_prediction_time_utc: scheduledPredictionTimeUtc,
            actual_prediction_time_utc: actualPredictionTimeUtc,
            kickoff_time_utc: match.utc_date,
            minutes_before_kickoff: timing.minutesBeforeKickoff,
            timing_status: timing.timingStatus,
            prompt_template_id: PREDICTION_PROMPT_TEMPLATE_ID,
            prompt_hash: promptHash,
            raw_prompt: prompt,
            raw_response: completion.rawResponse,
            response_id: completion.responseId,
            temperature: BENCHMARK_TEMPERATURE,
            top_p: BENCHMARK_TOP_P,
            max_tokens: BENCHMARK_MAX_TOKENS,
            latency_ms: completion.latencyMs,
            input_tokens: completion.inputTokens,
            output_tokens: completion.outputTokens,
            cost_usd: completion.costUsd,
            ...parsedFields,
            tools_enabled: completion.toolMetadata.toolsEnabled,
            tool_type: completion.toolMetadata.toolType,
            tool_calls_observed: completion.toolMetadata.toolCallsObserved,
            num_tool_calls: completion.toolMetadata.numToolCalls,
            tool_trace_available: completion.toolMetadata.toolTraceAvailable,
            tool_trace: completion.toolMetadata.toolTrace,
            open_book_compliance: completion.toolMetadata.openBookCompliance
          });

          console.log(formatSuccessLog(match, model.name, condition, completion.toolMetadata.openBookCompliance));
        } catch (error) {
          const failedAt = new Date().toISOString();
          await upsertBenchmarkPrediction(db, {
            run_id: runId,
            match_id: match.id,
            predictor_type: "llm",
            predictor_id: model.id,
            provider: "openrouter",
            model_id: model.id,
            model_version: null,
            access_condition: condition.accessCondition,
            prompt_strategy: condition.promptStrategy,
            forecast_horizon: args.horizon,
            sample_id: args.sampleId,
            scheduled_prediction_time_utc: scheduledPredictionTimeUtc,
            actual_prediction_time_utc: failedAt,
            kickoff_time_utc: match.utc_date,
            minutes_before_kickoff: getMinutesBeforeKickoff(match, failedAt),
            timing_status: getTimingMetadata(match, args.horizon, failedAt).timingStatus,
            prompt_template_id: PREDICTION_PROMPT_TEMPLATE_ID,
            prompt_hash: promptHash,
            raw_prompt: prompt,
            raw_response: serializeError(error),
            temperature: BENCHMARK_TEMPERATURE,
            top_p: BENCHMARK_TOP_P,
            max_tokens: BENCHMARK_MAX_TOKENS,
            validation_status: "api_error",
            is_valid_for_scoring: false,
            tools_enabled: condition.accessCondition === "open_book",
            tool_type: condition.accessCondition === "open_book" ? "openrouter:web_search" : null,
            tool_calls_observed: condition.accessCondition === "open_book" ? false : null,
            num_tool_calls: condition.accessCondition === "open_book" ? 0 : null,
            tool_trace_available: false,
            tool_trace: null,
            open_book_compliance: condition.accessCondition === "open_book" ? "unknown" : "not_applicable"
          });

          console.error(formatFailureLog(match, model.name, condition, error));
        }
      }
    }
  }

  db.close();
}

function parseCliArgs(args: string[]): CliArgs {
  const horizon = parseHorizon(readArg(args, "horizon") ?? "STAGE_OPENING");
  const rawLimit = readArg(args, "limit");
  const all = args.includes("--all");
  const modelIds = readArg(args, "model") ?? readArg(args, "models");
  const sampleId = Number.parseInt(readArg(args, "sample-id") ?? "1", 10);

  if (!Number.isInteger(sampleId) || sampleId < 1) {
    throw new Error("Invalid --sample-id. Use a positive integer.");
  }

  return {
    horizon,
    limit: all ? null : parseLimit(rawLimit),
    matchId: readArg(args, "match-id"),
    modelIds: modelIds ? modelIds.split(",").map((entry) => entry.trim()).filter(Boolean) : null,
    sampleId
  };
}

function readArg(args: string[], name: string): string | null {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function parseHorizon(value: string): ForecastHorizon {
  if (value === "T_24H" || value === "T_1H" || value === "STAGE_OPENING") {
    return value;
  }

  throw new Error("Invalid --horizon. Use T_24H, T_1H, or STAGE_OPENING.");
}

function parseLimit(value: string | null): number {
  if (!value) {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 104) {
    throw new Error("Invalid --limit. Use a number from 1 to 104, or pass --all.");
  }

  return parsed;
}

function selectMatches(matches: MatchRow[], args: CliArgs): MatchRow[] {
  const selected = matches
    .filter((match) => !args.matchId || match.id === args.matchId)
    .filter((match) => args.matchId || ["SCHEDULED", "TIMED"].includes(match.status))
    .sort((a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime());

  return args.limit === null ? selected : selected.slice(0, args.limit);
}

function toPromptMatch(match: MatchRow) {
  return {
    utcDate: match.utc_date,
    competition: match.competition,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    tournamentEdition: match.tournament_edition ?? "FIFA World Cup 2026",
    stage: match.stage ?? inferStage(match.competition),
    venue: match.venue,
    isKnockout: match.is_knockout ?? inferIsKnockout(match.competition)
  };
}

function inferStage(competition: string): string | null {
  if (competition.includes("GROUP_STAGE")) return "group_stage";
  if (competition.includes("LAST_32")) return "round_of_32";
  if (competition.includes("LAST_16")) return "round_of_16";
  if (competition.includes("QUARTER_FINALS")) return "quarterfinal";
  if (competition.includes("SEMI_FINALS")) return "semifinal";
  if (competition.includes("THIRD_PLACE")) return "third_place";
  if (competition.includes("FINAL")) return "final";
  return null;
}

function inferIsKnockout(competition: string): boolean | null {
  const stage = inferStage(competition);
  return stage ? stage !== "group_stage" : null;
}

function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex");
}

function getScheduledPredictionTimeUtc(match: MatchRow, horizon: ForecastHorizon): string {
  const kickoff = new Date(match.utc_date);
  const offsetMinutes = horizon === "T_24H" ? 1440 : horizon === "T_1H" ? 60 : 0;
  const scheduled = horizon === "STAGE_OPENING"
    ? new Date()
    : new Date(kickoff.getTime() - offsetMinutes * 60_000);

  return scheduled.toISOString();
}

function getTimingMetadata(
  match: MatchRow,
  horizon: ForecastHorizon,
  actualPredictionTimeUtc: string
): { minutesBeforeKickoff: number | null; timingStatus: TimingStatus } {
  const minutesBeforeKickoff = getMinutesBeforeKickoff(match, actualPredictionTimeUtc);

  if (horizon === "STAGE_OPENING") {
    return { minutesBeforeKickoff, timingStatus: "fallback" };
  }

  if (minutesBeforeKickoff === null) {
    return { minutesBeforeKickoff, timingStatus: "missed" };
  }

  const target = horizon === "T_24H" ? 1440 : 60;
  const tolerance = horizon === "T_24H" ? 90 : 20;
  const delta = minutesBeforeKickoff - target;

  if (Math.abs(delta) <= tolerance) {
    return { minutesBeforeKickoff, timingStatus: "on_time" };
  }

  return { minutesBeforeKickoff, timingStatus: delta > 0 ? "early" : "late" };
}

function getMinutesBeforeKickoff(match: MatchRow, actualPredictionTimeUtc: string): number | null {
  const kickoffMs = new Date(match.utc_date).getTime();
  const actualMs = new Date(actualPredictionTimeUtc).getTime();

  if (Number.isNaN(kickoffMs) || Number.isNaN(actualMs)) {
    return null;
  }

  return Math.round((kickoffMs - actualMs) / 60_000);
}

function parseBenchmarkPredictionContent(content: string): Partial<NewBenchmarkPredictionRow> {
  try {
    const parsed = JSON.parse(extractFirstJsonObject(content)) as Record<string, unknown>;
    const score90 = readScoreObject(parsed.most_likely_score_90);
    const scoreFull = readScoreObject(parsed.most_likely_score_full);

    return {
      home_win_90_prob: readNumber(parsed.home_win_90_prob),
      draw_90_prob: readNumber(parsed.draw_90_prob),
      away_win_90_prob: readNumber(parsed.away_win_90_prob),
      expected_home_goals_90: readNumber(parsed.expected_home_goals_90),
      expected_away_goals_90: readNumber(parsed.expected_away_goals_90),
      most_likely_score_90_home: score90.home,
      most_likely_score_90_away: score90.away,
      home_win_full_prob: readNumber(parsed.home_win_full_prob),
      draw_full_prob: readNumber(parsed.draw_full_prob),
      away_win_full_prob: readNumber(parsed.away_win_full_prob),
      most_likely_score_full_home: scoreFull.home,
      most_likely_score_full_away: scoreFull.away,
      home_advances_prob: readNullableNumber(parsed.home_advances_prob),
      away_advances_prob: readNullableNumber(parsed.away_advances_prob),
      confidence: readNumber(parsed.confidence),
      reason: typeof parsed.reason === "string" ? parsed.reason : null
    };
  } catch {
    return {};
  }
}

function extractFirstJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found.");
  }

  return trimmed.slice(start, end + 1);
}

function readScoreObject(value: unknown): { home: number | null; away: number | null } {
  if (!isRecord(value)) {
    return { home: null, away: null };
  }

  return {
    home: readInteger(value.home),
    away: readInteger(value.away)
  };
}

function readInteger(value: unknown): number | null {
  return Number.isInteger(value) ? value as number : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNullableNumber(value: unknown): number | null {
  return value === null ? null : readNumber(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      error: error.message,
      name: error.name,
      stack: error.stack
    };
  }

  return { error: String(error) };
}

function formatSuccessLog(
  match: MatchRow,
  modelName: string,
  condition: BenchmarkCondition,
  compliance: string
): string {
  return [
    `${match.home_team} vs ${match.away_team}`,
    modelName,
    `${condition.accessCondition}/${condition.promptStrategy}`,
    `search=${compliance}`
  ].join(" | ");
}

function formatFailureLog(
  match: MatchRow,
  modelName: string,
  condition: BenchmarkCondition,
  error: unknown
): string {
  const message = error instanceof Error ? error.message : String(error);
  return [
    `${match.home_team} vs ${match.away_team}`,
    modelName,
    `${condition.accessCondition}/${condition.promptStrategy}`,
    `failed=${message}`
  ].join(" | ");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
