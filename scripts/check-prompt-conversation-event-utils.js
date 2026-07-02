import {
  getGenerationToolNameFromEvent,
  isGenerationIntent,
  isGenerationTool
} from "../src/client/features/workspace/chat/workflows/prompt-conversation-event-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(isGenerationTool("generate_image"), "Generation tool check should accept image generation");
assert(isGenerationTool(" edit_image "), "Generation tool check should trim edit image tools");
assert(isGenerationTool("generate_video"), "Generation tool check should accept video generation");
assert(!isGenerationTool("generate_3d"), "Generation tool check should reject unsupported tools");
assert(!isGenerationTool(""), "Generation tool check should reject empty values");

assert(isGenerationIntent("generate_image"), "Generation intent check should accept image generation");
assert(isGenerationIntent(" edit_image "), "Generation intent check should trim edit image intents");
assert(isGenerationIntent("generate_video"), "Generation intent check should accept video generation");
assert(!isGenerationIntent("chat"), "Generation intent check should reject chat intents");

assert(
  getGenerationToolNameFromEvent({ toolCall: { name: " generate_image " } }) === "generate_image",
  "Generation tool lookup should prefer toolCall names"
);
assert(
  getGenerationToolNameFromEvent({ tool: { name: "edit_image" } }) === "edit_image",
  "Generation tool lookup should read tool names"
);
assert(
  getGenerationToolNameFromEvent({ name: "generate_video" }) === "generate_video",
  "Generation tool lookup should read event names"
);
assert(
  getGenerationToolNameFromEvent({
    toolCalls: [
      { name: "search" },
      { name: " edit_image " }
    ]
  }) === "edit_image",
  "Generation tool lookup should scan event toolCalls"
);
assert(
  getGenerationToolNameFromEvent({
    message: {
      toolCalls: [
        { name: "unknown" },
        { name: "generate_video" }
      ]
    }
  }) === "generate_video",
  "Generation tool lookup should scan message toolCalls"
);
assert(
  getGenerationToolNameFromEvent({
    toolCall: { name: "unknown" },
    tool: { name: "generate_image" },
    name: "generate_video"
  }) === "generate_image",
  "Generation tool lookup should return the first generation-capable candidate"
);
assert(
  getGenerationToolNameFromEvent({ toolCalls: "not-array", message: { toolCalls: "not-array" } }) === "",
  "Generation tool lookup should ignore malformed toolCalls"
);
assert(
  getGenerationToolNameFromEvent({}) === "",
  "Generation tool lookup should handle empty events"
);

console.log("Prompt conversation event utility checks passed.");
