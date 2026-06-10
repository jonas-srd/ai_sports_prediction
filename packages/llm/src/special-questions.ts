/**
 * Purpose: Canonical World Cup 2026 special-question definitions, prompts, and validation.
 * These forecasts are tournament-level Kicktipp questions, not match predictions.
 */
import type { AccessCondition, PromptStrategy } from "./prompt";

export type SpecialQuestionId =
  | "top_scorer_team"
  | "semifinalists"
  | "group_winner_A"
  | "group_winner_B"
  | "group_winner_C"
  | "group_winner_D"
  | "group_winner_E"
  | "group_winner_F"
  | "group_winner_G"
  | "group_winner_H"
  | "group_winner_I"
  | "group_winner_J"
  | "group_winner_K"
  | "group_winner_L"
  | "world_champion";

export type SpecialPredictionType = "single_choice" | "multi_choice_fixed_k";

export type SpecialQuestionDefinition = {
  id: SpecialQuestionId;
  label: string;
  meaning: string;
  predictionType: SpecialPredictionType;
  candidateScope: "all_teams" | "group";
  groupName?: string;
  k?: number;
};

export type SpecialCandidate = {
  id: string;
  label: string;
  type: "team";
};

export type SpecialGroupContext = {
  groupName: string;
  teams: string[];
};

export type SpecialFixtureContext = {
  utcDate: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  stage?: string | null;
  groupName?: string | null;
  venue?: string | null;
};

export type SpecialTournamentContext = {
  tournamentEdition: string;
  groups: SpecialGroupContext[];
  fixtures: SpecialFixtureContext[];
};

export type BuildSpecialPredictionPromptArgs = {
  question: SpecialQuestionDefinition;
  candidates: SpecialCandidate[];
  context: SpecialTournamentContext;
  accessCondition: AccessCondition;
  promptStrategy: PromptStrategy;
  stage: "STAGE_OPENING";
};

export type SpecialPredictionChoice = {
  team: string;
  probability: number;
  rank: number;
  is_final_pick: boolean;
};

export type SpecialPredictionValidationStatus =
  | "valid"
  | "normalized"
  | "repaired"
  | "repaired_and_normalized"
  | "invalid_json"
  | "invalid_schema"
  | "invalid_probability_range"
  | "invalid_probability_sum"
  | "invalid_candidate"
  | "invalid_pick_count"
  | "invalid_rank"
  | "invalid_after_repair"
  | "api_error"
  | "timeout";

export type ValidatedSpecialPredictionFields = {
  question_id: SpecialQuestionId;
  prediction_type: SpecialPredictionType;
  stage: "STAGE_OPENING";
  k: number | null;
  choices: SpecialPredictionChoice[];
  final_pick: string | null;
  final_picks: string[];
  confidence: number | null;
  reasoning_summary: string;
};

export type SpecialPredictionValidationResult = {
  status: SpecialPredictionValidationStatus;
  isValidForScoring: boolean;
  fields: ValidatedSpecialPredictionFields | null;
  normalizationApplied: boolean;
  normalizedFields: string[];
  validationErrors: string[];
  probabilitySumOriginal: number | null;
  probabilitySumFinal: number | null;
};

export const SPECIAL_PREDICTION_PROMPT_TEMPLATE_ID = "wc2026_special_v1";
export const SPECIAL_PREDICTION_STAGE = "STAGE_OPENING";

export const SPECIAL_GROUP_NAMES = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L"
] as const;

export const SPECIAL_QUESTIONS: SpecialQuestionDefinition[] = [
  {
    id: "top_scorer_team",
    label: "Which team will provide the tournament top scorer?",
    meaning: "Predict the national team that will have the tournament's top goalscorer.",
    predictionType: "single_choice",
    candidateScope: "all_teams"
  },
  {
    id: "semifinalists",
    label: "Which teams will reach the semifinals?",
    meaning: "Predict the four teams that will reach the semifinals.",
    predictionType: "multi_choice_fixed_k",
    candidateScope: "all_teams",
    k: 4
  },
  ...SPECIAL_GROUP_NAMES.map((groupName) => ({
    id: `group_winner_${groupName}` as SpecialQuestionId,
    label: `Who will win Group ${groupName}?`,
    meaning: `Predict the winner of group ${groupName}.`,
    predictionType: "single_choice" as const,
    candidateScope: "group" as const,
    groupName
  })),
  {
    id: "world_champion",
    label: "Who will win the FIFA World Cup 2026?",
    meaning: "Predict the FIFA World Cup 2026 champion.",
    predictionType: "single_choice",
    candidateScope: "all_teams"
  }
];

