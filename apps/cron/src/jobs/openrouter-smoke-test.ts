/**
 * Purpose: Verifies that the local OPENROUTER_API_KEY can call one model and parse a score prediction.
 * This does not read or write SQLite; it is only a safe integration smoke test.
 */
import "../load-env";
import { buildPredictionPrompt, getConfiguredLlmModels, OpenRouterClient } from "@llm-kicktipp/llm";

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY. Add it to .env, not to frontend code.");
  }

  const modelId = process.env.OPENROUTER_TEST_MODEL ?? getConfiguredLlmModels()[0]?.id;
  if (!modelId) {
    throw new Error("No OpenRouter model configured.");
  }

  const client = new OpenRouterClient({
    apiKey,
    siteUrl: process.env.OPENROUTER_SITE_URL,
    siteName: process.env.OPENROUTER_SITE_NAME
  });

  const prompt = buildPredictionPrompt({
    utcDate: new Date().toISOString(),
    competition: "Smoke Test",
    homeTeam: "Germany",
    awayTeam: "France"
  });

  const prediction = await client.predictScore(modelId, prompt);

  console.log(`OpenRouter OK: ${modelId}`);
  console.log(`Prediction: Germany ${prediction.home} - ${prediction.away} France`);
  console.log(`Confidence: ${prediction.confidence ?? "n/a"}`);
  console.log(`Reason: ${prediction.reason ?? "n/a"}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
