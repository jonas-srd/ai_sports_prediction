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
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", active: true },
  { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5", provider: "Google", active: true },
  { id: "x-ai/grok-2", name: "Grok 2", provider: "xAI", active: true },
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B", provider: "Meta", active: true },
  { id: "mistralai/mistral-large", name: "Mistral Large", provider: "Mistral", active: true },
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", provider: "DeepSeek", active: true },
  { id: "perplexity/llama-3.1-sonar-large-128k-online", name: "Perplexity Sonar Large", provider: "Perplexity", active: true }
];
