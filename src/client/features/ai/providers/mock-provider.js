export const mockProvider = {
  async analyzeImage(input = {}) {
    return {
      provider: "mock",
      industry: input.industry || "unknown",
      summary: "TODO: replace mock analyzeImage with a real provider adapter."
    };
  },

  async generateImage(input = {}) {
    return {
      provider: "mock",
      prompt: input.prompt || "",
      imageUrl: "",
      status: "mock"
    };
  },

  async generateSuggestions(context = {}) {
    return {
      provider: "mock",
      suggestion: "AI suggestion ready",
      context
    };
  },

  async extractPrompt(input = {}) {
    return {
      provider: "mock",
      prompt: input.prompt || ""
    };
  }
};
