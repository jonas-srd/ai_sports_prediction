/**
 * Purpose: Lists currently free text-output models from OpenRouter's public models endpoint.
 * Use this when a previously free model becomes unavailable or starts returning 404.
 */
type OpenRouterModel = {
  id: string;
  name: string;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  architecture?: {
    output_modalities?: string[];
  };
};

type OpenRouterModelsResponse = {
  data: OpenRouterModel[];
};

async function main() {
  const response = await fetch("https://openrouter.ai/api/v1/models");
  const body = (await response.json()) as OpenRouterModelsResponse;

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenRouter models: ${JSON.stringify(body)}`);
  }

  const freeTextModels = body.data
    .filter((model) => model.pricing?.prompt === "0" && model.pricing?.completion === "0")
    .filter((model) => model.architecture?.output_modalities?.includes("text"))
    .slice(0, 30);

  if (freeTextModels.length === 0) {
    console.log("No free text models found.");
    return;
  }

  console.log("Current free OpenRouter text models:");
  for (const model of freeTextModels) {
    console.log(`${model.id} - ${model.name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
