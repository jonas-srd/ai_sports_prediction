import test from "node:test";
import assert from "node:assert/strict";
import { EXPECTED_TARGET, EXPECTED_TARGET_HOST, EXPECTED_SOURCE_HOST, EXPECTED_RUN, PRODUCTION_MODEL_IDS, PRODUCTION_BACKUP_PREFIX, productionProofWindow, prepareTarget, foreignKeyViolationSql, quoteIdentifier, assertKnownIncomingForeignKeys, assertProductionEvidence } from "./recovery-cutover-validate.mjs";

const env = { RECOVERY_TARGET_DB_IDENTIFIER: EXPECTED_TARGET, RECOVERY_TARGET_HOST: EXPECTED_TARGET_HOST,
  DATABASE_URL: `postgresql://fake-user:fake-password@${EXPECTED_SOURCE_HOST}:5432/sample?sslmode=no-verify` };
const proofNow = Date.parse("2026-09-16T15:32:00.000Z");
const proofEnv = { RECOVERY_PROOF_SINCE_UTC: "2026-09-16T15:00:00.000Z", RECOVERY_PROOF_BEFORE_UTC: "2026-09-16T17:00:00.000Z" };
const proofWindow = productionProofWindow(proofEnv, proofNow);
test("exact old and new connection hosts both resolve only to target without mutating env", () => {
  for (const source of [EXPECTED_SOURCE_HOST, EXPECTED_TARGET_HOST]) {
    const input = { ...env, DATABASE_URL: env.DATABASE_URL.replace(EXPECTED_SOURCE_HOST, source) };
    const before = structuredClone(input);
    const result = new URL(prepareTarget(input, "inspect").connectionString);
    assert.equal(result.hostname, EXPECTED_TARGET_HOST);
    assert.equal(result.username, "fake-user"); assert.equal(result.password, "fake-password");
    assert.equal(result.searchParams.has("sslmode"), false);
    assert.deepEqual(input, before);
  }
});
test("destination, credentials and query override controls fail closed", () => {
  for (const changes of [
    { RECOVERY_TARGET_HOST: EXPECTED_SOURCE_HOST }, { RECOVERY_TARGET_DB_IDENTIFIER: "other" },
    { DATABASE_URL: env.DATABASE_URL.replace("cl44cuw6mk0e", "different") },
    { DATABASE_URL: env.DATABASE_URL.replace(":5432", ":9999") },
    { DATABASE_URL: `${env.DATABASE_URL}&host=localhost` }, { DATABASE_URL: `${env.DATABASE_URL}&options=unsafe` },
    { DATABASE_URL: `${env.DATABASE_URL}#fragment` }, { AWS_PROFILE: "default" },
    { AWS_ACCESS_KEY_ID: "fake" }, { AWS_CONTAINER_CREDENTIALS_FULL_URI: "https://example.invalid" },
    { AWS_ENDPOINT_URL_STS: "https://example.invalid" }, { PGOPTIONS: "unsafe" }, { NODE_TLS_REJECT_UNAUTHORIZED: "0" }
  ]) assert.throws(() => prepareTarget({ ...env, ...changes }, "inspect"));
});
test("cleanup requires exact run and explicit cleanup approval; proof does not authorize mutation", () => {
  assert.throws(() => prepareTarget(env, "cleanup"));
  const approved = { ...env, RECOVERY_CUTOVER_APPROVED: "production-cutover-20260913", RECOVERY_RUN_ID: EXPECTED_RUN };
  assert.doesNotThrow(() => prepareTarget(approved, "cleanup"));
  assert.throws(() => prepareTarget({ ...approved, RECOVERY_RUN_ID: `${EXPECTED_RUN}-other` }, "cleanup"));
  assert.doesNotThrow(() => prepareTarget(env, "prove"));
  assert.throws(() => prepareTarget(env, "production-proof", proofNow), /EXPLICIT_PRODUCTION_PROOF_UTC_WINDOW_REQUIRED/);
  assert.deepEqual(prepareTarget({ ...env, ...proofEnv }, "production-proof", proofNow).proofWindow, proofWindow);
  assert.throws(() => prepareTarget(approved, "migrate"));
});
test("production proof requires a fresh explicit bounded UTC window", () => {
  assert.deepEqual(productionProofWindow({ RECOVERY_PROOF_SINCE_UTC: "2026-09-16T15:00:00Z", RECOVERY_PROOF_BEFORE_UTC: "2026-09-16T17:00:00Z" }, proofNow), proofWindow);
  for (const changes of [
    { RECOVERY_PROOF_SINCE_UTC: undefined }, { RECOVERY_PROOF_BEFORE_UTC: undefined },
    { RECOVERY_PROOF_SINCE_UTC: "2026-09-16" }, { RECOVERY_PROOF_SINCE_UTC: "2026-09-16T15:00:00+00:00" },
    { RECOVERY_PROOF_SINCE_UTC: "2026-02-30T15:00:00.000Z" },
    { RECOVERY_PROOF_SINCE_UTC: "2026-09-13T15:00:00.000Z" },
    { RECOVERY_PROOF_SINCE_UTC: "2026-09-16T16:00:00.000Z" },
    { RECOVERY_PROOF_BEFORE_UTC: "2026-09-16T15:32:00.000Z" },
    { RECOVERY_PROOF_BEFORE_UTC: "2026-09-16T14:00:00.000Z" },
    { RECOVERY_PROOF_BEFORE_UTC: "2026-09-17T15:00:00.001Z" }
  ]) assert.throws(() => productionProofWindow({ ...proofEnv, ...changes }, proofNow));
  assert.throws(() => productionProofWindow(proofEnv, NaN));
});
const production = { prediction_count: 3, matched_revision_count: 3, profile_count: 3, fixture_count: 1,
  first_generated_at_utc: "2026-09-16T15:30:00.000Z", latest_generated_at_utc: "2026-09-16T15:30:01.000Z" };
