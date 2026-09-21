import assert from "node:assert/strict";
import test from "node:test";
import { translatePublicText } from "./public-text-translation";

test("unchanged prediction text preserves SSR text-node whitespace byte for byte", () => {
  for (const value of [" · ", " · Bedrock", " ", "\n\t", "  NEXUS  ", " Reasoning ", "\u00a0 · Bedrock\u00a0"]) {
    assert.equal(translatePublicText(value, "en"), value);
  }
  assert.equal(translatePublicText(" · Bedrock", "de"), " · Bedrock");
  assert.equal(translatePublicText("   Unmapped team name  ", "fr"), "   Unmapped team name  ");
});

test("translated labels retain exactly the original outer whitespace and remain stable", () => {
  const translated = translatePublicText(" \tPrediction one week before kickoff\n ", "de");
  assert.equal(translated, " \tPrognose eine Woche vor Anpfiff\n ");
  assert.equal(translatePublicText(translated, "de"), translated);
  assert.equal(translatePublicText(" AI prediction ", "de"), " KI-PROGNOSE ");
});
