import {
  buildAgentDebugPanelSnapshot,
  createAgentDebugRecord,
  sanitizeDebugValue
} from "../src/client/features/workspace/chat/workflows/prompt-agent-debug-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const fixedDate = new Date("2026-07-02T08:00:00.000Z");
const record = createAgentDebugRecord({
  originalPrompt: "make image",
  modelId: "gpt-image-2",
  composerAttachmentCount: "2",
  pendingHomeAttachmentCount: "",
  addChatBlocksAvailable: true
}, {
  autoExecute: true,
  now: () => fixedDate,
  random: () => 0.5
});

assert(record.runId === `${fixedDate.getTime().toString(36)}-i`, "Agent debug records should preserve deterministic run id format");
assert(record.startedAt === "2026-07-02T08:00:00.000Z", "Agent debug records should store start time");
assert(record.originalPrompt === "make image", "Agent debug records should keep original prompts");
assert(record.modelId === "gpt-image-2", "Agent debug records should keep model ids");
assert(record.composerAttachmentCount === 2, "Agent debug records should normalize attachment counts");
assert(record.pendingHomeAttachmentCount === 0, "Agent debug records should default empty attachment counts");
assert(record.addChatBlocksAvailable === true, "Agent debug records should keep block availability");
assert(record.autoExecute === true, "Agent debug records should preserve auto execute config");
assert(record.generationStage === "idle", "Agent debug records should start with idle generation stage");
assert(Array.isArray(record.stageHistory) && record.stageHistory.length === 0, "Agent debug records should initialize stage history");
assert(Array.isArray(record.streamEventTypes) && record.streamEventTypes.length === 0, "Agent debug records should initialize stream history");

const sanitized = sanitizeDebugValue({
  plain: "hello",
  image: "data:image/png;base64,abcdef",
  nested: [
    "data:image/jpeg;base64,1234",
    { value: "ok" }
  ]
});
assert(sanitized.plain === "hello", "Debug sanitizing should keep plain strings");
assert(sanitized.image === "data:image/png;base64, length=6", "Debug sanitizing should summarize data URLs");
assert(sanitized.nested[0] === "data:image/jpeg;base64, length=4", "Debug sanitizing should recurse into arrays");
assert(sanitized.nested[1].value === "ok", "Debug sanitizing should recurse into objects");

record.intent = "generate_image";
record.promptStrategy = "optimized";
record.referenceImageCount = 3;
record.generatePayload = { generationType: "image" };
record.streamEventTypes.push("message.delta");
record.generationStage = "generate";
record.stageHistory.push({ stage: "generate", at: 1 });
record.streamAbortReason = "reader completed";

const snapshot = buildAgentDebugPanelSnapshot(record, {
  workflowVersion: "workflow-1",
  loadedWorkflowVersion: "loaded-1"
});

assert(snapshot.runId === record.runId, "Debug panel snapshots should keep run ids");
assert(snapshot.intent === "generate_image", "Debug panel snapshots should keep intent");
assert(snapshot.promptStrategy === "optimized", "Debug panel snapshots should keep prompt strategy");
assert(snapshot.referenceImagesCount === 3, "Debug panel snapshots should preserve reference image count alias");
assert(snapshot.generationType === "image", "Debug panel snapshots should fall back to payload generation type");
assert(snapshot.workflowVersion === "workflow-1", "Debug panel snapshots should include workflow versions");
assert(snapshot.loadedWorkflowVersion === "loaded-1", "Debug panel snapshots should include loaded workflow versions");
assert(snapshot.streamEventTypes[0] === "message.delta", "Debug panel snapshots should keep stream events");
assert(snapshot.stageHistory[0].stage === "generate", "Debug panel snapshots should keep stage history");
assert(snapshot.streamAbortReason === "reader completed", "Debug panel snapshots should keep stream abort reasons");

console.log("Prompt agent debug utility checks passed.");
