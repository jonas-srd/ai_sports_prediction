/**
 * Purpose: Runs one-time STAGE_OPENING World Cup 2026 special-question predictions.
 * This job deliberately builds context only from official fixture/group data, never from stored predictions.
 */
import "../load-env";
import { createHash } from "node:crypto";
import {
  createSpecialPredictionRun,
  createSqliteDb,
  getDefaultDbPath,
  getExistingSpecialPredictionStatus,
  listMatches,
  upsertModels,
  upsertSpecialPrediction
} from "@llm-kicktipp/db";
import type {
  ForecastHorizon,
  MatchRow,
  NewSpecialPredictionRow,
  SqliteDb
} from "@llm-kicktipp/db";
import {
  buildSpecialPredictionPrompt,
  buildSpecialPredictionRepairPrompt,
  getConfiguredLlmModels,
  getSpecialQuestionById,
  markRepairedSpecialValidation,
  OpenRouterClient,
  OpenRouterResponseError,
  SPECIAL_GROUP_NAMES,
  SPECIAL_PREDICTION_PROMPT_TEMPLATE_ID,
  SPECIAL_PREDICTION_STAGE,
  SPECIAL_QUESTIONS,
  validateSpecialPredictionContent
} from "@llm-kicktipp/llm";
import type {
  AccessCondition,
  LlmModel,
  OpenRouterChatOptions,
  OpenRouterChatResult,
  OpenRouterTool,
  PromptStrategy,
  SpecialCandidate,
  SpecialFixtureContext,
  SpecialGroupContext,
  SpecialPredictionValidationResult,
  SpecialQuestionDefinition,
  SpecialQuestionId,
  SpecialTournamentContext
} from "@llm-kicktipp/llm";

type SpecialCondition = {
  accessCondition: AccessCondition;
  promptStrategy: PromptStrategy;
};

type CliArgs = {
  modelIds: string[] | null;
  questionIds: SpecialQuestionId[] | null;
  sampleId: number;
  concurrency: number;
  force: boolean;
  skipAnyExisting: boolean;
  accessConditions: AccessCondition[] | null;
  promptStrategies: PromptStrategy[] | null;
};

type SpecialTask = {
  question: SpecialQuestionDefinition;
  candidates: SpecialCandidate[];
  model: LlmModel;
  condition: SpecialCondition;
};

const CONDITIONS: SpecialCondition[] = [
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
      max_total_results: 8,
      search_context_size: "low"
    }
  }
];
const JSON_RESPONSE_FORMAT = { type: "json_object" };
const SPECIAL_TEMPERATURE = 0;
const SPECIAL_TOP_P = 1;
const SPECIAL_N = 1;
const SPECIAL_DEFAULT_MAX_COMPLETION_TOKENS = 9000;
const SPECIAL_MAX_TOKENS = readPositiveIntEnv(
  "OPENROUTER_SPECIAL_MAX_COMPLETION_TOKENS",
  SPECIAL_DEFAULT_MAX_COMPLETION_TOKENS
);
const SPECIAL_RETRY_MAX_TOKENS = readPositiveIntEnv(
  "OPENROUTER_SPECIAL_RETRY_MAX_COMPLETION_TOKENS",
  SPECIAL_MAX_TOKENS
);
const SPECIAL_REPAIR_MAX_TOKENS = readPositiveIntEnv(
  "OPENROUTER_SPECIAL_REPAIR_MAX_COMPLETION_TOKENS",
  SPECIAL_MAX_TOKENS
);
const DEFAULT_CONCURRENCY = 2;
const MAX_CONCURRENCY = 20;
const API_RETRY_ATTEMPTS = 3;
const API_RETRY_BASE_DELAY_MS = 2_000;
const SPECIAL_HORIZON: ForecastHorizon = SPECIAL_PREDICTION_STAGE;

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

  const matches = await listMatches(db);
  const context = buildSpecialTournamentContext(matches);
  const questions = selectQuestions(args);
  const conditions = selectConditions(args);
  const tasks = createSpecialTasks(questions, activeModels, conditions, context);
  const openRouter = new OpenRouterClient({
    apiKey,
    siteUrl: process.env.OPENROUTER_SITE_URL,
    siteName: process.env.OPENROUTER_SITE_NAME
  });
  const runId = createSpecialPredictionRun(db, {
    forecast_horizon: SPECIAL_HORIZON,
    sample_id: args.sampleId
  });

  console.log(`Special prediction run: ${runId}`);
  console.log(`Horizon: ${SPECIAL_HORIZON}`);
  console.log(`Questions: ${questions.length}; models: ${activeModels.length}; tasks: ${tasks.length}`);
  console.log(`Conditions: ${conditions.map((condition) => `${condition.accessCondition}/${condition.promptStrategy}`).join(", ")}`);
  console.log(`Concurrency: ${args.concurrency}`);
  console.log(`Existing behavior: ${args.force ? "force overwrite" : args.skipAnyExisting ? "skip any existing" : "skip valid, retry failed"}`);
  console.log(`SQLite DB: ${getDefaultDbPath()}`);

  await runWithConcurrency(tasks, args.concurrency, (task) => runSpecialTask({
    db,
    openRouter,
    runId,
    args,
    context,
    task
  }));

  db.close();
}

