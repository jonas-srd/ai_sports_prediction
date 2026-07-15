import { createHash } from "node:crypto";

declare global {
  var aiSportsAdminLoginLimits: Map<string, LoginLimit> | undefined;
}

type LoginLimit = {
  failures: number;
  resetAt: number;
};

const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 8;

export function checkAdminLoginRateLimit(email: string, ip: string | null, nowMs = Date.now()): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const limits = getLimits();
  const keys = rateLimitKeys(email, ip);
  let retryAfterMs = 0;
  for (const key of keys) {
    const limit = limits.get(key);
    if (!limit) continue;
    if (limit.resetAt <= nowMs) {
      limits.delete(key);
      continue;
    }
    if (limit.failures >= MAX_FAILURES) {
      retryAfterMs = Math.max(retryAfterMs, limit.resetAt - nowMs);
    }
  }
  return {
    allowed: retryAfterMs === 0,
    retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000))
  };
}

export function recordAdminLoginFailure(email: string, ip: string | null, nowMs = Date.now()): void {
  const limits = getLimits();
  for (const key of rateLimitKeys(email, ip)) {
    const current = limits.get(key);
    if (!current || current.resetAt <= nowMs) {
      limits.set(key, { failures: 1, resetAt: nowMs + WINDOW_MS });
    } else {
      current.failures += 1;
    }
  }
}

export function clearAdminLoginFailures(email: string, ip: string | null): void {
  const limits = getLimits();
  for (const key of rateLimitKeys(email, ip)) {
    limits.delete(key);
  }
}

function rateLimitKeys(email: string, ip: string | null): string[] {
  const keys = [`email:${hash(email.trim().toLowerCase())}`];
  if (ip) keys.push(`ip:${hash(ip)}`);
  return keys;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function getLimits(): Map<string, LoginLimit> {
  if (!globalThis.aiSportsAdminLoginLimits) {
    globalThis.aiSportsAdminLoginLimits = new Map();
  }
  return globalThis.aiSportsAdminLoginLimits;
}
