import assert from "node:assert/strict";
import test from "node:test";
import { ConverseCommand, type ConverseCommandOutput } from "@aws-sdk/client-bedrock-runtime";
import { BedrockClient, BedrockResponseError } from "./bedrock-client";

test("maps the shared chat request to Bedrock Converse and reads all text blocks", async () => {
  const commands: ConverseCommand[] = [];
  const client = new BedrockClient({
    region: "eu-central-1",
    client: {
      async send(command) {
        commands.push(command);
        return {
          $metadata: { requestId: "bedrock-request-1" },
          output: { message: { role: "assistant", content: [{ text: "first " }, { text: "second" }] } },
          stopReason: "end_turn",
          usage: { inputTokens: 12, outputTokens: 7, totalTokens: 19 },
          metrics: { latencyMs: 42 }
        } as ConverseCommandOutput;
      }
    }
  });

  const result = await client.createChatCompletion("eu.amazon.nova-2-lite-v1:0", "Predict it", {
    temperature: 0.2,
    topP: 0.8,
    maxTokens: 900,
    responseFormat: { type: "json_object" }
  });

  assert.equal(commands.length, 1);
  assert.ok(commands[0] instanceof ConverseCommand);
  assert.deepEqual(commands[0]?.input, {
    modelId: "eu.amazon.nova-2-lite-v1:0",
    messages: [{ role: "user", content: [{ text: "Predict it" }] }],
    inferenceConfig: { maxTokens: 900, temperature: 0.2, topP: 0.8 }
  });
  assert.equal(result.content, "first second");
  assert.equal(result.responseId, "bedrock-request-1");
  assert.equal(result.finishReason, "end_turn");
  assert.equal(result.inputTokens, 12);
  assert.equal(result.outputTokens, 7);
  assert.equal(result.latencyMs, 42);
  assert.equal(result.costUsd, null);
});

test("retries once with a larger token budget after an empty max_tokens response", async () => {
  const maxTokens: Array<number | undefined> = [];
  const client = new BedrockClient({
    region: "eu-central-1",
    client: {
      async send(command) {
        maxTokens.push(command.input.inferenceConfig?.maxTokens);
        if (maxTokens.length === 1) {
          return {
            $metadata: {},
            output: { message: { role: "assistant", content: [] } },
            stopReason: "max_tokens",
            usage: { inputTokens: 10, outputTokens: 100, totalTokens: 110 },
            metrics: { latencyMs: 1 }
          } as ConverseCommandOutput;
        }
        return {
          $metadata: {},
          output: { message: { role: "assistant", content: [{ text: "done" }] } },
          stopReason: "end_turn"
        } as ConverseCommandOutput;
      }
    }
  });

  const result = await client.createChatCompletion("test-model", "prompt", { maxTokens: 100 });
  assert.deepEqual(maxTokens, [100, 2000]);
  assert.equal(result.content, "done");
  assert.equal(result.retryCount, 1);
  assert.equal(result.maxCompletionTokens, 2000);
});

test("wraps Bedrock service failures with request metadata", async () => {
  const failure = Object.assign(new Error("Access denied"), {
    $metadata: { requestId: "denied-request" }
  });
  const client = new BedrockClient({
    region: "eu-central-1",
    client: { async send() { throw failure; } }
  });

  await assert.rejects(
    client.createChatCompletion("test-model", "prompt"),
    (error: unknown) => error instanceof BedrockResponseError
      && error.code === "request_failed"
      && error.responseId === "denied-request"
      && error.cause === failure
  );
});

test("rejects unsupported multi-completion and tool options before calling AWS", async () => {
  let calls = 0;
  const client = new BedrockClient({
    region: "eu-central-1",
    client: { async send() { calls += 1; return { $metadata: {} } as ConverseCommandOutput; } }
  });

  await assert.rejects(client.createChatCompletion("model", "prompt", { n: 2 }), /n must be 1/);
  await assert.rejects(
    client.createChatCompletion("model", "prompt", { tools: [{ type: "web" }] }),
    /tool use is not enabled/
  );
  assert.equal(calls, 0);
});
