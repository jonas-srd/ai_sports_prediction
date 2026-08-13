import { OpenRouterResponseError, type OpenRouterClient } from "./openrouter-client";

export type PublicPredictionProfileKey = "nexus" | "pulse" | "edge";

export type PublicPredictionFixture = {
  sport: string;
  competition: string;
  utcDate: string | null;
  homeTeam: string;
  awayTeam: string;
  venue: string | null;
  round: string | null;
};

export type GeneratedPublicPrediction = {
  profile: PublicPredictionProfileKey;
  predictedHome: number;
  predictedAway: number;
  confidence: number;
  reason: string;
  promptText: string;
  providerResponseId: string | null;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  generatedAtUtc: string;
  rawResponse: unknown;
};

const PROFILE_KEYS: PublicPredictionProfileKey[] = ["nexus", "pulse", "edge"];

export async function generatePublicSportsPredictions(
  client: OpenRouterClient,
  modelId: string,
  fixture: PublicPredictionFixture
): Promise<GeneratedPublicPrediction[]> {
  const promptText = buildPublicPredictionPrompt(fixture);
  let lastError: unknown;

  // A provider can occasionally return truncated JSON despite JSON mode. Retry
  // the model call once; never invent or substitute a prediction locally.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const completion = await client.createChatCompletion(modelId, promptText, {
        temperature: 0.1,
        maxTokens: 900,
        responseFormat: { type: "json_object" }
      });
      const parsed = parseJsonObject(completion.content);
      const predictions = readRecord(parsed.predictions);
      const generatedAtUtc = new Date().toISOString();

      return PROFILE_KEYS.map((profile) => {
        const row = readRecord(predictions[profile]);
        const predictedHome = readNonNegativeInteger(row.home);
        const predictedAway = readNonNegativeInteger(row.away);
        const confidence = readConfidence(row.confidence);
        const reason = typeof row.reason === "string" ? row.reason.trim() : "";

        if (predictedHome === null || predictedAway === null || confidence === null || !reason) {
          throw new Error(`OpenRouter returned an invalid ${profile} public prediction.`);
        }

        return {
          profile,
          predictedHome,
          predictedAway,
          confidence,
          reason,
          promptText,
          providerResponseId: completion.responseId,
          latencyMs: completion.latencyMs,
          inputTokens: completion.inputTokens,
          outputTokens: completion.outputTokens,
          costUsd: completion.costUsd,
          generatedAtUtc,
          rawResponse: {
            profile,
            responseId: completion.responseId,
            modelId,
            response: completion.rawResponse
          }
        };
      });
    } catch (error) {
      if (error instanceof OpenRouterResponseError) throw error;
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("OpenRouter public prediction generation failed.");
}

function buildPublicPredictionPrompt(fixture: PublicPredictionFixture) {
  return [
    "Create three independent, calibrated pre-match sports predictions for the fixture below.",
    "Return only one valid JSON object and no markdown.",
    "Do not invent injuries, lineups, statistics or news that are not supplied.",
    "Use conservative scores and confidence values between 34 and 82.",
    "Keep each reason factual and below 40 words.",
    "For tennis, home and away mean the first and second listed player and scores mean sets.",
    "NEXUS emphasizes long-term strength and historical priors.",
    "PULSE emphasizes short-term uncertainty, scheduling and momentum without claiming unavailable facts.",
    "EDGE emphasizes matchup structure, venue and situational factors without claiming unavailable facts.",
    "Required schema:",
    '{"predictions":{"nexus":{"home":0,"away":0,"confidence":50,"reason":"..."},"pulse":{"home":0,"away":0,"confidence":50,"reason":"..."},"edge":{"home":0,"away":0,"confidence":50,"reason":"..."}}}',
    "",
    `Sport: ${fixture.sport}`,
    `Competition: ${fixture.competition}`,
    `Kickoff UTC: ${fixture.utcDate ?? "unknown"}`,
    `Home/listed first team: ${fixture.homeTeam}`,
    `Away/listed second team: ${fixture.awayTeam}`,
    `Venue: ${fixture.venue ?? "unknown"}`,
    `Round: ${fixture.round ?? "unknown"}`
  ].join("\n");
}

function parseJsonObject(value: string): Record<string, unknown> {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("OpenRouter public prediction response was not a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readNonNegativeInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 250 ? parsed : null;
}

function readConfidence(value: unknown) {
  const parsed = Number(value);
  const percentage = parsed > 0 && parsed <= 1 ? parsed * 100 : parsed;
  return Number.isFinite(percentage) && percentage >= 34 && percentage <= 82
    ? Math.round(percentage)
    : null;
}
