import assert from "node:assert/strict";
import test from "node:test";
import type { OpenRouterClient, OpenRouterChatResult } from "./openrouter-client";
import { generatePublicSportsPredictions } from "./public-sports-predictions";

const fixture = {
  sport: "football",
  competition: "Test League",
  utcDate: "2026-08-10T18:00:00.000Z",
  homeTeam: "Home Team",
  awayTeam: "Away Team",
  venue: null,
  round: null
};

test("reads all three OpenRouter profiles without creating substitute values", async () => {
  const client = fakeClient(JSON.stringify({
    predictions: {
      nexus: { home: 2, away: 1, confidence: 61, reason: "Long-term edge." },
      pulse: { home: 1, away: 1, confidence: 0.42, reason: "Short-term uncertainty." },
      edge: { home: 1, away: 2, confidence: 57, reason: "Matchup edge." }
    }
  }));

  const predictions = await generatePublicSportsPredictions(client, "test/model", fixture);
  assert.deepEqual(predictions.map((prediction) => prediction.profile), ["nexus", "pulse", "edge"]);
  assert.deepEqual(predictions.map((prediction) => prediction.predictedHome), [2, 1, 1]);
  assert.equal(predictions[1]?.confidence, 42);
  assert.match(predictions[0]?.promptText ?? "", /Test League/);
  assert.equal(predictions[0]?.providerResponseId, "response-1");
  assert.equal(predictions[0]?.inputTokens, 10);
  assert.equal(predictions[0]?.outputTokens, 20);
  assert.ok(!Number.isNaN(Date.parse(predictions[0]?.generatedAtUtc ?? "")));
});

test("rejects an incomplete response instead of fabricating a missing profile", async () => {
  const client = fakeClient(JSON.stringify({
    predictions: {
      nexus: { home: 2, away: 1, confidence: 61, reason: "Long-term edge." }
    }
  }));

  await assert.rejects(
    generatePublicSportsPredictions(client, "test/model", fixture),
    /invalid pulse public prediction/
  );
});

function fakeClient(content: string): OpenRouterClient {
  return {
    async createChatCompletion(): Promise<OpenRouterChatResult> {
      return {
        content,
        rawResponse: { fixture: true },
        responseId: "response-1",
        finishReason: "stop",
        latencyMs: 1,
        inputTokens: 10,
        outputTokens: 20,
        costUsd: 0,
        retryCount: 0,
        maxCompletionTokens: 1200,
        toolMetadata: {
          toolsEnabled: false,
          toolType: null,
          toolCallsObserved: null,
          numToolCalls: null,
          toolTraceAvailable: false,
          toolTrace: null,
          openBookCompliance: "not_applicable"
        }
      };
    }
  } as unknown as OpenRouterClient;
}