const CLOSED_BOOK_SPECIAL_HEADER = [
  "Access condition: CLOSED_BOOK.",
  "Do not use internet search, browsing, tools, APIs, external data sources, or project databases.",
  "Use only the static tournament context below plus your internal football knowledge.",
  "You do not have access to this project's stored match predictions, special predictions, analytics, scores, or tournament-tree outputs."
].join("\n");

const OPEN_BOOK_SPECIAL_HEADER = [
  "Access condition: OPEN_BOOK.",
  "You may use the available web-search tool for current public factual information about teams, squads, injuries, form, fixtures, and tournament context.",
  "Do not read, request, infer from, or use this project's stored match predictions, special predictions, analytics, scores, or tournament-tree outputs.",
  "Base the final forecast on public information, the static tournament context below, and calibrated football reasoning."
].join("\n");

const DIRECT_SPECIAL_INSTRUCTION = [
  "Prompt strategy: DIRECT_SCORE.",
  "Make the final pick(s) first, then assign calibrated probabilities that support those pick(s).",
  "Do not overstate certainty."
].join("\n");

const PROBABILISTIC_SPECIAL_INSTRUCTION = [
  "Prompt strategy: PROBABILISTIC_FORECAST.",
  "Estimate calibrated probabilities for every valid candidate first, then derive the final pick(s).",
  "Do not overstate certainty."
].join("\n");

export function getSpecialQuestionById(id: string): SpecialQuestionDefinition | null {
  return SPECIAL_QUESTIONS.find((question) => question.id === id) ?? null;
}

export function buildSpecialPredictionPrompt(args: BuildSpecialPredictionPromptArgs): string {
  const accessHeader = args.accessCondition === "closed_book"
    ? CLOSED_BOOK_SPECIAL_HEADER
    : OPEN_BOOK_SPECIAL_HEADER;
  const strategyInstruction = args.promptStrategy === "direct_score"
    ? DIRECT_SPECIAL_INSTRUCTION
    : PROBABILISTIC_SPECIAL_INSTRUCTION;

  return [
    "You are forecasting FIFA World Cup 2026 tournament outcomes for Kicktipp-style special questions.",
    "Return only valid JSON. Do not include markdown or any text outside JSON.",
    "Return concise reasoning_summary only; do not reveal hidden reasoning or chain-of-thought.",
    "Use calibrated probabilities and valid candidate teams only.",
    "These special predictions are one-time pre-tournament/STAGE_OPENING forecasts.",
    "",
    accessHeader,
    "",
    strategyInstruction,
    "",
    buildSpecialQuestionBlock(args.question),
    "",
    buildCandidateBlock(args.candidates),
    "",
    buildSpecialContextBlock(args.context),
    "",
    buildSpecialJsonSchemaBlock(args.question, args.stage)
  ].join("\n");
}

export function buildSpecialPredictionRepairPrompt(args: {
  previousResponse: string;
  validationErrors?: string[];
  question: SpecialQuestionDefinition;
  candidates: SpecialCandidate[];
  stage: "STAGE_OPENING";
}): string {
  const validationErrors = args.validationErrors?.length
    ? ["Validation errors:", ...args.validationErrors.map((error) => `- ${error}`)].join("\n")
    : "Validation errors: unavailable.";

  return [
    "Your previous response could not be parsed or validated.",
    "Convert it into valid JSON matching the required special-question schema.",
    "Do not change the substantive forecast unless required to satisfy candidate, probability, or pick constraints.",
    "Return only valid JSON. Do not include markdown or explanation outside JSON.",
    "",
    validationErrors,
    "",
    buildSpecialQuestionBlock(args.question),
    "",
    buildCandidateBlock(args.candidates),
    "",
    buildSpecialJsonSchemaBlock(args.question, args.stage),
    "",
    "Previous response:",
    args.previousResponse
  ].join("\n");
}

