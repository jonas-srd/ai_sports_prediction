/**
 * Purpose: Runs World Cup 2026 benchmark predictions for the 2x2 access x prompt design.
 * This writes paper-grade records to benchmark_predictions and leaves the legacy prediction
 * scripts/tables untouched for the current website.
 */
import "../load-env";
import { createHash, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
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
  SqliteDb,
  TimingStatus
} from "@llm-kicktipp/db";
import {
  buildPredictionRepairPrompt,
  buildPredictionPrompt,
  getConfiguredLlmModels,
  markRepairedValidation,
  OpenRouterClient,
  OpenRouterResponseError,
  PREDICTION_PROMPT_TEMPLATE_ID,
  validatePredictionContent
} from "@llm-kicktipp/llm";
import type {
  LlmModel,
  OpenRouterChatOptions,
  OpenRouterChatResult,
  OpenRouterTool,
  PredictionValidationResult
} from "@llm-kicktipp/llm";

export type BenchmarkAccessCondition = "closed_book" | "open_book";

export type BenchmarkPromptStrategy = "direct_score" | "probabilistic_forecast";

export type BenchmarkCondition = {
  accessCondition: BenchmarkAccessCondition;
  promptStrategy: BenchmarkPromptStrategy;
};

const CONDITIONS: BenchmarkCondition[] = [
  { accessCondition: "closed_book", promptStrategy: "direct_score" },
  { accessCondition: "closed_book", promptStrategy: "probabilistic_forecast" },
  { accessCondition: "open_book", promptStrategy: "direct_score" },
  { accessCondition: "open_book", promptStrategy: "probabilistic_forecast" }
];

const OPENROUTER_WEB_SEARCH_TOOLS: OpenRouterTool[] = [
  {
    type: "openrouter:web_search",
    parameters: {
      max_results: 3,
      max_total_results: 6,
      search_context_size: "low"
    }
  }
];
const JSON_RESPONSE_FORMAT = { type: "json_object" };
const BENCHMARK_TEMPERATURE = 0;
const BENCHMARK_TOP_P = 1;
const BENCHMARK_N = 1;
const BENCHMARK_DEFAULT_MAX_COMPLETION_TOKENS = 5000;
const BENCHMARK_MAX_TOKENS = readPositiveIntEnv(
  "OPENROUTER_BENCHMARK_MAX_COMPLETION_TOKENS",
  BENCHMARK_DEFAULT_MAX_COMPLETION_TOKENS
);
const BENCHMARK_RETRY_MAX_TOKENS = readPositiveIntEnv(
  "OPENROUTER_BENCHMARK_RETRY_MAX_COMPLETION_TOKENS",
  BENCHMARK_MAX_TOKENS
);
const BENCHMARK_REPAIR_MAX_TOKENS = readPositiveIntEnv(
  "OPENROUTER_BENCHMARK_REPAIR_MAX_COMPLETION_TOKENS",
  BENCHMARK_MAX_TOKENS
);
const DEFAULT_CONCURRENCY = 3;
const MAX_CONCURRENCY = 20;
const API_RETRY_ATTEMPTS = 3;
const API_RETRY_BASE_DELAY_MS = 2_000;

type CliArgs = {
  horizon: ForecastHorizon;
  limit: number | null;
  matchId: string | null;
  matchIds: string[] | null;
  modelIds: string[] | null;
  sampleId: number;
  groupStageOnly: boolean;
  concurrency: number;
  skipExisting: boolean;
  skipAnyExisting: boolean;
  force: boolean;
  dryRun: boolean;
  accessConditions: BenchmarkAccessCondition[] | null;
  promptStrategies: BenchmarkPromptStrategy[] | null;
};

export type BenchmarkRunnerOptions = {
  horizon: ForecastHorizon;
  matches?: MatchRow[];
  limit?: number | null;
  matchId?: string | null;
  matchIds?: string[] | null;
  modelIds?: string[] | null;
  sampleId?: number;
  groupStageOnly?: boolean;
  concurrency?: number;
  skipExisting?: boolean;
  skipAnyExisting?: boolean;
  force?: boolean;
  dryRun?: boolean;
  accessConditions?: BenchmarkAccessCondition[] | null;
  promptStrategies?: BenchmarkPromptStrategy[] | null;
  db?: SqliteDb;
};

