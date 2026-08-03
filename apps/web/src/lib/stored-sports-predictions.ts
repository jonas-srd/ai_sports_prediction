/**
 * Loads persisted OpenRouter predictions from the internal API and attaches them
 * to live TheSportsDB fixtures by the provider's stable source match id.
 */
import { generatePublicSportsPredictions, OpenRouterClient } from "@ai-sports-prediction/llm";
import type { ApiSportId, SportApiMatch, SportApiPrediction } from "@/lib/sports-api-data";

type StoredPredictionRow = {
  id?: unknown;
  source_match_id?: unknown;
  model_id?: unknown;
  model_name?: unknown;
  model_version?: unknown;
  model_provider?: unknown;
  predicted_home?: unknown;
  predicted_away?: unknown;
  confidence?: unknown;
  reason?: unknown;
  created_at?: unknown;
};

declare global {
  var aiSportsOpenRouterPredictionCache: Map<string, Promise<SportApiPrediction[]>> | undefined;
  var aiSportsOpenRouterPredictionQueue: {
    active: number;
    pending: Array<() => void>;
  } | undefined;
}

export async function hydrateMatchesWithStoredPredictions(matches: SportApiMatch[]): Promise<SportApiMatch[]> {
  const apiUrl = (process.env.AI_SPORTS_API_URL ?? process.env.INTERNAL_API_URL)?.replace(/\/+$/, "");
  const sourceMatchIds = [...new Set(matches.map(getSourceMatchId).filter(Boolean))].slice(0, 250);

  if (!apiUrl || sourceMatchIds.length === 0) {
    return matches;
  }

  const url = new URL(`${apiUrl}/v1/predictions`);
  url.searchParams.set("sourceMatchIds", sourceMatchIds.join(","));
  const controller = new AbortController();
  const timeoutMs = Number(process.env.WEB_API_FETCH_TIMEOUT_MS ?? 3000);
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 3000);
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    next: { revalidate: Number(process.env.WEB_API_PREDICTIONS_CACHE_SECONDS ?? 60) },
    signal: controller.signal
  }).catch(() => null).finally(() => clearTimeout(timeout));

  if (!response?.ok) {
    return matches;
  }

  const payload = await response.json().catch(() => null) as { predictions?: StoredPredictionRow[] } | null;
  const bySourceMatchId = new Map<string, SportApiPrediction[]>();

  for (const row of payload?.predictions ?? []) {
    const sourceMatchId = stringValue(row.source_match_id);
    const prediction = normalizePrediction(row);
    if (!sourceMatchId || !prediction) {
      continue;
    }

    const rows = bySourceMatchId.get(sourceMatchId) ?? [];
    if (!rows.some((candidate) => candidate.modelKey === prediction.modelKey)) {
      rows.push(prediction);
      bySourceMatchId.set(sourceMatchId, rows);
    }
  }

  return matches.map((match) => ({
    ...match,
    predictions: bySourceMatchId.get(getSourceMatchId(match)) ?? match.predictions ?? []
  }));
}

export async function ensureSportApiMatchPredictions(
  matches: SportApiMatch[],
  sport: ApiSportId
): Promise<SportApiMatch[]> {
  const existing = await hydrateMatchesWithStoredPredictions(matches);
  const missing = existing.filter((match) => !hasAllPredictionProfiles(match));
  if (missing.length === 0) return existing;

  const apiUrl = (process.env.AI_SPORTS_API_URL ?? process.env.INTERNAL_API_URL)?.replace(/\/+$/, "");
  const generationTask = apiUrl
    ? ensureViaInternalApi(apiUrl, missing, sport)
    : ensureLocallyWithOpenRouter(missing, sport);
  const generatedRows = await resolveWithin(
    generationTask,
    Number(process.env.WEB_PREDICTION_RENDER_WAIT_MS ?? 1200),
    []
  );
  if (generatedRows.length === 0) return existing;

  return mergePredictionRows(existing, generatedRows);
}

function hasAllPredictionProfiles(match: SportApiMatch) {
  const keys = new Set((match.predictions ?? []).map((prediction) => prediction.modelKey));
  return keys.has("nexus") && keys.has("pulse") && keys.has("edge");
}

async function ensureViaInternalApi(apiUrl: string, matches: SportApiMatch[], sport: ApiSportId) {
  const token = process.env.INTERNAL_API_TOKEN ?? process.env.ADMIN_API_TOKEN;
  if (!token) return [];

  const controller = new AbortController();
  const timeoutMs = Number(process.env.OPENROUTER_ON_DEMAND_TIMEOUT_MS ?? 60_000);
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 60_000);
  const response = await fetch(`${apiUrl}/v1/predictions/ensure`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ fixtures: matches.map((match) => toEnsureFixture(match, sport)) }),
    cache: "no-store",
    signal: controller.signal
  }).catch(() => null).finally(() => clearTimeout(timeout));

  if (!response?.ok) return [];
  const payload = await response.json().catch(() => null) as { predictions?: StoredPredictionRow[] } | null;
  return payload?.predictions ?? [];
}