export function validateSpecialPredictionContent(
  content: string,
  args: {
    question: SpecialQuestionDefinition;
    candidates: SpecialCandidate[];
    stage: "STAGE_OPENING";
    maxReasoningSummaryLength?: number;
  }
): SpecialPredictionValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractFirstJsonObject(content));
  } catch (error) {
    return invalidSpecialResult("invalid_json", [`invalid_json: ${errorMessage(error)}`]);
  }

  if (!isRecord(parsed) || Array.isArray(parsed)) {
    return invalidSpecialResult("invalid_schema", ["invalid_schema: response must be a JSON object"]);
  }

  const schemaErrors = validateSpecialRequiredFields(parsed, args.question);
  if (schemaErrors.length > 0) {
    return invalidSpecialResult("invalid_schema", schemaErrors);
  }

  const readResult = readSpecialFields(parsed, args.question, args.maxReasoningSummaryLength ?? 500);
  if (readResult.schemaErrors.length > 0) {
    return invalidSpecialResult("invalid_schema", readResult.schemaErrors);
  }

  const fields = readResult.value;
  const candidateLabels = args.candidates.map((candidate) => candidate.label);
  const candidateSet = new Set(candidateLabels);
  const choiceLabels = fields.choices.map((choice) => choice.team);
  const candidateErrors = validateCandidates(candidateLabels, choiceLabels, fields);
  if (candidateErrors.length > 0) {
    return invalidSpecialResult("invalid_candidate", candidateErrors);
  }

  const rangeErrors = fields.choices
    .filter((choice) => choice.probability < 0 || choice.probability > 1)
    .map((choice) => `invalid_probability_range: ${choice.team} probability must be between 0 and 1`);
  if (rangeErrors.length > 0) {
    return invalidSpecialResult("invalid_probability_range", rangeErrors);
  }

  const pickErrors = validatePicks(fields, args.question, candidateSet);
  if (pickErrors.length > 0) {
    return invalidSpecialResult("invalid_pick_count", pickErrors);
  }

  const normalizedFields = { ...fields, choices: fields.choices.map((choice) => ({ ...choice })) };
  const normalizedFieldNames: string[] = [];
  let probabilitySumOriginal: number | null = null;
  let probabilitySumFinal: number | null = null;

  if (args.question.predictionType === "single_choice") {
    const sumResult = normalizeSingleChoiceProbabilities(normalizedFields.choices, normalizedFieldNames);
    probabilitySumOriginal = sumResult.original;
    probabilitySumFinal = sumResult.final;

    if (!sumResult.valid) {
      return {
        ...invalidSpecialResult("invalid_probability_sum", [sumResult.error]),
        probabilitySumOriginal,
        probabilitySumFinal
      };
    }
  }

  normalizeChoiceRanks(normalizedFields.choices, normalizedFieldNames);

  const normalizationApplied = normalizedFieldNames.length > 0;

  return {
    status: normalizationApplied ? "normalized" : "valid",
    isValidForScoring: true,
    fields: normalizedFields,
    normalizationApplied,
    normalizedFields: normalizedFieldNames,
    validationErrors: [],
    probabilitySumOriginal,
    probabilitySumFinal
  };
}

export function markRepairedSpecialValidation(
  result: SpecialPredictionValidationResult
): SpecialPredictionValidationResult {
  if (!result.isValidForScoring) {
    return {
      ...result,
      status: "invalid_after_repair",
      isValidForScoring: false
    };
  }

  return {
    ...result,
    status: result.normalizationApplied ? "repaired_and_normalized" : "repaired"
  };
}

function buildSpecialQuestionBlock(question: SpecialQuestionDefinition): string {
  const lines = [
    "Special question:",
    `question_id: ${question.id}`,
    `Question label: ${question.label}`,
    `Meaning: ${question.meaning}`,
    `prediction_type: ${question.predictionType}`,
    "Use team names exactly as listed in the valid candidates section. Do not translate, abbreviate, or rename teams."
  ];

  if (question.groupName) {
    lines.push(`Group: ${question.groupName}`);
  }

  if (question.k) {
    lines.push(`Required number of final picks: ${question.k}`);
  }

  if (question.id === "top_scorer_team") {
    lines.push("Important: answer with the TEAM of the player who becomes top goalscorer, not the player name.");
  }

  return lines.join("\n");
}