async function runSpecialTask(options: {
  db: SqliteDb;
  openRouter: OpenRouterClient;
  runId: string;
  args: CliArgs;
  context: SpecialTournamentContext;
  task: SpecialTask;
}): Promise<void> {
  const { db, openRouter, runId, args, context, task } = options;
  const { question, candidates, model, condition } = task;
  const existing = getExistingSpecialPredictionStatus(db, {
    question_id: question.id,
    predictor_type: "llm",
    predictor_id: model.id,
    forecast_horizon: SPECIAL_HORIZON,
    access_condition: condition.accessCondition,
    prompt_strategy: condition.promptStrategy,
    sample_id: args.sampleId
  });

  if (!args.force && args.skipAnyExisting && existing) {
    console.log(formatSkippedLog(question, model.name, condition, "existing"));
    return;
  }

  if (!args.force && existing?.is_valid_for_scoring === 1) {
    console.log(formatSkippedLog(question, model.name, condition, existing.validation_status ?? "valid"));
    return;
  }

  const prompt = buildSpecialPredictionPrompt({
    question,
    candidates,
    context,
    accessCondition: condition.accessCondition,
    promptStrategy: condition.promptStrategy,
    stage: SPECIAL_PREDICTION_STAGE
  });
  const promptHash = hashPrompt(prompt);
  const tools = condition.accessCondition === "open_book" ? OPENROUTER_WEB_SEARCH_TOOLS : undefined;

  try {
    let completion = await createChatCompletionWithBackoff(openRouter, model.id, prompt, {
      temperature: SPECIAL_TEMPERATURE,
      topP: SPECIAL_TOP_P,
      n: SPECIAL_N,
      maxTokens: SPECIAL_MAX_TOKENS,
      responseFormat: JSON_RESPONSE_FORMAT,
      retryContentFailures: false,
      tools
    }, formatTaskPrefix(question, model.name, condition));
    let initialValidation = validateSpecialPredictionContent(completion.content, {
      question,
      candidates,
      stage: SPECIAL_PREDICTION_STAGE
    });

    if (shouldRetryCompletionAfterValidation(initialValidation, completion)) {
      console.warn(formatRetryLog(question, model.name, condition, initialValidation.status, completion));
      completion = await createChatCompletionWithBackoff(openRouter, model.id, prompt, {
        temperature: SPECIAL_TEMPERATURE,
        topP: SPECIAL_TOP_P,
        n: SPECIAL_N,
        maxTokens: SPECIAL_RETRY_MAX_TOKENS,
        responseFormat: JSON_RESPONSE_FORMAT,
        retryContentFailures: false,
        tools
      }, formatTaskPrefix(question, model.name, condition));
      initialValidation = validateSpecialPredictionContent(completion.content, {
        question,
        candidates,
        stage: SPECIAL_PREDICTION_STAGE
      });
    }

    const repair = initialValidation.isValidForScoring
      ? null
      : await attemptRepair(openRouter, model.id, completion.content, initialValidation, question, candidates);
    const finalValidation = repair?.validation ?? initialValidation;
    const actualPredictionTimeUtc = new Date().toISOString();

    await upsertSpecialPrediction(db, {
      run_id: runId,
      question_id: question.id,
      question_label: question.label,
      prediction_type: question.predictionType,
      k: question.k ?? null,
      predictor_type: "llm",
      predictor_id: model.id,
      provider: "openrouter",
      model_id: model.id,
      model_version: model.model_version,
      access_condition: condition.accessCondition,
      prompt_strategy: condition.promptStrategy,
      forecast_horizon: SPECIAL_HORIZON,
      sample_id: args.sampleId,
      actual_prediction_time_utc: actualPredictionTimeUtc,
      prompt_template_id: SPECIAL_PREDICTION_PROMPT_TEMPLATE_ID,
      prompt_hash: promptHash,
      raw_prompt: prompt,
      raw_response: completion.rawResponse,
      response_id: completion.responseId,
      temperature: SPECIAL_TEMPERATURE,
      top_p: SPECIAL_TOP_P,
      max_tokens: completion.maxCompletionTokens,
      latency_ms: completion.latencyMs,
      input_tokens: completion.inputTokens,
      output_tokens: completion.outputTokens,
      cost_usd: completion.costUsd,
      ...toSpecialValidationStorageFields(finalValidation, repair !== null, repair?.rawResponse ?? null),
      tools_enabled: completion.toolMetadata.toolsEnabled,
      tool_type: completion.toolMetadata.toolType,
      tool_calls_observed: completion.toolMetadata.toolCallsObserved,
      num_tool_calls: completion.toolMetadata.numToolCalls,
      tool_trace_available: completion.toolMetadata.toolTraceAvailable,
      tool_trace: completion.toolMetadata.toolTrace,
      open_book_compliance: completion.toolMetadata.openBookCompliance
    });

    console.log(formatSuccessLog(
      question,
      model.name,
      condition,
      completion.toolMetadata.openBookCompliance,
      finalValidation.status
    ));
  } catch (error) {
    const failedAt = new Date().toISOString();
    await upsertSpecialPrediction(db, {
      run_id: runId,
      question_id: question.id,
      question_label: question.label,
      prediction_type: question.predictionType,
      k: question.k ?? null,
      predictor_type: "llm",
      predictor_id: model.id,
      provider: "openrouter",
      model_id: model.id,
      model_version: model.model_version,
      access_condition: condition.accessCondition,
      prompt_strategy: condition.promptStrategy,
      forecast_horizon: SPECIAL_HORIZON,
      sample_id: args.sampleId,
      actual_prediction_time_utc: failedAt,
      prompt_template_id: SPECIAL_PREDICTION_PROMPT_TEMPLATE_ID,
      prompt_hash: promptHash,
      raw_prompt: prompt,
      raw_response: serializeError(error),
      parsed_response: null,
      temperature: SPECIAL_TEMPERATURE,
      top_p: SPECIAL_TOP_P,
      max_tokens: SPECIAL_MAX_TOKENS,
      validation_status: getApiFailureStatus(error),
      is_valid_for_scoring: false,
      validation_errors: [errorMessage(error)],
      tools_enabled: condition.accessCondition === "open_book",
      tool_type: condition.accessCondition === "open_book" ? "openrouter:web_search" : null,
      tool_calls_observed: condition.accessCondition === "open_book" ? false : null,
      num_tool_calls: condition.accessCondition === "open_book" ? 0 : null,
      tool_trace_available: false,
      tool_trace: null,
      open_book_compliance: condition.accessCondition === "open_book" ? "unknown" : "not_applicable"
    });

    console.error(formatFailureLog(question, model.name, condition, error));
  }
}

