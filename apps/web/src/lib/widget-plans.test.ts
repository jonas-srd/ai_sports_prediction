import assert from "node:assert/strict";
import test from "node:test";
import { getWidgetPlanRules } from "./widget-plans";

test("keeps sales and enforcement limits in one plan source", () => {
  assert.equal(getWidgetPlanRules("starter").domainLimit, 2);
  assert.equal(getWidgetPlanRules("starter").monthlyRequestLimit, 50_000);
  assert.equal(getWidgetPlanRules("growth").domainLimit, 8);
  assert.equal(getWidgetPlanRules("growth").monthlyRequestLimit, 250_000);
  assert.equal(getWidgetPlanRules("enterprise").maxItems, 12);
});
