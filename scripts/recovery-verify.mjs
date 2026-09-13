/**
 * Isolated recovery verification; never starts the worker or changes production config.
 * Run with: node --import tsx scripts/recovery-verify.mjs read|write|backup
 * Required: source DATABASE_URL secret, RECOVERY_TARGET_HOST (confirmed RDS endpoint),
 * RECOVERY_TARGET_DB_IDENTIFIER, and an ECS task in the expected account/region.
 * write/backup require RECOVERY_WRITE_APPROVED=isolated-test-only and RECOVERY_RUN_ID.
 * Test records remain in the isolated target and MUST be removed or isolated before cutover.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, mkdirSync, lstatSync, chmodSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const EXPECTED_ACCOUNT = "186581960948";
export const EXPECTED_REGION = "eu-central-1";
export const EXPECTED_TARGET = "ai-sports-prediction-db-recovery-20260913";
export const EXPECTED_TARGET_HOST = "ai-sports-prediction-db-recovery-20260913.cl44cuw6mk0e.eu-central-1.rds.amazonaws.com";
const SOURCE_IDENTIFIER = "ai-sports-prediction-db";
const MODEL_ID = "eu.amazon.nova-2-lite-v1:0";
const BACKUP_BUCKET = "ai-sports-prediction";
const BACKUP_PREFIX = "ai-sports-prediction/backups/recovery-check-20260913";
const BACKUP_DIRECTORY = "/tmp/isolated-recovery-backup-20260913";
// RECOVERY_APP_ROOT permits injection into an existing immutable ECS image with
// node --input-type=module -e '<this source>; await main("read")'. No secret files.
const ROOT = process.env.RECOVERY_APP_ROOT
  ? resolve(process.env.RECOVERY_APP_ROOT)
  : resolve(dirname(fileURLToPath(import.meta.url)), "..");
const quote = (identifier) => '"' + identifier.replaceAll('"', '""') + '"';
const emit = (event, evidence = {}) => console.log(JSON.stringify({ event, ...evidence }));

export function prepareTarget(env, phase) {
  assert.ok(["read", "write", "backup"].includes(phase), "INVALID_PHASE");
  assert.equal(env.RECOVERY_TARGET_DB_IDENTIFIER, EXPECTED_TARGET, "TARGET_IDENTIFIER_MISMATCH");
  const host = env.RECOVERY_TARGET_HOST;
  assert.equal(host, EXPECTED_TARGET_HOST, "TARGET_HOST_NOT_ALLOWLISTED");
  for (const key of ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN", "AWS_PROFILE", "AWS_SHARED_CREDENTIALS_FILE", "AWS_CONFIG_FILE", "AWS_WEB_IDENTITY_TOKEN_FILE", "AWS_ROLE_ARN", "AWS_CONTAINER_CREDENTIALS_FULL_URI"]) {
    assert.ok(!env[key], "ALTERNATE_CREDENTIALS_NOT_ALLOWED");
  }
  for (const key of Object.keys(env)) {
    if (/^AWS_ENDPOINT_URL(?:_|$)/.test(key)) assert.ok(!env[key], "CUSTOM_AWS_ENDPOINT_NOT_ALLOWED");
  }
  assert.notEqual(env.NODE_TLS_REJECT_UNAUTHORIZED, "0", "TLS_DISABLED");
  assert.ok(env.DATABASE_URL, "SOURCE_DATABASE_URL_REQUIRED");
  const targetUrl = new URL(env.DATABASE_URL);
  assert.ok(["postgres:", "postgresql:"].includes(targetUrl.protocol), "INVALID_DATABASE_PROTOCOL");
  assert.match(targetUrl.hostname, new RegExp(`^${SOURCE_IDENTIFIER}\\.[a-z0-9]+\\.eu-central-1\\.rds\\.amazonaws\\.com$`), "SOURCE_HOST_MISMATCH");
  assert.notEqual(targetUrl.hostname, host, "SOURCE_TARGET_COLLISION");
  assert.ok(!targetUrl.port || targetUrl.port === "5432", "UNEXPECTED_DATABASE_PORT");
  // pg lets ssl URL flags replace the explicit ssl object; do not permit that.
  for (const key of [...targetUrl.searchParams.keys()]) {
    if (/^ssl/i.test(key)) targetUrl.searchParams.delete(key);
    else assert.ok(["application_name", "fallback_application_name", "client_encoding"].includes(key), "DATABASE_URL_QUERY_OVERRIDE_NOT_ALLOWED");
  }
  targetUrl.hostname = host;
  if (phase === "write" || phase === "backup") {
    assert.equal(env.RECOVERY_WRITE_APPROVED, "isolated-test-only", "WRITE_APPROVAL_REQUIRED");
    assert.match(env.RECOVERY_RUN_ID ?? "", /^[a-z0-9][a-z0-9-]{7,63}$/, "RECOVERY_RUN_ID_REQUIRED");
  }
  if (phase === "backup") {
    assert.ok(!env.BACKUP_S3_ENDPOINT, "CUSTOM_BACKUP_ENDPOINT_NOT_ALLOWED");
    for (const key of Object.keys(env)) {
      if (/^(?:BACKUP_S3|S3)_(?:ACCESS_KEY|SECRET|SESSION_TOKEN)/.test(key)) assert.ok(!env[key], "CUSTOM_BACKUP_CREDENTIALS_NOT_ALLOWED");
    }
  }
  return { host, connectionString: targetUrl.toString() };
}

export function prepareBackupEnvironment(target, caFile) {
  const url = new URL(target.connectionString);
  // These apply to the backup module's own pool, including every export query.
  url.searchParams.set("statement_timeout", "15000");
  url.searchParams.set("query_timeout", "18000");
  url.searchParams.set("lock_timeout", "5000");
  url.searchParams.set("idle_in_transaction_session_timeout", "30000");
  url.searchParams.set("application_name", "isolated-recovery-backup");
  return {
    DATABASE_URL: url.toString(), POSTGRES_URL: undefined,
    DATABASE_SSL: "1", DATABASE_SSL_REJECT_UNAUTHORIZED: "1", DATABASE_SSL_CA: undefined,
    DATABASE_SSL_CA_FILE: caFile, PGCONNECT_TIMEOUT: "8",
    PGOPTIONS: "-c statement_timeout=15000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=30000",
    BACKUP_S3_BUCKET: BACKUP_BUCKET, BACKUP_S3_PREFIX: BACKUP_PREFIX,
    BACKUP_S3_REGION: EXPECTED_REGION, BACKUP_S3_ENDPOINT: undefined, BACKUP_S3_FORCE_PATH_STYLE: "0",
    POSTGRES_BACKUP_DIR: BACKUP_DIRECTORY, AWS_REGION: EXPECTED_REGION,
    AWS_DEFAULT_REGION: EXPECTED_REGION, AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: "true"
  };
}

async function verifyEcsAccount(env) {
  assert.match(env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI ?? "", /^\/v2\/credentials\/[a-zA-Z0-9-]+$/, "ECS_TASK_CREDENTIALS_REQUIRED");
  const metadata = new URL(env.ECS_CONTAINER_METADATA_URI_V4 ?? "http://invalid");
  assert.equal(metadata.protocol, "http:", "INVALID_ECS_METADATA");
  assert.equal(metadata.hostname, "169.254.170.2", "INVALID_ECS_METADATA");
  assert.ok(!metadata.username && !metadata.password && !metadata.port && !metadata.search && !metadata.hash, "INVALID_ECS_METADATA");
  assert.match(metadata.pathname, /^\/v4\/[a-zA-Z0-9-]+$/, "INVALID_ECS_METADATA");
  const response = await fetch(`${metadata.href}/task`, { signal: AbortSignal.timeout(5000), redirect: "error" });
  assert.ok(response.ok, "ECS_METADATA_FAILED");
  const task = await response.json();
  assert.match(task.TaskARN ?? "", new RegExp(`^arn:aws:ecs:${EXPECTED_REGION}:${EXPECTED_ACCOUNT}:task/ai-sports-prediction/[a-f0-9]+$`), "ACCOUNT_OR_CLUSTER_MISMATCH");
  return task.TaskARN;
}

async function readEvidence(pool, repository) {
  const client = await pool.connect();
  try {
    await client.query("begin isolation level repeatable read read only");
    await client.query("set local statement_timeout = '15000ms'");
    const tls = await client.query("select ssl, version, cipher from pg_stat_ssl where pid=pg_backend_pid()");
    assert.equal(tls.rows[0]?.ssl, true, "TLS_NOT_ACTIVE");
    emit("database_health", {
      ...(await repository.checkPostgresHealth(client)),
      tls: tls.rows[0],
      readOnly: (await client.query("show transaction_read_only")).rows[0].transaction_read_only,
      serverVersion: (await client.query("show server_version")).rows[0].server_version
    });
    const tables = (await client.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows.map((row) => row.tablename);
    const expectedMigrations = readdirSync(resolve(ROOT, "packages/db/migrations/postgres")).filter((name) => name.endsWith(".sql")).sort();
    const applied = tables.includes("schema_migrations")
      ? (await client.query("select id, applied_at from schema_migrations order by id")).rows
      : [];
    const missingMigrations = expectedMigrations.filter((name) => !applied.some((row) => row.id === name));
    emit("migrations", { applied, missingMigrations, extraMigrations: applied.map((row) => row.id).filter((name) => !expectedMigrations.includes(name)) });
    for (const table of tables) {
      const columns = (await client.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1 and data_type in ('timestamp with time zone','timestamp without time zone','date') order by ordinal_position", [table])).rows;
      const aggregates = ["count(*)::text as row_count", ...columns.flatMap(({ column_name }, i) => [
        `min(${quote(column_name)})::text as ${quote(`min_${i}`)}`,
        `max(${quote(column_name)})::text as ${quote(`max_${i}`)}`
      ])];
      const result = (await client.query(`select ${aggregates.join(",")} from public.${quote(table)}`)).rows[0];
      emit("table_aggregate", { table, count: result.row_count, timestamps: Object.fromEntries(columns.map(({ column_name }, i) => [column_name, { min: result[`min_${i}`], max: result[`max_${i}`] }])) });
    }
    const constraints = (await client.query(`
      select c.conname as name, r.relname as table_name, c.contype as type, c.convalidated as validated,
             c.condeferrable as deferrable, pg_get_constraintdef(c.oid) as definition
      from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace
      where n.nspname='public' and c.contype in ('f','c','p','u') order by r.relname,c.conname
    `)).rows;
    // Report definition hashes, never potential customer-specific constraint constants.
    emit("constraints", { constraints: constraints.map(({ definition, ...row }) => ({ ...row, definitionSha256: createHash("sha256").update(definition).digest("hex") })) });
    const indexes = (await client.query(`
      select t.relname as table_name, i.relname as index_name, x.indisunique as unique_index,
             x.indisvalid as valid, x.indisready as ready
      from pg_index x join pg_class i on i.oid=x.indexrelid join pg_class t on t.oid=x.indrelid
      join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' order by t.relname,i.relname
    `)).rows;
    emit("indexes", { indexes });
    const triggers = (await client.query(`
      select r.relname as table_name, t.tgname as name, t.tgenabled as enabled,
             p.proname as function_name, pg_get_triggerdef(t.oid) as trigger_definition,
             pg_get_functiondef(p.oid) as function_definition
      from pg_trigger t join pg_class r on r.oid=t.tgrelid join pg_namespace n on n.oid=r.relnamespace
      join pg_proc p on p.oid=t.tgfoid where n.nspname='public' and not t.tgisinternal order by r.relname,t.tgname
    `)).rows;
    emit("triggers", { triggers: triggers.map(({ trigger_definition, function_definition, ...row }) => ({ ...row,
      triggerDefinitionSha256: createHash("sha256").update(trigger_definition).digest("hex"),
      functionDefinitionSha256: createHash("sha256").update(function_definition).digest("hex")
    })) });
    const missingRequiredTriggers = ["editorial_outreach_send_gate", "marketing_post_publish_gate"].filter((name) => !triggers.some((row) => row.name === name));
    emit("required_send_gate_presence", { missingRequiredTriggers });
    emit("sequences", { sequences: (await client.query("select sequencename, start_value::text, min_value::text, max_value::text, increment_by::text, cycle, last_value::text from pg_sequences where schemaname='public' order by sequencename")).rows });
    const sampleIds = (await client.query("select distinct m.source_match_id from matches m join predictions p on p.match_id=m.id where m.source_match_id is not null and coalesce(m.source,'') <> 'recovery-verification' order by m.source_match_id limit 5")).rows.map((row) => row.source_match_id);
    emit("api_repository_checks", {
      health: true,
      dashboardMatches: (await repository.listDashboardMatches(client)).length,
      benchmarkPredictions: (await repository.listBenchmarkPredictionsForApi(client)).length,
      specialPredictions: (await repository.listSpecialPredictionsForApi(client)).length,
      historicalFixtureSample: sampleIds.length,
      historicalPredictions: (await repository.listLatestMatchPredictionsBySourceMatchIds(client, sampleIds)).length
    });
    await client.query("rollback");
    return { missingMigrations, unvalidatedConstraints: constraints.filter((row) => !row.validated).length,
      invalidIndexes: indexes.filter((row) => !row.valid || !row.ready).length,
      disabledTriggers: triggers.filter((row) => !["O", "A"].includes(row.enabled)).length,
      missingRequiredTriggers };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function writeEvidence(pool, repository, env) {
  const sourceId = `recovery-verification:${env.RECOVERY_RUN_ID}`;
  const matchId = sourceId;
  const modelIds = ["nexus", "pulse", "edge"].map((profile) => `recovery-verification:${env.RECOVERY_RUN_ID}:${profile}`);
  emit("controlled_write_scope", { matchId, sourceId, modelIds, synthetic: true, cleanupBeforeCutoverRequired: true });
  const collision = await pool.query("select (select count(*) from matches where id=$1 or source_match_id=$1)::int as matches, (select count(*) from models where id=any($2::text[]))::int as models", [matchId, modelIds]);
  assert.equal(collision.rows[0].matches + collision.rows[0].models, 0, "RECOVERY_RUN_ALREADY_EXISTS");
  const { BedrockRuntimeClient } = await import("@aws-sdk/client-bedrock-runtime");
  const { BedrockClient, generatePublicSportsPredictions } = await import(pathToFileURL(resolve(ROOT, "packages/llm/src/index.ts")).href);
  const runtime = new BedrockRuntimeClient({ region: EXPECTED_REGION, maxAttempts: 1, requestHandler: { connectionTimeout: 8000, requestTimeout: 45000 } });
  const fixture = {
    sport: "football", competition: "RECOVERY VERIFICATION ONLY — fictional fixture",
    utcDate: "2099-01-01T12:00:00.000Z", homeTeam: "Recovery Test Alpha (fictional)",
    awayTeam: "Recovery Test Beta (fictional)", venue: "Synthetic isolated test", round: "Recovery validation"
  };
  let predictions;
  try {
    predictions = await generatePublicSportsPredictions(new BedrockClient({ region: EXPECTED_REGION, client: runtime }), MODEL_ID, fixture);
  } finally { runtime.destroy(); }
  assert.equal(predictions.length, 3, "UNEXPECTED_PREDICTION_COUNT");
  assert.deepEqual(predictions.map((row) => row.profile).sort(), ["edge", "nexus", "pulse"], "UNEXPECTED_PROFILES");
  await repository.upsertPredictionMatch(pool, { id: matchId, ...fixture, source: "recovery-verification", sourceMatchId: sourceId, status: "SCHEDULED", stage: "RECOVERY TEST ONLY" });
  await repository.storeMatchDataSnapshot(pool, { matchId, provider: "RecoveryVerification", sourceMatchId: sourceId, snapshotType: "synthetic-recovery-test", eventTimeUtc: fixture.utcDate, rawPayload: fixture, normalizedPayload: { ...fixture, recoveryOnly: true } });
  for (const prediction of predictions) {
    const modelId = `recovery-verification:${env.RECOVERY_RUN_ID}:${prediction.profile}`;
    await repository.upsertPredictionModel(pool, { id: modelId, name: prediction.profile.toUpperCase(), provider: "Bedrock", modelVersion: MODEL_ID, modelFamily: "bedrock", supportsToolAccess: false, isOpenWeight: false });
    await repository.upsertStoredPrediction(pool, { ...prediction, matchId, modelId, modelVersion: MODEL_ID, inputContext: { ...fixture, recoveryOnly: true } });
  }
  await pool.query("update models set active=false where id=any($1::text[])", [modelIds]);
  const stored = await repository.listLatestMatchPredictionsBySourceMatchIds(pool, [sourceId]);
  assert.equal(stored.length, 3, "PREDICTION_ROUNDTRIP_FAILED");
  for (const row of stored) {
    assert.equal(row.model_provider, "Bedrock", "WRONG_STORED_PROVIDER");
    assert.ok(modelIds.includes(row.model_id), "WRONG_STORED_MODEL");
    assert.equal(row.match_id, matchId, "WRONG_STORED_MATCH");
  }
  const revisions = await pool.query("select count(*)::int as count from prediction_revisions where match_id=$1", [matchId]);
  assert.equal(revisions.rows[0].count, 3, "REVISION_ROUNDTRIP_FAILED");
  emit("controlled_write_passed", { matchId, modelIds, predictions: stored.length, revisions: revisions.rows[0].count,
    providerRequestIds: [...new Set(predictions.map((row) => row.providerResponseId))],
    inputTokens: predictions[0].inputTokens, outputTokens: predictions[0].outputTokens,
    cleanupBeforeCutoverRequired: true });
}

async function backupEvidence(pool, target, caFile, env) {
  assert.equal(env, process.env, "BACKUP_REQUIRES_CURRENT_EPHEMERAL_PROCESS_ENV");
  // Re-check all pure configuration guards immediately before overriding this
  // one-off process; no ECS task definition, secret or production env is edited.
  prepareTarget(env, "backup");
  const changes = prepareBackupEnvironment(target, caFile);
  const previous = new Map(Object.keys(changes).map((key) => [key, process.env[key]]));
  const startedAt = (await pool.query("select now() as now")).rows[0].now;
  emit("isolated_backup_scope", { bucket: BACKUP_BUCKET, prefix: BACKUP_PREFIX,
    targetHost: target.host, localDirectory: BACKUP_DIRECTORY, lifecycleDays: 35,
    lifecycleProtectedArchive: false, sourceBackupsUnchanged: true });
  const previousUmask = process.umask(0o077);
  try {
    mkdirSync(BACKUP_DIRECTORY, { recursive: true, mode: 0o700 });
    assert.ok(lstatSync(BACKUP_DIRECTORY).isDirectory(), "BACKUP_DIRECTORY_MUST_NOT_BE_SYMLINK");
    chmodSync(BACKUP_DIRECTORY, 0o700);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    const { main: exportBackup } = await import(pathToFileURL(resolve(ROOT, "apps/worker/src/jobs/export-postgres-backup.ts")).href);
    await exportBackup();
  } finally {
    process.umask(previousUmask);
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
  const result = await pool.query(`
    select ba.id, ba.artifact_type, ba.storage_url, ba.bytes::text, ba.sha256, ba.schema_version,
           ba.created_at_utc, bv.status as verification_status, bv.verified_at_utc, bv.row_counts
    from backup_artifacts ba join backup_verifications bv on bv.artifact_id=ba.id
    where ba.created_at_utc >= $1 and ba.storage_url like $2
    order by ba.created_at_utc desc, bv.verified_at_utc desc
  `, [startedAt, `s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/%`]);
  assert.equal(result.rows.length, 1, "FRESH_BACKUP_AUDIT_ROW_REQUIRED");
  const artifact = result.rows[0];
  assert.equal(artifact.verification_status, "succeeded", "FRESH_BACKUP_VERIFICATION_REQUIRED");
  assert.equal(artifact.artifact_type, "logical_export", "UNEXPECTED_BACKUP_TYPE");
  assert.match(artifact.sha256, /^[a-f0-9]{64}$/, "BACKUP_CHECKSUM_REQUIRED");
  assert.ok(Number(artifact.bytes) > 0, "BACKUP_SIZE_REQUIRED");
  emit("isolated_backup_passed", { artifact, uploadedAndDownloadedChecksumMatched: true,
    temporaryTableRestoreDrill: "passed", fullForeignKeyAndTriggerRestoreDrill: false,
    lifecycleDays: 35, lifecycleProtectedArchive: false, productionCutover: false });
}

export async function main(phase = process.argv[2], env = process.env) {
  let stage = "guards";
  let pool;
  const maxSeconds = phase === "backup" ? 600 : 180;
  const timer = setTimeout(() => { emit("recovery_verification_failed", { stage, code: `HARD_TIMEOUT_${maxSeconds}_SECONDS` }); process.exit(124); }, maxSeconds * 1000);
  try {
    const target = prepareTarget(env, phase);
    const taskArn = await verifyEcsAccount(env);
    emit("target_confirmed", { phase, host: target.host, account: EXPECTED_ACCOUNT, taskArn, productionConfigUnchanged: true });
    const caFile = env.DATABASE_SSL_CA_FILE ?? "/etc/ssl/certs/aws-rds-global-bundle.pem";
    const ca = readFileSync(caFile, "utf8");
    assert.ok(ca.includes("-----BEGIN CERTIFICATE-----"), "RDS_CA_REQUIRED");
    const { default: pg } = await import("pg");
    const repository = await import(pathToFileURL(resolve(ROOT, "packages/db/src/index.ts")).href);
    pool = new pg.Pool({ connectionString: target.connectionString, max: 2, connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 5000, statement_timeout: 15000, query_timeout: 18000,
      application_name: `isolated-recovery-${phase}`, ssl: { ca, rejectUnauthorized: true } });
    stage = "read_only_evidence";
    const checks = await readEvidence(pool, repository);
    emit("read_only_phase_complete", { ...checks, semanticConstraintValidationNotPerformed: true });
    if (phase === "write" || phase === "backup") {
      assert.equal(checks.missingMigrations.length + checks.unvalidatedConstraints + checks.invalidIndexes + checks.disabledTriggers + checks.missingRequiredTriggers.length, 0, "SCHEMA_REVIEW_REQUIRED_BEFORE_WRITE");
    }
    if (phase === "write") {
      stage = "controlled_write";
      await writeEvidence(pool, repository, env);
    }
    if (phase === "backup") {
      stage = "isolated_backup_restore_drill";
      await backupEvidence(pool, target, caFile, env);
    }
    emit("recovery_verification_passed", { phase, productionCutover: false,
      freshLogicalBackupDrillPerformed: phase === "backup", fullForeignKeyAndTriggerRestoreDrillPerformed: false });
  } catch (error) {
    // Database/SDK errors can contain passwords, data or signed URLs. Never log them.
    const code = error?.code && /^[A-Za-z0-9_]+$/.test(error.code) ? error.code : "CHECK_FAILED";
    emit("recovery_verification_failed", { stage, code,
      check: error?.code === "ERR_ASSERTION" && /^[A-Z0-9_]+$/.test(error.message) ? error.message : undefined });
    process.exitCode = 1;
  } finally {
    await pool?.end().catch(() => {});
    clearTimeout(timer);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
