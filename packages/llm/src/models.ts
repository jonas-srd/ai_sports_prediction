/**
 * Purpose: Defines the benchmark model roster and the active MVP subset used for predictions.
 */
export type BenchmarkModelConfig = {
  slot: string;
  displayName: string;
  modelId: string;
  canonicalVersion: string;
  family: string;
  tier: string;
  includeInPrimary2x2: boolean;
};

export type LlmModel = {
  id: string;
  name: string;
  provider: string;
  active: boolean;
  model_version: string;
  model_family: string;
};

export const MINIMAL_FLAGSHIP_MODELS: BenchmarkModelConfig[] = [
  {
    slot: "openai_gpt_5_5",
    displayName: "GPT-5.5",
    modelId: "openai/gpt-5.5",
    canonicalVersion: "openai/gpt-5.5-20260423",
    family: "OpenAI",
    tier: "frontier_general",
    includeInPrimary2x2: true
  },
  {
    slot: "anthropic_claude_opus_4_8",
    displayName: "Claude Opus 4.8",
    modelId: "anthropic/claude-opus-4.8",
    canonicalVersion: "anthropic/claude-4.8-opus-20260528",
    family: "Anthropic",
    tier: "opus_flagship",
    includeInPrimary2x2: true
  },
  {
    slot: "google_gemini_3_1_pro",
    displayName: "Gemini 3.1 Pro",
    modelId: "google/gemini-3.1-pro-preview",
    canonicalVersion: "google/gemini-3.1-pro-preview-20260219",
    family: "Google",
    tier: "flagship_pro",
    includeInPrimary2x2: true
  },
  {
    slot: "xai_grok_4_3",
    displayName: "Grok 4.3",
    modelId: "x-ai/grok-4.3",
    canonicalVersion: "x-ai/grok-4.3-20260430",
    family: "xAI",
    tier: "flagship_current_info",
    includeInPrimary2x2: true
  },
  {
    slot: "deepseek_v4_pro",
    displayName: "DeepSeek V4 Pro",
    modelId: "deepseek/deepseek-v4-pro",
    canonicalVersion: "deepseek/deepseek-v4-pro-20260423",
    family: "DeepSeek",
    tier: "flagship",
    includeInPrimary2x2: true
  },
  {
    slot: "qwen_3_7_max",
    displayName: "Qwen 3.7 Max",
    modelId: "qwen/qwen3.7-max",
    canonicalVersion: "qwen/qwen3.7-max-20260520",
    family: "Qwen",
    tier: "flagship",
    includeInPrimary2x2: true
  },
  {
    slot: "mistral_large_2512",
    displayName: "Mistral Large 2512",
    modelId: "mistralai/mistral-large-2512",
    canonicalVersion: "mistralai/mistral-large-2512",
    family: "Mistral",
    tier: "most_capable_mistral",
    includeInPrimary2x2: true
  }
];

export const FULL_BENCHMARK_MODELS: BenchmarkModelConfig[] = [
  ...MINIMAL_FLAGSHIP_MODELS,

  {
    slot: "anthropic_claude_fable_5",
    displayName: "Claude Fable 5",
    modelId: "anthropic/claude-fable-5",
    canonicalVersion: "anthropic/claude-5-fable-20260609",
    family: "Anthropic",
    tier: "latest_flagship_experimental",
    includeInPrimary2x2: false
  },
  {
    slot: "anthropic_claude_sonnet_4_6",
    displayName: "Claude Sonnet 4.6",
    modelId: "anthropic/claude-sonnet-4.6",
    canonicalVersion: "anthropic/claude-4.6-sonnet-20260217",
    family: "Anthropic",
    tier: "strong_efficient_frontier",
    includeInPrimary2x2: false
  },
  {
    slot: "google_gemini_3_5_flash",
    displayName: "Gemini 3.5 Flash",
    modelId: "google/gemini-3.5-flash",
    canonicalVersion: "google/gemini-3.5-flash-20260519",
    family: "Google",
    tier: "fast_frontier",
    includeInPrimary2x2: false
  },
  {
    slot: "deepseek_v4_flash",
    displayName: "DeepSeek V4 Flash",
    modelId: "deepseek/deepseek-v4-flash",
    canonicalVersion: "deepseek/deepseek-v4-flash-20260423",
    family: "DeepSeek",
    tier: "fast_low_cost",
    includeInPrimary2x2: false
  },
  {
    slot: "qwen_3_7_plus",
    displayName: "Qwen 3.7 Plus",
    modelId: "qwen/qwen3.7-plus",
    canonicalVersion: "qwen/qwen3.7-plus-20260602",
    family: "Qwen",
    tier: "efficient_strong",
    includeInPrimary2x2: false
  },
  {
    slot: "mistral_medium_3_5",
    displayName: "Mistral Medium 3.5",
    modelId: "mistralai/mistral-medium-3-5",
    canonicalVersion: "mistralai/mistral-medium-3.5-20260430",
    family: "Mistral",
    tier: "current_dense_flagship",
    includeInPrimary2x2: false
  },
  {
    slot: "llama_4_maverick",
    displayName: "Llama 4 Maverick",
    modelId: "meta-llama/llama-4-maverick",
    canonicalVersion: "meta-llama/llama-4-maverick-17b-128e-instruct",
    family: "Meta Llama",
    tier: "open_weight_reference",
    includeInPrimary2x2: false
  },
  {
    slot: "nvidia_nemotron_3_ultra",
    displayName: "Nemotron 3 Ultra",
    modelId: "nvidia/nemotron-3-ultra-550b-a55b",
    canonicalVersion: "nvidia/nemotron-3-ultra-550b-a55b-20260604",
    family: "NVIDIA",
    tier: "open_frontier_reference",
    includeInPrimary2x2: false
  },
  {
    slot: "minimax_m3",
    displayName: "MiniMax M3",
    modelId: "minimax/minimax-m3",
    canonicalVersion: "minimax/minimax-m3-20260531",
    family: "MiniMax",
    tier: "long_context_agentic",
    includeInPrimary2x2: false
  },
  {
    slot: "moonshot_kimi_latest_frozen_alias_not_primary",
    displayName: "Kimi Latest",
    modelId: "~moonshotai/kimi-latest",
    canonicalVersion: "~moonshotai/kimi-latest",
    family: "MoonshotAI",
    tier: "alias_exploratory_only",
    includeInPrimary2x2: false
  }
];

export const ACTIVE_BENCHMARK_MODELS = MINIMAL_FLAGSHIP_MODELS;

export const LLM_MODELS: LlmModel[] = ACTIVE_BENCHMARK_MODELS.map(toLlmModel);

export function getConfiguredLlmModels(): LlmModel[] {
  const configuredIds = process.env.OPENROUTER_MODEL_IDS
    ?.split(",")
    .map((modelId) => modelId.trim())
    .filter(Boolean);

  if (!configuredIds || configuredIds.length === 0) {
    return LLM_MODELS;
  }

  return configuredIds.map((modelId) => {
    const knownModel = FULL_BENCHMARK_MODELS.find((model) => model.modelId === modelId);

    if (!knownModel) {
      throw new Error(`OPENROUTER_MODEL_IDS contains an unsupported benchmark model: ${modelId}`);
    }

    return toLlmModel(knownModel);
  });
}

function toLlmModel(model: BenchmarkModelConfig): LlmModel {
  return {
    id: model.modelId,
    name: model.displayName,
    provider: model.family,
    active: true,
    model_version: model.canonicalVersion,
    model_family: model.family
  };
}
