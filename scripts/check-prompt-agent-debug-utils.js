import {
  applyConversationResultToAgentDebug,
  buildAgentDebugPanelSnapshot,
  buildMessageDoneGenerationDecisionPayload,
  createAgentDebugRecord,
  markAgentGeneratePayloadBuilt,
  markAgentGuardPass,
  markAgentGuardSkip,
  markAgentPreviewCreationFailed,
  sanitizeDebugValue,
  setAgentGenerationStage
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

const stageRecord = createAgentDebugRecord({}, {
  now: () => fixedDate,
  random: () => 0.5
});
const stageLogs = [];
const stageUpdates = [];
setAgentGenerationStage(stageRecord, "generateRequest", {
  prompt: "data:image/png;base64,abcdef",
  count: 2
}, {
  now: () => 100,
  logAgentDebug: (_record, label, data) => stageLogs.push({ label, data }),
  updateAgentDebugPanel: (nextRecord) => stageUpdates.push(nextRecord.generationStage)
});
assert(stageRecord.generationStage === "generateRequest", "Generation stage helper should store the current stage");
assert(stageRecord.stageHistory.length === 1, "Generation stage helper should append stage history");
assert(stageRecord.stageHistory[0].at === 100, "Generation stage helper should preserve injected timestamps");
assert(stageRecord.stageHistory[0].prompt === "data:image/png;base64, length=6", "Generation stage helper should sanitize debug data in history");
assert(stageRecord.stageHistory[0].count === 2, "Generation stage helper should preserve non-sensitive debug data");
assert(stageLogs[0]?.label === "stage.generateRequest", "Generation stage helper should preserve log labels");
assert(stageLogs[0]?.data?.prompt === "data:image/png;base64,abcdef", "Generation stage helper should pass original data to loggers");
assert(stageUpdates[0] === "generateRequest", "Generation stage helper should update debug panels");

for (let index = 0; index < 45; index += 1) {
  setAgentGenerationStage(stageRecord, `stage-${index}`, {}, { now: () => index });
}
assert(stageRecord.stageHistory.length === 40, "Generation stage helper should cap stage history");
assert(stageRecord.stageHistory[0].stage === "stage-5", "Generation stage helper should remove the oldest stage history entries");

const decisionPayload = buildMessageDoneGenerationDecisionPayload({
  runId: "run-1",
  intent: "generate_image",
  shouldGenerate: true,
  generationType: "",
  generationStarted: false,
  executeGeneration: true,
  pendingPreviewCreated: true,
  messageDoneHandled: false,
  messageDoneSkipReason: "waiting"
}, {
  prompt: "data:image/png;base64,1234"
}, {
  activeRunId: "active-1",
  autoExecute: true
});
assert(decisionPayload.runId === "run-1", "Message done decision payloads should keep run ids");
assert(decisionPayload.activeRunId === "active-1", "Message done decision payloads should keep active run ids");
assert(decisionPayload.intent === "generate_image", "Message done decision payloads should keep intents");
assert(decisionPayload.shouldGenerate === true, "Message done decision payloads should keep generation decisions");
assert(decisionPayload.autoExecute === true, "Message done decision payloads should keep auto execute config");
assert(decisionPayload.pendingPreviewCreated === true, "Message done decision payloads should keep preview state");
assert(decisionPayload.skipReason === "waiting", "Message done decision payloads should keep skip reasons");
assert(decisionPayload.prompt === "data:image/png;base64, length=4", "Message done decision payloads should sanitize extra debug data");

const mergeRecord = createAgentDebugRecord({}, {
  now: () => fixedDate,
  random: () => 0.5
});
mergeRecord.intent = "existing_intent";
mergeRecord.taskType = "existing_task";
mergeRecord.promptStrategy = "existing_strategy";
mergeRecord.optimizedPrompt = "existing optimized";
mergeRecord.qwenVlMode = "existing-qwen";
mergeRecord.promptOptimizerMode = "existing-optimizer";
mergeRecord.skippedOptimizer = true;
mergeRecord.optimizerError = "existing error";
mergeRecord.usedFallbackPrompt = true;
mergeRecord.totalBudgetExceeded = true;
mergeRecord.imageAnalysisError = "existing analysis error";
mergeRecord.generationType = "image";
mergeRecord.shouldGenerate = true;
assert(
  applyConversationResultToAgentDebug(mergeRecord, {
    shouldGenerate: false,
    outputType: "video"
  }, {
    prompt: "fallback prompt",
    mode: "merge"
  }) === true,
  "Conversation result merge should apply debug state"
);
assert(mergeRecord.intent === "existing_intent", "Merge debug sync should keep existing intents when missing");
assert(mergeRecord.taskType === "existing_task", "Merge debug sync should keep existing task types when missing");
assert(mergeRecord.promptStrategy === "existing_strategy", "Merge debug sync should keep existing prompt strategies when missing");
assert(mergeRecord.optimizedPrompt === "existing optimized", "Merge debug sync should keep existing optimized prompts when missing");
assert(mergeRecord.qwenVlMode === "existing-qwen", "Merge debug sync should keep existing Qwen mode when missing");
assert(mergeRecord.promptOptimizerMode === "existing-optimizer", "Merge debug sync should keep existing optimizer mode when missing");
assert(mergeRecord.skippedOptimizer === true, "Merge debug sync should preserve skipped optimizer flags");
assert(mergeRecord.optimizerError === "existing error", "Merge debug sync should preserve optimizer errors when missing");
assert(mergeRecord.usedFallbackPrompt === true, "Merge debug sync should preserve fallback prompt flags");
assert(mergeRecord.totalBudgetExceeded === true, "Merge debug sync should preserve budget flags");
assert(mergeRecord.imageAnalysisPresent === false, "Merge debug sync should reflect missing image analysis");
assert(mergeRecord.imageAnalysisError === "existing analysis error", "Merge debug sync should preserve analysis errors when missing");
assert(mergeRecord.generationType === "video", "Merge debug sync should update generation types from output types");
assert(mergeRecord.shouldGenerate === false, "Merge debug sync should mirror generation decisions");

const executeRecord = createAgentDebugRecord({}, {
  now: () => fixedDate,
  random: () => 0.5
});
executeRecord.intent = "existing_intent";
executeRecord.taskType = "existing_task";
executeRecord.promptStrategy = "existing_strategy";
executeRecord.optimizedPrompt = "existing optimized";
executeRecord.generationType = "video";
assert(
  applyConversationResultToAgentDebug(executeRecord, {
    taskType: "",
    imageAnalysis: { subject: "subject" },
    optimizedPrompt: "",
    skippedOptimizer: false
  }, {
    prompt: "fallback prompt",
    mode: "execute",
    autoExecute: true
  }) === true,
  "Conversation result execute sync should apply debug state"
);
assert(executeRecord.intent === "", "Execute debug sync should clear missing intents");
assert(executeRecord.taskType === "existing_task", "Execute debug sync should fall back to existing task types");
assert(executeRecord.promptStrategy === "existing_strategy", "Execute debug sync should keep existing prompt strategies when missing");
assert(executeRecord.optimizedPrompt === "fallback prompt", "Execute debug sync should fall back to original prompts");
assert(executeRecord.generationType === "video", "Execute debug sync should not rewrite generation types");
assert(executeRecord.imageAnalysisPresent === true, "Execute debug sync should reflect image analysis presence");
assert(executeRecord.autoExecute === true, "Execute debug sync should store auto execute config");
assert(executeRecord.shouldGenerate === true, "Execute debug sync should force generation after guard pass");
assert(executeRecord.executeGeneration === true, "Execute debug sync should mirror auto execute for execution state");

const guardSkipRecord = createAgentDebugRecord({}, {
  now: () => fixedDate,
  random: () => 0.5
});
guardSkipRecord.intent = "generate_image";
const guardSkipPayload = markAgentGuardSkip(guardSkipRecord, "skipped because missing payload");
assert(guardSkipRecord.messageDoneSkipReason === "skipped because missing payload", "Guard skip helper should store skip reasons");
assert(guardSkipRecord.intent === "generate_image", "Guard skip helper should not rewrite unrelated debug state");
assert(guardSkipPayload.stage === "guard.skip", "Guard skip helper should build guard skip payload stage");
assert(guardSkipPayload.reason === "skipped because missing payload", "Guard skip helper should build guard skip payload reason");

const emptyGuardSkipPayload = markAgentGuardSkip(null, "");
assert(emptyGuardSkipPayload.stage === "guard.skip", "Guard skip helper should return payloads without a record");
assert(emptyGuardSkipPayload.reason === "", "Guard skip helper should default missing reasons");

const guardPassRecord = createAgentDebugRecord({}, {
  now: () => fixedDate,
  random: () => 0.5
});
guardPassRecord.messageDoneSkipReason = "waiting";
const guardPassPayload = markAgentGuardPass(guardPassRecord);
assert(guardPassRecord.generationStarted === true, "Guard pass helper should mark generation as started");
assert(guardPassRecord.executeGeneration === true, "Guard pass helper should mark execution state");
assert(guardPassRecord.messageDoneHandled === true, "Guard pass helper should mark message.done as handled");
assert(guardPassRecord.messageDoneSkipReason === "", "Guard pass helper should clear skip reasons");
assert(guardPassPayload.stage === "guard.pass", "Guard pass helper should build guard pass payload stage");
assert(guardPassPayload.enterExecuteGeneration === true, "Guard pass helper should build execution entry payload");

const emptyGuardPassPayload = markAgentGuardPass(null);
assert(emptyGuardPassPayload.stage === "guard.pass", "Guard pass helper should return payloads without a record");
assert(emptyGuardPassPayload.enterExecuteGeneration === true, "Guard pass helper should keep execution entry payload without a record");

const previewFailureRecord = createAgentDebugRecord({}, {
  now: () => fixedDate,
  random: () => 0.5
});
const previewFailurePayload = markAgentPreviewCreationFailed(previewFailureRecord, "Unable to create pending generation preview.");
assert(previewFailureRecord.previewCreationError === "Unable to create pending generation preview.", "Preview failure helper should store preview errors");
assert(previewFailurePayload.stage === "preview.failed", "Preview failure helper should build failure payload stage");
assert(previewFailurePayload.reason === "Unable to create pending generation preview.", "Preview failure helper should build failure payload reason");

const generatePayloadRecord = createAgentDebugRecord({}, {
  now: () => fixedDate,
  random: () => 0.5
});
const payloadSummary = { generationType: "image", prompt: "short prompt" };
const payloadBuiltPayload = markAgentGeneratePayloadBuilt(generatePayloadRecord, payloadSummary);
assert(generatePayloadRecord.generatePayload === payloadSummary, "Payload built helper should store payload summaries by reference");
assert(generatePayloadRecord.generatePayloadBuilt === true, "Payload built helper should mark payload state");
assert(payloadBuiltPayload.stage === "payload.built", "Payload built helper should build payload stage");
assert(payloadBuiltPayload.generatePayloadBuilt === true, "Payload built helper should build payload flag");

console.log("Prompt agent debug utility checks passed.");
