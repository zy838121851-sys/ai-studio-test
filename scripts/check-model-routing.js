import express from "express";
import { createAIRouter } from "../src/server/routes/ai.routes.js";
import { generateImage } from "../src/server/services/ai.service.js";
import { DEFAULT_IMAGE_MODEL } from "../src/server/services/model-catalog.service.js";
import { registerAIProvider } from "../src/server/services/providers/index.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const calls = [];

const restoreVolcengine = registerAIProvider({
  id: "volcengine",
  async generateImage(input) {
    calls.push({ provider: "volcengine", input });
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
  async generateImage(input) {
    calls.push({ provider: "qwen", input });
    return {
      imageUrl: "mock://qwen-image",
      model: input.model,
      referenceCount: input.images?.length || 0,
      providerCalls: [
        {
          provider: "qwen",
          model: input.model,
          operation: "generateImage",
          endpoint: "mock://qwen"
        }
      ]
    };
  },
  async expandImage() {
    throw new Error("expandImage should not be called by routing checks");
  },
  async superResolutionImage() {
    throw new Error("superResolutionImage should not be called by routing checks");
  },
  async analyzeImage() {
    throw new Error("analyzeImage should not be called by routing checks");
  },
  async generateText() {
    throw new Error("generateText should not be called by routing checks");
  }
});

try {
  calls.length = 0;
  const seedreamResult = await generateImage({
    model: DEFAULT_IMAGE_MODEL,
    prompt: "route to seedream",
    images: ["data:image/png;base64,abc"],
    size: "2K"
  });
  assert(seedreamResult.provider === "volcengine", "Seedream result should report volcengine provider");
  assert(seedreamResult.requestedModel === DEFAULT_IMAGE_MODEL, "Seedream result should keep requested model");
  assert(seedreamResult.providerModel === DEFAULT_IMAGE_MODEL, "Seedream result should keep provider model");
  assert(seedreamResult.providerCalls?.[0]?.provider === "volcengine", "Seedream result should expose providerCalls");
  assert(calls.length === 1, "Seedream should call exactly one provider");
  assert(calls[0].provider === "volcengine", "Seedream should call Volcengine, not Qwen");
  assert(calls[0].input.model === DEFAULT_IMAGE_MODEL, "Seedream provider should receive the selected model");

  calls.length = 0;
  const wanResult = await generateImage({
    model: "wan2.7-image-pro",
    prompt: "route to wan",
    images: [],
    size: "2K"
  });
  assert(wanResult.provider === "qwen", "Wan result should report qwen provider");
  assert(wanResult.requestedModel === "wan2.7-image-pro", "Wan result should keep requested model");
  assert(calls.length === 1, "Wan should call exactly one provider");
  assert(calls[0].provider === "qwen", "Wan should call Qwen provider");

  calls.length = 0;
  let unsupportedError = null;
  try {
    await generateImage({ model: "not-a-real-model", prompt: "fail" });
  } catch (error) {
    unsupportedError = error;
  }
  assert(unsupportedError?.message?.includes("Unsupported image model"), "Unknown model should fail explicitly");
  assert(calls.length === 0, "Unknown model should not call any provider");

  calls.length = 0;
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use((req, _res, next) => {
    req.auth = { user: { id: "test-user" } };
    next();
  });
  app.use("/api", createAIRouter());
  const server = await new Promise((resolve) => {
    const nextServer = app.listen(0, () => resolve(nextServer));
  });
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: DEFAULT_IMAGE_MODEL,
        prompt: "route through api",
        images: [],
        size: "2K"
      })
    });
    const payload = await response.json();
    assert(response.ok, `Route should return 200, got ${response.status}: ${payload.message || ""}`);
    assert(payload.provider === "volcengine", "Route response should expose the real provider");
    assert(payload.requestedModel === DEFAULT_IMAGE_MODEL, "Route response should expose requestedModel");
    assert(payload.providerModel === DEFAULT_IMAGE_MODEL, "Route response should expose providerModel");
    assert(payload.resolvedModel === DEFAULT_IMAGE_MODEL, "Route response should expose resolvedModel");
    assert(payload.providerCalls?.[0]?.provider === "volcengine", "Route response should expose real providerCalls");
    assert(calls.length === 1 && calls[0].provider === "volcengine", "Route should call Volcengine exactly once");

    const restoreBadVolcengine = registerAIProvider({
      id: "volcengine",
      async generateImage(input) {
        calls.push({ provider: "bad-volcengine", input });
        return {
          imageUrl: "mock://bad-image",
          model: "qwen-image-edit-plus",
          provider: "qwen",
          providerModel: "qwen-image-edit-plus",
          referenceCount: input.images?.length || 0,
          providerCalls: [
            {
              provider: "qwen",
              model: "qwen-image-edit-plus",
              operation: "generateImage",
              endpoint: "mock://qwen"
            }
          ]
        };
      }
    });
    try {
      calls.length = 0;
      const badResponse = await fetch(`http://127.0.0.1:${port}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: DEFAULT_IMAGE_MODEL,
          prompt: "must be blocked",
          images: ["data:image/png;base64,abc"],
          size: "2K"
        })
      });
      const badPayload = await badResponse.json();
      assert(!badResponse.ok, "Route should reject Doubao responses resolved to Qwen");
      assert(badPayload.message?.includes("unexpected provider"), "Route should explain the unexpected provider");
    } finally {
      restoreBadVolcengine();
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
} finally {
  restoreVolcengine();
  restoreQwen();
}

console.log("Model routing checks passed.");
