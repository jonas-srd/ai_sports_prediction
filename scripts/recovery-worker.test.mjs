import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ACCOUNT, REGION, TARGET, TARGET_HOST, SOURCE_HOST, MODEL, JOBS,
  prepareConfiguration, metadataTaskUrl, validateTaskIdentity, initialSchedule,
  selectDueJob, completeScheduledJob, sanitizeError } from "./recovery-worker.mjs";

const sample = {
  RECOVERY_WORKER_APPROVED: "production-cutover-20260913",
  RECOVERY_TARGET_DB_IDENTIFIER: TARGET, RECOVERY_TARGET_HOST: TARGET_HOST,
  DATABASE_URL: `postgresql://example:fake-password@${SOURCE_HOST}:5432/sample?sslmode=no-verify`,
  AWS_REGION: REGION, BEDROCK_MODEL_ID: MODEL, LLM_PROVIDER: "bedrock"
};

test("source or already-switched target URL resolves to exact target, strict TLS, fixed model and backup", () => {
  for (const host of [SOURCE_HOST, TARGET_HOST]) {
    const input = { ...sample, DATABASE_URL: sample.DATABASE_URL.replace(SOURCE_HOST, host) };
    const before = structuredClone(input);
    const config = prepareConfiguration(input);
    const url = new URL(config.connectionString);
    assert.equal(url.hostname, TARGET_HOST);
    assert.equal(url.username, "example");
    assert.equal(url.password, "fake-password");
    assert.equal(url.searchParams.get("sslmode"), null);
    assert.equal(url.searchParams.get("statement_timeout"), "15000");
    assert.equal(config.environment.DATABASE_SSL_REJECT_UNAUTHORIZED, "1");
    assert.equal(config.environment.PUBLIC_PREDICTION_BEDROCK_MODEL, MODEL);
    assert.equal(config.environment.AWS_MAX_ATTEMPTS, "1");
    assert.equal(config.environment.BACKUP_S3_BUCKET, "ai-sports-prediction");
    assert.equal(config.environment.BACKUP_S3_PREFIX, "ai-sports-prediction/backups/recovery-production-20260913");
    assert.equal(config.environment.REVENUE_AUTOMATION_ENABLED, "0");
    assert.deepEqual(input, before);
  }
});

test("fail closed for absent authorization, wrong target, custom credentials, endpoints, or non-sports secrets", () => {
  for (const overrides of [
    { RECOVERY_WORKER_APPROVED: "" }, { RECOVERY_TARGET_DB_IDENTIFIER: "other" },
    { RECOVERY_TARGET_HOST: SOURCE_HOST }, { AWS_REGION: "us-east-1" },
    { BEDROCK_MODEL_ID: "other" }, { PUBLIC_PREDICTION_BEDROCK_MODEL: "other" },
    { LLM_PROVIDER: "openrouter" }, { AWS_ACCESS_KEY_ID: "fake" }, { AWS_DEFAULT_PROFILE: "alternate" },
    { AWS_CONFIG_FILE: "/tmp/alternate" }, { AWS_CONTAINER_CREDENTIALS_FULL_URI: "http://example.test" },
    { AWS_ENDPOINT_URL_BEDROCK_RUNTIME: "http://example.test" },
    { BACKUP_S3_ENDPOINT: "http://example.test" }, { BACKUP_S3_SECRET_ACCESS_KEY: "fake" },
    { REDIS_URL: "rediss://example.test" }, { RESEND_API_KEY: "fake" },
    { GA4_API_SECRET: "fake" }, { TIKTOK_TOKEN_ENCRYPTION_KEY: "fake" },
    { STRIPE_SECRET_KEY: "fake" }, { OPENROUTER_API_KEY: "fake" },
    { BACKUP_S3_BUCKET: "other" }, { BACKUP_S3_PREFIX: "unapproved-prefix" },
    { NODE_TLS_REJECT_UNAUTHORIZED: "0" }, { DATABASE_SSL: "0" },
    { DATABASE_SSL_REJECT_UNAUTHORIZED: "0" }, { DATABASE_SSL_CA_FILE: "/tmp/alternate" },
    { DATABASE_URL: sample.DATABASE_URL.replace(SOURCE_HOST, "localhost") },
    { DATABASE_URL: sample.DATABASE_URL.replace(":5432/", ":1234/") },
    { DATABASE_URL: sample.DATABASE_URL + "&host=other" },
    { DATABASE_URL: sample.DATABASE_URL + "&options=-c%20role%3Dother" }
  ]) assert.throws(() => prepareConfiguration({ ...sample, ...overrides }));
});

