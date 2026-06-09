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
  { id: "openrouter/owl-alpha", name: "Owl Alpha Free", provider: "OpenRouter", active: true },
  { id: "nex-agi/nex-n2-pro:free", name: "Nex N2 Pro Free", provider: "Nex AGI", active: true },
  { id: "moonshotai/kimi-k2.6:free", name: "Kimi K2.6 Free", provider: "Moonshot AI", active: true }
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