function buildCandidateBlock(candidates: SpecialCandidate[]): string {
  return [
    "Valid candidates:",
    ...candidates.map((candidate) => `- ${candidate.label}`)
  ].join("\n");
}

function buildSpecialContextBlock(context: SpecialTournamentContext): string {
  const groupLines = context.groups.flatMap((group) => [
    `Group ${group.groupName}: ${group.teams.join(", ")}`
  ]);
  const fixtureLines = context.fixtures.map((fixture) => [
    fixture.utcDate,
    fixture.stage ?? "unknown_stage",
    fixture.groupName ? `Group ${fixture.groupName}` : null,
    `${fixture.homeTeam} vs ${fixture.awayTeam}`,
    fixture.venue ? `Venue: ${fixture.venue}` : null
  ].filter(Boolean).join(" | "));

  return [
    "Allowed static context:",
    `Tournament edition: ${context.tournamentEdition}`,
    "",
    "Groups:",
    ...groupLines,
    "",
    "Official fixture data:",
    ...fixtureLines
  ].join("\n");
}

function buildSpecialJsonSchemaBlock(question: SpecialQuestionDefinition, stage: "STAGE_OPENING"): string {
  if (question.predictionType === "single_choice") {
    return [
      "Required JSON schema:",
      "{",
      `  \"question_id\": \"${question.id}\",`,
      "  \"prediction_type\": \"single_choice\",",
      `  \"stage\": \"${stage}\",`,
      "  \"choices\": [",
      "    {",
      "      \"team\": \"exact candidate team name\",",
      "      \"probability\": number,",
      "      \"rank\": number,",
      "      \"is_final_pick\": boolean",
      "    }",
      "  ],",
      "  \"final_pick\": \"exact candidate team name\",",
      "  \"confidence\": number,",
      "  \"reasoning_summary\": \"brief explanation\"",
      "}",
      "Include exactly one choices entry for every valid candidate. For single_choice, probabilities must sum to 1.",
      "Rank may be omitted or approximate; stored ranks are recalculated from probabilities during validation."
    ].join("\n");
  }

  return [
    "Required JSON schema:",
    "{",
    `  \"question_id\": \"${question.id}\",`,
    "  \"prediction_type\": \"multi_choice_fixed_k\",",
    `  \"k\": ${question.k ?? 4},`,
    `  \"stage\": \"${stage}\",`,
    "  \"choices\": [",
    "    {",
    "      \"team\": \"exact candidate team name\",",
    "      \"probability\": number,",
    "      \"rank\": number,",
    "      \"is_final_pick\": boolean",
    "    }",
    "  ],",
    "  \"final_picks\": [\"exact candidate team name\", \"...\"],",
    "  \"reasoning_summary\": \"brief explanation\"",
    "}",
    `Include exactly one choices entry for every valid candidate. final_picks must contain exactly ${question.k ?? 4} unique teams.`,
    "Rank may be omitted or approximate; stored ranks are recalculated from probabilities during validation."
  ].join("\n");
}

function validateSpecialRequiredFields(
  record: Record<string, unknown>,
  question: SpecialQuestionDefinition
): string[] {
  const required = ["question_id", "prediction_type", "stage", "choices", "reasoning_summary"];
  if (question.predictionType === "single_choice") {
    required.push("final_pick", "confidence");
  } else {
    required.push("k", "final_picks");
  }

  const errors: string[] = [];
  for (const field of required) {
    if (!(field in record)) {
      errors.push(`missing_required_field: ${field}`);
    }
  }

  return errors;
}

