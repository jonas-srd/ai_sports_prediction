/**
 * Purpose: Dedicated production API for Residual Sports.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  checkPostgresHealth,
  createPostgresPool,
  listBackupArtifacts,
  listBenchmarkPredictionsForApi,
  listDashboardMatches,
  listLatestMatchPredictionsBySourceMatchIds,
  listLatestMatchOddsBySourceMatchIds,
  listSpecialPredictionsForApi
} from "@ai-sports-prediction/db";
import { createApiCache } from "./cache";
import { ensurePublicPredictions } from "./public-predictions";

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);
const host = process.env.API_HOST ?? process.env.HOST ?? "0.0.0.0";
const db = createPostgresPool();
const cache = createApiCache();

const CACHE_TTLS = {
  health: Number(process.env.API_CACHE_HEALTH_TTL_SECONDS ?? 2),
  matches: Number(process.env.API_CACHE_MATCHES_TTL_SECONDS ?? 300),
  odds: Number(process.env.API_CACHE_ODDS_TTL_SECONDS ?? 60),
  predictions: Number(process.env.API_CACHE_PREDICTIONS_TTL_SECONDS ?? 60),
  benchmarkPredictions: Number(process.env.API_CACHE_BENCHMARK_TTL_SECONDS ?? 300),
  specialPredictions: Number(process.env.API_CACHE_SPECIAL_TTL_SECONDS ?? 300)
};

const server = createServer(async (request, response) => {
  try {
    await routeRequest(request, response);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, {
      error: "internal_server_error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

server.listen(port, host, () => {
  console.log(`Residual Sports API listening on ${host}:${port}`);
});

process.on("SIGTERM", () => shutdown());
process.on("SIGINT", () => shutdown());

async function routeRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "OPTIONS") {
    sendEmpty(response, 204);
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/predictions/ensure") {
    if (!isAdminAuthorized(request)) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }
    const body = await readJsonBody(request);
    const predictions = await ensurePublicPredictions(db, body?.fixtures);
    sendJson(response, 200, { predictions });
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "method_not_allowed" });
    return;
  }

  if (url.pathname === "/health") {
    const cached = await cache.getOrSet(
      "health",
      CACHE_TTLS.health,
      async () => ({ ok: true, service: "residual-sports-api", postgres: await checkPostgresHealth(db) })
    );
    sendJson(response, 200, cached.value, cacheHeaders(cached.hit));
    return;
  }

  if (url.pathname === "/v1/matches") {
    const cached = await cache.getOrSet(
      "matches",
      CACHE_TTLS.matches,
      async () => ({ matches: await listDashboardMatches(db) })
    );
    sendJson(response, 200, cached.value, cacheHeaders(cached.hit));
    return;
  }

  if (url.pathname === "/v1/benchmark-predictions") {
    const cached = await cache.getOrSet(
      "benchmark-predictions",
      CACHE_TTLS.benchmarkPredictions,
      async () => ({ predictions: await listBenchmarkPredictionsForApi(db) })
    );
    sendJson(response, 200, cached.value, cacheHeaders(cached.hit));
    return;
  }

  if (url.pathname === "/v1/odds") {
    const sourceMatchIds = (url.searchParams.get("sourceMatchIds") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 250);

    if (sourceMatchIds.length === 0) {
      sendJson(response, 400, { error: "source_match_ids_required" });
      return;
    }

    const cacheKey = `odds:${[...sourceMatchIds].sort().join(",")}`;
    const cached = await cache.getOrSet(
      cacheKey,
      CACHE_TTLS.odds,
      async () => ({ odds: await listLatestMatchOddsBySourceMatchIds(db, sourceMatchIds) })
    );
    sendJson(response, 200, cached.value, cacheHeaders(cached.hit));
    return;
  }

  if (url.pathname === "/v1/predictions") {
    const sourceMatchIds = readSourceMatchIds(url);
    if (sourceMatchIds.length === 0) {
      sendJson(response, 400, { error: "source_match_ids_required" });
      return;
    }

    const cacheKey = `predictions:${[...sourceMatchIds].sort().join(",")}`;
    const cached = await cache.getOrSet(
      cacheKey,
      CACHE_TTLS.predictions,
      async () => ({ predictions: await listLatestMatchPredictionsBySourceMatchIds(db, sourceMatchIds) })
    );
    sendJson(response, 200, cached.value, cacheHeaders(cached.hit));
    return;
  }

  if (url.pathname === "/v1/special-predictions") {
    const cached = await cache.getOrSet(
      "special-predictions",
      CACHE_TTLS.specialPredictions,
      async () => ({ predictions: await listSpecialPredictionsForApi(db) })
    );
    sendJson(response, 200, cached.value, cacheHeaders(cached.hit));
    return;
  }

  if (url.pathname === "/v1/admin/backups") {
    if (!isAdminAuthorized(request)) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    sendJson(response, 200, { backups: await listBackupArtifacts(db) });
    return;
  }

  sendJson(response, 404, { error: "not_found" });
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, any> | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 128 * 1024) throw new Error("request_body_too_large");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return null;
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
}

function readSourceMatchIds(url: URL) {
  return [...new Set((url.searchParams.get("sourceMatchIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean))]
    .slice(0, 250);
}

function isAdminAuthorized(request: IncomingMessage): boolean {
  const token = process.env.INTERNAL_API_TOKEN ?? process.env.ADMIN_API_TOKEN;
  if (!token) {
    return false;
  }

  return request.headers.authorization === `Bearer ${token}`;
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {}
): void {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    ...corsHeaders(),
    ...headers,
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload)
  });
  response.end(payload);
}

function sendEmpty(response: ServerResponse, statusCode: number): void {
  response.writeHead(statusCode, corsHeaders());
  response.end();
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": process.env.API_CORS_ORIGIN ?? "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-max-age": "86400"
  };
}

function cacheHeaders(hit: boolean): Record<string, string> {
  return {
    "cache-control": "public, max-age=30, stale-while-revalidate=300",
    "x-api-cache": hit ? "HIT" : "MISS"
  };
}

async function shutdown(): Promise<void> {
  console.log("Shutting down Residual Sports API");
  server.close();
  await cache.close();
  await db.end();
  process.exit(0);
}
