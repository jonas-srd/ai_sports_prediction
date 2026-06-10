/**
 * Purpose: Builds the World Cup 2026 benchmark prediction prompt.
 * The builder supports the 2x2 access-condition x prompt-strategy design while
 * keeping the existing cron call shape source-compatible.
 */
export type AccessCondition = "closed_book" | "open_book";

export type PromptStrategy = "direct_score" | "probabilistic_forecast";

export type PromptMatch = {
  utcDate: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  tournamentEdition?: string | null;
  stage?: string | null;
  venue?: string | null;
  isKnockout?: boolean | number | null;
};

export type BenchmarkPromptMatch = Required<
  Pick<PromptMatch, "utcDate" | "competition" | "homeTeam" | "awayTeam">
> & {
  tournamentEdition?: string | null;
  stage?: string | null;
  venue?: string | null;
  isKnockout?: boolean | number | null;
};

export type BuildPredictionPromptArgs = {
  match: BenchmarkPromptMatch;
  accessCondition: AccessCondition;
  promptStrategy: PromptStrategy;
};

export const PREDICTION_PROMPT_TEMPLATE_ID = "wc2026_v1";

export const CLOSED_BOOK_HEADER = [
  "Access condition: CLOSED_BOOK.",
  "Do not use internet search, browsing, tools, APIs, or external data sources.",
  "Use only your internal model knowledge, general football reasoning, typical football score distributions, and the fixture information provided below.",
  "The fixture information identifies a current FIFA World Cup 2026 football/soccer match."
].join("\n");

export const OPEN_BOOK_HEADER = [
  "Access condition: OPEN_BOOK.",
  "Before making the prediction, use the available web-search tool to check current public information about this match and both teams.",
  "Relevant information may include recent form, injuries, suspensions, expected lineups, tactical news, venue, rest/travel, tournament context, and betting-market odds if available.",
  "Base the final prediction on the retrieved public information plus your football reasoning."
].join("\n");

export const DIRECT_SCORE_INSTRUCTION = [
  "Prompt strategy: DIRECT_SCORE.",
  "First predict the most likely scoreline for the match.",
  "Then provide probabilities, expected goals, and full-match/advancement probabilities that are consistent with that predicted scoreline.",
  "Do not overstate certainty."
].join("\n");

export const PROBABILISTIC_FORECAST_INSTRUCTION = [
  "Prompt strategy: PROBABILISTIC_FORECAST.",
  "First estimate calibrated probabilities for the 90-minute result and expected goals.",
  "Then derive the most likely scoreline from those probabilities and expected goals.",
  "Do not overstate certainty."
].join("\n");

export const DEFINITIONS_BLOCK = [
  "Definitions:",
  "- 90-minute result means regulation time plus stoppage time, excluding extra time and penalties.",
  "- home_win_90_prob is the probability that the listed home team leads after 90 minutes plus stoppage time.",
  "- draw_90_prob is the probability that the match is tied after 90 minutes plus stoppage time.",
  "- away_win_90_prob is the probability that the listed away team leads after 90 minutes plus stoppage time.",
  "- expected_home_goals_90 and expected_away_goals_90 are expected goals scored in regulation time plus stoppage time.",
  "- most_likely_score_90 is the single most likely score after regulation time plus stoppage time.",
  "- Full-match result means final match outcome after all applicable extra time and penalty shootout procedures.",
  "- For group-stage matches, full-match result is the same as the 90-minute result.",
  "- For knockout matches, home_advances_prob and away_advances_prob are probabilities that each team advances/wins the tie after extra time and penalties if needed.",
  "- Probabilities must be numbers between 0 and 1.",
  "- home_win_90_prob + draw_90_prob + away_win_90_prob must sum to 1.",
  "- home_win_full_prob + draw_full_prob + away_win_full_prob must sum to 1.",
  "- For knockout matches, home_advances_prob + away_advances_prob must sum to 1.",
  "- Confidence is the model's confidence in the overall forecast, between 0 and 1."
].join("\n");

