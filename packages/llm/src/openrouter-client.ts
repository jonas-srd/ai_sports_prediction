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
        temperature: 0.2
      })
    });

    const rawResponse = await response.json();

    if (!response.ok) {
      throw new Error(`OpenRouter request failed for ${modelId}: ${JSON.stringify(rawResponse)}`);
    }

    const content = rawResponse?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error(`OpenRouter response for ${modelId} did not include message content.`);
    }

    const parsed = parsePredictionJson(content);

    return {
      ...parsed,
      rawResponse
    };
  }
}

function parsePredictionJson(content: string): Omit<LlmPrediction, "rawResponse"> {
  const trimmed = content.trim();
  const jsonText = trimmed.startsWith("{") ? trimmed : extractFirstJsonObject(trimmed);
  const parsed = JSON.parse(jsonText) as Partial<LlmPrediction>;

  if (!Number.isInteger(parsed.home) || !Number.isInteger(parsed.away)) {
    throw new Error(`Prediction JSON must contain integer home and away scores: ${content}`);
  }

  return {
    home: parsed.home,
    away: parsed.away,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : undefined,
    reason: typeof parsed.reason === "string" ? parsed.reason : undefined
  };
}

function extractFirstJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object found in model response: ${text}`);
  }

  return text.slice(start, end + 1);
}
