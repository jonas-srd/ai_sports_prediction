/**
 * Purpose: Dedicated production API for AI Sports Prediction.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  checkPostgresHealth,
  createPostgresPool,
  listBackupArtifacts,
  listBenchmarkPredictionsForApi,
  listDashboardMatches,
  listSpecialPredictionsForApi
} from "@ai-sports-prediction/db";

const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
const db = createPostgresPool();

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

server.listen(port, "0.0.0.0", () => {
  console.log(`AI Sports Prediction API listening on ${port}`);
});

process.on("SIGTERM", () => shutdown());
process.on("SIGINT", () => shutdown());

async function routeRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "OPTIONS") {
    sendEmpty(response, 204);
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "method_not_allowed" });
    return;
  }

  if (url.pathname === "/health") {
    const postgres = await checkPostgresHealth(db);
    sendJson(response, 200, { ok: true, service: "ai-sports-prediction-api", postgres });
    return;
  }

  if (url.pathname === "/v1/matches") {
    sendJson(response, 200, { matches: await listDashboardMatches(db) });
    return;
  }

  if (url.pathname === "/v1/benchmark-predictions") {
    sendJson(response, 200, { predictions: await listBenchmarkPredictionsForApi(db) });
    return;
  }

  if (url.pathname === "/v1/special-predictions") {
    sendJson(response, 200, { predictions: await listSpecialPredictionsForApi(db) });
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

function isAdminAuthorized(request: IncomingMessage): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) {
    return false;
  }

  return request.headers.authorization === `Bearer ${token}`;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    ...corsHeaders(),
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
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-max-age": "86400"
  };
}

async function shutdown(): Promise<void> {
  console.log("Shutting down AI Sports Prediction API");
  server.close();
  await db.end();
  process.exit(0);
}