export type BenchmarkRunResult = {
  runId: string;
  matches: number;
  models: number;
  tasks: number;
  written: number;
  skipped: number;
  failures: number;
};

export type BenchmarkCoverageSummary = {
  total: number;
  valid: number;
  missing: number;
  invalid: number;
};

type BenchmarkTask = {
  match: MatchRow;
  model: LlmModel;
  condition: BenchmarkCondition;
};

type ExistingPredictionStatus = {
  validation_status: string | null;
  is_valid_for_scoring: number;
} | null;

type BenchmarkTaskResult = "written" | "skipped" | "failed";

async function main() {
  const args = parseCliArgs(process.argv.slice(2));

  await runBenchmarkPredictions({
    horizon: args.horizon,
    limit: args.limit,
    matchId: args.matchId,
    matchIds: args.matchIds,
    modelIds: args.modelIds,
    sampleId: args.sampleId,
    groupStageOnly: args.groupStageOnly,
    concurrency: args.concurrency,
    skipExisting: args.skipExisting,
    skipAnyExisting: args.skipAnyExisting,
    force: args.force,
    dryRun: args.dryRun,
    accessConditions: args.accessConditions,
    promptStrategies: args.promptStrategies
  });
}

export async function runBenchmarkPredictions(options: BenchmarkRunnerOptions): Promise<BenchmarkRunResult> {
  const db = options.db ?? createSqliteDb();
  const shouldCloseDb = !options.db;
  const allModels = getConfiguredLlmModels();
  const activeModels = allModels
    .filter((model) => model.active)
    .filter((model) => !options.modelIds || options.modelIds.includes(model.id));

  if (options.modelIds && activeModels.length === 0) {
    throw new Error(`No configured active models matched: ${options.modelIds.join(", ")}`);
  }

  await upsertModels(db, allModels);

  const matches = selectMatches(options.matches ?? await listMatches(db), {
    horizon: options.horizon,
    limit: options.matches ? null : options.limit ?? null,
    matchId: options.matchId ?? null,
    matchIds: options.matchIds ?? null,
    modelIds: options.modelIds ?? null,
    sampleId: options.sampleId ?? 1,
    groupStageOnly: options.groupStageOnly ?? false,
    concurrency: options.concurrency ?? DEFAULT_CONCURRENCY,
    skipExisting: options.skipExisting ?? false,
    skipAnyExisting: options.skipAnyExisting ?? false,
    force: options.force ?? false,
    dryRun: options.dryRun ?? false,
    accessConditions: options.accessConditions ?? null,
    promptStrategies: options.promptStrategies ?? null
  });
  const conditions = selectConditions({
    accessConditions: options.accessConditions ?? null,
    promptStrategies: options.promptStrategies ?? null
  });
  if (conditions.length === 0) {
    throw new Error("No benchmark conditions selected. Check --access and --prompt-strategy.");
  }
  const tasks = createBenchmarkTasks(matches, activeModels, conditions);
  const runId = randomUUID();
  const runnerArgs: CliArgs = {
    horizon: options.horizon,
    limit: options.limit ?? null,
    matchId: options.matchId ?? null,
    matchIds: options.matchIds ?? null,
    modelIds: options.modelIds ?? null,
    sampleId: options.sampleId ?? 1,
    groupStageOnly: options.groupStageOnly ?? false,
    concurrency: options.concurrency ?? DEFAULT_CONCURRENCY,
    skipExisting: options.skipExisting ?? false,
    skipAnyExisting: options.skipAnyExisting ?? false,
    force: options.force ?? false,
    dryRun: options.dryRun ?? false,
    accessConditions: options.accessConditions ?? null,
    promptStrategies: options.promptStrategies ?? null
  };

  console.log(`Benchmark run: ${runId}`);
  console.log(`Horizon: ${options.horizon}`);
  console.log(`Found ${matches.length} matches and ${activeModels.length} active models.`);
  console.log(`Conditions: ${conditions.map((condition) => `${condition.accessCondition}/${condition.promptStrategy}`).join(", ")}`);
  console.log(`Tasks: ${tasks.length}; concurrency: ${runnerArgs.concurrency}`);
  console.log(`Skip existing: ${runnerArgs.force ? "off (force)" : runnerArgs.skipAnyExisting ? "any predictions" : runnerArgs.skipExisting ? "valid predictions" : "off"}`);
  console.log(`Dry run: ${runnerArgs.dryRun ? "yes" : "no"}`);
  console.log(`SQLite DB: ${getDefaultDbPath()}`);

  const initialCoverage = inspectBenchmarkTaskCoverage(db, tasks, runnerArgs);
  console.log(`Existing prediction coverage: valid=${initialCoverage.valid}; invalid=${initialCoverage.invalid}; missing=${initialCoverage.missing}; total=${initialCoverage.total}`);

  if (runnerArgs.dryRun || tasks.length === 0) {
    if (shouldCloseDb) db.close();
    return {
      runId,
      matches: matches.length,
      models: activeModels.length,
      tasks: tasks.length,
      written: 0,
      skipped: tasks.length,
      failures: 0
    };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    if (shouldCloseDb) db.close();
    throw new Error("Missing OPENROUTER_API_KEY. Add it to .env, not to frontend code.");
  }

  const openRouter = new OpenRouterClient({
    apiKey,
    siteUrl: process.env.OPENROUTER_SITE_URL,
    siteName: process.env.OPENROUTER_SITE_NAME
  });

  const taskResults: BenchmarkTaskResult[] = [];
  await runWithConcurrency(tasks, runnerArgs.concurrency, async (task) => {
    const result = await runBenchmarkTask({
      db,
      openRouter,
      runId,
      args: runnerArgs,
      task
    });
    taskResults.push(result);
  });

  const finalCoverage = inspectBenchmarkTaskCoverage(db, tasks, runnerArgs);
  console.log(`Post-run prediction coverage: valid=${finalCoverage.valid}; invalid=${finalCoverage.invalid}; missing=${finalCoverage.missing}; total=${finalCoverage.total}`);

  if (shouldCloseDb) db.close();

  return {
    runId,
    matches: matches.length,
    models: activeModels.length,
    tasks: tasks.length,
    written: taskResults.filter((result) => result === "written").length,
    skipped: taskResults.filter((result) => result === "skipped").length,
    failures: taskResults.filter((result) => result === "failed").length
  };
}