function readSpecialFields(
  record: Record<string, unknown>,
  question: SpecialQuestionDefinition,
  maxReasoningSummaryLength: number
): {
  value: ValidatedSpecialPredictionFields;
  schemaErrors: string[];
} {
  const schemaErrors: string[] = [];
  const choices = Array.isArray(record.choices)
    ? record.choices.map((choice, index) => readChoice(choice, index, schemaErrors))
    : [];

  if (!Array.isArray(record.choices)) {
    schemaErrors.push("invalid_schema: choices must be an array");
  }

  const value: ValidatedSpecialPredictionFields = {
    question_id: readExactString(record.question_id, question.id, "question_id", schemaErrors) as SpecialQuestionId,
    prediction_type: readExactString(
      record.prediction_type,
      question.predictionType,
      "prediction_type",
      schemaErrors
    ) as SpecialPredictionType,
    stage: readExactString(record.stage, SPECIAL_PREDICTION_STAGE, "stage", schemaErrors) as "STAGE_OPENING",
    k: question.predictionType === "multi_choice_fixed_k"
      ? readExactNumber(record.k, question.k ?? 4, "k", schemaErrors)
      : null,
    choices,
    final_pick: question.predictionType === "single_choice"
      ? readString(record.final_pick, "final_pick", schemaErrors)
      : null,
    final_picks: question.predictionType === "multi_choice_fixed_k"
      ? readStringArray(record.final_picks, "final_picks", schemaErrors)
      : [],
    confidence: question.predictionType === "single_choice"
      ? readNumber(record.confidence, "confidence", schemaErrors)
      : null,
    reasoning_summary: readReasoningSummary(record.reasoning_summary, maxReasoningSummaryLength, schemaErrors)
  };

  if (value.confidence !== null && (value.confidence < 0 || value.confidence > 1)) {
    schemaErrors.push("invalid_schema: confidence must be between 0 and 1");
  }

  return { value, schemaErrors };
}

function readChoice(value: unknown, index: number, errors: string[]): SpecialPredictionChoice {
  if (!isRecord(value) || Array.isArray(value)) {
    errors.push(`invalid_schema: choices[${index}] must be an object`);
    return { team: "", probability: 0, rank: 0, is_final_pick: false };
  }

  return {
    team: readString(value.team, `choices[${index}].team`, errors),
    probability: readNumber(value.probability, `choices[${index}].probability`, errors),
    rank: readOptionalRank(value.rank, index),
    is_final_pick: readBoolean(value.is_final_pick, `choices[${index}].is_final_pick`, errors)
  };
}

function validateCandidates(
  candidateLabels: string[],
  choiceLabels: string[],
  fields: ValidatedSpecialPredictionFields
): string[] {
  const errors: string[] = [];
  const candidateSet = new Set(candidateLabels);
  const seen = new Set<string>();

  for (const label of choiceLabels) {
    if (!candidateSet.has(label)) {
      errors.push(`invalid_candidate: ${label} is not a valid candidate`);
    }
    if (seen.has(label)) {
      errors.push(`invalid_candidate: duplicate choice for ${label}`);
    }
    seen.add(label);
  }

  for (const label of candidateLabels) {
    if (!seen.has(label)) {
      errors.push(`invalid_candidate: missing choice for ${label}`);
    }
  }

  const finalLabels = fields.final_pick ? [fields.final_pick] : fields.final_picks;
  for (const label of finalLabels) {
    if (!candidateSet.has(label)) {
      errors.push(`invalid_candidate: final pick ${label} is not a valid candidate`);
    }
  }

  return errors;
}

function validatePicks(
  fields: ValidatedSpecialPredictionFields,
  question: SpecialQuestionDefinition,
  candidateSet: Set<string>
): string[] {
  const errors: string[] = [];

  if (question.predictionType === "single_choice") {
    if (!fields.final_pick || !candidateSet.has(fields.final_pick)) {
      errors.push("invalid_pick_count: final_pick must be exactly one valid team");
      return errors;
    }

    const flagged = fields.choices.filter((choice) => choice.is_final_pick).map((choice) => choice.team);
    if (flagged.length !== 1 || flagged[0] !== fields.final_pick) {
      errors.push("invalid_pick_count: exactly final_pick must have is_final_pick=true");
    }

    return errors;
  }

  const expectedK = question.k ?? 4;
  const uniquePicks = new Set(fields.final_picks);
  if (fields.final_picks.length !== expectedK || uniquePicks.size !== expectedK) {
    errors.push(`invalid_pick_count: final_picks must contain exactly ${expectedK} unique teams`);
  }

  const flagged = fields.choices.filter((choice) => choice.is_final_pick).map((choice) => choice.team);
  const flaggedSet = new Set(flagged);
  if (flagged.length !== expectedK || flaggedSet.size !== expectedK) {
    errors.push(`invalid_pick_count: exactly ${expectedK} choices must have is_final_pick=true`);
  }

  for (const pick of uniquePicks) {
    if (!flaggedSet.has(pick)) {
      errors.push(`invalid_pick_count: final_picks and is_final_pick disagree for ${pick}`);
    }
  }

  return errors;
}

