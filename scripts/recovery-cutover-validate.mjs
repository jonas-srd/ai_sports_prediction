/**
 * Bounded RDS cutover validation. Never starts a worker or changes secrets/config.
 * inspect/prove/production-proof are read-only. cleanup deletes only the exact 11 synthetic rows,
 * after rollback-only trigger probes. May be injected into the existing ECS image:
 * node --import tsx --input-type=module -e '<source>; await main("inspect")'
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const EXPECTED_ACCOUNT = "186581960948";
export const EXPECTED_REGION = "eu-central-1";
export const EXPECTED_TARGET = "ai-sports-prediction-db-recovery-20260913";
export const EXPECTED_TARGET_HOST = "ai-sports-prediction-db-recovery-20260913.cl44cuw6mk0e.eu-central-1.rds.amazonaws.com";
export const EXPECTED_SOURCE_HOST = "ai-sports-prediction-db.cl44cuw6mk0e.eu-central-1.rds.amazonaws.com";
export const EXPECTED_RUN = "recovery-20260913-a";
export const MATCH_ID = `recovery-verification:${EXPECTED_RUN}`;
export const MODEL_IDS = ["nexus", "pulse", "edge"].map((p) => `${MATCH_ID}:${p}`);
const MODEL_VERSION = "eu.amazon.nova-2-lite-v1:0";
export const PRODUCTION_MODEL_IDS = ["nexus", "pulse", "edge"].map((p) => `bedrock:${MODEL_VERSION}:${p}`);
export const PRODUCTION_SINCE = "2026-09-13T15:00:00.000Z";
const PRODUCTION_BEFORE = "2026-09-14T00:00:00.000Z";
export const PRODUCTION_BACKUP_PREFIX = "s3://ai-sports-prediction/ai-sports-prediction/backups/recovery-production-20260913/";
const ROOT = process.env.RECOVERY_APP_ROOT ? resolve(process.env.RECOVERY_APP_ROOT) : resolve(dirname(fileURLToPath(import.meta.url)), "..");
const emit = (event, fields = {}) => console.log(JSON.stringify({ event, ...fields }));
export const quoteIdentifier = (value) => '"' + value.replaceAll('"', '""') + '"';
const qualified = (schema, table) => `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;

export function prepareTarget(env, phase) {
  assert.ok(["inspect", "cleanup", "prove", "production-proof"].includes(phase), "INVALID_PHASE");
  assert.equal(env.RECOVERY_TARGET_DB_IDENTIFIER, EXPECTED_TARGET, "TARGET_IDENTIFIER_MISMATCH");
  assert.equal(env.RECOVERY_TARGET_HOST, EXPECTED_TARGET_HOST, "TARGET_HOST_MISMATCH");
  for (const key of ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN", "AWS_PROFILE", "AWS_SHARED_CREDENTIALS_FILE", "AWS_CONFIG_FILE", "AWS_WEB_IDENTITY_TOKEN_FILE", "AWS_ROLE_ARN", "AWS_CONTAINER_CREDENTIALS_FULL_URI", "PGOPTIONS", "PGSERVICE", "PGSERVICEFILE"]) {
    assert.ok(!env[key], "ALTERNATE_CONNECTION_OR_CREDENTIALS_NOT_ALLOWED");
  }
  for (const key of Object.keys(env)) if (/^AWS_ENDPOINT_URL(?:_|$)/.test(key)) assert.ok(!env[key], "CUSTOM_AWS_ENDPOINT_NOT_ALLOWED");
  assert.notEqual(env.NODE_TLS_REJECT_UNAUTHORIZED, "0", "TLS_DISABLED");
  assert.ok(env.DATABASE_URL, "DATABASE_URL_REQUIRED");
  const url = new URL(env.DATABASE_URL);
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol), "INVALID_DATABASE_PROTOCOL");
  assert.ok([EXPECTED_SOURCE_HOST, EXPECTED_TARGET_HOST].includes(url.hostname), "DATABASE_HOST_NOT_ALLOWLISTED");
  assert.ok(!url.port || url.port === "5432", "UNEXPECTED_DATABASE_PORT");
  assert.ok(!url.hash, "DATABASE_FRAGMENT_NOT_ALLOWED");
  for (const key of [...url.searchParams.keys()]) {
    if (/^ssl/i.test(key)) url.searchParams.delete(key);
    else assert.ok(["application_name", "fallback_application_name", "client_encoding"].includes(key), "DATABASE_QUERY_OVERRIDE_NOT_ALLOWED");
  }
  if (phase === "cleanup") {
    assert.equal(env.RECOVERY_CUTOVER_APPROVED, "production-cutover-20260913", "CLEANUP_APPROVAL_REQUIRED");
    assert.equal(env.RECOVERY_RUN_ID, EXPECTED_RUN, "RUN_ID_MISMATCH");
  }
  url.hostname = EXPECTED_TARGET_HOST;
  return { host: url.hostname, connectionString: url.toString() };
}

async function verifyEcsAccount(env) {
  assert.match(env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI ?? "", /^\/v2\/credentials\/[a-zA-Z0-9-]+$/, "ECS_CREDENTIALS_REQUIRED");
  const metadata = new URL(env.ECS_CONTAINER_METADATA_URI_V4 ?? "http://invalid");
  assert.equal(metadata.protocol, "http:", "INVALID_ECS_METADATA");
  assert.equal(metadata.hostname, "169.254.170.2", "INVALID_ECS_METADATA");
  assert.ok(!metadata.port && !metadata.username && !metadata.password && !metadata.search && !metadata.hash, "INVALID_ECS_METADATA");
  assert.match(metadata.pathname, /^\/v4\/[a-zA-Z0-9-]+$/, "INVALID_ECS_METADATA");
  const response = await fetch(`${metadata.href}/task`, { signal: AbortSignal.timeout(5000), redirect: "error" });
  assert.ok(response.ok, "ECS_METADATA_FAILED");
  const task = await response.json();
  assert.match(task.TaskARN ?? "", /^arn:aws:ecs:eu-central-1:186581960948:task\/ai-sports-prediction\/[a-f0-9]+$/, "ACCOUNT_OR_CLUSTER_MISMATCH");
  return task.TaskARN;
}

export function foreignKeyViolationSql(fk) {
  assert.ok(Array.isArray(fk.child_columns) && Array.isArray(fk.parent_columns) && fk.child_columns.length > 0 && fk.child_columns.length === fk.parent_columns.length, "INVALID_FK_COLUMNS");
  assert.ok(["s", "f"].includes(fk.match_type), "UNSUPPORTED_FK_MATCH_TYPE");
  assert.ok(Array.isArray(fk.operators) && fk.operators.length === fk.child_columns.length && fk.operators.every((v) => v === "="), "UNSUPPORTED_FK_OPERATOR");
  const present = fk.child_columns.map((c) => `c.${quoteIdentifier(c)} IS NOT NULL`);
  const missing = fk.child_columns.map((c) => `c.${quoteIdentifier(c)} IS NULL`);
  const join = fk.child_columns.map((c, i) => `p.${quoteIdentifier(fk.parent_columns[i])} = c.${quoteIdentifier(c)}`).join(" AND ");
  const orphan = `((${present.join(" AND ")}) AND NOT EXISTS (SELECT 1 FROM ${qualified(fk.parent_schema, fk.parent_table)} p WHERE ${join}))`;
  const partial = fk.match_type === "f" ? ` OR ((${present.join(" OR ")}) AND (${missing.join(" OR ")}))` : "";
  return `SELECT count(*)::int AS violations FROM ${qualified(fk.child_schema, fk.child_table)} c WHERE ${orphan}${partial}`;
}

const INCOMING = {
  matches: ["predictions", "benchmark_predictions", "match_odds", "odds_refresh_checks", "marketing_campaigns", "match_data_snapshots", "prediction_revisions"],
  models: ["predictions", "benchmark_predictions", "special_predictions", "prediction_revisions"],
  predictions: ["scores", "marketing_campaigns", "prediction_revisions"],
  prediction_revisions: [], match_data_snapshots: []
};
export function assertKnownIncomingForeignKeys(fks) {
  for (const fk of fks) if (Object.hasOwn(INCOMING, fk.parent_table) && fk.parent_schema === "public") {
    assert.ok(fk.child_schema === "public" && INCOMING[fk.parent_table].includes(fk.child_table), "UNKNOWN_CLEANUP_FK_CHILD");
  }
  for (const [parent, children] of Object.entries(INCOMING)) for (const child of children) {
    assert.ok(fks.some((fk) => fk.parent_schema === "public" && fk.child_schema === "public" && fk.parent_table === parent && fk.child_table === child), "EXPECTED_CLEANUP_FK_MISSING");
  }
}

async function count(client, sql, params = []) {
  const result = await client.query(sql, params);
  return Number(Object.values(result.rows[0])[0]);
}
async function tlsGuard(client) {
  assert.equal((await client.query("select ssl from pg_stat_ssl where pid=pg_backend_pid()")).rows[0]?.ssl, true, "TLS_NOT_ACTIVE");
}
async function begin(client, readOnly) {
  await client.query(readOnly ? "begin isolation level repeatable read read only" : "begin isolation level serializable");
  await client.query("set local statement_timeout='15000ms'");
  await client.query("set local lock_timeout='5000ms'");
  await client.query("set local idle_in_transaction_session_timeout='30000ms'");
  await client.query("set local search_path=pg_catalog,public");
  assert.equal((await client.query("show session_replication_role")).rows[0].session_replication_role, "origin", "UNSAFE_REPLICATION_ROLE");
  await tlsGuard(client);
}

async function inspect(client, phase) {
  await begin(client, true);
  try {
    const expected = readdirSync(resolve(ROOT, "packages/db/migrations/postgres")).filter((f) => f.endsWith(".sql")).sort();
    const applied = (await client.query("select id from schema_migrations order by id")).rows.map((r) => r.id);
    assert.deepEqual(applied, expected, "MIGRATION_SET_MISMATCH");
    const fks = (await client.query(`
      select c.conname, c.convalidated as validated, c.confmatchtype as match_type,
        n.nspname as child_schema, t.relname as child_table, pn.nspname as parent_schema, pt.relname as parent_table,
        array(select a.attname::text from unnest(c.conkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num order by k.ord) as child_columns,
        array(select a.attname::text from unnest(c.confkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.num order by k.ord) as parent_columns,
        array(select o.oprname::text from unnest(c.conpfeqop) with ordinality k(num,ord) join pg_operator o on o.oid=k.num order by k.ord) as operators
      from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
      join pg_class pt on pt.oid=c.confrelid join pg_namespace pn on pn.oid=pt.relnamespace
      where c.contype='f' and (n.nspname='public' or pn.nspname='public') order by n.nspname,t.relname,c.conname
    `)).rows;
    assertKnownIncomingForeignKeys(fks);
    let fkViolations = 0;
    for (const fk of fks) {
      assert.equal(fk.validated, true, "UNVALIDATED_FK");
      assert.equal(fk.child_schema, "public", "UNEXPECTED_EXTERNAL_FK");
      assert.equal(fk.parent_schema, "public", "UNEXPECTED_EXTERNAL_FK");
      fkViolations += await count(client, foreignKeyViolationSql(fk));
    }
    const checks = (await client.query(`select c.conname, c.convalidated as validated, n.nspname as schema_name,
      r.relname as table_name, pg_get_expr(c.conbin,c.conrelid) as expression
      from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace
      where n.nspname='public' and c.contype='c' order by r.relname,c.conname`)).rows;
    let checkViolations = 0;
    for (const constraint of checks) {
      assert.equal(constraint.validated, true, "UNVALIDATED_CHECK");
      // Expression comes from the existing restored PostgreSQL catalog, not input.
      checkViolations += await count(client, `select count(*)::int from ${qualified(constraint.schema_name, constraint.table_name)} where (${constraint.expression}) IS FALSE`);
    }
    const badIndexes = await count(client, `select count(*)::int from pg_index i join pg_class r on r.oid=i.indrelid join pg_namespace n on n.oid=r.relnamespace where n.nspname='public' and (not i.indisvalid or not i.indisready)`);
    const triggers = (await client.query(`select t.tgname as name,t.tgenabled as enabled,p.proname as function_name,nf.nspname as function_schema
      from pg_trigger t join pg_class r on r.oid=t.tgrelid join pg_namespace n on n.oid=r.relnamespace
      join pg_proc p on p.oid=t.tgfoid join pg_namespace nf on nf.oid=p.pronamespace
      where n.nspname='public' and not t.tgisinternal order by t.tgname`)).rows;
    assert.deepEqual(triggers.map((t) => t.name), ["editorial_outreach_send_gate", "marketing_campaign_touch", "marketing_post_publish_gate"], "TRIGGER_SET_MISMATCH");
    assert.ok(triggers.every((t) => ["O", "A"].includes(t.enabled) && t.function_schema === "public"), "TRIGGER_DISABLED_OR_UNEXPECTED_SCHEMA");
    const revisionMismatch = await count(client, "select count(*)::int from prediction_revisions r join predictions p on p.id=r.prediction_id where r.match_id<>p.match_id or r.model_id<>p.model_id");
    const campaignMismatch = await count(client, "select count(*)::int from marketing_campaigns c join predictions p on p.id=c.prediction_id where c.match_id<>p.match_id");
    const auth = (await client.query(`select
      (select count(*)::int from widget_customers) as widget_customers,
      (select count(*)::int from widget_customer_login_tokens) as login_tokens,
      (select count(*)::int from social_connections where status in ('connected','refresh_failed')) as active_social_connections,
      (select count(*)::int from social_connections where status='disconnected') as disconnected_social_connections,
      (select count(*)::int from newsletter_subscribers) as newsletter_subscribers,
      (select count(*)::int from newsletter_campaign_recipients where sent_at_utc is null) as unsent_newsletter_recipients`)).rows[0];
    emit("cutover_auth_aggregate", { ...auth, noEmailBillingOAuthCallsPerformed: true });
    emit("cutover_integrity", { foreignKeys: fks.length, fkViolations, checks: checks.length, checkViolations, badIndexes, revisionMismatch, campaignMismatch, migrationCount: applied.length, enabledTriggers: triggers.length });
    assert.equal(fkViolations + checkViolations + badIndexes + revisionMismatch + campaignMismatch, 0, "SEMANTIC_INTEGRITY_FAILURE");
    assert.equal(auth.widget_customers + auth.login_tokens + auth.active_social_connections, 0, "RESTORED_AUTH_RECONCILIATION_REQUIRED");
    const synthetic = (await client.query(`select
      (select count(*)::int from matches where id=$1 or source_match_id=$1 or source='recovery-verification') as matches,
      (select count(*)::int from models where id like 'recovery-verification:%') as models,
      (select count(*)::int from predictions where match_id=$1 or model_id=any($2::text[])) as predictions,
      (select count(*)::int from prediction_revisions where match_id=$1 or model_id=any($2::text[])) as revisions,
      (select count(*)::int from match_data_snapshots where match_id=$1 or provider='RecoveryVerification') as snapshots`, [MATCH_ID, MODEL_IDS])).rows[0];
    emit("cutover_synthetic_aggregate", synthetic);
    if (phase === "prove") assert.equal(Object.values(synthetic).reduce((a, b) => a + b, 0), 0, "SYNTHETIC_RECORDS_REMAIN");
    else assert.deepEqual(synthetic, { matches: 1, models: 3, predictions: 3, revisions: 3, snapshots: 1 }, "SYNTHETIC_SCOPE_MISMATCH");
    await client.query("rollback");
  } catch (error) { await client.query("rollback").catch(() => {}); throw error; }
}

async function requireExactSyntheticScope(client) {
  const m = await count(client, `select count(*)::int from matches where id=$1 and source_match_id=$1 and source='recovery-verification'
    and utc_date='2099-01-01T12:00:00Z' and home_team='Recovery Test Alpha (fictional)' and away_team='Recovery Test Beta (fictional)'`, [MATCH_ID]);
  assert.equal(m, 1, "EXACT_SYNTHETIC_MATCH_REQUIRED");
  assert.equal(await count(client, "select count(*)::int from models where id=any($1::text[]) and not active and provider='Bedrock' and model_version=$2", [MODEL_IDS, MODEL_VERSION]), 3, "EXACT_SYNTHETIC_MODELS_REQUIRED");
  const predictions = (await client.query("select id,match_id,model_id,model_version from predictions where match_id=$1 or model_id=any($2::text[]) order by model_id", [MATCH_ID, MODEL_IDS])).rows;
  assert.equal(predictions.length, 3, "EXACT_SYNTHETIC_PREDICTIONS_REQUIRED");
  assert.deepEqual(predictions.map((p) => p.model_id).sort(), [...MODEL_IDS].sort(), "SYNTHETIC_PREDICTION_MODELS_MISMATCH");
  assert.ok(predictions.every((p) => p.match_id === MATCH_ID && p.model_version === MODEL_VERSION), "SYNTHETIC_PREDICTION_SCOPE_MISMATCH");
  const ids = predictions.map((p) => p.id);
  const revisions = (await client.query("select prediction_id,match_id,model_id from prediction_revisions where match_id=$1 or model_id=any($2::text[]) or prediction_id=any($3::text[])", [MATCH_ID, MODEL_IDS, ids])).rows;
  assert.equal(revisions.length, 3, "EXACT_SYNTHETIC_REVISIONS_REQUIRED");
  assert.ok(revisions.every((r) => predictions.some((p) => p.id === r.prediction_id && p.match_id === r.match_id && p.model_id === r.model_id)), "SYNTHETIC_REVISION_SCOPE_MISMATCH");
  assert.equal(await count(client, "select count(*)::int from match_data_snapshots where match_id=$1", [MATCH_ID]), 1, "EXACT_SYNTHETIC_SNAPSHOT_COUNT_REQUIRED");
  assert.equal(await count(client, "select count(*)::int from match_data_snapshots where match_id=$1 and source_match_id=$1 and provider='RecoveryVerification' and snapshot_type='synthetic-recovery-test' and normalized_payload->>'recoveryOnly'='true'", [MATCH_ID]), 1, "EXACT_SYNTHETIC_SNAPSHOT_REQUIRED");
  const dependentQueries = [
    ["scores", "select count(*)::int from scores where prediction_id=any($1::text[])", [ids]],
    ["benchmark_predictions", "select count(*)::int from benchmark_predictions where match_id=$1 or model_id=any($2::text[])", [MATCH_ID, MODEL_IDS]],
    ["special_predictions", "select count(*)::int from special_predictions where model_id=any($1::text[])", [MODEL_IDS]],
    ["marketing_campaigns", "select count(*)::int from marketing_campaigns where match_id=$1 or prediction_id=any($2::text[])", [MATCH_ID, ids]],
    ["match_odds", "select count(*)::int from match_odds where match_id=$1", [MATCH_ID]],
    ["odds_refresh_checks", "select count(*)::int from odds_refresh_checks where match_id=$1", [MATCH_ID]]
  ];
  for (const [, sql, params] of dependentQueries) assert.equal(await count(client, sql, params), 0, "UNEXPECTED_SYNTHETIC_DEPENDENT");
  return ids;
}

async function expectGateBlocked(client, sql, params, expectedMessage) {
  await client.query("savepoint gate_probe");
  let blocked = false;
  try { await client.query(sql, params); }
  catch (error) { blocked = error?.code === "P0001" && error.message === expectedMessage; }
  finally { await client.query("rollback to savepoint gate_probe"); await client.query("release savepoint gate_probe"); }
  assert.equal(blocked, true, "EXPECTED_SEND_GATE_DID_NOT_BLOCK");
}

async function triggerProbes(client) {
  await begin(client, false);
  try {
    const predictionIds = await requireExactSyntheticScope(client);
    const id = "recovery-cutover-rollback-probe-20260913";
    assert.equal(await count(client, "select (select count(*) from editorial_prospects where id=$1)+(select count(*) from editorial_outreach_drafts where id=$1)+(select count(*) from marketing_campaigns where id=$1)+(select count(*) from marketing_posts where id=$1)", [id]), 0, "TRIGGER_PROBE_COLLISION");
    await client.query("insert into editorial_prospects(id,publication_name,domain,website_url) values($1,'ROLLBACK ONLY Recovery Probe','recovery-cutover-20260913.invalid','https://recovery-cutover-20260913.invalid')", [id]);
    await client.query("insert into editorial_outreach_drafts(id,prospect_id,subject,text_body) values($1,$1,'ROLLBACK ONLY','ROLLBACK ONLY')", [id]);
    const send = "update editorial_outreach_drafts set status='sending' where id=$1";
    await expectGateBlocked(client, send, [id], "Editorial outreach is blocked: documented consent or the existing-customer exception is required.");
    await client.query("update editorial_prospects set consent_status='explicit_consent',consent_evidence='ROLLBACK ONLY synthetic gate probe',suppressed_at_utc=now() where id=$1", [id]);
    await expectGateBlocked(client, send, [id], "Editorial outreach is blocked: prospect is suppressed.");
    await client.query("update editorial_prospects set suppressed_at_utc=null where id=$1", [id]);
    await expectGateBlocked(client, send, [id], "Editorial outreach is blocked: human approval is required.");
    await client.query("update editorial_outreach_drafts set approved_by='ROLLBACK ONLY synthetic test',approved_at_utc=now(),status='sending' where id=$1", [id]);
    await client.query("insert into marketing_campaigns(id,prediction_id,match_id) values($1,$2,$3)", [id, predictionIds[0], MATCH_ID]);
    await client.query("insert into marketing_posts(id,campaign_id,platform,body) values($1,$1,'reddit','ROLLBACK ONLY')", [id]);
    const publish = "update marketing_posts set status=$2 where id=$1";
    await expectGateBlocked(client, publish, [id, "publishing"], "Marketing publishing is blocked: campaign approval is required.");
    await client.query("update marketing_campaigns set status='approved',approved_by='ROLLBACK ONLY synthetic test',approved_at_utc=now() where id=$1", [id]);
    for (const status of ["publishing", "published", "uploaded_draft"]) await expectGateBlocked(client, publish, [id, status], "Marketing publishing is blocked: post approval is required.");
    await client.query("update marketing_posts set approved_by='ROLLBACK ONLY synthetic test',approved_at_utc=now() where id=$1", [id]);
    for (const status of ["publishing", "published", "uploaded_draft"]) await client.query(publish, [id, status]);
    await client.query("rollback");
    emit("cutover_send_gates_passed", { blockedCases: 7, positiveCases: 4, allProbeRowsRolledBack: true, externalCalls: 0 });
  } catch (error) { await client.query("rollback").catch(() => {}); throw error; }
}

async function cleanup(client) {
  await begin(client, false);
  try {
    const tables = [...new Set([...Object.keys(INCOMING), ...Object.values(INCOMING).flat()])].sort();
    await client.query(`lock table ${tables.map((t) => qualified("public", t)).join(",")} in share row exclusive mode`);
    // Recheck under locks: adding a foreign key also needs a conflicting parent
    // lock, so no new CASCADE/SET NULL child can slip in after this verification.
    const currentIncoming = (await client.query(`select n.nspname as child_schema,r.relname as child_table,
      pn.nspname as parent_schema,p.relname as parent_table from pg_constraint c
      join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace
      join pg_class p on p.oid=c.confrelid join pg_namespace pn on pn.oid=p.relnamespace
      where c.contype='f' and pn.nspname='public'`)).rows;
    assertKnownIncomingForeignKeys(currentIncoming);
    await requireExactSyntheticScope(client);
    const steps = [
      ["prediction_revisions", "match_id=$1", [MATCH_ID], 3],
      ["match_data_snapshots", "match_id=$1", [MATCH_ID], 1],
      ["predictions", "match_id=$1", [MATCH_ID], 3],
      ["models", "id=any($1::text[])", [MODEL_IDS], 3],
      ["matches", "id=$1", [MATCH_ID], 1]
    ];
    const deleted = {};
    for (const [table, predicate, params, expected] of steps) {
      const result = await client.query(`delete from ${qualified("public", table)} where ${predicate}`, params);
      assert.equal(result.rowCount, expected, "CLEANUP_DELETE_COUNT_MISMATCH");
      deleted[table] = result.rowCount;
      assert.equal(await count(client, `select count(*)::int from ${qualified("public", table)} where ${predicate}`, params), 0, "CLEANUP_ROWS_REMAIN");
    }
    await client.query("commit");
    emit("cutover_synthetic_cleanup_committed", { deleted, totalDeleted: 11, originalBackupsUnchanged: true });
  } catch (error) { await client.query("rollback").catch(() => {}); throw error; }
}

export function assertProductionEvidence(evidence, backup) {
  for (const key of ["prediction_count", "matched_revision_count", "profile_count", "fixture_count"]) {
    assert.ok(Number.isSafeInteger(evidence[key]) && evidence[key] >= 0, "INVALID_PRODUCTION_AGGREGATE");
  }
  assert.ok(evidence.prediction_count >= 3 && evidence.matched_revision_count >= 3, "REAL_BEDROCK_PREDICTION_BATCH_REQUIRED");
  assert.equal(evidence.profile_count, 3, "ALL_THREE_PRODUCTION_PROFILES_REQUIRED");
  assert.ok(evidence.fixture_count >= 1, "REAL_PUBLIC_SPORT_FIXTURE_REQUIRED");
  const firstPredictionAt = new Date(evidence.first_generated_at_utc).getTime();
  assert.ok(Number.isFinite(firstPredictionAt) && firstPredictionAt >= Date.parse(PRODUCTION_SINCE) && firstPredictionAt < Date.parse(PRODUCTION_BEFORE), "FRESH_PRODUCTION_PREDICTIONS_REQUIRED");
  assert.ok(backup, "FRESH_PRODUCTION_BACKUP_REQUIRED");
  assert.equal(backup.artifact_type, "logical_export", "PRODUCTION_LOGICAL_BACKUP_REQUIRED");
  assert.equal(backup.verification_status, "succeeded", "PRODUCTION_BACKUP_VERIFICATION_REQUIRED");
  assert.match(backup.id ?? "", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, "INVALID_PRODUCTION_BACKUP_ID");
  assert.match(backup.sha256 ?? "", /^[0-9a-f]{64}$/, "PRODUCTION_BACKUP_SHA256_REQUIRED");
  assert.ok(typeof backup.storage_url === "string" && backup.storage_url.startsWith(PRODUCTION_BACKUP_PREFIX), "PRODUCTION_BACKUP_PREFIX_MISMATCH");
  assert.match(backup.storage_url.slice(PRODUCTION_BACKUP_PREFIX.length), /^postgres-logical-[0-9TZ.\-]+\.jsonl\.gz$/, "UNEXPECTED_PRODUCTION_BACKUP_KEY");
  assert.ok(Number.isSafeInteger(Number(backup.bytes)) && Number(backup.bytes) > 0, "PRODUCTION_BACKUP_SIZE_REQUIRED");
  const createdAt = new Date(backup.created_at_utc).getTime();
  const verifiedAt = new Date(backup.verified_at_utc).getTime();
  assert.ok(Number.isFinite(createdAt) && createdAt >= firstPredictionAt && Number.isFinite(verifiedAt) && verifiedAt >= createdAt, "PRODUCTION_BACKUP_MUST_FOLLOW_FIRST_PREDICTION");
  assert.ok(backup.row_counts && typeof backup.row_counts === "object" && !Array.isArray(backup.row_counts), "PRODUCTION_BACKUP_COUNTS_REQUIRED");
  for (const [key, value] of Object.entries(backup.row_counts)) {
    assert.match(key, /^[a-z][a-z0-9_]{0,62}$/, "INVALID_PRODUCTION_BACKUP_COUNT_NAME");
    assert.ok(Number.isSafeInteger(value) && value >= 0, "INVALID_PRODUCTION_BACKUP_COUNT");
  }
}

async function productionProof(client) {
  await begin(client, true);
  try {
    // A matching archived revision is required for each counted real prediction;
    // no reasons, prompts, raw responses or customer data leave PostgreSQL.
    const cte = `with real_predictions as (
      select p.id,p.model_id,p.generated_at_utc,m.source_match_id,
        (select count(*)::int from prediction_revisions r where r.prediction_id=p.id
          and r.match_id=p.match_id and r.model_id=p.model_id and r.model_version=p.model_version
          and r.provider_response_id is not distinct from p.provider_response_id
          and r.generated_at_utc >= $2::timestamptz and r.generated_at_utc < $4::timestamptz) as revision_count
      from predictions p join matches m on m.id=p.match_id join models md on md.id=p.model_id
      where p.model_id=any($1::text[]) and p.model_version=$3 and md.provider='Bedrock'
        and md.model_version=$3 and m.source='thesportsdb' and m.source_match_id is not null
        and p.generated_at_utc >= $2::timestamptz and p.generated_at_utc < $4::timestamptz
        and m.id not like 'recovery-verification:%'
    )`;
    const params = [PRODUCTION_MODEL_IDS, PRODUCTION_SINCE, MODEL_VERSION, PRODUCTION_BEFORE];
    const evidence = (await client.query(`${cte} select count(*)::int as prediction_count,
      coalesce(sum(revision_count),0)::int as matched_revision_count,
      count(distinct model_id)::int as profile_count,count(distinct source_match_id)::int as fixture_count,
      min(generated_at_utc) as first_generated_at_utc,max(generated_at_utc) as latest_generated_at_utc
      from real_predictions where revision_count>0`, params)).rows[0];
    const sample = (await client.query(`${cte} select distinct source_match_id from real_predictions
      where revision_count>0 order by source_match_id limit 5`, params)).rows
      .map((r) => r.source_match_id).filter((id) => typeof id === "string" && /^[A-Za-z0-9:_-]{1,100}$/.test(id));
    emit("cutover_real_bedrock_aggregate", { ...evidence, modelIds: PRODUCTION_MODEL_IDS, source: "thesportsdb", since: PRODUCTION_SINCE, samplePublicSourceMatchIds: sample });
    const backup = (await client.query(`select ba.id,ba.artifact_type,ba.storage_url,ba.bytes::text,ba.sha256,
      ba.created_at_utc,bv.status as verification_status,bv.verified_at_utc,bv.row_counts
      from backup_artifacts ba join backup_verifications bv on bv.artifact_id=ba.id
      where ba.storage_url like $1 and ba.created_at_utc >= $2::timestamptz and bv.status='succeeded'
      order by ba.created_at_utc desc,bv.verified_at_utc desc limit 1`,
      [`${PRODUCTION_BACKUP_PREFIX}%`, evidence.first_generated_at_utc])).rows[0];
    assertProductionEvidence(evidence, backup);
    emit("cutover_production_backup_proof", { artifact: backup, followsFirstNewPrediction: true, temporaryRestoreAudit: "succeeded", fullBackupForeignKeyRestoreProven: false });
    await client.query("rollback");
  } catch (error) { await client.query("rollback").catch(() => {}); throw error; }
}

export async function main(phase = process.argv[2], env = process.env) {
  let pool, client, stage = "guards";
  const timer = setTimeout(() => { emit("cutover_validation_failed", { stage, code: "HARD_TIMEOUT_240_SECONDS" }); process.exit(124); }, 240000);
  try {
    const target = prepareTarget(env, phase);
    const taskArn = await verifyEcsAccount(env);
    emit("cutover_target_confirmed", { phase, host: target.host, account: EXPECTED_ACCOUNT, taskArn });
    const caPath = env.DATABASE_SSL_CA_FILE ?? "/etc/ssl/certs/aws-rds-global-bundle.pem";
    assert.equal(caPath, "/etc/ssl/certs/aws-rds-global-bundle.pem", "UNEXPECTED_CA_PATH");
    const ca = readFileSync(caPath, "utf8");
    assert.ok(ca.includes("-----BEGIN CERTIFICATE-----"), "RDS_CA_REQUIRED");
    const { default: pg } = await import("pg");
    pool = new pg.Pool({ connectionString: target.connectionString, max: 1, connectionTimeoutMillis: 8000, idleTimeoutMillis: 5000,
      statement_timeout: 15000, query_timeout: 18000, application_name: `recovery-cutover-${phase}`, ssl: { ca, rejectUnauthorized: true } });
    client = await pool.connect();
    stage = "read_only_integrity";
    await inspect(client, phase === "production-proof" ? "prove" : phase);
    if (phase === "cleanup") {
      stage = "rollback_only_send_gate_tests";
      await triggerProbes(client);
      stage = "exact_synthetic_cleanup";
      await cleanup(client);
      stage = "post_cleanup_read_only_proof";
      await inspect(client, "prove");
    }
    if (phase === "production-proof") {
      stage = "read_only_real_bedrock_and_backup_proof";
      await productionProof(client);
    }
    emit("cutover_validation_passed", { phase, productionConfigurationChanged: false, syntheticCleanupCommitted: phase === "cleanup", semanticConstraintChecksPassed: true });
  } catch (error) {
    const code = error?.code && /^[A-Za-z0-9_]+$/.test(error.code) ? error.code : "CHECK_FAILED";
    emit("cutover_validation_failed", { stage, code, check: error?.code === "ERR_ASSERTION" && /^[A-Z0-9_]+$/.test(error.message) ? error.message : undefined });
    process.exitCode = 1;
  } finally { client?.release(); await pool?.end().catch(() => {}); clearTimeout(timer); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
