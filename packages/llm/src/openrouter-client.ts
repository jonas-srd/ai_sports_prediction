/**
 * Purpose: Minimal OpenRouter client for requesting one structured score prediction from one model.
 * It intentionally wraps the raw response so invalid JSON can still be stored and debugged later.
 */
export type LlmPrediction = {
  home: number;
  away: number;
  confidence?: number;
  reason?: string;
  rawResponse: unknown;
};

export type OpenRouterTool = {
  type: string;
};

export type OpenRouterChatOptions = {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  n?: number;
  tools?: OpenRouterTool[];
};

export type OpenRouterToolMetadata = {
  toolsEnabled: boolean;
  toolType: string | null;
  toolCallsObserved: boolean | null;
  numToolCalls: number | null;
  toolTraceAvailable: boolean;
  toolTrace: unknown;
  openBookCompliance: "observed_search" | "no_observed_search" | "unknown" | "not_applicable";
};

export type OpenRouterChatResult = {
  content: string;
  rawResponse: unknown;
  responseId: string | null;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  toolMetadata: OpenRouterToolMetadata;
};

export type OpenRouterClientOptions = {
  apiKey: string;
  siteUrl?: string;
  siteName?: string;
};

export class OpenRouterClient {
  private readonly apiKey: string;
  private readonly siteUrl?: string;
  private readonly siteName?: string;

  constructor(options: OpenRouterClientOptions) {
    this.apiKey = options.apiKey;
    this.siteUrl = options.siteUrl;
    this.siteName = options.siteName;
  }

  async predictScore(modelId: string, prompt: string): Promise<LlmPrediction> {
    const completion = await this.createChatCompletion(modelId, prompt, {
      temperature: 0.2,
      maxTokens: 300
    });

    const parsed = parsePredictionJson(completion.content);

    return {
      ...parsed,
      rawResponse: completion.rawResponse
    };
  }

  async createChatCompletion(
    modelId: string,
    prompt: string,
    options: OpenRouterChatOptions = {}
  ): Promise<OpenRouterChatResult> {
    const startedAt = Date.now();
    const tools = options.tools?.length ? options.tools : undefined;
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(this.siteUrl ? { "HTTP-Referer": this.siteUrl } : {}),
        ...(this.siteName ? { "X-Title": this.siteName } : {})
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: options.temperature ?? 0,
        top_p: options.topP,
        n: options.n ?? 1,
        max_tokens: options.maxTokens ?? 1000,
        ...(tools ? { tools } : {})
      })
    });
    const latencyMs = Date.now() - startedAt;

    const rawResponse = await response.json();

    if (!response.ok) {
      throw new Error(`OpenRouter request failed for ${modelId}: ${JSON.stringify(rawResponse)}`);
    }

    const content = rawResponse?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error(`OpenRouter response for ${modelId} did not include message content.`);
    }

    return {
      content,
      rawResponse,
      responseId: typeof rawResponse?.id === "string" ? rawResponse.id : null,
      latencyMs,
      inputTokens: readNumber(rawResponse?.usage?.prompt_tokens),
      outputTokens: readNumber(rawResponse?.usage?.completion_tokens),
      costUsd: readCost(rawResponse),
      toolMetadata: extractToolMetadata(rawResponse, tools)
    };
  }
}

function parsePredictionJson(content: string): Omit<LlmPrediction, "rawResponse"> {
  const trimmed = content.trim();
  const jsonText = trimmed.startsWith("{") ? trimmed : extractFirstJsonObject(trimmed);
  const parsed = JSON.parse(jsonText) as Partial<LlmPrediction> & {
    most_likely_score_90?: {
      home?: unknown;
      away?: unknown;
    };
  };
  const home = readInteger(parsed.home) ?? readInteger(parsed.most_likely_score_90?.home);
  const away = readInteger(parsed.away) ?? readInteger(parsed.most_likely_score_90?.away);

  if (home === undefined || away === undefined) {
    throw new Error(`Prediction JSON must contain integer home and away scores or most_likely_score_90: ${content}`);
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

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readCost(rawResponse: unknown): number | null {
  if (!isRecord(rawResponse)) {
    return null;
  }

  const usage = rawResponse.usage;

  return readNumber(isRecord(usage) ? usage.cost : undefined) ??
    readNumber(rawResponse.cost);
}

function extractToolMetadata(rawResponse: unknown, tools?: OpenRouterTool[]): OpenRouterToolMetadata {
  const toolsEnabled = Boolean(tools?.length);
  const toolType = tools?.map((tool) => tool.type).join(",") ?? null;

  if (!toolsEnabled) {
    return {
      toolsEnabled: false,
      toolType: null,
      toolCallsObserved: null,
      numToolCalls: null,
      toolTraceAvailable: false,
      toolTrace: null,
      openBookCompliance: "not_applicable"
    };
  }

  const toolTrace = collectToolTrace(rawResponse);
  const numToolCalls = countObservedToolCalls(toolTrace);
  const toolTraceAvailable = Array.isArray(toolTrace) ? toolTrace.length > 0 : toolTrace !== null;
  const toolCallsObserved = numToolCalls > 0;

  return {
    toolsEnabled,
    toolType,
    toolCallsObserved,
    numToolCalls,
    toolTraceAvailable,
    toolTrace,
    openBookCompliance: toolCallsObserved ? "observed_search" : "no_observed_search"
  };
}

function collectToolTrace(rawResponse: unknown): unknown {
  if (!isRecord(rawResponse)) {
    return null;
  }

  const traces: unknown[] = [];
  const choices = Array.isArray(rawResponse.choices) ? rawResponse.choices : [];

  for (const choice of choices) {
    if (!isRecord(choice) || !isRecord(choice.message)) {
      continue;
    }

    for (const key of ["tool_calls", "annotations", "citations"] as const) {
      const value = choice.message[key];
      if (Array.isArray(value) && value.length > 0) {
        traces.push({ key, value });
      }
    }
  }

  for (const key of ["tool_calls", "annotations", "citations"] as const) {
    const value = rawResponse[key];
    if (Array.isArray(value) && value.length > 0) {
      traces.push({ key, value });
    }
  }

  return traces.length > 0 ? traces : null;
}

function countObservedToolCalls(toolTrace: unknown): number {
  if (!Array.isArray(toolTrace)) {
    return 0;
  }

  let count = 0;
  for (const entry of toolTrace) {
    if (!isRecord(entry) || !Array.isArray(entry.value)) {
      continue;
    }

    count += entry.value.length;
  }

  return count;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractFirstJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object found in model response: ${text}`);
  }

  return text.slice(start, end + 1);
}