function buildSpecialTournamentContext(matches: MatchRow[]): SpecialTournamentContext {
  const groupMap = new Map<string, Set<string>>();
  const fixtures: SpecialFixtureContext[] = [];

  for (const match of matches) {
    const groupName = normalizeGroupName(match.group_name) ?? normalizeGroupName(match.competition);
    if (groupName) {
      const group = groupMap.get(groupName) ?? new Set<string>();
      group.add(match.home_team);
      group.add(match.away_team);
      groupMap.set(groupName, group);
    }

    fixtures.push({
      utcDate: match.utc_date,
      competition: match.competition,
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      stage: match.stage,
      groupName,
      venue: match.venue
    });
  }

  const groups: SpecialGroupContext[] = SPECIAL_GROUP_NAMES.map((groupName) => ({
    groupName,
    teams: [...(groupMap.get(groupName) ?? new Set<string>())].sort((a, b) => a.localeCompare(b))
  }));

  const missingGroups = groups.filter((group) => group.teams.length === 0).map((group) => group.groupName);
  if (missingGroups.length > 0) {
    throw new Error(`Cannot build special-question context. Missing group teams for: ${missingGroups.join(", ")}`);
  }

  return {
    tournamentEdition: "FIFA World Cup 2026",
    groups,
    fixtures: fixtures.sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
  };
}

function normalizeGroupName(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const upper = value.toUpperCase();
  const explicit = upper.match(/GROUP[_\s-]?([A-L])/);
  if (explicit) {
    return explicit[1];
  }

  const single = upper.trim().match(/^([A-L])$/);
  return single ? single[1] : null;
}

function selectQuestions(args: CliArgs): SpecialQuestionDefinition[] {
  if (!args.questionIds) {
    return SPECIAL_QUESTIONS;
  }

  return args.questionIds.map((id) => {
    const question = getSpecialQuestionById(id);
    if (!question) {
      throw new Error(`Unsupported special question: ${id}`);
    }
    return question;
  });
}

