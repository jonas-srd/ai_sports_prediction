/**
 * Purpose: Amazon Bedrock implementation of the shared chat-completion surface.
 * Credentials are resolved by the AWS SDK credential chain (for example, the
 * ECS task role in production); this module never accepts or stores access keys.
 */
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandInput,
  type ConverseCommandOutput
} from "@aws-sdk/client-bedrock-runtime";
import type {
  ChatCompletionClient,
  LlmChatOptions,
  LlmChatResult,
  LlmPrediction
} from "./openrouter-client";

type BedrockRuntimeSender = {
  send(command: ConverseCommand): Promise<ConverseCommandOutput>;
};

export type BedrockClientOptions = {
  region: string;
  client?: BedrockRuntimeSender;
};

export class BedrockClient implements ChatCompletionClient {
  private readonly client: BedrockRuntimeSender;

  constructor(options: BedrockClientOptions) {
    const region = options.region.trim();
    if (!region) {
      throw new Error("An AWS region is required for Amazon Bedrock.");
    }

    this.client = options.client ?? new BedrockRuntimeClient({ region });
  }

  async predictScore(modelId: string, prompt: string): Promise<LlmPrediction> {
    const completion = await this.createChatCompletion(modelId, prompt, {
      temperature: 0.2,
      maxTokens: 300
    });
    const parsed = parsePredictionJson(completion.content);

    return { ...parsed, rawResponse: completion.rawResponse };
  }

  async createChatCompletion(
    modelId: string,
    prompt: string,
    options: LlmChatOptions = {}
  ): Promise<LlmChatResult> {
    if (options.tools?.length) {
      throw new Error("Amazon Bedrock tool use is not enabled by this integration.");
    }
    if (options.n !== undefined && options.n !== 1) {
      throw new Error("Amazon Bedrock returns one completion per Converse request; n must be 1.");
    }

    const maxCompletionTokens = options.maxTokens ?? 1000;
    // `responseFormat` is intentionally not mapped: Converse structured-output
    // support varies by model (including Nova), so JSON is enforced by prompts
    // and the caller's existing parser/retry path.
    const input: ConverseCommandInput = {
      modelId,
      messages: [{ role: "user", content: [{ text: prompt }] }],
      inferenceConfig: {
        maxTokens: maxCompletionTokens,
        temperature: options.temperature ?? 0,
        ...(options.topP === undefined ? {} : { topP: options.topP })
      }
    };
    const startedAt = Date.now();
    let rawResponse: ConverseCommandOutput;

    try {
      rawResponse = await this.client.send(new ConverseCommand(input));
    } catch (error) {
      throw new BedrockResponseError(
        `Amazon Bedrock request failed for ${modelId}: ${readErrorMessage(error)}`,
        {
          code: "request_failed",
          cause: error,
          rawResponse: error,
          responseId: readRequestId(error),
          finishReason: null,
          inputTokens: null,
          outputTokens: null
        }
      );
    }

    const measuredLatencyMs = Date.now() - startedAt;
    const latencyMs = readFiniteNumber(rawResponse.metrics?.latencyMs) ?? measuredLatencyMs;
    const responseId = rawResponse.$metadata.requestId ?? null;
    const finishReason = rawResponse.stopReason ?? null;
    const inputTokens = readFiniteNumber(rawResponse.usage?.inputTokens);
    const outputTokens = readFiniteNumber(rawResponse.usage?.outputTokens);
    const content = readTextContent(rawResponse);

    if (content === null || content.trim().length === 0) {
      if (
        options.retryContentFailures !== false
        && (finishReason === "max_tokens"
          || (outputTokens !== null && outputTokens >= maxCompletionTokens * 0.9))
      ) {
        const retried = await this.createChatCompletion(modelId, prompt, {
          ...options,
          maxTokens: Math.max(maxCompletionTokens * 2, 2000),
          retryContentFailures: false
        });
        return { ...retried, retryCount: retried.retryCount + 1 };
      }

      throw new BedrockResponseError(
        `Amazon Bedrock response for ${modelId} did not include text content. stop_reason=${finishReason ?? "unknown"}.`,
        {
          code: content === null ? "missing_content" : "empty_content",
          rawResponse,
          responseId,
          finishReason,
          inputTokens,
          outputTokens
        }
      );
    }

    return {
      content,
      rawResponse,
      responseId,
      finishReason,
      latencyMs,
      inputTokens,
      outputTokens,
      costUsd: null,
      retryCount: 0,
      maxCompletionTokens,
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
}

export class BedrockResponseError extends Error {
  readonly code: "request_failed" | "missing_content" | "empty_content";
  readonly rawResponse: unknown;
  readonly responseId: string | null;
  readonly finishReason: string | null;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;

  constructor(
    message: string,
    metadata: {
      code: "request_failed" | "missing_content" | "empty_content";
      cause?: unknown;
      rawResponse: unknown;
      responseId: string | null;
      finishReason: string | null;
      inputTokens: number | null;
      outputTokens: number | null;
    }
  ) {
    super(message, metadata.cause === undefined ? undefined : { cause: metadata.cause });
    this.name = "BedrockResponseError";
    this.code = metadata.code;
    this.rawResponse = metadata.rawResponse;
    this.responseId = metadata.responseId;
    this.finishReason = metadata.finishReason;
    this.inputTokens = metadata.inputTokens;
    this.outputTokens = metadata.outputTokens;
  }
}

function readTextContent(response: ConverseCommandOutput): string | null {
  const blocks = response.output?.message?.content;
  if (!Array.isArray(blocks)) return null;

  const text = blocks.flatMap((block) => typeof block.text === "string" ? [block.text] : []);
  return text.length > 0 ? text.join("") : null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readRequestId(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const metadata = (error as { $metadata?: { requestId?: unknown } }).$metadata;
  return typeof metadata?.requestId === "string" ? metadata.requestId : null;
}

function parsePredictionJson(content: string): Omit<LlmPrediction, "rawResponse"> {
  const trimmed = content.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const parsed = JSON.parse(
    trimmed.startsWith("{") ? trimmed : trimmed.slice(start, end + 1)
  ) as Partial<LlmPrediction> & { most_likely_score_90?: { home?: unknown; away?: unknown } };
  const home = readInteger(parsed.home) ?? readInteger(parsed.most_likely_score_90?.home);
  const away = readInteger(parsed.away) ?? readInteger(parsed.most_likely_score_90?.away);
  if (home === undefined || away === undefined) {
    throw new Error(`Prediction JSON must contain integer home and away scores: ${content}`);
  }
  return {
    home,
    away,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : undefined,
    reason: typeof parsed.reason === "string" ? parsed.reason : undefined
  };
}

function readInteger(value: unknown): number | undefined {
  return Number.isInteger(value) ? value as number : undefined;
}
