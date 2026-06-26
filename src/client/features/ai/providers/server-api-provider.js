import { postJson } from "../api-client.js";

export const serverAPIProvider = {
  async analyzeImage(input = {}) {
    return postJson("/api/analyze-image", input);
  },

  async generateImage(input = {}) {
    return postJson("/api/chat", input);
  },

  async generateSuggestions(context = {}) {
    const canvasState = context.canvasState || context;
    return postJson("/api/canvas-agent", {
      canvasState,
      model: context.model
    });
  },

  async extractPrompt(input = {}) {
    return postJson("/api/extract-image-text", input);
  }
};