test("forecast caps never exceed ten or a smaller existing cap", () => {
  assert.equal(prepareConfiguration(sample).maxFixtures, 3);
  assert.equal(prepareConfiguration({ ...sample, RECOVERY_MAX_FIXTURES_PER_RUN: "10" }).maxFixtures, 10);
  assert.equal(prepareConfiguration({ ...sample, PREDICTION_AUTOMATION_MAX_FIXTURES_PER_RUN: "2" }).maxFixtures, 2);
  for (const value of ["0", "-1", "11", "1.2", "NaN"]) {
    assert.throws(() => prepareConfiguration({ ...sample, RECOVERY_MAX_FIXTURES_PER_RUN: value }));
  }
});

test("cadence defaults cannot be accelerated and configured slower cadence is preserved", () => {
  const normal = prepareConfiguration(sample).schedule;
  assert.deepEqual(normal.map((job) => job.intervalMs), [900_000, 3_600_000, 43_200_000, 3_600_000, 120_000]);
  const slowed = prepareConfiguration({ ...sample, PREDICTION_AUTOMATION_INTERVAL_MINUTES: "120", LIVE_SCORE_SYNC_INTERVAL_MINUTES: "1" }).schedule;
  assert.equal(slowed.find((job) => job.id === "predictions").intervalMs, 7_200_000);
  assert.equal(slowed.find((job) => job.id === "live-scores").intervalMs, 120_000);
  assert.throws(() => prepareConfiguration({ ...sample, BACKUP_AUTOMATION_INTERVAL_HOURS: "NaN" }));
});

test("initial ordering is fixtures, one forecast cycle, backup, odds, live scores; never catch up missed runs", () => {
  let state = initialSchedule(prepareConfiguration(sample).schedule, 1_000);
  const seen = [];
  for (let index = 0; index < JOBS.length; index += 1) {
    const due = selectDueJob(state, 2_000);
    seen.push(due.id);
    state = completeScheduledJob(state, due.id, 2_000);
  }
  assert.deepEqual(seen, ["fixtures", "predictions", "backup", "odds", "live-scores"]);
  assert.equal(selectDueJob(state, 2_001), null);
  assert.equal(selectDueJob(state, 122_000).id, "live-scores");
  const finishedLate = completeScheduledJob(state, "live-scores", 10_000_000);
  assert.equal(finishedLate.find((job) => job.id === "live-scores").dueAt, 10_120_000);
  assert.throws(() => completeScheduledJob(state, "marketing", 3_000));
});

test("ECS metadata requests cannot leave allowed link-local task endpoint and account/cluster", () => {
  const env = { AWS_CONTAINER_CREDENTIALS_RELATIVE_URI: "/v2/credentials/abc-123", ECS_CONTAINER_METADATA_URI_V4: "http://169.254.170.2/v4/abc-123" };
  assert.equal(metadataTaskUrl(env), "http://169.254.170.2/v4/abc-123/task");
  for (const uri of ["http://example.test/v4/a", "https://169.254.170.2/v4/a", "http://169.254.170.2:9999/v4/a", "http://169.254.170.2/v4/a?q=1", "http://169.254.170.2/v2/credentials/a"]) {
    assert.throws(() => metadataTaskUrl({ ...env, ECS_CONTAINER_METADATA_URI_V4: uri }));
  }
  const arn = `arn:aws:ecs:${REGION}:${ACCOUNT}:task/ai-sports-prediction/abcdef123`;
  assert.equal(validateTaskIdentity({ TaskARN: arn }), arn);
  assert.throws(() => validateTaskIdentity({ TaskARN: arn.replace(ACCOUNT, "999999999999") }));
  assert.throws(() => validateTaskIdentity({ TaskARN: arn.replace("ai-sports-prediction/", "other/") }));
});

test("error evidence never contains provider text, stacks, secrets or arbitrary codes", () => {
  const privateError = new Error("postgresql://private:secret@example.test/data");
  privateError.code = "PRIVATE_TOKEN_123";
  assert.deepEqual(sanitizeError(privateError), { code: "JOB_FAILED", check: undefined });
  assert.deepEqual(sanitizeError({ code: "ETIMEDOUT", message: "secret" }), { code: "ETIMEDOUT", check: undefined });
});

test("runner contains only explicit allowlisted imports, no Redis consumer or normal worker import", () => {
  const source = readFileSync(new URL("./recovery-worker.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /import\([^\n]*(?:worker\.ts|marketing|revenue|outreach)/);
  assert.doesNotMatch(source, /(?:from|import\()\s*["'](?:bullmq|ioredis)/);
  assert.doesNotMatch(source, /new\s+(?:Queue|Worker)\s*\(/);
  assert.match(source, /job\.runs === 0 \? 1 : maxFixtures/);
  assert.match(source, /await withSanitizedHandlerLogs/);
  assert.match(source, /process\.exit\(124\)/);
});
