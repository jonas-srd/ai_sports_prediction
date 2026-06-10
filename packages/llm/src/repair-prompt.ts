/**
 * Purpose: Build the single allowed repair prompt for invalid benchmark JSON output.
 */
import { JSON_SCHEMA_BLOCK } from "./prompt";

export type BuildPredictionRepairPromptArgs = {
  previousResponse: string;
  validationErrors?: string[];
};

export function buildPredictionRepairPrompt(args: BuildPredictionRepairPromptArgs): string {
  const validationErrors = args.validationErrors?.length
    ? ["Validation errors:", ...args.validationErrors.map((error) => `- ${error}`)].join("\n")
    : "Validation errors: unavailable.";

  return [
    "Your previous response could not be parsed or validated.",
    "Convert it into valid JSON matching the required schema.",
    "Do not change the substantive forecast unless required to satisfy probability constraints.",
    "Return only valid JSON. Do not include markdown or explanation outside JSON.",
    "",
    validationErrors,
    "",
    "Required schema:",
    JSON_SCHEMA_BLOCK,
    "",
    "Previous response:",
    args.previousResponse
  ].join("\n");
}
