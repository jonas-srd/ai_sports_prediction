import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTotpUri,
  generateTotp,
  getAdminTotpSecrets,
  verifyAdminTotp
} from "./admin-totp";
import {
  checkAdminLoginRateLimit,
  clearAdminLoginFailures,
  recordAdminLoginFailure
} from "./admin-login-rate-limit";

const rfcSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

test("generates RFC 6238 compatible six-digit SHA1 codes", () => {
  assert.equal(generateTotp(rfcSecret, 59_000), "287082");
  assert.equal(generateTotp(rfcSecret, 1_111_111_109_000), "081804");
  assert.equal(generateTotp(rfcSecret, 1_234_567_890_000), "005924");
  assert.equal(generateTotp(rfcSecret, 2_000_000_000_000), "279037");
});

test("accepts the current or adjacent authenticator interval", () => {
  const code = generateTotp(rfcSecret, 1_234_567_890_000);
  assert.equal(verifyAdminTotp({ code, secret: rfcSecret, nowMs: 1_234_567_890_000 }), true);
  assert.equal(verifyAdminTotp({ code, secret: rfcSecret, nowMs: 1_234_567_920_000, window: 1 }), true);
  assert.equal(verifyAdminTotp({ code: "000000", secret: rfcSecret, nowMs: 1_234_567_890_000 }), false);
});

test("loads per-user secrets and builds an authenticator URI", () => {
  const secrets = getAdminTotpSecrets({
    ADMIN_TOTP_SECRETS: JSON.stringify({ " Owner@Example.com ": rfcSecret })
  } as unknown as NodeJS.ProcessEnv);
  assert.equal(secrets.get("owner@example.com"), rfcSecret);
  const uri = buildTotpUri("owner@example.com", rfcSecret);
  assert.match(uri, /^otpauth:\/\/totp\//);
  assert.match(uri, /issuer=AI\+Sports\+Prediction/);
  assert.match(uri, new RegExp(`secret=${rfcSecret}`));
});

test("blocks an email and IP after repeated failures", () => {
  const email = "rate-limit-test@example.com";
  const ip = "192.0.2.20";
  const now = 1_800_000_000_000;
  clearAdminLoginFailures(email, ip);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    assert.equal(checkAdminLoginRateLimit(email, ip, now).allowed, true);
    recordAdminLoginFailure(email, ip, now);
  }
  assert.equal(checkAdminLoginRateLimit(email, ip, now).allowed, false);
  assert.equal(checkAdminLoginRateLimit(email, ip, now + 15 * 60_000 + 1).allowed, true);
});
