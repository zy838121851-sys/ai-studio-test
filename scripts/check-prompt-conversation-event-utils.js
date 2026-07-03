import {
  buildConversationRunPayload,
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

const explicitAttachments = [{ type: "image", name: "ready.png", dataUrl: "data:image/png;base64,a" }];
const explicitPayload = buildConversationRunPayload({
  runId: "run-1",
  prompt: "Make a concept",
  model: "gpt-image",
  attachments: explicitAttachments,
  images: ["ignored"],
  files: [{ type: "image/jpeg", name: "ignored.jpg" }],
  canvasContext: { selected: 1 }
});
assert(explicitPayload.runId === "run-1", "Conversation payloads should preserve run ids");
assert(explicitPayload.text === "Make a concept", "Conversation payloads should map prompts to text");
assert(explicitPayload.model === "gpt-image", "Conversation payloads should preserve models");
assert(explicitPayload.mode === "auto", "Conversation payloads should preserve auto mode");
assert(explicitPayload.attachments === explicitAttachments, "Conversation payloads should prefer explicit attachments");
assert(explicitPayload.canvasContext.selected === 1, "Conversation payloads should preserve canvas context");

const uploadPayload = buildConversationRunPayload({
  images: ["data:image/png;base64,a", "data:image/png;base64,b"],
  files: [{ type: "image/png", name: "first.png" }]
});
assert(uploadPayload.attachments.length === 2, "Conversation payloads should map image uploads to attachments");
assert(
  uploadPayload.attachments[0].type === "image/png"
    && uploadPayload.attachments[0].name === "first.png"
    && uploadPayload.attachments[0].source === "upload"
    && uploadPayload.attachments[0].dataUrl === "data:image/png;base64,a",
  "Conversation payloads should preserve uploaded file metadata"
);
assert(
  uploadPayload.attachments[1].type === "image"
    && uploadPayload.attachments[1].name === "Reference 2",
  "Conversation payloads should preserve fallback upload metadata"
);

console.log("Prompt conversation event utility checks passed.");