function selectConditions(args: CliArgs): SpecialCondition[] {
  return CONDITIONS.filter((condition) => {
    const accessMatches = !args.accessConditions || args.accessConditions.includes(condition.accessCondition);
    const strategyMatches = !args.promptStrategies || args.promptStrategies.includes(condition.promptStrategy);
    return accessMatches && strategyMatches;
  });
}

function createSpecialTasks(
  questions: SpecialQuestionDefinition[],
  models: LlmModel[],
  conditions: SpecialCondition[],
  context: SpecialTournamentContext
): SpecialTask[] {
  const tasks: SpecialTask[] = [];

  for (const question of questions) {
    const candidates = getCandidatesForQuestion(question, context);
    for (const model of models) {
      for (const condition of conditions) {
        tasks.push({ question, candidates, model, condition });
      }
    }
  }

  return tasks;
}

function getCandidatesForQuestion(
  question: SpecialQuestionDefinition,
  context: SpecialTournamentContext
): SpecialCandidate[] {
  if (question.candidateScope === "group") {
    const group = context.groups.find((entry) => entry.groupName === question.groupName);
    if (!group || group.teams.length === 0) {
      throw new Error(`No candidates found for ${question.id}`);
    }
    return group.teams.map(toTeamCandidate);
  }

  const teams = Array.from(new Set(context.groups.flatMap((group) => group.teams)))
    .sort((a, b) => a.localeCompare(b));
  if (teams.length === 0) {
    throw new Error(`No tournament teams found for ${question.id}`);
  }
  return teams.map(toTeamCandidate);
}

function toTeamCandidate(team: string): SpecialCandidate {
  return {
    id: team,
    label: team,
    type: "team"
  };
}

