import { runConversationAgent } from "../src/client/features/workspace/chat/workflows/prompt-conversation-agent-workflow.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const missingProject = await runConversationAgent({
  prompt: "Fallback prompt",
  model: "gpt-image-2"
});
assert(missingProject.shouldGenerate === true, "Missing projects should preserve the direct-generation fallback");
assert(missingProject.optimizedPrompt === "Fallback prompt", "Missing projects should preserve the submitted prompt");

let observedConversationId = "";
let observedPayload = null;
const result = await runConversationAgent({
  projectId: "project-1",
  prompt: "Create an image",
  model: "gpt-image-2",
  images: ["data:image/png;base64,abc"],
  files: [{ name: "reference.png" }],
  attachments: [{ name: "reference.png", source: "upload" }],
  canvasContext: { selectedNodeCount: 1 },
  thinking: {},
  addChat: () => null,
  updateChat: () => {},
  updateThinking: () => {},
  setThinkingSummary: () => {}
}, {
  ensureConversation: async (projectId) => ({ id: `conversation:${projectId}` }),
  conversationStreamRunner: {
    async run(conversationId, payload, onEvent) {
      observedConversationId = conversationId;
      observedPayload = payload;
      const shouldContinue = onEvent({
        type: "message.done",
        intent: "chat",
        shouldGenerate: false
      });
      assert(shouldContinue === false, "message.done should stop the conversation stream");
    }
  },
  getActiveRunId: () => ""
});

assert(observedConversationId === "conversation:project-1", "Conversation runs should use the ensured conversation id");
assert(observedPayload.text === "Create an image", "Conversation runs should map prompts to conversation text");
assert(observedPayload.model === "gpt-image-2", "Conversation runs should preserve models");
assert(observedPayload.attachments.length === 1, "Conversation runs should preserve attachment metadata");
assert(observedPayload.canvasContext.selectedNodeCount === 1, "Conversation runs should preserve canvas context");
assert(result.shouldGenerate === false, "Chat message completion should not start generation");
assert(result.optimizedPrompt === "Create an image", "Conversation results should preserve fallback prompts");

let missingDoneError = null;
try {
  await runConversationAgent({
    projectId: "project-2",
    prompt: "No completion event",
    model: "gpt-image-2"
  }, {
    ensureConversation: async () => ({ id: "conversation:project-2" }),
    conversationStreamRunner: { run: async () => {} },
    getActiveRunId: () => ""
  });
} catch (error) {
  missingDoneError = error;
}
assert(
  missingDoneError?.message === "Conversation stream ended before message.done",
  "Conversation runs should reject streams that end before message.done"
);

console.log("Prompt conversation agent workflow checks passed.");