export const JSON_SCHEMA_BLOCK = [
  "Return only valid JSON. Do not include markdown or explanation outside JSON.",
  "",
  "JSON schema:",
  "{",
  "  \"home_win_90_prob\": number,",
  "  \"draw_90_prob\": number,",
  "  \"away_win_90_prob\": number,",
  "  \"expected_home_goals_90\": number,",
  "  \"expected_away_goals_90\": number,",
  "  \"most_likely_score_90\": {",
  "    \"home\": number,",
  "    \"away\": number",
  "  },",
  "  \"home_win_full_prob\": number,",
  "  \"draw_full_prob\": number,",
  "  \"away_win_full_prob\": number,",
  "  \"most_likely_score_full\": {",
  "    \"home\": number,",
  "    \"away\": number",
  "  },",
  "  \"home_advances_prob\": number or null,",
  "  \"away_advances_prob\": number or null,",
  "  \"confidence\": number,",
  "  \"reason\": \"short reason\"",
  "}"
].join("\n");

export function buildPredictionPrompt(match: PromptMatch): string;
export function buildPredictionPrompt(args: BuildPredictionPromptArgs): string;
export function buildPredictionPrompt(args: PromptMatch | BuildPredictionPromptArgs): string {
  const normalizedArgs = normalizePromptArgs(args);
  const accessHeader = normalizedArgs.accessCondition === "closed_book"
    ? CLOSED_BOOK_HEADER
    : OPEN_BOOK_HEADER;
  const strategyInstruction = normalizedArgs.promptStrategy === "direct_score"
    ? DIRECT_SCORE_INSTRUCTION
    : PROBABILISTIC_FORECAST_INSTRUCTION;

  return [
    accessHeader,
    "",
    strategyInstruction,
    "",
    DEFINITIONS_BLOCK,
    "",
    buildMatchBlock(normalizedArgs.match),
    "",
    JSON_SCHEMA_BLOCK
  ].join("\n");
}

export function buildAllBenchmarkPromptVariants(match: BenchmarkPromptMatch): Record<string, string> {
  return {
    closed_book_direct_score: buildPredictionPrompt({
      match,
      accessCondition: "closed_book",
      promptStrategy: "direct_score"
    }),
    closed_book_probabilistic_forecast: buildPredictionPrompt({
      match,
      accessCondition: "closed_book",
      promptStrategy: "probabilistic_forecast"
    }),
    open_book_direct_score: buildPredictionPrompt({
      match,
      accessCondition: "open_book",
      promptStrategy: "direct_score"
    }),
    open_book_probabilistic_forecast: buildPredictionPrompt({
      match,
      accessCondition: "open_book",
      promptStrategy: "probabilistic_forecast"
    })
  };
}

export function buildMatchBlock(match: BenchmarkPromptMatch): string {
  return [
    "Match:",
    "Sport: football / soccer",
    `Competition: ${formatUnknown(match.competition)}`,
    `Tournament edition: ${formatUnknown(match.tournamentEdition ?? "FIFA World Cup 2026")}`,
    `Stage: ${formatUnknown(match.stage)}`,
    `Date UTC: ${formatUnknown(match.utcDate)}`,
    `Home/listed first team: ${formatUnknown(match.homeTeam)}`,
    `Away/listed second team: ${formatUnknown(match.awayTeam)}`,
    `Venue: ${formatUnknown(match.venue)}`,
    `Is knockout match: ${formatKnockout(match.isKnockout)}`
  ].join("\n");
}

function normalizePromptArgs(args: PromptMatch | BuildPredictionPromptArgs): BuildPredictionPromptArgs {
  if ("match" in args) {
    return args;
  }

  return {
    match: args,
    accessCondition: "closed_book",
    promptStrategy: "direct_score"
  };
}

function formatUnknown(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : "unknown";
}

function formatKnockout(value: boolean | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "unknown";
  }

  return value ? "yes" : "no";
}
