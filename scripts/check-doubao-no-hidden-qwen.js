import {
  analyzeImage,
  extractImageText,
  generateImage,
  generateSuggestions,
  prepareAction
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
    calls.push({ provider: "volcengine", operation: "generateImage", input });
    return {
      imageUrl: "mock://volcengine-image",
      model: input.model,
      referenceCount: input.images?.length || 0,
      providerCalls: [
        {
          provider: "volcengine",
          model: input.model,
          operation: "generateImage",
          endpoint: "mock://volcengine"
        }
      ]
    };
  }
});

const restoreQwen = registerAIProvider({
  id: "qwen",
  async generateImage() {
    throw new Error("Qwen generateImage must not run for Doubao ordinary flows");
  },
  async expandImage() {
    throw new Error("Qwen expandImage is not part of this ordinary-flow check");
  },
  async superResolutionImage() {
    throw new Error("Qwen superResolutionImage is not part of this ordinary-flow check");
  },
  async analyzeImage() {
    throw new Error("Qwen analyzeImage must not run for Doubao ordinary flows");
  },
  async generateText() {
    throw new Error("Qwen generateText must not run for Doubao ordinary flows");
  }
});

try {
  const result = await generateImage({
    model: DEFAULT_IMAGE_MODEL,
    prompt: "ordinary doubao generation",
    images: ["data:image/png;base64,abc"],
    size: "2K"
  });
  assert(result.provider === "volcengine", "Doubao ordinary generation should report Volcengine");
  assert(result.providerCalls?.[0]?.provider === "volcengine", "Doubao ordinary generation should expose Volcengine providerCalls");
  assert(calls.length === 1 && calls[0].provider === "volcengine", "Doubao ordinary generation should call only Volcengine");

  const blockedCalls = [
    () => analyzeImage({ model: DEFAULT_IMAGE_MODEL, image: "data:image/png;base64,abc" }),
    () => extractImageText({ model: DEFAULT_IMAGE_MODEL, image: "data:image/png;base64,abc" }),
    () => prepareAction({ model: DEFAULT_IMAGE_MODEL, analysis: { productName: "x" }, action: { type: "scene" } }),
    () => generateSuggestions({ model: DEFAULT_IMAGE_MODEL, prompt: "suggest" }),
    () => generateSuggestions({ model: DEFAULT_IMAGE_MODEL, canvasState: { nodes: [] } })
  ];

  for (const runBlockedCall of blockedCalls) {
    let blockedError = null;
    try {
      await runBlockedCall();
    } catch (error) {
      blockedError = error;
    }
    assert(blockedError?.message?.includes("避免隐藏调用千问"), "Doubao auxiliary Qwen-only calls should be blocked with a clear message");
  }
  assert(calls.length === 1, "Blocked Doubao auxiliary calls should not call Volcengine or Qwen");
} finally {
  restoreVolcengine();
  restoreQwen();
}

console.log("Doubao no-hidden-Qwen checks passed.");
