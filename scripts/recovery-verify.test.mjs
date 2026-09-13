import test from "node:test";
import assert from "node:assert/strict";
import { EXPECTED_TARGET, EXPECTED_TARGET_HOST, prepareTarget, prepareBackupEnvironment } from "./recovery-verify.mjs";

const sample = {
  RECOVERY_TARGET_DB_IDENTIFIER: EXPECTED_TARGET,
  RECOVERY_TARGET_HOST: EXPECTED_TARGET_HOST,
  DATABASE_URL: "postgresql://test-user:fake-password@ai-sports-prediction-db.example123.eu-central-1.rds.amazonaws.com:5432/sample?sslmode=no-verify"
};
test("target override keeps source env untouched and removes SSL query overrides", () => {
  const before = structuredClone(sample);
  const result = prepareTarget(sample, "read");
  const url = new URL(result.connectionString);
  assert.equal(url.hostname, sample.RECOVERY_TARGET_HOST);
  assert.equal(url.username, "test-user");
  assert.equal(url.password, "fake-password");
  assert.equal(url.pathname, "/sample");
  assert.equal(url.searchParams.get("sslmode"), null);
  assert.deepEqual(sample, before);
});
test("rejects source, arbitrary destinations, region and account credential ambiguity", () => {
  for (const overrides of [
    { RECOVERY_TARGET_HOST: "ai-sports-prediction-db.example123.eu-central-1.rds.amazonaws.com" },
    { RECOVERY_TARGET_HOST: `${EXPECTED_TARGET}.example123.eu-west-1.rds.amazonaws.com` },
    { RECOVERY_TARGET_HOST: `${EXPECTED_TARGET}.example123.eu-central-1.rds.amazonaws.com.attacker.example` },
    { RECOVERY_TARGET_DB_IDENTIFIER: "ai-sports-prediction-db" },
    { AWS_ACCESS_KEY_ID: "fake-key" },
    { AWS_PROFILE: "default" },
    { AWS_ENDPOINT_URL_S3: "https://unexpected.example" },
    { NODE_TLS_REJECT_UNAUTHORIZED: "0" },
    { DATABASE_URL: "postgresql://x:y@localhost:5432/test" },
    { DATABASE_URL: sample.DATABASE_URL.replace(":5432/", ":1234/") },
    { DATABASE_URL: sample.DATABASE_URL + "&host=ai-sports-prediction-db.example123.eu-central-1.rds.amazonaws.com" },
    { DATABASE_URL: sample.DATABASE_URL + "&options=-c%20default_transaction_read_only%3Doff" }
  ]) assert.throws(() => prepareTarget({ ...sample, ...overrides }, "read"));
});
test("write fails closed without phase-specific approval and a bounded run ID", () => {
  assert.throws(() => prepareTarget(sample, "write"));
  assert.throws(() => prepareTarget({ ...sample, RECOVERY_WRITE_APPROVED: "isolated-test-only", RECOVERY_RUN_ID: "bad/id" }, "write"));
  assert.doesNotThrow(() => prepareTarget({ ...sample, RECOVERY_WRITE_APPROVED: "isolated-test-only", RECOVERY_RUN_ID: "recovery-20260913-a" }, "write"));
  assert.throws(() => prepareTarget(sample, "migrate"));
});
test("backup requires explicit approval and refuses custom storage endpoints/credentials", () => {
  const approved = { ...sample, RECOVERY_WRITE_APPROVED: "isolated-test-only", RECOVERY_RUN_ID: "recovery-20260913-a" };
  assert.throws(() => prepareTarget(sample, "backup"));
  assert.doesNotThrow(() => prepareTarget(approved, "backup"));
  assert.throws(() => prepareTarget({ ...approved, BACKUP_S3_ENDPOINT: "https://unexpected.example" }, "backup"));
  assert.throws(() => prepareTarget({ ...approved, BACKUP_S3_SECRET_ACCESS_KEY: "fake" }, "backup"));
});
test("backup configuration fixes target, strict TLS, timeout and isolated storage scope without changing env", () => {
  const before = structuredClone(sample);
  const target = prepareTarget(sample, "read");
  const config = prepareBackupEnvironment(target, "/etc/ssl/certs/aws-rds-global-bundle.pem");
  assert.equal(new URL(config.DATABASE_URL).hostname, sample.RECOVERY_TARGET_HOST);
  assert.equal(new URL(config.DATABASE_URL).searchParams.get("statement_timeout"), "15000");
  assert.equal(config.DATABASE_SSL_REJECT_UNAUTHORIZED, "1");
  assert.equal(config.DATABASE_SSL_CA, undefined);
  assert.equal(config.BACKUP_S3_BUCKET, "ai-sports-prediction");
  assert.equal(config.BACKUP_S3_REGION, "eu-central-1");
  assert.equal(config.BACKUP_S3_PREFIX, "ai-sports-prediction/backups/recovery-check-20260913");
  assert.equal(config.POSTGRES_BACKUP_DIR, "/tmp/isolated-recovery-backup-20260913");
  assert.equal(config.BACKUP_S3_ENDPOINT, undefined);
  assert.deepEqual(sample, before);
});
