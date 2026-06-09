/**
 * Purpose: Validate and normalize benchmark prediction JSON before storage/scoring.
 */
export type PredictionValidationStatus =
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

export type ValidatedPredictionFields = {
  home_win_90_prob: number;
  draw_90_prob: number;
  away_win_90_prob: number;
  expected_home_goals_90: number;
  expected_away_goals_90: number;
  most_likely_score_90_home: number;
  most_likely_score_90_away: number;
  home_win_full_prob: number;
  draw_full_prob: number;
  away_win_full_prob: number;
  most_likely_score_full_home: number;
  most_likely_score_full_away: number;
  home_advances_prob: number | null;
  away_advances_prob: number | null;
  confidence: number;
  reason: string;
};

export type PredictionValidationResult = {
  status: PredictionValidationStatus;
  isValidForScoring: boolean;
  fields: ValidatedPredictionFields | null;
  normalizationApplied: boolean;
  normalizedFields: string[];
  validationErrors: string[];
  probSum90Original: number | null;
  probSum90Final: number | null;
  probSumFullOriginal: number | null;
  probSumFullFinal: number | null;
  probSumAdvancementOriginal: number | null;
  probSumAdvancementFinal: number | null;
};

export type ValidatePredictionContentArgs = {
  isKnockout: boolean;
  maxReasonLength?: number;
};

type ProbabilityField =
  | "home_win_90_prob"
  | "draw_90_prob"
  | "away_win_90_prob"
  | "home_win_full_prob"
  | "draw_full_prob"
  | "away_win_full_prob"
  | "home_advances_prob"
  | "away_advances_prob";

const REQUIRED_TOP_LEVEL_FIELDS = [
  "home_win_90_prob",
  "draw_90_prob",
  "away_win_90_prob",
  "expected_home_goals_90",
  "expected_away_goals_90",
  "most_likely_score_90",
  "home_win_full_prob",
  "draw_full_prob",
  "away_win_full_prob",
  "most_likely_score_full",
  "home_advances_prob",
  "away_advances_prob",
  "confidence",
  "reason"
] as const;

const PROBABILITY_SUM_TOLERANCE = 0.01;
const NORMALIZATION_MIN_SUM = 0.98;
const NORMALIZATION_MAX_SUM = 1.02;
const EXACT_ONE_EPSILON = 1e-12;
const DEFAULT_MAX_REASON_LENGTH = 500;

export function validatePredictionContent(
  content: string,
  args: ValidatePredictionContentArgs
): PredictionValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractFirstJsonObject(content));
  } catch (error) {
    return invalidResult("invalid_json", [`invalid_json: ${errorMessage(error)}`]);
  }

  if (!isRecord(parsed) || Array.isArray(parsed)) {
    return invalidResult("invalid_schema", ["invalid_schema: response must be a JSON object"]);
  }

  const schemaErrors = validateRequiredFields(parsed);
  if (schemaErrors.length > 0) {
    return invalidResult("invalid_schema", schemaErrors);
  }

  const fields = readFields(parsed, args.maxReasonLength ?? DEFAULT_MAX_REASON_LENGTH);

  if (fields.schemaErrors.length > 0) {
    return invalidResult("invalid_schema", fields.schemaErrors);
  }

  if (fields.scoreErrors.length > 0) {
    return invalidResult("invalid_score", fields.scoreErrors);
  }

  if (fields.rangeErrors.length > 0) {
    return invalidResult("invalid_probability_range", fields.rangeErrors);
  }

  const normalizedFields = { ...fields.value };
  const normalizedFieldNames: string[] = [];
  const sumErrors: string[] = [];

  const ninetySums = normalizeProbabilityVector(
    [
      ["home_win_90_prob", normalizedFields.home_win_90_prob],
      ["draw_90_prob", normalizedFields.draw_90_prob],
      ["away_win_90_prob", normalizedFields.away_win_90_prob]
    ],
    normalizedFields,
    normalizedFieldNames
  );

  if (!ninetySums.valid) {
    sumErrors.push(ninetySums.error);
  }

  const fullSums = normalizeProbabilityVector(
    [
      ["home_win_full_prob", normalizedFields.home_win_full_prob],
      ["draw_full_prob", normalizedFields.draw_full_prob],
      ["away_win_full_prob", normalizedFields.away_win_full_prob]
    ],
    normalizedFields,
    normalizedFieldNames
  );

  if (!fullSums.valid) {
    sumErrors.push(fullSums.error);
  }

  const advancementSums = getAdvancementSums(
    normalizedFields,
    args.isKnockout,
    normalizedFieldNames
  );

  if (!advancementSums.valid) {
    sumErrors.push(advancementSums.error);
  }

  if (sumErrors.length > 0) {
    return {
      ...invalidResult("invalid_probability_sum", sumErrors),
      probSum90Original: ninetySums.original,
      probSum90Final: ninetySums.final,
      probSumFullOriginal: fullSums.original,
      probSumFullFinal: fullSums.final,
      probSumAdvancementOriginal: advancementSums.original,
      probSumAdvancementFinal: advancementSums.final
    };
  }

  const normalizationApplied = normalizedFieldNames.length > 0;

  return {
    status: normalizationApplied ? "normalized" : "valid",
    isValidForScoring: true,
    fields: normalizedFields,
    normalizationApplied,
    normalizedFields: normalizedFieldNames,
    validationErrors: [],
    probSum90Original: ninetySums.original,
    probSum90Final: ninetySums.final,
    probSumFullOriginal: fullSums.original,
    probSumFullFinal: fullSums.final,
    probSumAdvancementOriginal: advancementSums.original,
    probSumAdvancementFinal: advancementSums.final
  };
}

