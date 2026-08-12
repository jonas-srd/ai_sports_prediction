/**
 * Loads persisted OpenRouter predictions from the internal API and attaches them
 * to live TheSportsDB fixtures by the provider's stable source match id.
 */
import type { SportApiMatch, SportApiPrediction } from "@/lib/sports-api-data";

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
    next: { revalidate: Number(process.env.WEB_API_PREDICTIONS_CACHE_SECONDS ?? 300) },
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
