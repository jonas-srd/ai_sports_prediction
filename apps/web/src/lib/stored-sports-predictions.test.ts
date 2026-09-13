import assert from "node:assert/strict";
import test from "node:test";
import type { SportApiMatch } from "@/lib/sports-api-data";
import { hydrateMatchesWithStoredPredictions } from "@/lib/stored-sports-predictions";

test("hydrates Bedrock predictions without rewriting their provider", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.AI_SPORTS_API_URL;
  process.env.AI_SPORTS_API_URL = "https://internal.example";
  globalThis.fetch = (async () => new Response(JSON.stringify({
    predictions: [{
      id: "prediction-1",
      source_match_id: "fixture-1",
      model_id: "bedrock:eu.amazon.nova-2-lite-v1:0:nexus",
      model_name: "NEXUS",
      model_version: "eu.amazon.nova-2-lite-v1:0",
      model_provider: "Bedrock",
      predicted_home: 2,
      predicted_away: 1,
      confidence: 61,
      reason: "Calibrated prior."
    }]
  }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;

  try {
    const matches = await hydrateMatchesWithStoredPredictions([{
      id: "sport-api:fixture-1",
      competition: "Test League",
      date: "2026-09-14T18:00:00.000Z",
      homeName: "Home",
      awayName: "Away",
      homeLogo: null,
      awayLogo: null,
      homeScore: null,
      awayScore: null,
      status: "NS"
    } as SportApiMatch]);

    assert.equal(matches[0]?.predictions?.[0]?.provider, "Bedrock");
    assert.equal(matches[0]?.predictions?.[0]?.modelKey, "nexus");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) delete process.env.AI_SPORTS_API_URL;
    else process.env.AI_SPORTS_API_URL = originalApiUrl;
  }
});
