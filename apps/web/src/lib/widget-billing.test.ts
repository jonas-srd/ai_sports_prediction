import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  getMinimumTermEnd,
  getStripeTaxIdType,
  parseWidgetBillingInterval,
  verifyWidgetStripeWebhook
} from "./widget-billing";

test("normalizes widget billing intervals", () => {
  assert.equal(parseWidgetBillingInterval("annual"), "annual");
  assert.equal(parseWidgetBillingInterval("monthly"), "monthly");
  assert.equal(parseWidgetBillingInterval("unexpected"), "monthly");
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
