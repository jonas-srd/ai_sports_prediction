import assert from "node:assert/strict";
import test from "node:test";
import {
  createAdminSession,
  getAdminSessionSecret,
  getAllowedAdminEmails,
  isSafeAdminRedirect,
  verifyAdminSession
} from "./admin-session";

const secret = "test-secret-that-is-longer-than-thirty-two-characters";
const allowedEmails = new Set(["owner@example.com", "friend@example.com"]);

test("normalizes the admin email allowlist and validates configuration", () => {
  const environment = {
    ADMIN_ACCESS_EMAILS: " Owner@Example.com, friend@example.com ",
    ADMIN_SESSION_SECRET: secret
  } as unknown as NodeJS.ProcessEnv;
  assert.deepEqual([...getAllowedAdminEmails(environment)], ["owner@example.com", "friend@example.com"]);
  assert.equal(getAdminSessionSecret(environment), secret);
  assert.equal(getAdminSessionSecret({ ADMIN_SESSION_SECRET: "too-short" } as unknown as NodeJS.ProcessEnv), null);
});

test("creates and verifies an allowlisted admin session", async () => {
  const token = await createAdminSession("Owner@Example.com", secret, 1_800_000_000, 300);
  assert.deepEqual(
    await verifyAdminSession(token, secret, allowedEmails, 1_800_000_010),
    { email: "owner@example.com", expiresAt: 1_800_000_300 }
  );
  assert.equal(await verifyAdminSession(token, secret, allowedEmails, 1_800_000_301), null);
  assert.equal(await verifyAdminSession(token, secret, new Set(["other@example.com"]), 1_800_000_010), null);
});

test("rejects tampered sessions and unsafe redirect targets", async () => {
  const token = await createAdminSession("owner@example.com", secret, 1_800_000_000, 300);
  assert.equal(await verifyAdminSession(`${token}x`, secret, allowedEmails, 1_800_000_010), null);
  assert.equal(isSafeAdminRedirect("/admin/outreach?tab=review"), true);
  assert.equal(isSafeAdminRedirect("/administrator"), false);
  assert.equal(isSafeAdminRedirect("//attacker.example/admin"), false);
  assert.equal(isSafeAdminRedirect("https://attacker.example"), false);
});
