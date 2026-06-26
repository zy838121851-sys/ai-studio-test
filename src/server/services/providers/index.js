import {
  callQwenImage,
  callQwenText,
  callQwenVision,
  callWan27ImageExpand,
  callWanImageSuperResolution
} from "./qwen.provider.js";
import { callVolcengineSeedreamImage } from "./volcengine.provider.js";
import { getModelConfig } from "../model-catalog.service.js";

const qwenProvider = {
  id: "qwen",
  generateImage: callQwenImage,
  expandImage: callWan27ImageExpand,
  superResolutionImage: callWanImageSuperResolution,
  analyzeImage: callQwenVision,
  generateText: callQwenText
};

const volcengineProvider = {
  id: "volcengine",
  generateImage: callVolcengineSeedreamImage
};

const providers = new Map([
  [qwenProvider.id, qwenProvider],
  [volcengineProvider.id, volcengineProvider]
]);

let activeProviderId = "qwen";

export function getAIProvider(providerId = activeProviderId) {
  const provider = providers.get(providerId);
  if (!provider) throw new Error(`Unknown AI provider: ${providerId}`);
  return provider;
}

export function setAIProvider(providerId) {
  if (!providers.has(providerId)) throw new Error(`Unknown AI provider: ${providerId}`);
  activeProviderId = providerId;
  return getAIProvider();
}

export function getAIProviderForModel(modelId) {
  return resolveImageGenerationRoute(modelId).provider;
}

export function resolveImageGenerationRoute(modelId, operation = "generateImage") {
  const requestedModel = String(modelId || "").trim();
  const config = getModelConfig(requestedModel);
  if (!config) {
    throw new Error(`Unsupported image model: ${requestedModel || "(empty)"}`);
  }
  const providerId = config.providerId;
  if (!providerId) {
    throw new Error(`Image model is missing a provider: ${config.id}`);
  }
  const provider = getAIProvider(providerId);
  if (typeof provider?.[operation] !== "function") {
    throw new Error(`AI provider ${providerId} does not support ${operation} for model ${config.id}`);
  }
  const providerModel = config.providerModel || config.id;
  return {
    requestedModel: config.id,
    resolvedModel: providerModel,
    providerModel,
    providerId,
    provider,
    config
  };
}

export function registerAIProvider(provider) {
  if (!provider?.id) throw new Error("AI provider must include an id");
  const previous = providers.get(provider.id);
  providers.set(provider.id, provider);
  return () => {
    if (previous) {
      providers.set(provider.id, previous);
    } else {
      providers.delete(provider.id);
    }
    if (!providers.has(activeProviderId)) activeProviderId = "qwen";
  };
}

export function listAIProviders() {
  return Array.from(providers.keys());
}