async function ensureLocallyWithOpenRouter(matches: SportApiMatch[], sport: ApiSportId): Promise<StoredPredictionRow[]> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return [];
  const modelId = process.env.OPENROUTER_MODEL_IDS?.split(",").map((value) => value.trim()).find(Boolean)
    ?? process.env.OPENROUTER_TEST_MODEL?.trim()
    ?? "openai/gpt-oss-20b:free";
  const client = new OpenRouterClient({
    apiKey,
    siteUrl: process.env.OPENROUTER_SITE_URL,
    siteName: process.env.OPENROUTER_SITE_NAME
  });
  const cache = globalThis.aiSportsOpenRouterPredictionCache ??= new Map();
  const results = await Promise.all(matches.map(async (match) => {
    const sourceMatchId = getSourceMatchId(match);
    let pending = cache.get(sourceMatchId);
    if (!pending) {
      pending = runWithLocalGenerationLimit(() => generatePublicSportsPredictions(client, modelId, {
        sport,
        competition: match.competition,
        utcDate: match.date,
        homeTeam: match.homeName,
        awayTeam: match.awayName,
        venue: match.venue ?? null,
        round: match.round ?? null
      }))
        .then((predictions) => predictions.map((prediction) => ({
          id: `local:${sourceMatchId}:${prediction.profile}`,
          modelKey: prediction.profile,
          modelName: prediction.profile.toUpperCase(),
          modelVersion: modelId,
          provider: "OpenRouter" as const,
          predictedHome: prediction.predictedHome,
          predictedAway: prediction.predictedAway,
          confidence: prediction.confidence,
          reason: prediction.reason,
          createdAt: new Date().toISOString()
        }))).catch(() => {
          cache.delete(sourceMatchId);
          return [];
        });
      cache.set(sourceMatchId, pending);
    }
    return { sourceMatchId, predictions: await pending };
  }));

  return results.flatMap(({ sourceMatchId, predictions }) => predictions.map((prediction: SportApiPrediction) => ({
    id: prediction.id,
    source_match_id: sourceMatchId,
    model_id: `openrouter:${prediction.modelVersion}:${prediction.modelKey}`,
    model_name: prediction.modelName,
    model_version: prediction.modelVersion,
    model_provider: prediction.provider,
    predicted_home: prediction.predictedHome,
    predicted_away: prediction.predictedAway,
    confidence: prediction.confidence,
    reason: prediction.reason,
    created_at: prediction.createdAt
  })));
}

async function runWithLocalGenerationLimit<T>(task: () => Promise<T>): Promise<T> {
  const queue = globalThis.aiSportsOpenRouterPredictionQueue ??= { active: 0, pending: [] };
  await new Promise<void>((resolve) => {
    queue.pending.push(resolve);
    drainLocalGenerationQueue(queue);
  });
  try {
    return await task();
  } finally {
    queue.active -= 1;
    drainLocalGenerationQueue(queue);
  }
}

function drainLocalGenerationQueue(queue: NonNullable<typeof globalThis.aiSportsOpenRouterPredictionQueue>) {
  while (queue.active < 2 && queue.pending.length > 0) {
    const start = queue.pending.shift();
    if (!start) return;
    queue.active += 1;
    start();
  }
}

async function resolveWithin<T>(promise: Promise<T>, timeoutMs: number, timeoutValue: T): Promise<T> {
  const waitMs = Number.isFinite(timeoutMs) && timeoutMs >= 0 ? timeoutMs : 1200;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(timeoutValue), waitMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function mergePredictionRows(matches: SportApiMatch[], rows: StoredPredictionRow[]) {
  const bySourceMatchId = new Map<string, SportApiPrediction[]>();
  for (const row of rows) {
    const sourceMatchId = stringValue(row.source_match_id);
    const prediction = normalizePrediction(row);
    if (!sourceMatchId || !prediction) continue;
    const predictions = bySourceMatchId.get(sourceMatchId) ?? [];
    const withoutSameProfile = predictions.filter((candidate) => candidate.modelKey !== prediction.modelKey);
    bySourceMatchId.set(sourceMatchId, [...withoutSameProfile, prediction]);
  }

  return matches.map((match) => {
    const generated = bySourceMatchId.get(getSourceMatchId(match)) ?? [];
    const merged = new Map((match.predictions ?? []).map((prediction) => [prediction.modelKey, prediction]));
    generated.forEach((prediction) => merged.set(prediction.modelKey, prediction));
    return { ...match, predictions: [...merged.values()] };
  });
}

function toEnsureFixture(match: SportApiMatch, sport: ApiSportId) {
  return {
    sourceMatchId: getSourceMatchId(match),
    sport,
    competition: match.competition,
    utcDate: match.date,
    homeTeam: match.homeName,
    awayTeam: match.awayName,
    venue: match.venue ?? null,
    round: match.round ?? null,
    status: match.status ?? null
  };
}

function normalizePrediction(row: StoredPredictionRow): SportApiPrediction | null {
  const predictedHome = numberValue(row.predicted_home);
  const predictedAway = numberValue(row.predicted_away);
  const modelId = stringValue(row.model_id);
  const modelKey = getModelKey(modelId, stringValue(row.model_name));
  if (predictedHome === null || predictedAway === null || !modelKey) {
    return null;
  }

  return {
    id: stringValue(row.id) || `${modelId}:${predictedHome}-${predictedAway}`,
    modelKey,
    modelName: stringValue(row.model_name) || modelKey.toUpperCase(),
    modelVersion: stringValue(row.model_version) || null,
    provider: "OpenRouter",
    predictedHome,
    predictedAway,
    confidence: numberValue(row.confidence),
    reason: stringValue(row.reason) || null,
    createdAt: stringValue(row.created_at) || null
  };
}

function getModelKey(modelId: string, modelName: string): SportApiPrediction["modelKey"] | null {
  const value = `${modelId}:${modelName}`.toLowerCase();
  if (value.includes("pulse")) return "pulse";
  if (value.includes("edge")) return "edge";
  if (value.includes("nexus") || value.startsWith("openrouter:")) return "nexus";
  return null;
}

function getSourceMatchId(match: SportApiMatch) {
  return match.id.replace(/^(?:tsdb|sport-api):/i, "");
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function numberValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