export function markRepairedValidation(
  result: PredictionValidationResult
): PredictionValidationResult {
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

function validateRequiredFields(record: Record<string, unknown>): string[] {
  const errors: string[] = [];

  for (const field of REQUIRED_TOP_LEVEL_FIELDS) {
    if (!(field in record)) {
      errors.push(`missing_required_field: ${field}`);
    }
  }

  if (isRecord(record.most_likely_score_90)) {
    if (!("home" in record.most_likely_score_90)) {
      errors.push("missing_required_field: most_likely_score_90.home");
    }
    if (!("away" in record.most_likely_score_90)) {
      errors.push("missing_required_field: most_likely_score_90.away");
    }
  } else if ("most_likely_score_90" in record) {
    errors.push("invalid_schema: most_likely_score_90 must be an object");
  }

  if (isRecord(record.most_likely_score_full)) {
    if (!("home" in record.most_likely_score_full)) {
      errors.push("missing_required_field: most_likely_score_full.home");
    }
    if (!("away" in record.most_likely_score_full)) {
      errors.push("missing_required_field: most_likely_score_full.away");
    }
  } else if ("most_likely_score_full" in record) {
    errors.push("invalid_schema: most_likely_score_full must be an object");
  }

  return errors;
}

function readFields(
  record: Record<string, unknown>,
  maxReasonLength: number
): {
  value: ValidatedPredictionFields;
  schemaErrors: string[];
  rangeErrors: string[];
  scoreErrors: string[];
} {
  const schemaErrors: string[] = [];
  const rangeErrors: string[] = [];
  const scoreErrors: string[] = [];
  const score90 = record.most_likely_score_90 as Record<string, unknown>;
  const scoreFull = record.most_likely_score_full as Record<string, unknown>;

  const value: ValidatedPredictionFields = {
    home_win_90_prob: readNumber(record.home_win_90_prob, "home_win_90_prob", schemaErrors),
    draw_90_prob: readNumber(record.draw_90_prob, "draw_90_prob", schemaErrors),
    away_win_90_prob: readNumber(record.away_win_90_prob, "away_win_90_prob", schemaErrors),
    expected_home_goals_90: readNumber(record.expected_home_goals_90, "expected_home_goals_90", schemaErrors),
    expected_away_goals_90: readNumber(record.expected_away_goals_90, "expected_away_goals_90", schemaErrors),
    most_likely_score_90_home: readScore(score90.home, "most_likely_score_90.home", scoreErrors),
    most_likely_score_90_away: readScore(score90.away, "most_likely_score_90.away", scoreErrors),
    home_win_full_prob: readNumber(record.home_win_full_prob, "home_win_full_prob", schemaErrors),
    draw_full_prob: readNumber(record.draw_full_prob, "draw_full_prob", schemaErrors),
    away_win_full_prob: readNumber(record.away_win_full_prob, "away_win_full_prob", schemaErrors),
    most_likely_score_full_home: readScore(scoreFull.home, "most_likely_score_full.home", scoreErrors),
    most_likely_score_full_away: readScore(scoreFull.away, "most_likely_score_full.away", scoreErrors),
    home_advances_prob: readNullableNumber(record.home_advances_prob, "home_advances_prob", schemaErrors),
    away_advances_prob: readNullableNumber(record.away_advances_prob, "away_advances_prob", schemaErrors),
    confidence: readNumber(record.confidence, "confidence", schemaErrors),
    reason: readReason(record.reason, maxReasonLength, schemaErrors)
  };

  validateRange(value.home_win_90_prob, "home_win_90_prob", rangeErrors);
  validateRange(value.draw_90_prob, "draw_90_prob", rangeErrors);
  validateRange(value.away_win_90_prob, "away_win_90_prob", rangeErrors);
  validateRange(value.home_win_full_prob, "home_win_full_prob", rangeErrors);
  validateRange(value.draw_full_prob, "draw_full_prob", rangeErrors);
  validateRange(value.away_win_full_prob, "away_win_full_prob", rangeErrors);
  validateNullableRange(value.home_advances_prob, "home_advances_prob", rangeErrors);
  validateNullableRange(value.away_advances_prob, "away_advances_prob", rangeErrors);
  validateRange(value.confidence, "confidence", rangeErrors);

  return { value, schemaErrors, rangeErrors, scoreErrors };
}

function readNumber(value: unknown, field: string, errors: string[]): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  errors.push(`invalid_schema: ${field} must be a finite number`);
  return 0;
}

