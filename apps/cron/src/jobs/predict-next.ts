/**
 * Purpose: Predicts the next scheduled matches in local SQLite through OpenRouter.
 * Use this for local testing when there are no matches today.
 */
import "../load-env";
import { createSqliteDb, getDefaultDbPath, listUpcomingMatches, upsertModels, upsertPrediction } from "@llm-kicktipp/db";
import { buildPredictionPrompt, getConfiguredLlmModels, OpenRouterClient } from "@llm-kicktipp/llm";

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY. Add it to .env, not to frontend code.");
  }

  const limit = parseLimit(process.argv.slice(2));
  const db = createSqliteDb();
  const models = getConfiguredLlmModels();

  await upsertModels(db, models);

  const matches = await listUpcomingMatches(db, limit);
  const activeModels = models.filter((model) => model.active);
  const openRouter = new OpenRouterClient({
    apiKey,
    siteUrl: process.env.OPENROUTER_SITE_URL,
    siteName: process.env.OPENROUTER_SITE_NAME
  });

  console.log(`Found ${matches.length} upcoming matches and ${activeModels.length} active models.`);
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

function parseLimit(args: string[]): number {
  const raw = args.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
  const parsed = raw ? Number.parseInt(raw, 10) : 1;

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
    throw new Error("Invalid --limit. Use a number from 1 to 20.");
  }

  return parsed;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
