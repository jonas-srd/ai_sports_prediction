import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("a pending forecast uses a neutral label and does not claim a provider", () => {
  const source = readFileSync(new URL("../components/prediction-model-selector.tsx", import.meta.url), "utf8");
  const pendingComponent = source.split("export function OpenRouterPredictionPending(")[1]
    .split("export function SelectedModelSignal(")[0];
  const renderedMarkup = pendingComponent.slice(pendingComponent.indexOf("  return ("));
  assert.match(renderedMarkup, /<span>\{t\(locale === "de" \? "KI-Prognose" : "AI prediction"\)\}<\/span>/);
  assert.doesNotMatch(renderedMarkup, /<span>[^<]*(?:OpenRouter|Bedrock)[^<]*<\/span>/);
  assert.match(renderedMarkup, /Prediction one week before kickoff/);
  assert.match(source, /if \(source === "openrouter"\) return " · OpenRouter"/);
  assert.match(source, /if \(source === "bedrock"\) return " · Bedrock"/);
});
