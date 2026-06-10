const providers = new Map();
let activeProvider = "mock";

export function registerAIProvider(name, provider) {
  providers.set(name, provider);
}

export function setActiveAIProvider(name) {
  if (!providers.has(name)) {
    throw new Error(`AI provider not registered: ${name}`);
  }
  activeProvider = name;
}

export function getActiveAIProvider() {
  const provider = providers.get(activeProvider);
  if (!provider) throw new Error(`AI provider unavailable: ${activeProvider}`);
  return provider;
}

export function analyzeImage(input) {
  return getActiveAIProvider().analyzeImage(input);
}

export function generateImage(input) {
  return getActiveAIProvider().generateImage(input);
}

export function generateSuggestions(context) {
  return getActiveAIProvider().generateSuggestions(context);
}

export function extractPrompt(input) {
  return getActiveAIProvider().extractPrompt(input);
}
