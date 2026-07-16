import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import {
  createWidgetCustomerSession,
  readWidgetCustomerSession,
  WIDGET_CUSTOMER_SESSION_COOKIE
} from "./widget-customer-session";

test("creates a signed customer session and rejects tampering", () => {
  const previous = process.env.WIDGET_CUSTOMER_SESSION_SECRET;
  process.env.WIDGET_CUSTOMER_SESSION_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
  try {
    const now = Math.floor(Date.now() / 1000);
    const token = createWidgetCustomerSession("customer-1", "Editor@Example.com", process.env.WIDGET_CUSTOMER_SESSION_SECRET, now);
    const request = new NextRequest("https://example.com/widgets/account", {
      headers: { cookie: `${WIDGET_CUSTOMER_SESSION_COOKIE}=${token}` }
    });
    assert.deepEqual(readWidgetCustomerSession(request), {
      customerId: "customer-1",
      email: "editor@example.com",
      exp: now + 2_592_000,
      iat: now,
      version: 1
    });

    const tampered = new NextRequest("https://example.com/widgets/account", {
      headers: { cookie: `${WIDGET_CUSTOMER_SESSION_COOKIE}=${token.slice(0, -1)}x` }
    });
    assert.equal(readWidgetCustomerSession(tampered), null);
  } finally {
    if (previous === undefined) delete process.env.WIDGET_CUSTOMER_SESSION_SECRET;
    else process.env.WIDGET_CUSTOMER_SESSION_SECRET = previous;
  }
});
