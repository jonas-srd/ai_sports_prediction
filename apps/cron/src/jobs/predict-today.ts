/**
 * Purpose: Daily prediction job.
 * It loads today's matches from SQLite, prompts all active LLMs through OpenRouter, and stores one prediction per model and match.
 */
import "../load-env";
import { createSqliteDb, getDefaultDbPath, listTodayMatches, upsertModels, upsertPrediction } from "@llm-kicktipp/db";
import { buildPredictionPrompt, LLM_MODELS, OpenRouterClient } from "@llm-kicktipp/llm";

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY.");
  }

  const db = createSqliteDb();
  await upsertModels(db, LLM_MODELS);

  const matches = await listTodayMatches(db);
  const activeModels = LLM_MODELS.filter((model) => model.active);
  const openRouter = new OpenRouterClient({
    apiKey,
    siteUrl: process.env.OPENROUTER_SITE_URL,
    siteName: process.env.OPENROUTER_SITE_NAME
  });

  console.log(`Found ${matches.length} matches and ${activeModels.length} active models.`);
  console.log(`SQLite DB: ${getDefaultDbPath()}`);

  for (const match of matches) {
    const prompt = buildPredictionPrompt({
      utcDate: match.utc_date,
      competition: match.competition,
      homeTeam: match.home_team,
      awayTeam: match.away_team
    });

    const settled = await Promise.allSettled(
      activeModels.map(async (model) => {
        const prediction = await openRouter.predictScore(model.id, prompt);
        await upsertPrediction(db, {
          match_id: match.id,
          model_id: model.id,
          predicted_home: prediction.home,
          predicted_away: prediction.away,
          confidence: prediction.confidence ?? null,
          reason: prediction.reason ?? null,
          raw_response: prediction.rawResponse
        });

        return `${model.name}: ${prediction.home}-${prediction.away}`;
      })
    );

    for (const result of settled) {
      if (result.status === "fulfilled") {
        console.log(`${match.home_team} vs ${match.away_team} -> ${result.value}`);
      } else {
        console.error(`${match.home_team} vs ${match.away_team} -> prediction failed`, result.reason);
      }
    }
  }

  db.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
