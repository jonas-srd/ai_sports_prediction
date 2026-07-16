import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  getMinimumTermEnd,
  getStripeTaxIdType,
  isWidgetCheckoutConfigured,
  parseWidgetBillingInterval,
  requiresEuVatId,
  updateWidgetStripeScheduleCancellation,
  verifyWidgetStripeWebhook
} from "./widget-billing";

test("normalizes widget billing intervals", () => {
  assert.equal(parseWidgetBillingInterval("annual"), "annual");
  assert.equal(parseWidgetBillingInterval("monthly"), "monthly");
  assert.equal(parseWidgetBillingInterval("unexpected"), "monthly");
});

test("cancels an annual subscription schedule at the minimum-term phase boundary", async () => {
  const previousKey = process.env.STRIPE_SECRET_KEY;
  const previousFetch = globalThis.fetch;
  process.env.STRIPE_SECRET_KEY = "sk_test_schedule";
  let updateBody = "";
  globalThis.fetch = async (_input, init) => {
    if (init?.method === "GET") {
      return new Response(JSON.stringify({
        status: "active",
        phases: [
          { start_date: 1_700_000_000, end_date: 1_731_536_000, items: [{ price: "price_annual", quantity: 1 }] },
          { start_date: 1_731_536_000, end_date: 1_734_214_400, items: [{ price: "price_monthly", quantity: 1 }] }
        ]
      }), { status: 200 });
    }
    updateBody = String(init?.body ?? "");
    return new Response(JSON.stringify({ id: "sub_sched_1" }), { status: 200 });
  };
  try {
    const handled = await updateWidgetStripeScheduleCancellation({
      cancellationAt: new Date(1_731_536_000 * 1000),
      plan: "growth",
      scheduleId: "sub_sched_1"
    });
    assert.equal(handled, true);
    const params = new URLSearchParams(updateBody);
    assert.equal(params.get("end_behavior"), "cancel");
    assert.equal(params.get("phases[0][end_date]"), "1731536000");
    assert.equal(params.has("phases[1][start_date]"), false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousKey;
  }
});

test("sets the minimum term to one calendar year", () => {
  assert.equal(getMinimumTermEnd(new Date("2026-07-15T12:00:00.000Z")).toISOString(), "2027-07-15T12:00:00.000Z");
});

test("maps billing countries to Stripe invoice tax ID types", () => {
  assert.equal(getStripeTaxIdType("DE"), "eu_vat");
  assert.equal(getStripeTaxIdType("gb"), "gb_vat");
  assert.equal(getStripeTaxIdType("US"), "us_ein");
  assert.equal(getStripeTaxIdType("XX"), null);
});

test("requires an EU VAT ID only for cross-border EU customers", () => {
  assert.equal(requiresEuVatId("FR"), true);
  assert.equal(requiresEuVatId("DE"), false);
  assert.equal(requiresEuVatId("US"), false);
});

test("keeps paid checkout blocked until legal, tax and invoice setup is complete", () => {
  const names = [
    "STRIPE_SECRET_KEY", "STRIPE_PRICE_STARTER_MONTHLY", "WIDGET_DIRECT_SALES_ENABLED",
    "LEGAL_SELLER_STREET", "LEGAL_SELLER_POSTAL_CODE", "LEGAL_SELLER_CITY",
    "LEGAL_SELLER_COUNTRY_CODE", "WIDGET_TAX_MODE", "LEGAL_SELLER_VAT_ID",
    "STRIPE_TAX_READY", "WIDGET_INVOICE_DELIVERY_READY"
  ] as const;
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  Object.assign(process.env, {
    STRIPE_SECRET_KEY: "sk_test_legal_gate",
    STRIPE_PRICE_STARTER_MONTHLY: "price_starter",
    WIDGET_DIRECT_SALES_ENABLED: "0",
    LEGAL_SELLER_STREET: "Example Street 1",
    LEGAL_SELLER_POSTAL_CODE: "81541",
    LEGAL_SELLER_CITY: "München",
    LEGAL_SELLER_COUNTRY_CODE: "DE",
    WIDGET_TAX_MODE: "standard",
    LEGAL_SELLER_VAT_ID: "DE123456789",
    STRIPE_TAX_READY: "1",
    WIDGET_INVOICE_DELIVERY_READY: "1"
  });
  assert.equal(isWidgetCheckoutConfigured("starter", "monthly"), false);
  process.env.WIDGET_DIRECT_SALES_ENABLED = "1";
  assert.equal(isWidgetCheckoutConfigured("starter", "monthly"), true);
  for (const name of names) {
    if (previous[name] === undefined) delete process.env[name];
    else process.env[name] = previous[name];
  }
});

test("verifies Stripe webhook signatures and rejects modified payloads", () => {
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_widget_test";
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ id: "evt_123", type: "invoice.paid" });
  const signature = createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  assert.equal(verifyWidgetStripeWebhook(payload, `t=${timestamp},v1=${signature}`), true);
  assert.equal(verifyWidgetStripeWebhook(`${payload} `, `t=${timestamp},v1=${signature}`), false);

  if (previousSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
});