function readNullableNumber(value: unknown, field: string, errors: string[]): number | null {
  if (value === null) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  errors.push(`invalid_schema: ${field} must be a finite number or null`);
  return null;
}

function readScore(value: unknown, field: string, errors: string[]): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`invalid_score: ${field} must be a finite number`);
    return 0;
  }

  if (!Number.isInteger(value) || value < 0) {
    errors.push(`invalid_score: ${field} must be a non-negative integer`);
    return 0;
  }

  return value;
}

function readReason(value: unknown, maxLength: number, errors: string[]): string {
  if (typeof value !== "string") {
    errors.push("invalid_schema: reason must be a string");
    return "";
  }

  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function validateRange(value: number, field: string, errors: string[]): void {
  if (value < 0 || value > 1) {
    errors.push(`invalid_probability_range: ${field} must be between 0 and 1`);
  }
}

function validateNullableRange(value: number | null, field: string, errors: string[]): void {
  if (value !== null) {
    validateRange(value, field, errors);
  }
}

function normalizeProbabilityVector(
  entries: [ProbabilityField, number][],
  fields: ValidatedPredictionFields,
  normalizedFieldNames: string[]
): { valid: true; original: number; final: number } | { valid: false; original: number; final: number; error: string } {
  const original = sum(entries.map(([, value]) => value));

  if (Math.abs(original - 1) <= EXACT_ONE_EPSILON) {
    return { valid: true, original, final: original };
  }

  if (original >= NORMALIZATION_MIN_SUM && original <= NORMALIZATION_MAX_SUM) {
    for (const [field, value] of entries) {
      setProbabilityField(fields, field, value / original);
      normalizedFieldNames.push(field);
    }

    return { valid: true, original, final: 1 };
  }

  if (Math.abs(original - 1) <= PROBABILITY_SUM_TOLERANCE) {
    return { valid: true, original, final: original };
  }

  return {
    valid: false,
    original,
    final: original,
    error: `invalid_probability_sum: ${entries.map(([field]) => field).join(" + ")} = ${original}`
  };
}

function getAdvancementSums(
  fields: ValidatedPredictionFields,
  isKnockout: boolean,
  normalizedFieldNames: string[]
): { valid: true; original: number | null; final: number | null } | {
  valid: false;
  original: number | null;
  final: number | null;
  error: string;
} {
  const hasHome = fields.home_advances_prob !== null;
  const hasAway = fields.away_advances_prob !== null;

  if (!isKnockout && !hasHome && !hasAway) {
    return { valid: true, original: null, final: null };
  }

  if (!hasHome || !hasAway) {
    return {
      valid: false,
      original: null,
      final: null,
      error: "invalid_probability_sum: advancement probabilities must both be numbers for knockout matches or both null for non-knockout matches"
    };
  }

  const sums = normalizeProbabilityVector(
    [
      ["home_advances_prob", fields.home_advances_prob as number],
      ["away_advances_prob", fields.away_advances_prob as number]
    ],
    fields,
    normalizedFieldNames
  );

  return sums;
}

function setProbabilityField(
  fields: ValidatedPredictionFields,
  field: ProbabilityField,
  value: number
): void {
  switch (field) {
    case "home_win_90_prob":
      fields.home_win_90_prob = value;
      return;
    case "draw_90_prob":
      fields.draw_90_prob = value;
      return;
    case "away_win_90_prob":
      fields.away_win_90_prob = value;
      return;
    case "home_win_full_prob":
      fields.home_win_full_prob = value;
      return;
    case "draw_full_prob":
      fields.draw_full_prob = value;
      return;
    case "away_win_full_prob":
      fields.away_win_full_prob = value;
      return;
    case "home_advances_prob":
      fields.home_advances_prob = value;
      return;
    case "away_advances_prob":
      fields.away_advances_prob = value;
      return;
  }
}

function invalidResult(
  status: Exclude<PredictionValidationStatus, "valid" | "normalized" | "repaired" | "repaired_and_normalized">,
  validationErrors: string[]
): PredictionValidationResult {
  return {
    status,
    isValidForScoring: false,
    fields: null,
    normalizationApplied: false,
    normalizedFields: [],
    validationErrors,
    probSum90Original: null,
    probSum90Final: null,
    probSumFullOriginal: null,
    probSumFullFinal: null,
    probSumAdvancementOriginal: null,
    probSumAdvancementFinal: null
  };
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

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
