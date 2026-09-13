/**
 * Narrow production recovery worker. No Redis, queue replay, email, marketing,
 * social, billing or revenue handlers. Inject into the immutable ECS image:
 * node --import tsx --input-type=module -e '<source>; await main()'
 * RECOVERY_APP_ROOT=/app is required for injection. This is intentionally not
 * the regular worker entrypoint and must not silently be replaced with it.
 */
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, lstatSync, chmodSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ACCOUNT = "186581960948";
export const REGION = "eu-central-1";
export const TARGET = "ai-sports-prediction-db-recovery-20260913";
export const TARGET_HOST = "ai-sports-prediction-db-recovery-20260913.cl44cuw6mk0e.eu-central-1.rds.amazonaws.com";
export const SOURCE_HOST = "ai-sports-prediction-db.cl44cuw6mk0e.eu-central-1.rds.amazonaws.com";
export const MODEL = "eu.amazon.nova-2-lite-v1:0";
const CA_FILE = "/etc/ssl/certs/aws-rds-global-bundle.pem";
const BACKUP_DIRECTORY = "/tmp/recovery-production-backups-20260913";
const BACKUP_PREFIX = "ai-sports-prediction/backups/recovery-production-20260913";
const nativeLog = console.log.bind(console);
const emit = (event, evidence = {}) => nativeLog(JSON.stringify({ event, ...evidence }));
const ROOT = process.env.RECOVERY_APP_ROOT
  ? resolve(process.env.RECOVERY_APP_ROOT)
  : resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Order also defines the initial sequence and tie-breaking. The verified fresh
// backup follows the first forecast and precedes other routine sports work.
export const JOBS = Object.freeze([
  { id: "fixtures", intervalEnv: "FIXTURE_SYNC_INTERVAL_MINUTES", unit: 60_000, defaultInterval: 15, timeoutMs: 180_000 },
  { id: "predictions", intervalEnv: "PREDICTION_AUTOMATION_INTERVAL_MINUTES", unit: 60_000, defaultInterval: 60, timeoutMs: 600_000 },
  { id: "backup", intervalEnv: "BACKUP_AUTOMATION_INTERVAL_HOURS", unit: 3_600_000, defaultInterval: 12, timeoutMs: 600_000 },
  { id: "odds", intervalEnv: "ODDS_REFRESH_INTERVAL_MINUTES", unit: 60_000, defaultInterval: 60, timeoutMs: 240_000 },
  { id: "live-scores", intervalEnv: "LIVE_SCORE_SYNC_INTERVAL_MINUTES", unit: 60_000, defaultInterval: 2, timeoutMs: 120_000 }
]);

function positiveInteger(value, fallback, check) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  assert.ok(Number.isSafeInteger(parsed) && parsed > 0, check);
  return parsed;
}

