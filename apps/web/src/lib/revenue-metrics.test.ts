import assert from "node:assert/strict";
import test from "node:test";
import { monthlyRecurringRevenueCents, percentage } from "./revenue-metrics";

test("normalizes monthly and annual widget contracts to MRR", () => {
  assert.equal(monthlyRecurringRevenueCents([
    { billing_interval: "monthly", plan: "starter", status: "active" },
    { billing_interval: "annual", plan: "growth", status: "active" },
    { billing_interval: "monthly", plan: "growth", status: "canceled" },
    { billing_interval: null, plan: "enterprise", status: "active" }
  ]), 18_558);
});

test("returns stable percentages for empty and populated funnels", () => {
  assert.equal(percentage(3, 8), 37.5);
  assert.equal(percentage(1, 0), 0);
});
