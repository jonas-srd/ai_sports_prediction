/**
 * Purpose: Builds a strict football score prediction prompt for each match.
 * The response contract is JSON only, which keeps the cron parser simple.
 */
export type PromptMatch = {
  utcDate: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
};

export function buildPredictionPrompt(match: PromptMatch): string {
  return [
    "You predict football match scores.",
    "Use current team strength, home advantage, tournament context, and typical football score distributions.",
    "Return only valid JSON. Do not include markdown or explanation outside JSON.",
    "",
    "Match:",
    `Competition: ${match.competition}`,
    `Date UTC: ${match.utcDate}`,
    `Home: ${match.homeTeam}`,
    `Away: ${match.awayTeam}`,
    "",
    "JSON schema:",
    "{",
    "  \"home\": number,",
    "  \"away\": number,",
    "  \"confidence\": number,",
    "  \"reason\": \"short reason\"",
    "}"
  ].join("\n");
}
