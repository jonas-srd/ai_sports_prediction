/**
 * Purpose: Defines the eight OpenRouter model IDs used in the prediction tournament.
 * Keep this list small for the MVP so cost, latency, and debugging stay manageable.
 */
export type LlmModel = {
  id: string;
  name: string;
  provider: string;
  active: boolean;
};

export const LLM_MODELS: LlmModel[] = [
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", active: true },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "Anthropic", active: true },
  { id: "google/gemini-3.5-flash", name: "Gemini 3.5 Flash", provider: "Google", active: true },
  { id: "x-ai/grok-4.20", name: "Grok 4.20", provider: "xAI", active: true },
  { id: "mistralai/mistral-large", name: "Mistral Large", provider: "Mistral", active: true },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek", active: true },
  { id: "perplexity/sonar-pro", name: "Perplexity Sonar Pro", provider: "Perplexity", active: true },
  { id: "meta-llama/llama-3.2-3b-instruct", name: "Llama 3.2 3B Instruct", provider: "Meta", active: true }
];

export function getConfiguredLlmModels(): LlmModel[] {
  const configuredIds = process.env.OPENROUTER_MODEL_IDS
    ?.split(",")
    .map((modelId) => modelId.trim())
    .filter(Boolean);

  if (!configuredIds || configuredIds.length === 0) {
    return LLM_MODELS;
  }

  return configuredIds.map((modelId) => {
    const knownModel = LLM_MODELS.find((model) => model.id === modelId);

    return knownModel ?? {
      id: modelId,
      name: modelId,
      provider: "OpenRouter",
      active: true
    };
  });
}