async function runBenchmarkTask(options: {
  db: SqliteDb;
  openRouter: OpenRouterClient;
  runId: string;
  args: CliArgs;
  task: BenchmarkTask;
}): Promise<BenchmarkTaskResult> {
  const { db, openRouter, runId, args, task } = options;
  const { match, model, condition } = task;
  const existing = getExistingBenchmarkPredictionStatus(db, task, args);

  if (!args.force && args.skipAnyExisting && existing) {
    console.log(formatSkippedLog(match, model.name, condition, "existing"));
    return "skipped";
  }

  if (!args.force && args.skipExisting && existing?.is_valid_for_scoring === 1) {
    console.log(formatSkippedLog(match, model.name, condition, existing.validation_status ?? "valid"));
    return "skipped";
  }

  const prompt = buildPredictionPrompt({
    match: toPromptMatch(match),
    accessCondition: condition.accessCondition,
    promptStrategy: condition.promptStrategy
  });
  const promptHash = hashPrompt(prompt);
  const scheduledPredictionTimeUtc = getScheduledPredictionTimeUtc(match, args.horizon);
  const tools = condition.accessCondition === "open_book" ? OPENROUTER_WEB_SEARCH_TOOLS : undefined;

  try {
    let completion = await createChatCompletionWithBackoff(openRouter, model.id, prompt, {
      temperature: BENCHMARK_TEMPERATURE,
      topP: BENCHMARK_TOP_P,
      n: BENCHMARK_N,
      maxTokens: BENCHMARK_MAX_TOKENS,
      responseFormat: JSON_RESPONSE_FORMAT,
      retryContentFailures: false,
      tools
    }, formatTaskPrefix(match, model.name, condition));
    const matchIsKnockout = isMatchKnockout(match);
    let initialValidation = validatePredictionContent(completion.content, {
      isKnockout: matchIsKnockout
    });

    if (shouldRetryCompletionAfterValidation(initialValidation, completion)) {
      console.warn(formatRetryLog(match, model.name, condition, initialValidation.status, completion));
      completion = await createChatCompletionWithBackoff(openRouter, model.id, prompt, {
        temperature: BENCHMARK_TEMPERATURE,
        topP: BENCHMARK_TOP_P,
        n: BENCHMARK_N,
        maxTokens: BENCHMARK_RETRY_MAX_TOKENS,
        responseFormat: JSON_RESPONSE_FORMAT,
        retryContentFailures: false,
        tools
      }, formatTaskPrefix(match, model.name, condition));
      initialValidation = validatePredictionContent(completion.content, {
        isKnockout: matchIsKnockout
      });
    }

    const actualPredictionTimeUtc = new Date().toISOString();
    const timing = getTimingMetadata(match, args.horizon, actualPredictionTimeUtc);
    const repair = initialValidation.isValidForScoring
      ? null
      : await attemptRepair(openRouter, model.id, completion.content, initialValidation, matchIsKnockout);
    const finalValidation = repair?.validation ?? initialValidation;

    await upsertBenchmarkPrediction(db, {
      run_id: runId,
      match_id: match.id,
      predictor_type: "llm",
      predictor_id: model.id,
      provider: "openrouter",
      model_id: model.id,
      model_version: model.model_version,
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
      max_tokens: completion.maxCompletionTokens,
      latency_ms: completion.latencyMs,
      input_tokens: completion.inputTokens,
      output_tokens: completion.outputTokens,
      cost_usd: completion.costUsd,
      ...toValidationStorageFields(
        finalValidation,
        repair !== null,
        repair?.rawResponse ?? null
      ),
      tools_enabled: completion.toolMetadata.toolsEnabled,
      tool_type: completion.toolMetadata.toolType,
      tool_calls_observed: completion.toolMetadata.toolCallsObserved,
      num_tool_calls: completion.toolMetadata.numToolCalls,
      tool_trace_available: completion.toolMetadata.toolTraceAvailable,
      tool_trace: completion.toolMetadata.toolTrace,
      open_book_compliance: completion.toolMetadata.openBookCompliance
    });

    console.log(formatSuccessLog(
      match,
      model.name,
      condition,
      completion.toolMetadata.openBookCompliance,
      finalValidation.status
    ));
    return "written";
  } catch (error) {
    const failedAt = new Date().toISOString();
    await upsertBenchmarkPrediction(db, {
      run_id: runId,
      match_id: match.id,
      predictor_type: "llm",
      predictor_id: model.id,
      provider: "openrouter",
      model_id: model.id,
      model_version: model.model_version,
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
      validation_status: getApiFailureStatus(error),
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
    return "failed";
  }
}

function parseCliArgs(args: string[]): CliArgs {
  const horizon = parseHorizon(readArg(args, "horizon") ?? "STAGE_OPENING");
  const rawLimit = readArg(args, "limit");
  const all = args.includes("--all");
  const groupStageOnly = args.includes("--group-stage");
  const modelIds = readArg(args, "model") ?? readArg(args, "models");
  const matchIds = readArg(args, "match-ids");
  const sampleId = Number.parseInt(readArg(args, "sample-id") ?? "1", 10);
  const skipExisting = args.includes("--skip-existing");
  const skipAnyExisting = args.includes("--skip-any-existing");
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");

  if (!Number.isInteger(sampleId) || sampleId < 1) {
    throw new Error("Invalid --sample-id. Use a positive integer.");
  }

  if (skipExisting && skipAnyExisting) {
    throw new Error("Use either --skip-existing or --skip-any-existing, not both.");
  }

  return {
    horizon,
    limit: all || (groupStageOnly && rawLimit === null) ? null : parseLimit(rawLimit),
    matchId: readArg(args, "match-id"),
    matchIds: matchIds ? parseCommaSeparated(matchIds) : null,
    modelIds: modelIds ? modelIds.split(",").map((entry) => entry.trim()).filter(Boolean) : null,
    sampleId,
    groupStageOnly,
    concurrency: parseConcurrency(readArg(args, "concurrency")),
    skipExisting,
    skipAnyExisting,
    force,
    dryRun,
    accessConditions: parseAccessConditions(readArg(args, "access")),
    promptStrategies: parsePromptStrategies(readArg(args, "prompt-strategy") ?? readArg(args, "strategy"))
  };
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function readArg(args: string[], name: string): string | null {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function parseHorizon(value: string): ForecastHorizon {
  if (value === "T_24H" || value === "T_2H" || value === "STAGE_OPENING") {
    return value;
  }

  throw new Error("Invalid --horizon. Use T_24H, T_2H, or STAGE_OPENING.");
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

function parseConcurrency(value: string | null): number {
  if (!value) {
    return DEFAULT_CONCURRENCY;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_CONCURRENCY) {
    throw new Error(`Invalid --concurrency. Use a number from 1 to ${MAX_CONCURRENCY}.`);
  }

  return parsed;
}

function parseAccessConditions(value: string | null): BenchmarkAccessCondition[] | null {
  if (!value) {
    return null;
  }

  const entries = parseCommaSeparated(value);
  for (const entry of entries) {
    if (entry !== "closed_book" && entry !== "open_book") {
      throw new Error("Invalid --access. Use closed_book, open_book, or a comma-separated combination.");
    }
  }

  return entries as BenchmarkAccessCondition[];
}

function parsePromptStrategies(value: string | null): BenchmarkPromptStrategy[] | null {
  if (!value) {
    return null;
  }

  const entries = parseCommaSeparated(value);
  for (const entry of entries) {
    if (entry !== "direct_score" && entry !== "probabilistic_forecast") {
      throw new Error(
        "Invalid --prompt-strategy. Use direct_score, probabilistic_forecast, or a comma-separated combination."
      );
    }
  }

  return entries as BenchmarkPromptStrategy[];
}

function parseCommaSeparated(value: string): string[] {
  const entries = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (entries.length === 0) {
    throw new Error("Comma-separated CLI options must include at least one value.");
  }

  return Array.from(new Set(entries));
}

function selectMatches(matches: MatchRow[], args: CliArgs): MatchRow[] {
  const selected = matches
    .filter((match) => !args.matchId || match.id === args.matchId)
    .filter((match) => !args.matchIds || args.matchIds.includes(match.id))
    .filter((match) => args.matchId || args.matchIds || ["SCHEDULED", "TIMED"].includes(match.status))
    .filter((match) => !args.groupStageOnly || isGroupStageMatch(match))
    .sort((a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime());

  return args.limit === null ? selected : selected.slice(0, args.limit);
}

function selectConditions(args: Pick<CliArgs, "accessConditions" | "promptStrategies">): BenchmarkCondition[] {
  return CONDITIONS.filter((condition) => {
    const accessMatches = !args.accessConditions || args.accessConditions.includes(condition.accessCondition);
    const strategyMatches = !args.promptStrategies || args.promptStrategies.includes(condition.promptStrategy);
    return accessMatches && strategyMatches;
  });
}

function createBenchmarkTasks(
  matches: MatchRow[],
  models: LlmModel[],
  conditions: BenchmarkCondition[]
): BenchmarkTask[] {
  const tasks: BenchmarkTask[] = [];

  for (const match of matches) {
    for (const model of models) {
      for (const condition of conditions) {
        tasks.push({ match, model, condition });
      }
    }
  }

  return tasks;
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
    isKnockout: isMatchKnockout(match)
  };
}

function isMatchKnockout(match: MatchRow): boolean {
  return Boolean(match.is_knockout ?? inferIsKnockout(match.competition) ?? false);
}

function isGroupStageMatch(match: MatchRow): boolean {
  return (match.stage ?? inferStage(match.competition)) === "group_stage";
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

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    for (;;) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      await worker(items[currentIndex]);
    }
  });

  await Promise.all(workers);
}

function getExistingBenchmarkPredictionStatus(
  db: SqliteDb,
  task: BenchmarkTask,
  args: CliArgs
): ExistingPredictionStatus {
  const row = db.prepare(`
    select validation_status, is_valid_for_scoring
    from benchmark_predictions
    where match_id = @match_id
      and predictor_type = 'llm'
      and predictor_id = @predictor_id
      and forecast_horizon = @forecast_horizon
      and access_condition = @access_condition
      and prompt_strategy = @prompt_strategy
      and sample_id = @sample_id
  `).get({
    match_id: task.match.id,
    predictor_id: task.model.id,
    forecast_horizon: args.horizon,
    access_condition: task.condition.accessCondition,
    prompt_strategy: task.condition.promptStrategy,
    sample_id: args.sampleId
  }) as ExistingPredictionStatus | undefined;

  return row ?? null;
}

export async function inspectBenchmarkPredictionCoverage(
  db: SqliteDb,
  options: Omit<BenchmarkRunnerOptions, "db" | "dryRun" | "force" | "skipExisting" | "skipAnyExisting" | "concurrency">
): Promise<BenchmarkCoverageSummary> {
  const allModels = getConfiguredLlmModels();
  const activeModels = allModels
    .filter((model) => model.active)
    .filter((model) => !options.modelIds || options.modelIds.includes(model.id));
  const matches = selectMatches(options.matches ?? await listMatches(db), {
    horizon: options.horizon,
    limit: options.matches ? null : options.limit ?? null,
    matchId: options.matchId ?? null,
    matchIds: options.matchIds ?? null,
    modelIds: options.modelIds ?? null,
    sampleId: options.sampleId ?? 1,
    groupStageOnly: options.groupStageOnly ?? false,
    concurrency: DEFAULT_CONCURRENCY,
    skipExisting: true,
    skipAnyExisting: false,
    force: false,
    dryRun: false,
    accessConditions: options.accessConditions ?? null,
    promptStrategies: options.promptStrategies ?? null
  });
  const conditions = selectConditions({
    accessConditions: options.accessConditions ?? null,
    promptStrategies: options.promptStrategies ?? null
  });
  const tasks = createBenchmarkTasks(matches, activeModels, conditions);

  return inspectBenchmarkTaskCoverage(db, tasks, {
    horizon: options.horizon,
    sampleId: options.sampleId ?? 1
  });
}

function inspectBenchmarkTaskCoverage(
  db: SqliteDb,
  tasks: BenchmarkTask[],
  args: Pick<CliArgs, "horizon" | "sampleId">
): BenchmarkCoverageSummary {
  let valid = 0;
  let invalid = 0;
  let missing = 0;

  for (const task of tasks) {
    const existing = getExistingBenchmarkPredictionStatus(db, task, args as CliArgs);
    if (!existing) {
      missing += 1;
    } else if (existing.is_valid_for_scoring === 1) {
      valid += 1;
    } else {
      invalid += 1;
    }
  }

  return {
    total: tasks.length,
    valid,
    missing,
    invalid
  };
}

async function createChatCompletionWithBackoff(
  openRouter: OpenRouterClient,
  modelId: string,
  prompt: string,
  options: OpenRouterChatOptions,
  context: string
): Promise<OpenRouterChatResult> {
  for (let attempt = 1; attempt <= API_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await openRouter.createChatCompletion(modelId, prompt, options);
    } catch (error) {
      if (attempt >= API_RETRY_ATTEMPTS || !isRetryableApiError(error)) {
        throw error;
      }

      const delayMs = API_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      console.warn(`${context} | api_retry=${attempt} | wait_ms=${delayMs} | error=${errorMessage(error)}`);
      await sleep(delayMs);
    }
  }

  throw new Error("Unexpected API retry loop exit.");
}

function isRetryableApiError(error: unknown): boolean {
  if (error instanceof OpenRouterResponseError) {
    if (
      (error.code === "missing_content" || error.code === "empty_content")
      && (
        error.finishReason === "length"
        || error.finishReason === "max_tokens"
        || error.finishReason === "tool_calls"
      )
    ) {
      return true;
    }

    return error.status === 429 || error.status === null || error.status >= 500;
  }

  const message = errorMessage(error).toLowerCase();
  return message.includes("timeout")
    || message.includes("timed out")
    || message.includes("fetch failed")
    || message.includes("econnreset")
    || message.includes("rate limit")
    || message.includes("429");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getScheduledPredictionTimeUtc(match: MatchRow, horizon: ForecastHorizon): string {
  const kickoff = new Date(match.utc_date);
  const offsetMinutes = horizon === "T_24H" ? 1440 : horizon === "T_2H" ? 120 : 0;
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

  const target = horizon === "T_24H" ? 1440 : 120;
  const tolerance = horizon === "T_24H" ? 90 : 60;
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

async function attemptRepair(
  openRouter: OpenRouterClient,
  modelId: string,
  previousResponse: string,
  initialValidation: PredictionValidationResult,
  isKnockout: boolean
): Promise<{ validation: PredictionValidationResult; rawResponse: unknown }> {
  const repairPrompt = buildPredictionRepairPrompt({
    previousResponse,
    validationErrors: initialValidation.validationErrors
  });

  try {
    const completion = await createChatCompletionWithBackoff(openRouter, modelId, repairPrompt, {
      temperature: BENCHMARK_TEMPERATURE,
      topP: BENCHMARK_TOP_P,
      n: BENCHMARK_N,
      maxTokens: BENCHMARK_REPAIR_MAX_TOKENS,
      responseFormat: JSON_RESPONSE_FORMAT,
      retryContentFailures: false
    }, `repair | ${modelId}`);
    let repairedValidation = validatePredictionContent(completion.content, { isKnockout });
    let repairRawResponse = completion.rawResponse;

    if (shouldRetryCompletionAfterValidation(repairedValidation, completion)) {
      const retryCompletion = await createChatCompletionWithBackoff(openRouter, modelId, repairPrompt, {
        temperature: BENCHMARK_TEMPERATURE,
        topP: BENCHMARK_TOP_P,
        n: BENCHMARK_N,
        maxTokens: BENCHMARK_RETRY_MAX_TOKENS,
        responseFormat: JSON_RESPONSE_FORMAT,
        retryContentFailures: false
      }, `repair | ${modelId}`);
      repairedValidation = validatePredictionContent(retryCompletion.content, { isKnockout });
      repairRawResponse = retryCompletion.rawResponse;
    }

    const validation = markRepairedValidation(repairedValidation.isValidForScoring
      ? repairedValidation
      : {
          ...repairedValidation,
          validationErrors: [
            ...initialValidation.validationErrors.map((error) => `initial_${error}`),
            ...repairedValidation.validationErrors.map((error) => `repair_${error}`)
          ]
        });

    return {
      validation,
      rawResponse: repairRawResponse
    };
  } catch (error) {
    const validation = markRepairedValidation({
      ...initialValidation,
      validationErrors: [
        ...initialValidation.validationErrors,
        `repair_api_error: ${errorMessage(error)}`
      ]
    });

    return {
      validation,
      rawResponse: serializeError(error)
    };
  }
}

function shouldRetryCompletionAfterValidation(
  validation: PredictionValidationResult,
  completion: OpenRouterChatResult
): boolean {
  if (validation.isValidForScoring) {
    return false;
  }

  if (validation.status !== "invalid_json" && validation.status !== "invalid_schema") {
    return false;
  }

  return isLikelyTruncatedCompletion(completion);
}

function isLikelyTruncatedCompletion(completion: OpenRouterChatResult): boolean {
  if (completion.finishReason === "length" || completion.finishReason === "max_tokens") {
    return true;
  }

  return completion.outputTokens !== null
    && completion.outputTokens >= completion.maxCompletionTokens * 0.9;
}

function toValidationStorageFields(
  validation: PredictionValidationResult,
  repairAttempted: boolean,
  repairRawResponse: unknown
): Partial<NewBenchmarkPredictionRow> {
  const fields = validation.isValidForScoring && validation.fields
    ? {
        home_win_90_prob: validation.fields.home_win_90_prob,
        draw_90_prob: validation.fields.draw_90_prob,
        away_win_90_prob: validation.fields.away_win_90_prob,
        expected_home_goals_90: validation.fields.expected_home_goals_90,
        expected_away_goals_90: validation.fields.expected_away_goals_90,
        most_likely_score_90_home: validation.fields.most_likely_score_90_home,
        most_likely_score_90_away: validation.fields.most_likely_score_90_away,
        home_win_full_prob: validation.fields.home_win_full_prob,
        draw_full_prob: validation.fields.draw_full_prob,
        away_win_full_prob: validation.fields.away_win_full_prob,
        most_likely_score_full_home: validation.fields.most_likely_score_full_home,
        most_likely_score_full_away: validation.fields.most_likely_score_full_away,
        home_advances_prob: validation.fields.home_advances_prob,
        away_advances_prob: validation.fields.away_advances_prob,
        confidence: validation.fields.confidence,
        reason: validation.fields.reason
      }
    : {};

  return {
    ...fields,
    validation_status: validation.status,
    is_valid_for_scoring: validation.isValidForScoring,
    repair_attempted: repairAttempted,
    repair_raw_response: repairRawResponse,
    normalization_applied: validation.normalizationApplied,
    normalized_fields: validation.normalizedFields,
    validation_errors: validation.validationErrors,
    prob_sum_90_original: validation.probSum90Original,
    prob_sum_90_final: validation.probSum90Final,
    prob_sum_full_original: validation.probSumFullOriginal,
    prob_sum_full_final: validation.probSumFullFinal,
    prob_sum_advancement_original: validation.probSumAdvancementOriginal,
    prob_sum_advancement_final: validation.probSumAdvancementFinal
  };
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getApiFailureStatus(error: unknown): "api_error" | "timeout" {
  const message = errorMessage(error).toLowerCase();
  const name = error instanceof Error ? error.name.toLowerCase() : "";

  return name.includes("timeout")
    || name.includes("abort")
    || message.includes("timeout")
    || message.includes("timed out")
    ? "timeout"
    : "api_error";
}

function formatSuccessLog(
  match: MatchRow,
  modelName: string,
  condition: BenchmarkCondition,
  compliance: string,
  validationStatus: string
): string {
  return [
    `${match.home_team} vs ${match.away_team}`,
    modelName,
    `${condition.accessCondition}/${condition.promptStrategy}`,
    `search=${compliance}`,
    `validation=${validationStatus}`
  ].join(" | ");
}

function formatSkippedLog(
  match: MatchRow,
  modelName: string,
  condition: BenchmarkCondition,
  reason: string
): string {
  return [
    formatTaskPrefix(match, modelName, condition),
    `skipped=${reason}`
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

function formatTaskPrefix(
  match: MatchRow,
  modelName: string,
  condition: BenchmarkCondition
): string {
  return [
    `${match.home_team} vs ${match.away_team}`,
    modelName,
    `${condition.accessCondition}/${condition.promptStrategy}`
  ].join(" | ");
}

function formatRetryLog(
  match: MatchRow,
  modelName: string,
  condition: BenchmarkCondition,
  validationStatus: string,
  completion: OpenRouterChatResult
): string {
  return [
    `${match.home_team} vs ${match.away_team}`,
    modelName,
    `${condition.accessCondition}/${condition.promptStrategy}`,
    `retrying=${validationStatus}`,
    `finish_reason=${completion.finishReason ?? "unknown"}`,
    `output_tokens=${completion.outputTokens ?? "unknown"}`,
    `max_completion_tokens=${completion.maxCompletionTokens}`
  ].join(" | ");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