function parseCliArgs(args: string[]): CliArgs {
  const modelIds = readArg(args, "model") ?? readArg(args, "models");
  const questionIds = readArg(args, "question") ?? readArg(args, "questions");
  const sampleId = Number.parseInt(readArg(args, "sample-id") ?? "1", 10);
  const force = args.includes("--force");
  const skipAnyExisting = args.includes("--skip-any-existing");

  if (!Number.isInteger(sampleId) || sampleId < 1) {
    throw new Error("Invalid --sample-id. Use a positive integer.");
  }

  if (force && skipAnyExisting) {
    throw new Error("Use either --force or --skip-any-existing, not both.");
  }

  return {
    modelIds: modelIds ? modelIds.split(",").map((entry) => entry.trim()).filter(Boolean) : null,
    questionIds: questionIds
      ? questionIds.split(",").map((entry) => entry.trim()).filter(Boolean) as SpecialQuestionId[]
      : null,
    sampleId,
    concurrency: parseConcurrency(readArg(args, "concurrency")),
    force,
    skipAnyExisting,
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

function parseAccessConditions(value: string | null): AccessCondition[] | null {
  if (!value) {
    return null;
  }

  const entries = parseCommaSeparated(value);
  for (const entry of entries) {
    if (entry !== "closed_book" && entry !== "open_book") {
      throw new Error("Invalid --access. Use closed_book, open_book, or a comma-separated combination.");
    }
  }

  return entries as AccessCondition[];
}

function parsePromptStrategies(value: string | null): PromptStrategy[] | null {
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

  return entries as PromptStrategy[];
}

function parseCommaSeparated(value: string): string[] {
  const entries = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (entries.length === 0) {
    throw new Error("Comma-separated CLI options must include at least one value.");
  }

  return Array.from(new Set(entries));
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

async function attemptRepair(
  openRouter: OpenRouterClient,
  modelId: string,
  previousResponse: string,
  initialValidation: SpecialPredictionValidationResult,
  question: SpecialQuestionDefinition,
  candidates: SpecialCandidate[]
): Promise<{ validation: SpecialPredictionValidationResult; rawResponse: unknown }> {
  const repairPrompt = buildSpecialPredictionRepairPrompt({
    previousResponse,
    validationErrors: initialValidation.validationErrors,
    question,
    candidates,
    stage: SPECIAL_PREDICTION_STAGE
  });

  try {
    const completion = await createChatCompletionWithBackoff(openRouter, modelId, repairPrompt, {
      temperature: SPECIAL_TEMPERATURE,
      topP: SPECIAL_TOP_P,
      n: SPECIAL_N,
      maxTokens: SPECIAL_REPAIR_MAX_TOKENS,
      responseFormat: JSON_RESPONSE_FORMAT,
      retryContentFailures: false
    }, `special repair | ${modelId}`);
    let repairedValidation = validateSpecialPredictionContent(completion.content, {
      question,
      candidates,
      stage: SPECIAL_PREDICTION_STAGE
    });
    let repairRawResponse = completion.rawResponse;

    if (shouldRetryCompletionAfterValidation(repairedValidation, completion)) {
      const retryCompletion = await createChatCompletionWithBackoff(openRouter, modelId, repairPrompt, {
        temperature: SPECIAL_TEMPERATURE,
        topP: SPECIAL_TOP_P,
        n: SPECIAL_N,
        maxTokens: SPECIAL_RETRY_MAX_TOKENS,
        responseFormat: JSON_RESPONSE_FORMAT,
        retryContentFailures: false
      }, `special repair | ${modelId}`);
      repairedValidation = validateSpecialPredictionContent(retryCompletion.content, {
        question,
        candidates,
        stage: SPECIAL_PREDICTION_STAGE
      });
      repairRawResponse = retryCompletion.rawResponse;
    }

    const validation = markRepairedSpecialValidation(repairedValidation.isValidForScoring
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
    return {
      validation: markRepairedSpecialValidation({
        ...initialValidation,
        validationErrors: [
          ...initialValidation.validationErrors,
          `repair_api_error: ${errorMessage(error)}`
        ]
      }),
      rawResponse: serializeError(error)
    };
  }
}

function toSpecialValidationStorageFields(
  validation: SpecialPredictionValidationResult,
  repairAttempted: boolean,
  repairRawResponse: unknown
): Partial<NewSpecialPredictionRow> {
  const validatedFields = validation.fields;
  const fields = validation.isValidForScoring && validatedFields
    ? {
        parsed_response: validatedFields,
        final_pick: validatedFields.final_pick,
        final_picks: validatedFields.final_picks,
        confidence: validatedFields.confidence,
        reasoning_summary: validatedFields.reasoning_summary,
        options: validatedFields.choices.map((choice) => ({
          question_id: validatedFields.question_id,
          candidate_id: choice.team,
          candidate_label: choice.team,
          candidate_type: "team",
          probability: choice.probability,
          rank: choice.rank,
          is_final_pick: choice.is_final_pick
        }))
      }
    : {
        parsed_response: null,
        final_picks: [],
        options: []
      };

  return {
    ...fields,
    validation_status: validation.status,
    is_valid_for_scoring: validation.isValidForScoring,
    repair_attempted: repairAttempted,
    repair_raw_response: repairRawResponse,
    normalization_applied: validation.normalizationApplied,
    normalized_fields: validation.normalizedFields,
    validation_errors: validation.validationErrors,
    probability_sum_original: validation.probabilitySumOriginal,
    probability_sum_final: validation.probabilitySumFinal
  };
}

function shouldRetryCompletionAfterValidation(
  validation: SpecialPredictionValidationResult,
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

function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  question: SpecialQuestionDefinition,
  modelName: string,
  condition: SpecialCondition,
  compliance: string,
  validationStatus: string
): string {
  return [
    question.id,
    modelName,
    `${condition.accessCondition}/${condition.promptStrategy}`,
    `search=${compliance}`,
    `validation=${validationStatus}`
  ].join(" | ");
}

function formatSkippedLog(
  question: SpecialQuestionDefinition,
  modelName: string,
  condition: SpecialCondition,
  reason: string
): string {
  return [
    formatTaskPrefix(question, modelName, condition),
    `skipped=${reason}`
  ].join(" | ");
}

function formatFailureLog(
  question: SpecialQuestionDefinition,
  modelName: string,
  condition: SpecialCondition,
  error: unknown
): string {
  return [
    question.id,
    modelName,
    `${condition.accessCondition}/${condition.promptStrategy}`,
    `failed=${errorMessage(error)}`
  ].join(" | ");
}

function formatTaskPrefix(
  question: SpecialQuestionDefinition,
  modelName: string,
  condition: SpecialCondition
): string {
  return [
    question.id,
    modelName,
    `${condition.accessCondition}/${condition.promptStrategy}`
  ].join(" | ");
}

function formatRetryLog(
  question: SpecialQuestionDefinition,
  modelName: string,
  condition: SpecialCondition,
  validationStatus: string,
  completion: OpenRouterChatResult
): string {
  return [
    question.id,
    modelName,
    `${condition.accessCondition}/${condition.promptStrategy}`,
    `retrying=${validationStatus}`,
    `finish_reason=${completion.finishReason ?? "unknown"}`,
    `output_tokens=${completion.outputTokens ?? "unknown"}`,
    `max_completion_tokens=${completion.maxCompletionTokens}`
  ].join(" | ");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
