#!/usr/bin/env node
/**
 * Purpose: Lightweight HTTP load test without external dependencies.
 */

const args = parseArgs(process.argv.slice(2));
const url = args.url ?? "http://127.0.0.1:3001/health";
const totalRequests = Number(args.requests ?? 200);
const concurrency = Number(args.concurrency ?? 20);
const timeoutMs = Number(args.timeoutMs ?? 15_000);

if (!Number.isInteger(totalRequests) || totalRequests <= 0) {
  throw new Error("--requests must be a positive integer.");
}

if (!Number.isInteger(concurrency) || concurrency <= 0) {
  throw new Error("--concurrency must be a positive integer.");
}

const latencies = [];
const statuses = new Map();
const responseHeaders = new Map();
let completed = 0;
let failed = 0;
let nextRequest = 0;
const startedAt = performance.now();

await Promise.all(
  Array.from({ length: Math.min(concurrency, totalRequests) }, () => worker())
);

const elapsedMs = performance.now() - startedAt;
latencies.sort((a, b) => a - b);

const result = {
  url,
  requests: totalRequests,
  concurrency,
  completed,
  failed,
  statusCounts: Object.fromEntries([...statuses.entries()].sort()),
  responseHeaderCounts: Object.fromEntries([...responseHeaders.entries()].sort()),
  requestsPerSecond: round((completed / elapsedMs) * 1000, 2),
  elapsedMs: round(elapsedMs, 2),
  latencyMs: {
    min: round(percentile(0), 2),
    p50: round(percentile(50), 2),
    p90: round(percentile(90), 2),
    p95: round(percentile(95), 2),
    p99: round(percentile(99), 2),
    max: round(percentile(100), 2)
  }
};

console.log(JSON.stringify(result, null, 2));

async function worker() {
  while (nextRequest < totalRequests) {
    nextRequest += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const requestStartedAt = performance.now();

    try {
      const response = await fetch(url, {
        headers: { "user-agent": "ai-sports-prediction-load-test" },
        signal: controller.signal
      });
      await response.arrayBuffer();
      latencies.push(performance.now() - requestStartedAt);
      statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
      countHeader(responseHeaders, "x-api-cache", response.headers.get("x-api-cache"));
      completed += 1;
    } catch {
      failed += 1;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function percentile(percent) {
  if (latencies.length === 0) {
    return 0;
  }

  if (percent <= 0) {
    return latencies[0];
  }

  if (percent >= 100) {
    return latencies[latencies.length - 1];
  }

  const index = Math.ceil((percent / 100) * latencies.length) - 1;
  return latencies[Math.max(0, Math.min(index, latencies.length - 1))];
}

function round(value, decimals) {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function countHeader(target, headerName, value) {
  if (!value) {
    return;
  }

  const key = `${headerName}:${value}`;
  target.set(key, (target.get(key) ?? 0) + 1);
}

function parseArgs(rawArgs) {
  const parsed = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, inlineValue] = arg.slice(2).split("=", 2);
    parsed[key] = inlineValue ?? rawArgs[index + 1];

    if (inlineValue === undefined) {
      index += 1;
    }
  }

  return parsed;
}