export function prepareConfiguration(env) {
  assert.equal(env.RECOVERY_WORKER_APPROVED, "production-cutover-20260913", "RECOVERY_WORKER_APPROVAL_REQUIRED");
  assert.equal(env.RECOVERY_TARGET_DB_IDENTIFIER, TARGET, "TARGET_IDENTIFIER_MISMATCH");
  assert.equal(env.RECOVERY_TARGET_HOST, TARGET_HOST, "TARGET_HOST_MISMATCH");
  for (const name of ["AWS_REGION", "AWS_DEFAULT_REGION", "BEDROCK_REGION", "BACKUP_S3_REGION"]) {
    assert.ok(!env[name] || env[name] === REGION, "REGION_MISMATCH");
  }
  for (const name of ["BEDROCK_MODEL_ID", "PUBLIC_PREDICTION_BEDROCK_MODEL"]) {
    assert.ok(!env[name] || env[name] === MODEL, "MODEL_MISMATCH");
  }
  assert.ok(!env.LLM_PROVIDER || env.LLM_PROVIDER === "bedrock", "LLM_PROVIDER_MISMATCH");
  for (const name of ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN", "AWS_PROFILE", "AWS_DEFAULT_PROFILE", "AWS_SHARED_CREDENTIALS_FILE", "AWS_CONFIG_FILE", "AWS_WEB_IDENTITY_TOKEN_FILE", "AWS_ROLE_ARN", "AWS_CONTAINER_CREDENTIALS_FULL_URI", "AWS_CONTAINER_AUTHORIZATION_TOKEN", "AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE"]) {
    assert.ok(!env[name], "ALTERNATE_AWS_CREDENTIALS_NOT_ALLOWED");
  }
  for (const name of Object.keys(env)) {
    if (/^AWS_ENDPOINT_URL(?:_|$)/.test(name) || /^(?:BEDROCK|BACKUP_S3|S3)_ENDPOINT/.test(name)) {
      assert.ok(!env[name], "CUSTOM_ENDPOINT_NOT_ALLOWED");
    }
    if (/^(?:BACKUP_S3|S3)_(?:ACCESS_KEY|SECRET|SESSION_TOKEN)/.test(name)) {
      assert.ok(!env[name], "ALTERNATE_BACKUP_CREDENTIALS_NOT_ALLOWED");
    }
    if (/^(?:RESEND_|GA4_API_SECRET$|STRIPE_|INSTAGRAM_ACCESS_TOKEN$|TIKTOK_(?:CLIENT_KEY|CLIENT_SECRET|TOKEN_ENCRYPTION_KEY)$|REDDIT_(?:CLIENT_ID|CLIENT_SECRET|TOKEN_ENCRYPTION_KEY)$|SERPAPI_API_KEY$|OPENROUTER_API_KEY$|REDIS_URL$)/.test(name)) {
      assert.ok(!env[name], "NON_SPORTS_CREDENTIALS_NOT_ALLOWED");
    }
  }
  assert.notEqual(env.NODE_TLS_REJECT_UNAUTHORIZED, "0", "TLS_DISABLED");
  assert.ok(!env.DATABASE_SSL || env.DATABASE_SSL === "1", "DATABASE_TLS_REQUIRED");
  assert.ok(!env.DATABASE_SSL_REJECT_UNAUTHORIZED || env.DATABASE_SSL_REJECT_UNAUTHORIZED === "1", "DATABASE_TLS_VERIFICATION_REQUIRED");
  assert.ok(!env.DATABASE_SSL_CA_FILE || env.DATABASE_SSL_CA_FILE === CA_FILE, "UNEXPECTED_CA_FILE");
  assert.ok(!env.BACKUP_S3_BUCKET || env.BACKUP_S3_BUCKET === "ai-sports-prediction", "BACKUP_BUCKET_MISMATCH");
  assert.ok(!env.BACKUP_S3_PREFIX || env.BACKUP_S3_PREFIX === BACKUP_PREFIX, "BACKUP_PREFIX_MISMATCH");
  assert.ok(!env.BACKUP_AUTOMATION_ENABLED || env.BACKUP_AUTOMATION_ENABLED === "1", "BACKUPS_REQUIRED");
  assert.ok(env.DATABASE_URL, "DATABASE_URL_REQUIRED");
  const url = new URL(env.DATABASE_URL);
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol), "INVALID_DATABASE_PROTOCOL");
  assert.ok([SOURCE_HOST, TARGET_HOST].includes(url.hostname), "DATABASE_HOST_NOT_ALLOWLISTED");
  assert.ok(!url.port || url.port === "5432", "INVALID_DATABASE_PORT");
  assert.ok(url.username && url.password && url.pathname.length > 1 && !url.hash, "INVALID_DATABASE_URL");
  for (const key of [...url.searchParams.keys()]) {
    if (/^ssl/i.test(key)) url.searchParams.delete(key);
    else assert.ok(["application_name", "fallback_application_name", "client_encoding"].includes(key), "DATABASE_QUERY_OVERRIDE_NOT_ALLOWED");
  }
  url.hostname = TARGET_HOST;
  url.searchParams.set("statement_timeout", "15000");
  url.searchParams.set("query_timeout", "18000");
  url.searchParams.set("lock_timeout", "5000");
  url.searchParams.set("idle_in_transaction_session_timeout", "30000");
  url.searchParams.set("application_name", "recovery-production-worker");
  const requestedLimit = positiveInteger(env.RECOVERY_MAX_FIXTURES_PER_RUN, 3, "INVALID_RECOVERY_FIXTURE_LIMIT");
  assert.ok(requestedLimit <= 10, "RECOVERY_FIXTURE_LIMIT_EXCEEDS_TEN");
  const existingLimit = positiveInteger(env.PREDICTION_AUTOMATION_MAX_FIXTURES_PER_RUN, 500, "INVALID_EXISTING_FIXTURE_LIMIT");
  const maxFixtures = Math.min(requestedLimit, existingLimit);
  const schedule = JOBS.map((job) => ({ ...job, intervalMs: Math.max(job.defaultInterval,
    positiveInteger(env[job.intervalEnv], job.defaultInterval, "INVALID_JOB_INTERVAL")) * job.unit }));
  for (const job of schedule) assert.ok(Number.isSafeInteger(job.intervalMs), "JOB_INTERVAL_TOO_LARGE");
  return { connectionString: url.toString(), maxFixtures, schedule, environment: {
    DATABASE_URL: url.toString(), POSTGRES_URL: undefined,
    DATABASE_SSL: "1", DATABASE_SSL_REJECT_UNAUTHORIZED: "1", DATABASE_SSL_CA: undefined, DATABASE_SSL_CA_FILE: CA_FILE,
    PGCONNECT_TIMEOUT: "8", PGOPTIONS: "-c statement_timeout=15000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=30000",
    PGHOST: undefined, PGHOSTADDR: undefined, PGPORT: undefined, PGSERVICE: undefined, PGSERVICEFILE: undefined,
    LLM_PROVIDER: "bedrock", BEDROCK_MODEL_ID: MODEL, PUBLIC_PREDICTION_BEDROCK_MODEL: MODEL,
    AWS_REGION: REGION, AWS_DEFAULT_REGION: REGION, AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: "true", AWS_MAX_ATTEMPTS: "1",
    BACKUP_AUTOMATION_ENABLED: "1", BACKUP_S3_BUCKET: "ai-sports-prediction", BACKUP_S3_REGION: REGION,
    BACKUP_S3_PREFIX: BACKUP_PREFIX, BACKUP_S3_FORCE_PATH_STYLE: "0", POSTGRES_BACKUP_DIR: BACKUP_DIRECTORY,
    PREDICTION_AUTOMATION_MAX_FIXTURES_PER_RUN: String(maxFixtures),
    MARKETING_AUTOMATION_ENABLED: "0", MARKETING_ANALYTICS_ENABLED: "0", MARKETING_PUBLISH_MODE: "review",
    REVENUE_AUTOMATION_ENABLED: "0", OPS_ALERT_EMAILS: "", SALES_ALERT_EMAILS: ""
  } };
}

