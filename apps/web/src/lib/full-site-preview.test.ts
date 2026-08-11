import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";
import { ADMIN_SESSION_COOKIE, createAdminSession } from "./admin-session";

const sessionSecret = "preview-session-secret-that-is-long-enough";
const adminEmail = "owner@residualsports.com";

test("keeps guests on coming soon while an authenticated device sees the full site", async () => {
  const previous = {
    showFullSite: process.env.SHOW_FULL_SITE,
    adminAccessEmails: process.env.ADMIN_ACCESS_EMAILS,
    adminSessionSecret: process.env.ADMIN_SESSION_SECRET
  };
  process.env.SHOW_FULL_SITE = "0";
  process.env.ADMIN_ACCESS_EMAILS = adminEmail;
  process.env.ADMIN_SESSION_SECRET = sessionSecret;

  try {
    const guestResponse = await proxy(new NextRequest("https://residualsports.com/football"));
    assert.equal(
      guestResponse.headers.get("x-middleware-rewrite"),
      "https://residualsports.com/coming-soon"
    );

    const session = await createAdminSession(adminEmail, sessionSecret);
    const previewResponse = await proxy(new NextRequest("https://residualsports.com/football", {
      headers: { cookie: `${ADMIN_SESSION_COOKIE}=${session}` }
    }));
    assert.equal(previewResponse.headers.get("x-middleware-next"), "1");
    assert.equal(previewResponse.headers.get("cache-control"), "private, no-store");
    assert.match(previewResponse.headers.get("set-cookie") ?? "", /residual_full_site_preview=1/);
  } finally {
    restoreEnvironment("SHOW_FULL_SITE", previous.showFullSite);
    restoreEnvironment("ADMIN_ACCESS_EMAILS", previous.adminAccessEmails);
    restoreEnvironment("ADMIN_SESSION_SECRET", previous.adminSessionSecret);
  }
});

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
