import {
  listLatestMatchPredictionsBySourceMatchIds,
  predictionExists,
  type PostgresDb,
  upsertPredictionMatch,
  upsertPredictionModel,
  upsertStoredPrediction
} from "@ai-sports-prediction/db";
import { generatePublicSportsPredictions, OpenRouterClient } from "@ai-sports-prediction/llm";

export type PublicPredictionFixtureInput = {
  sourceMatchId: string;
  sport: string;
  competition: string;
  utcDate: string;
  homeTeam: string;
  awayTeam: string;
  venue: string | null;
  round: string | null;
  status: string | null;
};

const PROFILES = ["nexus", "pulse", "edge"] as const;

export async function ensurePublicPredictions(db: PostgresDb, fixtureInputs: unknown) {
  const fixtures = normalizeFixtures(fixtureInputs).slice(0, 12);
  if (fixtures.length === 0) return [];

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is required to generate public predictions.");

  const modelId = getOpenRouterModelId();
  const client = new OpenRouterClient({
    apiKey,
    siteUrl: process.env.OPENROUTER_SITE_URL,
    siteName: process.env.OPENROUTER_SITE_NAME
  });

  await Promise.all(PROFILES.map((profile) => upsertPredictionModel(db, {
    id: getStoredModelId(modelId, profile),
    name: profile.toUpperCase(),
    provider: "OpenRouter",
    modelVersion: modelId,
    modelFamily: "openrouter",
    supportsToolAccess: false,
    isOpenWeight: modelId.includes("gpt-oss")
  })));

  await runWithConcurrency(fixtures, 2, async (fixture) => {
    const matchId = `sport-api:${fixture.sourceMatchId}`;
    await upsertPredictionMatch(db, {
      id: matchId,
      utcDate: fixture.utcDate,
      competition: fixture.competition,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      venue: fixture.venue,
      status: fixture.status,
      source: "thesportsdb",
      sourceMatchId: fixture.sourceMatchId,
      sport: fixture.sport,
      stage: fixture.round
    });

    const missingProfiles: Array<typeof PROFILES[number]> = [];
    for (const profile of PROFILES) {
      if (!await predictionExists(db, matchId, getStoredModelId(modelId, profile))) missingProfiles.push(profile);
    }
    if (missingProfiles.length === 0) return;

    const generated = await generatePublicSportsPredictions(client, modelId, fixture);
    await Promise.all(generated
      .filter((prediction) => missingProfiles.includes(prediction.profile))
      .map((prediction) => upsertStoredPrediction(db, {
        matchId,
        modelId: getStoredModelId(modelId, prediction.profile),
        predictedHome: prediction.predictedHome,
        predictedAway: prediction.predictedAway,
        confidence: prediction.confidence,
        reason: prediction.reason,
        rawResponse: prediction.rawResponse
      })));
  });

  return listLatestMatchPredictionsBySourceMatchIds(db, fixtures.map((fixture) => fixture.sourceMatchId));
}

function normalizeFixtures(value: unknown): PublicPredictionFixtureInput[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const candidate = row as Record<string, unknown>;
    const sourceMatchId = readString(candidate.sourceMatchId);
    const sport = readString(candidate.sport);
    const competition = readString(candidate.competition);
    const utcDate = readString(candidate.utcDate);
    const homeTeam = readString(candidate.homeTeam);
    const awayTeam = readString(candidate.awayTeam);
    if (!sourceMatchId || !sport || !competition || !utcDate || !homeTeam || !awayTeam || Number.isNaN(Date.parse(utcDate))) return [];
    return [{
      sourceMatchId,
      sport,
      competition,
      utcDate,
      homeTeam,
      awayTeam,
      venue: readString(candidate.venue) || null,
      round: readString(candidate.round) || null,
      status: readString(candidate.status) || null
    }];
  });
}

function getOpenRouterModelId() {
  return process.env.OPENROUTER_MODEL_IDS?.split(",").map((value) => value.trim()).find(Boolean)
    ?? process.env.OPENROUTER_TEST_MODEL?.trim()
    ?? "openai/gpt-oss-20b:free";
}

function getStoredModelId(modelId: string, profile: typeof PROFILES[number]) {
  return `openrouter:${modelId}:${profile}`;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function runWithConcurrency<T>(items: T[], concurrency: number, task: (item: T) => Promise<void>) {
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      await task(item);
    }
  }));
}
