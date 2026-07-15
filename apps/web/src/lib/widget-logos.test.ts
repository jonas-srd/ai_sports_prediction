import assert from "node:assert/strict";
import test from "node:test";
import { isOfficialWidgetLogoUrl } from "./widget-logo-policy";

test("accepts external HTTPS API logos", () => {
  assert.equal(isOfficialWidgetLogoUrl("https://r2.thesportsdb.com/images/team.png"), true);
  assert.equal(isOfficialWidgetLogoUrl("https://flagcdn.com/w80/de.png"), true);
});

test("rejects generated fallback images and missing logos", () => {
  assert.equal(isOfficialWidgetLogoUrl("data:image/svg+xml,%3Csvg%3E"), false);
  assert.equal(isOfficialWidgetLogoUrl(""), false);
  assert.equal(isOfficialWidgetLogoUrl(null), false);
});