export function metadataTaskUrl(env) {
  assert.match(env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI ?? "", /^\/v2\/credentials\/[a-zA-Z0-9-]+$/, "ECS_TASK_CREDENTIALS_REQUIRED");
  const metadata = new URL(env.ECS_CONTAINER_METADATA_URI_V4 ?? "http://invalid");
  assert.equal(metadata.protocol, "http:", "INVALID_ECS_METADATA");
  assert.equal(metadata.hostname, "169.254.170.2", "INVALID_ECS_METADATA");
  assert.ok(!metadata.username && !metadata.password && !metadata.port && !metadata.search && !metadata.hash, "INVALID_ECS_METADATA");
  assert.match(metadata.pathname, /^\/v4\/[a-zA-Z0-9-]+$/, "INVALID_ECS_METADATA");
  return `${metadata.href}/task`;
}

export function validateTaskIdentity(task) {
  assert.match(task?.TaskARN ?? "", new RegExp(`^arn:aws:ecs:${REGION}:${ACCOUNT}:task/ai-sports-prediction/[a-f0-9]+$`), "ACCOUNT_OR_CLUSTER_MISMATCH");
  return task.TaskARN;
}

export function initialSchedule(schedule, now) {
  return schedule.map((job) => ({ ...job, dueAt: now, runs: 0 }));
}

export function selectDueJob(schedule, now) {
  return schedule.filter((job) => job.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt)[0] ?? null;
}