const backup = { id: "00000000-0000-0000-0000-000000000001", artifact_type: "logical_export", verification_status: "succeeded",
  storage_url: `${PRODUCTION_BACKUP_PREFIX}postgres-logical-2026-09-16T15-31-00-000Z.jsonl.gz`, sha256: "a".repeat(64), bytes: "1234",
  created_at_utc: "2026-09-16T15:31:30.000Z", verified_at_utc: "2026-09-16T15:31:31.000Z", row_counts: { predictions: 506, matches: 403 } };
test("production proof accepts first real three-profile batch with a newer verified scoped backup", () => {
  assert.equal(PRODUCTION_MODEL_IDS.length, 3);
  assert.ok(PRODUCTION_MODEL_IDS.every((id) => id.startsWith("bedrock:eu.amazon.nova-2-lite-v1:0:")));
  assert.doesNotThrow(() => assertProductionEvidence(production, backup, proofWindow, proofNow));
});
test("production proof blocks missing revisions/profiles, stale data and absent or wrong backups", () => {
  for (const changes of [{ prediction_count: 2 }, { matched_revision_count: 2 }, { profile_count: 2 }, { fixture_count: 0 },
    { first_generated_at_utc: "2026-08-26T06:00:00.000Z" }, { first_generated_at_utc: "2099-01-01T12:00:00.000Z" },
    { latest_generated_at_utc: "2026-09-16T15:29:00.000Z" }, { latest_generated_at_utc: "2026-09-16T15:34:00.000Z" },
    { latest_generated_at_utc: "2026-09-16T17:00:00.000Z" }
  ]) assert.throws(() => assertProductionEvidence({ ...production, ...changes }, backup, proofWindow, proofNow));
  assert.throws(() => assertProductionEvidence(production, backup, undefined, proofNow));
  assert.throws(() => assertProductionEvidence(production, undefined, proofWindow, proofNow));
  for (const changes of [{ verification_status: "failed" }, { created_at_utc: "2026-09-16T15:00:00.000Z" },
    { verified_at_utc: "2026-09-16T15:31:00.000Z" }, { verified_at_utc: "2026-09-16T15:34:00.000Z" },
    { verified_at_utc: "2026-09-16T17:00:00.000Z" },
    { storage_url: "s3://other-bucket/backup.jsonl.gz" }, { sha256: "invalid" }, { bytes: "0" },
    { row_counts: { predictions: "506" } }, { storage_url: `${backup.storage_url}?signed=secret` }]) {
    assert.throws(() => assertProductionEvidence(production, { ...backup, ...changes }, proofWindow, proofNow));
  }
});
const fk = { child_schema: "public", child_table: "child", parent_schema: "public", parent_table: "parent",
  child_columns: ["parent_id", "tenant_id"], parent_columns: ["id", "tenant_id"], operators: ["=", "="], match_type: "s" };
test("FK SQL uses all ordered columns, excludes simple-match nulls and quotes identifiers", () => {
  const sql = foreignKeyViolationSql(fk);
  assert.ok(sql.includes('c."parent_id" IS NOT NULL AND c."tenant_id" IS NOT NULL'));
  assert.ok(sql.includes('p."id" = c."parent_id" AND p."tenant_id" = c."tenant_id"'));
  assert.ok(sql.includes('FROM "public"."child" c'));
  assert.equal(quoteIdentifier('odd"name'), '"odd""name"');
});
test("MATCH FULL catches partially null keys and unsupported semantics are rejected", () => {
  const sql = foreignKeyViolationSql({ ...fk, match_type: "f" });
  assert.ok(sql.includes('c."parent_id" IS NULL OR c."tenant_id" IS NULL'));
  assert.throws(() => foreignKeyViolationSql({ ...fk, match_type: "p" }));
  assert.throws(() => foreignKeyViolationSql({ ...fk, parent_columns: ["id"] }));
  assert.throws(() => foreignKeyViolationSql({ ...fk, operators: ["<>", "="] }));
  assert.throws(() => foreignKeyViolationSql({ ...fk, child_columns: "{parent_id,tenant_id}", parent_columns: "{id,tenant_id}" }), /INVALID_FK_COLUMNS/);
  assert.throws(() => foreignKeyViolationSql({ ...fk, operators: "{=,=}" }), /UNSUPPORTED_FK_OPERATOR/);
});
test("cleanup FK graph must be complete and refuses unexpected cascade children", () => {
  const graph = { matches: ["predictions", "benchmark_predictions", "match_odds", "odds_refresh_checks", "marketing_campaigns", "match_data_snapshots", "prediction_revisions"],
    models: ["predictions", "benchmark_predictions", "special_predictions", "prediction_revisions"], predictions: ["scores", "marketing_campaigns", "prediction_revisions"] };
  const fks = Object.entries(graph).flatMap(([parent_table, children]) => children.map((child_table) => ({ parent_schema: "public", child_schema: "public", parent_table, child_table })));
  assert.doesNotThrow(() => assertKnownIncomingForeignKeys(fks));
  assert.throws(() => assertKnownIncomingForeignKeys(fks.slice(1)));
  assert.throws(() => assertKnownIncomingForeignKeys([...fks, { parent_schema: "public", child_schema: "public", parent_table: "matches", child_table: "unexpected" }]));
});
