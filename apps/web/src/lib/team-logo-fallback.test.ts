import assert from "node:assert/strict";
import test from "node:test";
import { getStoredTeamLogo } from "./team-logo-fallback";

test("resolves locally stored NFL and NBA team logos", () => {
  assert.match(getStoredTeamLogo(null, "Kansas City Chiefs") ?? "", /^\/sports-logos\/teams\/\d+\.webp$/);
  assert.match(getStoredTeamLogo(null, "Baltimore Ravens") ?? "", /^\/sports-logos\/teams\/\d+\.webp$/);
  assert.match(getStoredTeamLogo(null, "Boston Celtics") ?? "", /^\/sports-logos\/teams\/\d+\.webp$/);
  assert.match(getStoredTeamLogo(null, "Los Angeles Lakers") ?? "", /^\/sports-logos\/teams\/\d+\.webp$/);
});
