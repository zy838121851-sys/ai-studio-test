import {
  analyzeImage,
  expandImage,
  generateFixedQwenImageEdit,
  generateImage,
  generateSuggestions,
  superResolutionImage
} from "../src/server/services/ai.service.js";
import { DEFAULT_IMAGE_MODEL } from "../src/server/services/model-catalog.service.js";
import { registerAIProvider } from "../src/server/services/providers/index.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const calls = [];

const restoreVolcengine = registerAIProvider({
  id: "volcengine",
  async generateImage(input) {
    calls.push({ provider: "volcengine", operation: "generateImage", model: input.model });
    return {
      imageUrl: "mock://volcengine-image",
      model: input.model,
      referenceCount: input.images?.length || 0,
      providerCalls: [{ provider: "volcengine", model: input.model, operation: "generateImage", endpoint: "mock://volcengine" }]
    };
  }
});

const restoreQwen = registerAIProvider({
  id: "qwen",
  async generateImage(input) {
    calls.push({ provider: "qwen", operation: "generateImage", model: input.model });
    return {
      imageUrl: "mock://qwen-image",
      model: input.model,
      referenceCount: input.images?.length || 0,
      providerCalls: [{ provider: "qwen", model: input.model, operation: "generateImage", endpoint: "mock://qwen" }]
    };
  },
  async expandImage(input) {
    calls.push({ provider: "qwen", operation: "expandImage", model: input.model });
    return {
      imageUrl: "mock://qwen-expanded",
      model: input.model,
      referenceCount: 1,
      providerCalls: [{ provider: "qwen", model: input.model, operation: "expandImage", endpoint: "mock://qwen" }]
    };
  },
  async superResolutionImage() {
    calls.push({ provider: "qwen", operation: "superResolutionImage", model: "wanx2.1-imageedit" });
    return {
      imageUrl: "mock://qwen-upscaled",
      model: "wanx2.1-imageedit",
      referenceCount: 1,
      providerCalls: [{ provider: "qwen", model: "wanx2.1-imageedit", operation: "superResolutionImage", endpoint: "mock://qwen-image-edit" }]
    };
  },
  async analyzeImage() {
    calls.push({ provider: "qwen", operation: "analyzeImage", model: "qwen3-vl-plus" });
    return {
      text: "{\"outpaintPrompt\":\"continue the background naturally\",\"sceneSummary\":\"source image\"}",
      providerCalls: [{ provider: "qwen", model: "qwen3-vl-plus", operation: "analyzeImage", endpoint: "mock://qwen" }]
    };
  },
  async generateText() {
    calls.push({ provider: "qwen", operation: "generateText", model: "qwen3-vl-plus" });
    return {
      text: "{\"ok\":true}",
      providerCalls: [{ provider: "qwen", model: "qwen3-vl-plus", operation: "generateText", endpoint: "mock://qwen" }]
    };
  }
});

const restoreApimart = registerAIProvider({
  id: "apimart",
  async generateImage(input) {
    calls.push({ provider: "apimart", operation: "generateImage", model: input.model });
    return {
      imageUrl: "mock://apimart-image",
      model: input.model,
      referenceCount: input.images?.length || 0,
      providerCalls: [{ provider: "apimart", model: input.model, operation: "generateImage", endpoint: "mock://apimart" }]
    };
  },
  async expandImage(input) {
    calls.push({ provider: "apimart", operation: "expandImage", model: input.model });
    return {
      imageUrl: "mock://apimart-expanded",
      model: input.model,
      referenceCount: 1,
      providerCalls: [{ provider: "apimart", model: input.model, operation: "expandImage", endpoint: "mock://apimart" }]
    };
  },
  async superResolutionImage() {
    calls.push({ provider: "apimart", operation: "superResolutionImage", model: "wanx2.1-imageedit" });
    return {
      imageUrl: "mock://apimart-upscaled",
      model: "wanx2.1-imageedit",
      referenceCount: 1,
      providerCalls: [{ provider: "apimart", model: "wanx2.1-imageedit", operation: "superResolutionImage", endpoint: "mock://apimart" }]
    };
  }
});

try {
  calls.length = 0;
  const defaultImage = await generateImage({ model: DEFAULT_IMAGE_MODEL, prompt: "home", size: "2K" });
  assert(defaultImage.providerCalls.map((call) => call.provider).join(",") === "apimart", "Default image generation should call only APIMart internally");

  calls.length = 0;
  const wan = await generateImage({ model: "wan2.7-image-pro", prompt: "wan", size: "2K" });
  assert(wan.providerCalls.map((call) => call.provider).join(",") === "apimart", "Wan generation should call APIMart provider");

  calls.length = 0;
  const expanded = await expandImage({ image: "data:image/png;base64,abc", prompt: "expand" });
  assert(expanded.providerCalls.some((call) => call.operation === "analyzeImage"), "Expand should expose Qwen planning call");
  assert(expanded.providerCalls.some((call) => call.operation === "expandImage"), "Expand should expose Wan2.7 expand call");
  assert(expanded.providerCalls.some((call) => call.operation === "expandImage" && call.provider === "apimart"), "Expand output should call APIMart provider");

  calls.length = 0;
  const upscaled = await superResolutionImage({ image: "data:image/png;base64,abc", prompt: "upscale", upscaleFactor: 2 });
  assert(upscaled.providerCalls[0]?.operation === "superResolutionImage", "Upscale should expose super-resolution call");
  assert(upscaled.providerCalls[0]?.provider === "qwen", "Upscale should call Qwen official provider");

  calls.length = 0;
  const fixedEdit = await generateFixedQwenImageEdit({
    images: ["data:image/png;base64,abc"],
    prompt: "remove background"
  });
  assert(fixedEdit.providerCalls[0]?.provider === "qwen", "Fixed image edit should call Qwen official provider");
  assert(fixedEdit.providerCalls[0]?.model === "qwen-image-edit-plus", "Fixed image edit should preserve Qwen Image Edit Plus");
  assert(!calls.some((call) => call.provider === "apimart"), "Fixed image edit should not fall back to APIMart");

  calls.length = 0;
  const analysis = await analyzeImage({ model: "wan2.7-image-pro", image: "data:image/png;base64,abc" });
  assert(analysis.providerCalls[0]?.provider === "qwen", "Qwen-selected analysis should expose Qwen providerCalls");

  calls.length = 0;
  const suggestions = await generateSuggestions({ model: "wan2.7-image-pro", prompt: "suggest" });
  assert(suggestions.providerCalls[0]?.provider === "qwen", "Qwen-selected suggestions should expose Qwen providerCalls");
} finally {
  restoreVolcengine();
  restoreQwen();
  restoreApimart();
}

console.log("AI provider call matrix checks passed.");
