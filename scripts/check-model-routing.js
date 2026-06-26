import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-routing-"));
process.env.DB_PATH = join(tempRoot, "routing.sqlite");
process.env.NODE_ENV = "test";

const express = (await import("express")).default;
const { createAIRouter } = await import("../src/server/routes/ai.routes.js");
const { generateImage } = await import("../src/server/services/ai.service.js");
const { DEFAULT_IMAGE_MODEL } = await import("../src/server/services/model-catalog.service.js");
const { registerAIProvider } = await import("../src/server/services/providers/index.js");
const { initializeDatabase, closeDatabase, execute } = await import("../src/server/db/sqlite.js");
const { runCreditsMigration } = await import("../src/server/db/credits-migration.js");
const { ensureCreditAccount } = await import("../src/server/services/credits/credit.service.js");

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

const restoreApimart = registerAIProvider({
  id: "apimart",
  async generateImage(input) {
    calls.push({ provider: "apimart", input });
    return {
      imageUrl: "mock://apimart-image",
      model: input.model,
      referenceCount: input.images?.length || 0,
      providerCalls: [
        {
          provider: "apimart",
          model: input.model,
          operation: "generateImage",
          endpoint: "mock://apimart"
        }
      ]
    };
  },
  async generateVideo() {
    throw new Error("generateVideo should not be called by routing checks");
  }
});

try {
  initializeDatabase();
  runCreditsMigration({ grantExistingUsers: false });
  execute(`
    INSERT INTO users (id, email, name, password_hash, password_salt, created_at, updated_at)
    VALUES ('test-user', 'routing@example.com', 'Routing User', '', '', ${Date.now()}, ${Date.now()});
  `);
  ensureCreditAccount("test-user", { initialCredits: 100, reason: "test_grant" });

  calls.length = 0;
  const defaultResult = await generateImage({
    model: DEFAULT_IMAGE_MODEL,
    prompt: "route to default image model",
    images: ["data:image/png;base64,abc"],
    size: "2K"
  });
  assert(defaultResult.provider === "apimart", "Default image result should report apimart provider internally");
  assert(defaultResult.requestedModel === DEFAULT_IMAGE_MODEL, "Default image result should keep requested model");
  assert(defaultResult.providerModel === "gpt-image-2", "Default image result should keep provider model");
  assert(defaultResult.providerCalls?.[0]?.provider === "apimart", "Default image result should expose internal providerCalls");
  assert(calls.length === 1, "Default image model should call exactly one provider");
  assert(calls[0].provider === "apimart", "Default image model should call APIMart, not Qwen");
  assert(calls[0].input.model === "gpt-image-2", "APIMart provider should receive the provider model");

  const apimartImageMappings = [
    ["gpt-image-2", "gpt-image-2"],
    ["nano-banana-pro", "gemini-3-pro-image-preview"],
    ["midjourney", "midjourney"],
    ["nano-banana", "gemini-2.5-flash-image-preview"],
    ["nano-banana-2", "gemini-3.1-flash-image-preview"],
    ["qwen-image-2.0-pro", "qwen-image-2.0-pro"],
    ["wan2.7-image-pro", "wan2.7-image-pro"],
    ["qwen-image-edit-plus", "qwen-image-edit-plus"],
    ["seedream-5-lite", "doubao-seedream-5-0-lite"],
    ["seedream-4-5", "doubao-seedream-4.5"]
  ];
  for (const [modelId, providerModel] of apimartImageMappings) {
    calls.length = 0;
    const result = await generateImage({
      model: modelId,
      prompt: `route ${modelId}`,
      images: ["data:image/png;base64,abc"],
      size: "2K"
    });
    assert(result.requestedModel === modelId, `${modelId} should keep requestedModel`);
    assert(result.provider === "apimart", `${modelId} should route to APIMart`);
    assert(result.providerModel === providerModel, `${modelId} should resolve to ${providerModel}`);
    assert(calls.length === 1, `${modelId} should call exactly one provider`);
    assert(calls[0].provider === "apimart", `${modelId} should call APIMart`);
    assert(calls[0].input.model === providerModel, `${modelId} should send ${providerModel} to APIMart`);
    if (modelId !== DEFAULT_IMAGE_MODEL) {
      assert(calls[0].input.model !== "gpt-image-2", `${modelId} must not fall back to gpt-image-2`);
    }
  }

  calls.length = 0;
  let hiddenDoubaoError = null;
  try {
    await generateImage({
      model: "doubao-seedream-5-0-lite-260128",
      prompt: "hidden direct seedream should fail",
      images: ["data:image/png;base64,abc"],
      size: "2K"
    });
  } catch (error) {
    hiddenDoubaoError = error;
  }
  assert(hiddenDoubaoError?.message?.includes("Unsupported image model"), "Hidden Doubao direct model should fail explicitly");
  assert(calls.length === 0, "Hidden Doubao direct model should not call any provider");

  calls.length = 0;
  const wanResult = await generateImage({
    model: "wan2.7-image-pro",
    prompt: "route to wan",
    images: [],
    size: "2K"
  });
  assert(wanResult.provider === "apimart", "Wan menu generation result should report apimart provider internally");
  assert(wanResult.requestedModel === "wan2.7-image-pro", "Wan result should keep requested model");
  assert(calls.length === 1, "Wan should call exactly one provider");
  assert(calls[0].provider === "apimart", "Wan menu generation should call APIMart provider");

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
    assert(!("provider" in payload), "APIMart route response should not expose provider");
    assert(payload.requestedModel === DEFAULT_IMAGE_MODEL, "Route response should expose requestedModel");
    assert(payload.providerModel === "gpt-image-2", "Route response should expose providerModel");
    assert(payload.resolvedModel === "gpt-image-2", "Route response should expose resolvedModel");
    assert(!payload.providerCalls?.length, "Route response should hide APIMart providerCalls");
    assert(calls.length === 1 && calls[0].provider === "apimart", "Route should call APIMart exactly once");

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
      assert(badResponse.ok, "APIMart default model should not use the Doubao direct-provider assertion");
      assert(!badPayload.providerCalls?.length, "APIMart default model response should keep providerCalls hidden");
    } finally {
      restoreBadVolcengine();
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
} finally {
  restoreVolcengine();
  restoreQwen();
  restoreApimart();
  closeDatabase();
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

console.log("Model routing checks passed.");
