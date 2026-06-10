import {
  callQwenImage,
  callQwenText,
  callQwenVision
} from "./qwen.provider.js";

const qwenProvider = {
  id: "qwen",
  generateImage: callQwenImage,
  analyzeImage: callQwenVision,
  generateText: callQwenText
};

const providers = new Map([
  [qwenProvider.id, qwenProvider]
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

export function listAIProviders() {
  return Array.from(providers.keys());
}
