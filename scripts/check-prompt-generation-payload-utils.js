import {
  buildPromptGenerationPayload,
  isPrompt3DGeneration,
  isPromptVideoGeneration,
  isPromptGenerationPayloadMissing,
  resolvePromptAgentGenerationType,
  resolvePromptGenerationType,
  resolvePromptModelSelection
} from "../src/client/features/workspace/chat/workflows/prompt-generation-payload-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(resolvePromptGenerationType(true) === "video", "Prompt generation type should resolve video models to video");
assert(resolvePromptGenerationType(false) === "image", "Prompt generation type should resolve non-video models to image");
assert(resolvePromptGenerationType("truthy") === "video", "Prompt generation type should preserve truthy behavior");
assert(resolvePromptGenerationType("") === "image", "Prompt generation type should preserve falsy behavior");
assert(resolvePromptAgentGenerationType("3d") === "3d", "Prompt agent generation type should preserve 3D model types");
assert(resolvePromptAgentGenerationType("video") === "video", "Prompt agent generation type should preserve video model types");
assert(resolvePromptAgentGenerationType("image") === "image", "Prompt agent generation type should preserve image model types");
assert(resolvePromptAgentGenerationType("unknown") === "image", "Prompt agent generation type should fall back to image for unknown model types");

const pendingSelection = resolvePromptModelSelection({
  pendingHomeModel: "home-model",
  selectedModel: "selected-model",
  resolveModelId: (value, source) => `${source}:${value}`
});
assert(pendingSelection.requestedModel === "home-model", "Prompt model selection should prefer pending home models");
assert(pendingSelection.model === "chat:home-model", "Prompt model selection should pass requested models through the resolver");
assert(pendingSelection.normalized === true, "Prompt model selection should report normalized model ids");

const selectedSelection = resolvePromptModelSelection({
  pendingHomeModel: "",
  selectedModel: "selected-model",
  resolveModelId: (value) => value
});
assert(selectedSelection.requestedModel === "selected-model", "Prompt model selection should fall back to selected models");
assert(selectedSelection.model === "selected-model", "Prompt model selection should keep resolved model ids");
assert(selectedSelection.normalized === false, "Prompt model selection should report unchanged model ids");

assert(isPrompt3DGeneration({ modelType: "3d" }), "Prompt 3D generation should accept 3D model types");
assert(!isPrompt3DGeneration({ modelType: "video" }), "Prompt 3D generation should reject video model types");
assert(!isPrompt3DGeneration({}), "Prompt 3D generation should default to false");
assert(isPromptVideoGeneration({ modelType: "video", outputType: "" }), "Prompt video generation should accept video model types");
assert(isPromptVideoGeneration({ modelType: "image", outputType: "video" }), "Prompt video generation should accept video output intents");
assert(!isPromptVideoGeneration({ modelType: "image", outputType: "image" }), "Prompt video generation should reject image-only requests");
assert(!isPromptVideoGeneration({}), "Prompt video generation should default to false");

const calls = [];
const payload = buildPromptGenerationPayload({
  buildChatImagePayload: (options) => {
    calls.push(options);
    return { ...options, built: true };
  },
  model: "gpt-image-2",
  prompt: "Generate a poster",
  images: [{ name: "ref.png" }],
  size: "1024x1024"
});
assert(payload.built === true, "Prompt generation payload helper should return builder results");
assert(calls.length === 1, "Prompt generation payload helper should call the builder once");
assert(calls[0].model === "gpt-image-2", "Prompt generation payload helper should preserve model");
assert(calls[0].prompt === "Generate a poster", "Prompt generation payload helper should preserve prompt");
assert(calls[0].images.length === 1, "Prompt generation payload helper should preserve images");
assert(calls[0].size === "1024x1024", "Prompt generation payload helper should preserve size");

let thrown = null;
try {
  buildPromptGenerationPayload({
    buildChatImagePayload: () => {
      throw new Error("builder failed");
    }
  });
} catch (error) {
  thrown = error;
}
assert(thrown?.message === "builder failed", "Prompt generation payload helper should preserve builder errors");

assert(isPromptGenerationPayloadMissing(null), "Prompt generation payload missing check should reject null payloads");
assert(isPromptGenerationPayloadMissing({}), "Prompt generation payload missing check should reject empty payloads");
assert(isPromptGenerationPayloadMissing({ prompt: "", images: "not-array" }), "Prompt generation payload missing check should reject empty prompts with non-array images");
assert(!isPromptGenerationPayloadMissing({ prompt: "hello" }), "Prompt generation payload missing check should accept prompt payloads");
assert(!isPromptGenerationPayloadMissing({ images: [] }), "Prompt generation payload missing check should preserve array-image payload behavior");
assert(!isPromptGenerationPayloadMissing({ prompt: "", images: [{ url: "/uploads/a.png" }] }), "Prompt generation payload missing check should accept image array payloads");

console.log("Prompt generation payload utility checks passed.");