export function completeScheduledJob(schedule, id, finishedAt) {
  assert.ok(JOBS.some((job) => job.id === id), "UNKNOWN_JOB");
  // No catch-up burst after a slow/failed run. Both success and failure wait a
  // full configured interval, and every invocation is awaited before the next.
  return schedule.map((job) => job.id === id
    ? { ...job, runs: job.runs + 1, dueAt: finishedAt + job.intervalMs } : job);
}

export function sanitizeError(error) {
  const permitted = new Set(["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "AccessDeniedException", "ThrottlingException", "ServiceUnavailableException", "ValidationException", "TimeoutError", "AbortError"]);
  return { code: permitted.has(error?.code) ? error.code : permitted.has(error?.name) ? error.name : "JOB_FAILED",
    check: error?.code === "ERR_ASSERTION" && /^[A-Z0-9_]+$/.test(error.message) ? error.message : undefined };
}

async function withSanitizedHandlerLogs(jobId, callback) {
  const methods = ["log", "info", "warn", "error", "debug"];
  const previous = new Map(methods.map((name) => [name, console[name]]));
  let diagnostics = 0;
  try {
    for (const name of methods) console[name] = (...args) => {
      // This one known aggregate contains no fixtures, customers, raw provider
      // errors, database URLs or tokens. All other handler diagnostics redact.
      const match = args.length === 1 && typeof args[0] === "string"
        ? /^Upcoming prediction job finished: (\d+) created, (\d+) skipped, (\d+) failed\.$/.exec(args[0]) : null;
      if (jobId === "predictions" && match) emit("recovery_prediction_summary", {
        created: Number(match[1]), skipped: Number(match[2]), failed: Number(match[3])
      });
      else diagnostics += 1;
    };
    return await callback();
  } finally {
    for (const [name, original] of previous) console[name] = original;
    if (diagnostics) emit("recovery_handler_diagnostics_redacted", { job: jobId, count: diagnostics });
  }
}

async function invokeHandler(job, pool, maxFixtures) {
  const moduleUrl = (name) => pathToFileURL(resolve(ROOT, "apps/worker/src/jobs", name)).href;
  switch (job.id) {
    case "fixtures": return (await import(moduleUrl("sync-upcoming-sport-fixtures.ts"))).syncUpcomingSportFixtures(pool);
    case "predictions":
      process.env.PREDICTION_AUTOMATION_MAX_FIXTURES_PER_RUN = String(job.runs === 0 ? 1 : maxFixtures);
      return (await import(moduleUrl("generate-upcoming-sport-api-predictions.ts"))).generateUpcomingSportApiPredictions(pool);
    case "backup": return (await import(moduleUrl("export-postgres-backup-runner.ts"))).main();
    case "odds": return (await import(moduleUrl("refresh-upcoming-odds.ts"))).refreshUpcomingOdds(pool);
    case "live-scores": return (await import(moduleUrl("sync-live-sport-scores.ts"))).syncLiveSportScores(pool);
    default: throw new Error("UNKNOWN_JOB");
  }
}

export async function main() {
  let stage = "guards";
  let pool;
  let stopping = false;
  let wake;
  let graceTimer;
  let jobTimer;
  const startupTimer = setTimeout(() => { emit("recovery_worker_failed", { stage, code: "STARTUP_HARD_TIMEOUT" }); process.exit(124); }, 60_000);
  const stop = () => {
    if (stopping) return;
    stopping = true;
    emit("recovery_worker_stopping", { stage });
    wake?.();
    // Finish the current job if possible; never start another after a signal.
    graceTimer = setTimeout(() => { emit("recovery_worker_failed", { stage, code: "SHUTDOWN_HARD_TIMEOUT" }); process.exit(143); }, 25_000);
  };
  const fatal = (error) => {
    // Do not let third-party background rejection/error handlers dump raw
    // credential-bearing errors. Continuing after an uncaught error is unsafe.
    emit("recovery_worker_failed", { stage, ...sanitizeError(error), fatal: true });
    process.exit(1);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  process.on("unhandledRejection", fatal);
  process.on("uncaughtException", fatal);
  try {
    const config = prepareConfiguration(process.env);
    const response = await fetch(metadataTaskUrl(process.env), { signal: AbortSignal.timeout(5000), redirect: "error" });
    assert.ok(response.ok, "ECS_METADATA_FAILED");
    const taskArn = validateTaskIdentity(await response.json());
    const ca = readFileSync(CA_FILE, "utf8");
    assert.ok(ca.includes("-----BEGIN CERTIFICATE-----"), "RDS_CA_REQUIRED");
    for (const [key, value] of Object.entries(config.environment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    process.umask(0o077);
    mkdirSync(BACKUP_DIRECTORY, { recursive: true, mode: 0o700 });
    assert.ok(lstatSync(BACKUP_DIRECTORY).isDirectory(), "BACKUP_DIRECTORY_MUST_NOT_BE_SYMLINK");
    chmodSync(BACKUP_DIRECTORY, 0o700);
    stage = "database_health";
    const { default: pg } = await import("pg");
    pool = new pg.Pool({ connectionString: config.connectionString, max: 2,
      connectionTimeoutMillis: 8000, idleTimeoutMillis: 5000, statement_timeout: 15000,
      query_timeout: 18000, ssl: { ca, rejectUnauthorized: true } });
    pool.on("error", (error) => emit("recovery_database_idle_error", sanitizeError(error)));
    const tls = await pool.query("select ssl from pg_stat_ssl where pid=pg_backend_pid()");
    assert.equal(tls.rows[0]?.ssl, true, "DATABASE_TLS_NOT_ACTIVE");
    clearTimeout(startupTimer);
    emit("recovery_worker_ready", { taskArn, account: ACCOUNT, targetHost: TARGET_HOST, model: MODEL,
      redisConnected: false, externalBusinessJobsEnabled: false, startupFixtureLimit: 1,
      maxFixturesPerRun: config.maxFixtures, jobs: config.schedule.map(({ id, intervalMs }) => ({ id, intervalMs })) });
    let schedule = initialSchedule(config.schedule, Date.now());
    while (!stopping) {
      const job = selectDueJob(schedule, Date.now());
      if (!job) {
        stage = "idle";
        await new Promise((resolveWait) => {
          const delay = Math.min(30_000, Math.max(1, Math.min(...schedule.map((item) => item.dueAt)) - Date.now()));
          const timer = setTimeout(() => { wake = undefined; resolveWait(); }, delay);
          wake = () => { clearTimeout(timer); wake = undefined; resolveWait(); };
        });
        continue;
      }
      stage = job.id;
      const startedAt = Date.now();
      emit("recovery_job_started", { job: job.id, initialCycle: job.runs === 0,
        fixtureLimit: job.id === "predictions" ? (job.runs === 0 ? 1 : config.maxFixtures) : undefined });
      jobTimer = setTimeout(() => {
        // Promise.race alone would leave the handler running. Terminate this
        // entire isolated worker so no timed-out invocation can overlap another.
        emit("recovery_worker_failed", { stage, code: "JOB_HARD_TIMEOUT" });
        process.exit(124);
      }, job.timeoutMs);
      try {
        await withSanitizedHandlerLogs(job.id, () => invokeHandler(job, pool, config.maxFixtures));
        emit("recovery_job_completed", { job: job.id, durationMs: Date.now() - startedAt });
      } catch (error) {
        emit("recovery_job_failed", { job: job.id, ...sanitizeError(error), retry: "next_scheduled_cycle" });
      } finally {
        clearTimeout(jobTimer);
        schedule = completeScheduledJob(schedule, job.id, Date.now());
      }
    }
  } catch (error) {
    emit("recovery_worker_failed", { stage, ...sanitizeError(error) });
    process.exitCode = 1;
  } finally {
    clearTimeout(startupTimer);
    clearTimeout(jobTimer);
    // A separate bound also covers pool.end() after an initialization failure.
    const closeTimer = setTimeout(() => process.exit(143), 10_000);
    await pool?.end().catch(() => {});
    clearTimeout(closeTimer);
    clearTimeout(graceTimer);
    process.off("SIGTERM", stop);
    process.off("SIGINT", stop);
    process.off("unhandledRejection", fatal);
    process.off("uncaughtException", fatal);
    emit("recovery_worker_stopped", { clean: process.exitCode !== 1 });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
