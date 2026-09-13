/** Purpose: Resolve the configured LLM provider without exposing credentials to callers. */
import { BedrockClient } from "./bedrock-client";
import { OpenRouterClient, type ChatCompletionClient } from "./openrouter-client";

export type LlmProviderKey = "openrouter" | "bedrock";

export type ConfiguredLlmClient = {
  client: ChatCompletionClient;
  modelId: string;
  provider: LlmProviderKey;
  providerLabel: "OpenRouter" | "Bedrock";
  region: string | null;
};

export type ConfiguredLlmClientOptions = {
  openRouterModelId: string;
  bedrockModelId?: string | null;
  env?: NodeJS.ProcessEnv;
};

export function createConfiguredLlmClient(
  options: ConfiguredLlmClientOptions
): ConfiguredLlmClient {
  const env = options.env ?? process.env;
  const provider = resolveLlmProvider(env.LLM_PROVIDER);

  if (provider === "bedrock") {
    const modelId = options.bedrockModelId?.trim() || env.BEDROCK_MODEL_ID?.trim();
    if (!modelId) {
      throw new Error("BEDROCK_MODEL_ID is required when LLM_PROVIDER=bedrock.");
    }
    const region = env.BEDROCK_REGION?.trim()
      || env.AWS_REGION?.trim()
      || env.AWS_DEFAULT_REGION?.trim()
      || "eu-central-1";
    return {
      client: new BedrockClient({ region }),
      modelId,
      provider,
      providerLabel: "Bedrock",
      region
    };
  }

  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required when LLM_PROVIDER=openrouter.");
  }
  return {
    client: new OpenRouterClient({
      apiKey,
      siteUrl: env.OPENROUTER_SITE_URL,
      siteName: env.OPENROUTER_SITE_NAME
    }),
    modelId: options.openRouterModelId,
    provider,
    providerLabel: "OpenRouter",
    region: null
  };
}

export function resolveLlmProvider(value: string | undefined): LlmProviderKey {
  const normalized = value?.trim().toLowerCase() || "openrouter";
  if (normalized === "openrouter" || normalized === "bedrock") return normalized;
  throw new Error(`Unsupported LLM_PROVIDER: ${value}. Use openrouter or bedrock.`);
}