function normalizeSingleChoiceProbabilities(
  choices: SpecialPredictionChoice[],
  normalizedFieldNames: string[]
): { valid: true; original: number; final: number } | { valid: false; original: number; final: number; error: string } {
  const original = choices.reduce((total, choice) => total + choice.probability, 0);

  if (Math.abs(original - 1) <= 1e-12) {
    return { valid: true, original, final: original };
  }

  if (original <= 0) {
    return {
      valid: false,
      original,
      final: original,
      error: `invalid_probability_sum: single-choice probabilities sum to ${original}`
    };
  }

  for (const choice of choices) {
    choice.probability = choice.probability / original;
    normalizedFieldNames.push(`choices.${choice.team}.probability`);
  }

  return { valid: true, original, final: 1 };
}

function normalizeChoiceRanks(choices: SpecialPredictionChoice[], normalizedFieldNames: string[]): void {
  const ranked = choices
    .map((choice, index) => ({ choice, index }))
    .sort((left, right) => (
      right.choice.probability - left.choice.probability
      || left.choice.team.localeCompare(right.choice.team)
      || left.index - right.index
    ));

  ranked.forEach(({ choice }, index) => {
    const normalizedRank = index + 1;
    if (choice.rank !== normalizedRank) {
      choice.rank = normalizedRank;
      normalizedFieldNames.push(`choices.${choice.team}.rank`);
    }
  });
}

function invalidSpecialResult(
  status: Exclude<
    SpecialPredictionValidationStatus,
    "valid" | "normalized" | "repaired" | "repaired_and_normalized" | "api_error" | "timeout"
  >,
  validationErrors: string[]
): SpecialPredictionValidationResult {
  return {
    status,
    isValidForScoring: false,
    fields: null,
    normalizationApplied: false,
    normalizedFields: [],
    validationErrors,
    probabilitySumOriginal: null,
    probabilitySumFinal: null
  };
}

function readExactString(value: unknown, expected: string, field: string, errors: string[]): string {
  const actual = readString(value, field, errors);
  if (actual !== expected) {
    errors.push(`invalid_schema: ${field} must be ${expected}`);
  }
  return actual;
}

function readExactNumber(value: unknown, expected: number, field: string, errors: string[]): number {
  const actual = readInteger(value, field, errors);
  if (actual !== expected) {
    errors.push(`invalid_schema: ${field} must be ${expected}`);
  }
  return actual;
}

function readString(value: unknown, field: string, errors: string[]): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  errors.push(`invalid_schema: ${field} must be a non-empty string`);
  return "";
}

function readStringArray(value: unknown, field: string, errors: string[]): string[] {
  if (!Array.isArray(value)) {
    errors.push(`invalid_schema: ${field} must be an array`);
    return [];
  }

  return value.map((entry, index) => readString(entry, `${field}[${index}]`, errors));
}

function readNumber(value: unknown, field: string, errors: string[]): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  errors.push(`invalid_schema: ${field} must be a finite number`);
  return 0;
}

function readInteger(value: unknown, field: string, errors: string[]): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1) {
    return value;
  }

  errors.push(`invalid_schema: ${field} must be a positive integer`);
  return 0;
}

function readOptionalRank(value: unknown, index: number): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1) {
    return value;
  }

  return index + 1;
}

function readBoolean(value: unknown, field: string, errors: string[]): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  errors.push(`invalid_schema: ${field} must be a boolean`);
  return false;
}

function readReasoningSummary(value: unknown, maxLength: number, errors: string[]): string {
  const text = readString(value, "reasoning_summary", errors);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function extractFirstJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found.");
  }

  return trimmed.slice(start, end + 1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
