import {
  callQwenImage,
  callQwenText,
  callQwenVision,
  callWanImageExpand
} from "./qwen.provider.js";

const qwenProvider = {
  id: "qwen",
  generateImage: callQwenImage,
  expandImage: callWanImageExpand,
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
