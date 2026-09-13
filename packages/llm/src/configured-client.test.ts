import assert from "node:assert/strict";
import test from "node:test";
import { BedrockClient } from "./bedrock-client";
import { createConfiguredLlmClient, resolveLlmProvider } from "./configured-client";
import { OpenRouterClient } from "./openrouter-client";

test("keeps OpenRouter as the backwards-compatible default", () => {
  const configured = createConfiguredLlmClient({
    openRouterModelId: "openrouter/test",
    env: { OPENROUTER_API_KEY: "secret" }
  });
  assert.equal(configured.provider, "openrouter");
  assert.equal(configured.modelId, "openrouter/test");
  assert.ok(configured.client instanceof OpenRouterClient);
});

test("selects Bedrock with its purpose-specific model and AWS region", () => {
  const configured = createConfiguredLlmClient({
    openRouterModelId: "unused",
    bedrockModelId: "eu.amazon.nova-2-lite-v1:0",
    env: { LLM_PROVIDER: "bedrock", AWS_REGION: "eu-central-1" }
  });
  assert.equal(configured.provider, "bedrock");
  assert.equal(configured.providerLabel, "Bedrock");
  assert.equal(configured.modelId, "eu.amazon.nova-2-lite-v1:0");
  assert.equal(configured.region, "eu-central-1");
  assert.ok(configured.client instanceof BedrockClient);
});

test("requires the active provider's configuration and rejects unknown providers", () => {
  assert.throws(
    () => createConfiguredLlmClient({ openRouterModelId: "model", env: {} }),
    /OPENROUTER_API_KEY/
  );
  assert.throws(
    () => createConfiguredLlmClient({ openRouterModelId: "model", env: { LLM_PROVIDER: "bedrock" } }),
    /BEDROCK_MODEL_ID/
  );
  assert.throws(() => resolveLlmProvider("other"), /Unsupported LLM_PROVIDER/);
});
