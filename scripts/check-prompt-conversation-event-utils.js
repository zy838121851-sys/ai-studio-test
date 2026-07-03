import {
  applyConversationIntentDebugState,
  applyImageAnalysisDebugState,
  applyImageAnalysisErrorDebugState,
  applyImageAnalysisStartDebugState,
  applyMessageDoneDebugState,
  applyPromptOptimizedDebugState,
  applyPromptOptimizerStartDebugState,
  buildConversationIntentState,
  buildImageAnalysisErrorState,
  buildImageAnalysisState,
  buildMessageDoneReceivedPayload,
  buildMessageDoneState,
  buildPromptOptimizedState,
  buildPromptOptimizerStartState,
  buildConversationRunPayload,
  getMessageDoneSkipReason,
  getGenerationToolNameFromEvent,
  isGenerationIntent,
  isGenerationTool,
  shouldEnterMessageDoneExecution
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

assert(
  shouldEnterMessageDoneExecution({
    shouldGenerate: true,
    autoExecute: true,
    runId: "run-1",
    activeRunId: "run-1"
  }) === true,
  "Message done execution should enter for matching active generation runs"
);
assert(
  shouldEnterMessageDoneExecution({
    shouldGenerate: true,
    autoExecute: true,
    runId: "run-1",
    activeRunId: "run-2"
  }) === false,
  "Message done execution should not enter stale runs"
);
assert(
  shouldEnterMessageDoneExecution({
    shouldGenerate: true,
    autoExecute: false,
    runId: "",
    activeRunId: ""
  }) === false,
  "Message done execution should respect auto execution flags"
);
assert(
  getMessageDoneSkipReason({
    shouldGenerate: true,
    autoExecute: true,
    runId: "run-1",
    activeRunId: "run-2"
  }) === "skipped because runId mismatch",
  "Message done skip reasons should report stale runs first"
);
assert(
  getMessageDoneSkipReason({
    shouldGenerate: true,
    autoExecute: false,
    runId: "run-1",
    activeRunId: "run-1"
  }) === "skipped because autoExecute false",
  "Message done skip reasons should report disabled auto execution"
);
assert(
  getMessageDoneSkipReason({
    shouldGenerate: false,
    autoExecute: true,
    runId: "run-1",
    activeRunId: "run-1"
  }) === "skipped because shouldGenerate false",
  "Message done skip reasons should report non-generation completions"
);
assert(
  getMessageDoneSkipReason({
    shouldGenerate: true,
    autoExecute: true,
    runId: "",
    activeRunId: ""
  }) === "",
  "Message done skip reasons should be empty when execution can enter"
);

const messageDonePayload = buildMessageDoneReceivedPayload({
  runId: "run-1",
  activeRunId: "run-1",
  intent: "generate_image",
  taskType: "image",
  promptStrategy: "optimized",
  shouldGenerate: true,
  generationType: "image",
  autoExecute: true,
  generationStarted: false
});
assert(messageDonePayload.enterExecuteGeneration === true, "Message done payloads should include execution entry decisions");
assert(messageDonePayload.skipReason === "", "Message done payloads should leave skip reasons empty when entering");
assert(messageDonePayload.intent === "generate_image", "Message done payloads should preserve intents");
assert(messageDonePayload.taskType === "image", "Message done payloads should preserve task types");
assert(messageDonePayload.promptStrategy === "optimized", "Message done payloads should preserve prompt strategies");

const staleMessageDonePayload = buildMessageDoneReceivedPayload({
  runId: "run-1",
  activeRunId: "run-2",
  shouldGenerate: true,
  generationType: "image",
  autoExecute: true
});
assert(staleMessageDonePayload.enterExecuteGeneration === false, "Message done payloads should not enter stale runs");
assert(
  staleMessageDonePayload.skipReason === "skipped because runId mismatch",
  "Message done payloads should preserve stale run skip reasons"
);
assert(
  !Object.prototype.hasOwnProperty.call(staleMessageDonePayload, "taskType")
    && !Object.prototype.hasOwnProperty.call(staleMessageDonePayload, "promptStrategy"),
  "Message done payloads should not add optional task fields unless provided"
);

const messageDoneState = buildMessageDoneState({
  intent: "generate_video",
  taskType: "event-task",
  promptStrategy: "event-strategy",
  strategyTags: ["event"],
  optimizedPrompt: "Event prompt",
  qwenVlMode: "event-vl",
  promptOptimizerMode: "event-optimizer",
  skippedOptimizer: false,
  optimizerError: "event-error",
  usedFallbackPrompt: true,
  promptDriftDetected: true,
  usedConservativeFallback: true,
  totalBudgetExceeded: true,
  imageAnalysis: { source: "event" },
  imageAnalysisError: "event-analysis-error",
  shouldGenerate: false
}, {
  intent: "chat",
  taskType: "current-task",
  promptStrategy: "current-strategy",
  optimizedPrompt: "Current prompt",
  qwenVlMode: "current-vl",
  promptOptimizerMode: "current-optimizer",
  skippedOptimizer: true,
  optimizerError: "current-error",
  usedFallbackPrompt: false,
  totalBudgetExceeded: false,
  imageAnalysis: { source: "current" },
  imageAnalysisError: "current-analysis-error",
  shouldGenerate: true,
  outputType: "image"
});
assert(messageDoneState.intent === "generate_video", "Message done state should prefer event intents");
assert(messageDoneState.taskType === "event-task", "Message done state should prefer event task types");
assert(messageDoneState.promptStrategy === "event-strategy", "Message done state should prefer event prompt strategies");
assert(messageDoneState.nextStrategyTags[0] === "event", "Message done state should preserve strategy tags");
assert(messageDoneState.optimizedPrompt === "Event prompt", "Message done state should prefer event optimized prompts");
assert(messageDoneState.qwenVlMode === "event-vl", "Message done state should prefer event VL modes");
assert(messageDoneState.promptOptimizerMode === "event-optimizer", "Message done state should prefer event optimizer modes");
assert(messageDoneState.skippedOptimizer === false, "Message done state should preserve explicit false optimizer skips");
assert(messageDoneState.optimizerError === "event-error", "Message done state should prefer event optimizer errors");
assert(messageDoneState.usedFallbackPrompt === true, "Message done state should preserve fallback prompt flags");
assert(messageDoneState.promptDriftDetected === true, "Message done state should preserve prompt drift flags");
assert(messageDoneState.usedConservativeFallback === true, "Message done state should preserve conservative fallback flags");
assert(messageDoneState.totalBudgetExceeded === true, "Message done state should preserve total budget flags");
assert(messageDoneState.imageAnalysis.source === "event", "Message done state should prefer event image analysis");
assert(messageDoneState.imageAnalysisError === "event-analysis-error", "Message done state should prefer event image analysis errors");
assert(messageDoneState.shouldGenerate === false, "Message done state should preserve explicit false generation decisions");
assert(messageDoneState.outputType === "video", "Message done state should mark video output for video intents");

const messageContentState = buildMessageDoneState({
  message: {
    content: {
      intent: "generate_image",
      taskType: "content-task",
      promptStrategy: "content-strategy",
      optimizedPrompt: "Content prompt",
      skippedOptimizer: true,
      usedFallbackPrompt: true,
      totalBudgetExceeded: true,
      imageAnalysis: { source: "content" },
      imageAnalysisError: "content-analysis-error"
    }
  }
}, {
  intent: "chat",
  outputType: "image"
});
assert(messageContentState.intent === "generate_image", "Message done state should fall back to message content intents");
assert(messageContentState.taskType === "content-task", "Message done state should fall back to message content task types");
assert(messageContentState.promptStrategy === "content-strategy", "Message done state should fall back to message content prompt strategies");
assert(messageContentState.optimizedPrompt === "Content prompt", "Message done state should fall back to message content prompts");
assert(messageContentState.skippedOptimizer === true, "Message done state should read message content optimizer skips");
assert(messageContentState.usedFallbackPrompt === true, "Message done state should read message content fallback flags");
assert(messageContentState.totalBudgetExceeded === true, "Message done state should read message content budget flags");
assert(messageContentState.imageAnalysis.source === "content", "Message done state should read message content image analysis");
assert(messageContentState.imageAnalysisError === "content-analysis-error", "Message done state should read message content image errors");
assert(messageContentState.shouldGenerate === true, "Message done state should infer generation from generation intents");
assert(messageContentState.outputType === "image", "Message done state should keep current output type for image intents");

const currentFallbackState = buildMessageDoneState({}, {
  intent: "chat",
  taskType: "current-task",
  promptStrategy: "current-strategy",
  optimizedPrompt: "Current prompt",
  qwenVlMode: "current-vl",
  promptOptimizerMode: "current-optimizer",
  skippedOptimizer: true,
  optimizerError: "current-error",
  usedFallbackPrompt: true,
  totalBudgetExceeded: true,
  imageAnalysis: { source: "current" },
  imageAnalysisError: "current-analysis-error",
  shouldGenerate: false,
  outputType: "image"
});
assert(currentFallbackState.intent === "chat", "Message done state should keep current intents when event is empty");
assert(currentFallbackState.taskType === "current-task", "Message done state should keep current task types when event is empty");
assert(currentFallbackState.promptStrategy === "current-strategy", "Message done state should keep current prompt strategies when event is empty");
assert(currentFallbackState.optimizedPrompt === "Current prompt", "Message done state should keep current optimized prompts when event is empty");
assert(currentFallbackState.qwenVlMode === "current-vl", "Message done state should keep current VL modes when event is empty");
assert(currentFallbackState.promptOptimizerMode === "current-optimizer", "Message done state should keep current optimizer modes when event is empty");
assert(currentFallbackState.skippedOptimizer === true, "Message done state should keep current optimizer skips when event is empty");
assert(currentFallbackState.optimizerError === "current-error", "Message done state should keep current optimizer errors when event is empty");
assert(currentFallbackState.usedFallbackPrompt === true, "Message done state should keep current fallback flags when event is empty");
assert(currentFallbackState.totalBudgetExceeded === true, "Message done state should keep current budget flags when event is empty");
assert(currentFallbackState.imageAnalysis.source === "current", "Message done state should keep current image analysis when event is empty");
assert(currentFallbackState.imageAnalysisError === "current-analysis-error", "Message done state should keep current image errors when event is empty");
assert(currentFallbackState.shouldGenerate === false, "Message done state should keep current generation decisions when event is empty");
assert(currentFallbackState.outputType === "image", "Message done state should keep current output types when event is empty");

const messageDoneDebugRecord = { strategyTags: ["existing"] };
assert(
  applyMessageDoneDebugState(messageDoneDebugRecord, messageDoneState, { fallbackPrompt: "Fallback prompt" }) === messageDoneDebugRecord,
  "Message done debug sync should return the debug record"
);
assert(messageDoneDebugRecord.intent === "generate_video", "Message done debug sync should write intents");
assert(messageDoneDebugRecord.taskType === "event-task", "Message done debug sync should write task types");
assert(messageDoneDebugRecord.promptStrategy === "event-strategy", "Message done debug sync should write prompt strategies");
assert(messageDoneDebugRecord.strategyTags.join(",") === "event", "Message done debug sync should write strategy tags when present");
assert(messageDoneDebugRecord.promptDriftDetected === true, "Message done debug sync should write drift flags");
assert(messageDoneDebugRecord.usedConservativeFallback === true, "Message done debug sync should write conservative fallback flags");
assert(messageDoneDebugRecord.optimizedPrompt === "Event prompt", "Message done debug sync should write optimized prompts");
assert(messageDoneDebugRecord.qwenVlMode === "event-vl", "Message done debug sync should write VL modes");
assert(messageDoneDebugRecord.promptOptimizerMode === "event-optimizer", "Message done debug sync should write optimizer modes");
assert(messageDoneDebugRecord.skippedOptimizer === false, "Message done debug sync should preserve explicit false optimizer skip flags");
assert(messageDoneDebugRecord.optimizerError === "event-error", "Message done debug sync should write optimizer errors");
assert(messageDoneDebugRecord.optimizerTimedOut === false, "Message done debug sync should derive optimizer timeout flags");
assert(messageDoneDebugRecord.usedFallbackPrompt === true, "Message done debug sync should write fallback prompt flags");
assert(messageDoneDebugRecord.totalBudgetExceeded === true, "Message done debug sync should write budget flags");
assert(messageDoneDebugRecord.imageAnalysisPresent === true, "Message done debug sync should write image analysis presence");
assert(messageDoneDebugRecord.imageAnalysisError === "event-analysis-error", "Message done debug sync should write image analysis errors");
assert(messageDoneDebugRecord.imageAnalysisTimedOut === false, "Message done debug sync should derive image analysis timeout flags");
assert(messageDoneDebugRecord.shouldGenerate === false, "Message done debug sync should preserve explicit false generation decisions");
assert(messageDoneDebugRecord.messageDoneReceived === true, "Message done debug sync should mark received message.done");
assert(messageDoneDebugRecord.messageDoneHandled === true, "Message done debug sync should mark handled message.done");
assert(messageDoneDebugRecord.generationType === "video", "Message done debug sync should write generation types");

const messageDoneFallbackDebugRecord = { strategyTags: ["existing"] };
applyMessageDoneDebugState(messageDoneFallbackDebugRecord, {
  optimizerError: "time budget exceeded",
  imageAnalysisError: "analysis timed out",
  shouldGenerate: true
}, { fallbackPrompt: "Fallback prompt" });
assert(messageDoneFallbackDebugRecord.strategyTags.join(",") === "existing", "Message done debug sync should preserve existing tags when state has none");
assert(messageDoneFallbackDebugRecord.optimizedPrompt === "Fallback prompt", "Message done debug sync should use fallback prompts");
assert(messageDoneFallbackDebugRecord.optimizerTimedOut === true, "Message done debug sync should detect optimizer timeout text");
assert(messageDoneFallbackDebugRecord.imageAnalysisTimedOut === true, "Message done debug sync should detect image analysis timeout text");
assert(applyMessageDoneDebugState(null, messageDoneState) === null, "Message done debug sync should ignore missing debug records");

const intentState = buildConversationIntentState({
  intent: "generate_image",
  taskType: "event-task",
  promptStrategy: "event-strategy",
  strategyTags: ["fast", "image"],
  qwenVlMode: "event-vl",
  promptOptimizerMode: "event-optimizer",
  generationType: "image"
}, {
  intent: "chat",
  taskType: "current-task",
  promptStrategy: "current-strategy",
  qwenVlMode: "current-vl",
  promptOptimizerMode: "current-optimizer",
  shouldGenerate: false,
  outputType: "video"
});
assert(intentState.intent === "generate_image", "Conversation intent state should prefer event intents");
assert(intentState.taskType === "event-task", "Conversation intent state should prefer event task types");
assert(intentState.promptStrategy === "event-strategy", "Conversation intent state should prefer event strategies");
assert(intentState.nextStrategyTags.length === 2, "Conversation intent state should preserve event strategy tag arrays");
assert(intentState.qwenVlMode === "event-vl", "Conversation intent state should prefer event VL modes");
assert(intentState.promptOptimizerMode === "event-optimizer", "Conversation intent state should prefer event optimizer modes");
assert(intentState.shouldGenerate === true, "Conversation intent state should infer generation from generation intents");
assert(intentState.outputType === "image", "Conversation intent state should prefer event generation types");

const explicitFalseIntentState = buildConversationIntentState({
  intent: "generate_image",
  shouldGenerate: false,
  strategyTags: "not-array"
}, {
  shouldGenerate: true,
  outputType: "image"
});
assert(explicitFalseIntentState.shouldGenerate === false, "Conversation intent state should preserve explicit false generation decisions");
assert(explicitFalseIntentState.nextStrategyTags === null, "Conversation intent state should ignore malformed strategy tags");

const fallbackIntentState = buildConversationIntentState({}, {
  intent: "chat",
  taskType: "current-task",
  promptStrategy: "current-strategy",
  qwenVlMode: "current-vl",
  promptOptimizerMode: "current-optimizer",
  shouldGenerate: true,
  outputType: "video"
});
assert(fallbackIntentState.intent === "chat", "Conversation intent state should keep current intents when event is empty");
assert(fallbackIntentState.taskType === "current-task", "Conversation intent state should keep current task types when event is empty");
assert(fallbackIntentState.promptStrategy === "current-strategy", "Conversation intent state should keep current strategies when event is empty");
assert(fallbackIntentState.qwenVlMode === "current-vl", "Conversation intent state should keep current VL modes when event is empty");
assert(fallbackIntentState.promptOptimizerMode === "current-optimizer", "Conversation intent state should keep current optimizer modes when event is empty");
assert(fallbackIntentState.shouldGenerate === true, "Conversation intent state should keep current generation decisions when event is empty");
assert(fallbackIntentState.outputType === "video", "Conversation intent state should keep current output types when event is empty");

const debugRecord = { strategyTags: ["existing"] };
assert(
  applyConversationIntentDebugState(debugRecord, intentState, { includeStrategyTags: true }) === debugRecord,
  "Conversation intent debug sync should return the debug record"
);
assert(debugRecord.intent === "generate_image", "Conversation intent debug sync should write intents");
assert(debugRecord.taskType === "event-task", "Conversation intent debug sync should write task types");
assert(debugRecord.promptStrategy === "event-strategy", "Conversation intent debug sync should write prompt strategies");
assert(debugRecord.strategyTags.join(",") === "fast,image", "Conversation intent debug sync should write strategy tags when requested");
assert(debugRecord.qwenVlMode === "event-vl", "Conversation intent debug sync should write VL modes");
assert(debugRecord.promptOptimizerMode === "event-optimizer", "Conversation intent debug sync should write optimizer modes");
assert(debugRecord.shouldGenerate === true, "Conversation intent debug sync should write generation decisions");
assert(debugRecord.generationType === "image", "Conversation intent debug sync should write generation types");

const debugRecordWithoutTags = { strategyTags: ["existing"] };
applyConversationIntentDebugState(debugRecordWithoutTags, intentState);
assert(debugRecordWithoutTags.strategyTags.join(",") === "existing", "Conversation intent debug sync should keep strategy tags unless requested");
assert(applyConversationIntentDebugState(null, intentState) === null, "Conversation intent debug sync should ignore missing debug records");

const promptOptimizedState = buildPromptOptimizedState({
  optimizedPrompt: "Event optimized prompt",
  taskType: "event-task",
  promptStrategy: "event-strategy",
  strategyTags: ["direct", "safe"],
  promptDriftDetected: true,
  usedConservativeFallback: true,
  qwenVlMode: "event-vl",
  promptOptimizerMode: "event-optimizer",
  skippedOptimizer: false,
  optimizerTimedOut: true,
  optimizerError: "event-error",
  usedFallbackPrompt: true,
  totalBudgetExceeded: true
}, {
  optimizedPrompt: "Current prompt",
  taskType: "current-task",
  promptStrategy: "current-strategy",
  qwenVlMode: "current-vl",
  promptOptimizerMode: "current-optimizer",
  skippedOptimizer: true,
  optimizerError: "current-error",
  usedFallbackPrompt: false,
  totalBudgetExceeded: false
});
assert(promptOptimizedState.optimizedPrompt === "Event optimized prompt", "Prompt optimized state should prefer event prompts");
assert(promptOptimizedState.taskType === "event-task", "Prompt optimized state should prefer event task types");
assert(promptOptimizedState.promptStrategy === "event-strategy", "Prompt optimized state should prefer event strategies");
assert(promptOptimizedState.nextStrategyTags.length === 2, "Prompt optimized state should preserve strategy tag arrays");
assert(promptOptimizedState.promptDriftDetected === true, "Prompt optimized state should preserve drift flags");
assert(promptOptimizedState.usedConservativeFallback === true, "Prompt optimized state should preserve conservative fallback flags");
assert(promptOptimizedState.qwenVlMode === "event-vl", "Prompt optimized state should prefer event VL modes");
assert(promptOptimizedState.promptOptimizerMode === "event-optimizer", "Prompt optimized state should prefer event optimizer modes");
assert(promptOptimizedState.skippedOptimizer === false, "Prompt optimized state should preserve explicit false optimizer skips");
assert(promptOptimizedState.optimizerTimedOut === true, "Prompt optimized state should preserve timeout flags");
assert(promptOptimizedState.optimizerError === "event-error", "Prompt optimized state should prefer event optimizer errors");
assert(promptOptimizedState.usedFallbackPrompt === true, "Prompt optimized state should preserve fallback prompt flags");
assert(promptOptimizedState.totalBudgetExceeded === true, "Prompt optimized state should preserve total budget flags");

const fallbackPromptOptimizedState = buildPromptOptimizedState({
  fallback: true,
  strategyTags: "not-array"
}, {
  optimizedPrompt: "Current prompt",
  taskType: "current-task",
  promptStrategy: "current-strategy",
  qwenVlMode: "current-vl",
  promptOptimizerMode: "current-optimizer",
  skippedOptimizer: true,
  optimizerError: "current-error",
  usedFallbackPrompt: false,
  totalBudgetExceeded: true
});
assert(fallbackPromptOptimizedState.optimizedPrompt === "Current prompt", "Prompt optimized state should keep current prompts when event is empty");
assert(fallbackPromptOptimizedState.taskType === "current-task", "Prompt optimized state should keep current task types when event is empty");
assert(fallbackPromptOptimizedState.promptStrategy === "current-strategy", "Prompt optimized state should keep current strategies when event is empty");
assert(fallbackPromptOptimizedState.nextStrategyTags === null, "Prompt optimized state should ignore malformed strategy tags");
assert(fallbackPromptOptimizedState.promptDriftDetected === false, "Prompt optimized state should default missing drift flags to false");
assert(fallbackPromptOptimizedState.usedConservativeFallback === true, "Prompt optimized state should treat fallback prompts as conservative fallback");
assert(fallbackPromptOptimizedState.qwenVlMode === "current-vl", "Prompt optimized state should keep current VL modes when event is empty");
assert(fallbackPromptOptimizedState.promptOptimizerMode === "current-optimizer", "Prompt optimized state should keep current optimizer modes when event is empty");
assert(fallbackPromptOptimizedState.skippedOptimizer === true, "Prompt optimized state should keep current optimizer skips when event is empty");
assert(fallbackPromptOptimizedState.optimizerTimedOut === false, "Prompt optimized state should default missing timeout flags to false");
assert(fallbackPromptOptimizedState.optimizerError === "current-error", "Prompt optimized state should keep current optimizer errors when event is empty");
assert(fallbackPromptOptimizedState.usedFallbackPrompt === true, "Prompt optimized state should read fallback aliases");
assert(fallbackPromptOptimizedState.totalBudgetExceeded === true, "Prompt optimized state should keep current budget flags when event is empty");

const promptOptimizedDebugRecord = { strategyTags: ["existing"] };
assert(
  applyPromptOptimizedDebugState(promptOptimizedDebugRecord, promptOptimizedState) === promptOptimizedDebugRecord,
  "Prompt optimized debug sync should return the debug record"
);
assert(promptOptimizedDebugRecord.optimizedPrompt === "Event optimized prompt", "Prompt optimized debug sync should write optimized prompts");
assert(promptOptimizedDebugRecord.taskType === "event-task", "Prompt optimized debug sync should write task types");
assert(promptOptimizedDebugRecord.promptStrategy === "event-strategy", "Prompt optimized debug sync should write prompt strategies");
assert(promptOptimizedDebugRecord.strategyTags.join(",") === "direct,safe", "Prompt optimized debug sync should write strategy tags when present");
assert(promptOptimizedDebugRecord.promptDriftDetected === true, "Prompt optimized debug sync should write drift flags");
assert(promptOptimizedDebugRecord.usedConservativeFallback === true, "Prompt optimized debug sync should write conservative fallback flags");
assert(promptOptimizedDebugRecord.qwenVlMode === "event-vl", "Prompt optimized debug sync should write VL modes");
assert(promptOptimizedDebugRecord.promptOptimizerMode === "event-optimizer", "Prompt optimized debug sync should write optimizer modes");
assert(promptOptimizedDebugRecord.skippedOptimizer === false, "Prompt optimized debug sync should preserve explicit false optimizer skip flags");
assert(promptOptimizedDebugRecord.optimizerStarted === true, "Prompt optimized debug sync should mark optimizer started");
assert(promptOptimizedDebugRecord.optimizerFinished === true, "Prompt optimized debug sync should mark optimizer finished");
assert(promptOptimizedDebugRecord.optimizerTimedOut === true, "Prompt optimized debug sync should write timeout flags");
assert(promptOptimizedDebugRecord.optimizerError === "event-error", "Prompt optimized debug sync should write optimizer errors");
assert(promptOptimizedDebugRecord.usedFallbackPrompt === true, "Prompt optimized debug sync should write fallback prompt flags");
assert(promptOptimizedDebugRecord.totalBudgetExceeded === true, "Prompt optimized debug sync should write budget flags");

const promptOptimizedDebugRecordWithoutTags = { strategyTags: ["existing"] };
applyPromptOptimizedDebugState(promptOptimizedDebugRecordWithoutTags, fallbackPromptOptimizedState);
assert(
  promptOptimizedDebugRecordWithoutTags.strategyTags.join(",") === "existing",
  "Prompt optimized debug sync should preserve existing tags when state has none"
);
assert(promptOptimizedDebugRecordWithoutTags.optimizerTimedOut === false, "Prompt optimized debug sync should default missing timeout flags to false");
assert(applyPromptOptimizedDebugState(null, promptOptimizedState) === null, "Prompt optimized debug sync should ignore missing debug records");

const optimizerStartState = buildPromptOptimizerStartState({
  qwenVlMode: "event-vl",
  promptOptimizerMode: "event-optimizer"
}, {
  qwenVlMode: "current-vl",
  promptOptimizerMode: "current-optimizer"
});
assert(optimizerStartState.qwenVlMode === "event-vl", "Prompt optimizer start state should prefer event VL modes");
assert(
  optimizerStartState.promptOptimizerMode === "event-optimizer",
  "Prompt optimizer start state should prefer event optimizer modes"
);

const fallbackOptimizerStartState = buildPromptOptimizerStartState({}, {
  qwenVlMode: "current-vl",
  promptOptimizerMode: "current-optimizer"
});
assert(
  fallbackOptimizerStartState.qwenVlMode === "current-vl",
  "Prompt optimizer start state should keep current VL modes when event is empty"
);
assert(
  fallbackOptimizerStartState.promptOptimizerMode === "current-optimizer",
  "Prompt optimizer start state should keep current optimizer modes when event is empty"
);

const optimizerStartDebugRecord = {
  qwenVlMode: "old-vl",
  promptOptimizerMode: "old-optimizer",
  optimizerFinished: true,
  optimizerTimedOut: true,
  optimizerError: "old-error"
};
assert(
  applyPromptOptimizerStartDebugState(optimizerStartDebugRecord, optimizerStartState) === optimizerStartDebugRecord,
  "Prompt optimizer start debug sync should return the debug record"
);
assert(optimizerStartDebugRecord.qwenVlMode === "event-vl", "Prompt optimizer start debug sync should write VL modes");
assert(
  optimizerStartDebugRecord.promptOptimizerMode === "event-optimizer",
  "Prompt optimizer start debug sync should write optimizer modes"
);
assert(optimizerStartDebugRecord.optimizerStarted === true, "Prompt optimizer start debug sync should mark optimizer started");
assert(optimizerStartDebugRecord.optimizerFinished === false, "Prompt optimizer start debug sync should clear optimizer finished");
assert(optimizerStartDebugRecord.optimizerTimedOut === false, "Prompt optimizer start debug sync should clear optimizer timeout");
assert(optimizerStartDebugRecord.optimizerError === "", "Prompt optimizer start debug sync should clear optimizer errors");
assert(
  applyPromptOptimizerStartDebugState(null, optimizerStartState) === null,
  "Prompt optimizer start debug sync should ignore missing debug records"
);

const imageAnalysisStartDebugRecord = {
  imageAnalysisFinished: true,
  imageAnalysisTimedOut: true,
  imageAnalysisError: "old-error"
};
assert(
  applyImageAnalysisStartDebugState(imageAnalysisStartDebugRecord, intentState) === imageAnalysisStartDebugRecord,
  "Image analysis start debug sync should return the debug record"
);
assert(imageAnalysisStartDebugRecord.intent === "generate_image", "Image analysis start debug sync should write intents");
assert(imageAnalysisStartDebugRecord.taskType === "event-task", "Image analysis start debug sync should write task types");
assert(imageAnalysisStartDebugRecord.promptStrategy === "event-strategy", "Image analysis start debug sync should write prompt strategies");
assert(imageAnalysisStartDebugRecord.qwenVlMode === "event-vl", "Image analysis start debug sync should write VL modes");
assert(
  imageAnalysisStartDebugRecord.promptOptimizerMode === "event-optimizer",
  "Image analysis start debug sync should write optimizer modes"
);
assert(imageAnalysisStartDebugRecord.shouldGenerate === true, "Image analysis start debug sync should write generation decisions");
assert(imageAnalysisStartDebugRecord.generationType === "image", "Image analysis start debug sync should write generation types");
assert(imageAnalysisStartDebugRecord.imageAnalysisStarted === true, "Image analysis start debug sync should mark analysis started");
assert(imageAnalysisStartDebugRecord.imageAnalysisFinished === false, "Image analysis start debug sync should clear finished flags");
assert(imageAnalysisStartDebugRecord.imageAnalysisTimedOut === false, "Image analysis start debug sync should clear timeout flags");
assert(imageAnalysisStartDebugRecord.imageAnalysisError === "", "Image analysis start debug sync should clear analysis errors");
assert(
  applyImageAnalysisStartDebugState(null, intentState) === null,
  "Image analysis start debug sync should ignore missing debug records"
);

const imageAnalysisState = buildImageAnalysisState({
  analysis: { source: "analysis" },
  summary: { source: "summary" }
}, {
  imageAnalysis: { source: "current" }
});
assert(imageAnalysisState.imageAnalysis.source === "analysis", "Image analysis state should prefer analysis payloads");

const imageAnalysisSummaryState = buildImageAnalysisState({
  summary: { source: "summary" }
}, {
  imageAnalysis: { source: "current" }
});
assert(imageAnalysisSummaryState.imageAnalysis.source === "summary", "Image analysis state should fall back to summary payloads");

const imageAnalysisFallbackState = buildImageAnalysisState({}, {
  imageAnalysis: { source: "current" }
});
assert(imageAnalysisFallbackState.imageAnalysis.source === "current", "Image analysis state should keep current analysis when event is empty");

const imageAnalysisDebugRecord = {
  imageAnalysisTimedOut: true,
  imageAnalysisError: "old-error"
};
assert(
  applyImageAnalysisDebugState(imageAnalysisDebugRecord, imageAnalysisState) === imageAnalysisDebugRecord,
  "Image analysis debug sync should return the debug record"
);
assert(imageAnalysisDebugRecord.imageAnalysisPresent === true, "Image analysis debug sync should mark analysis as present");
assert(imageAnalysisDebugRecord.imageAnalysisStarted === true, "Image analysis debug sync should mark analysis started");
assert(imageAnalysisDebugRecord.imageAnalysisFinished === true, "Image analysis debug sync should mark analysis finished");
assert(imageAnalysisDebugRecord.imageAnalysisTimedOut === false, "Image analysis debug sync should clear timeout flags");
assert(imageAnalysisDebugRecord.imageAnalysisError === "", "Image analysis debug sync should clear analysis errors");
assert(applyImageAnalysisDebugState(null, imageAnalysisState) === null, "Image analysis debug sync should ignore missing debug records");

const imageAnalysisErrorState = buildImageAnalysisErrorState({
  error: "analysis failed",
  timedOut: true
});
assert(imageAnalysisErrorState.imageAnalysisError === "analysis failed", "Image analysis error state should preserve error messages");
assert(imageAnalysisErrorState.imageAnalysisTimedOut === true, "Image analysis error state should preserve timeout flags");

const fallbackImageAnalysisErrorState = buildImageAnalysisErrorState({});
assert(
  fallbackImageAnalysisErrorState.imageAnalysisError === "Image analysis failed",
  "Image analysis error state should use default error messages"
);
assert(fallbackImageAnalysisErrorState.imageAnalysisTimedOut === false, "Image analysis error state should default timeout flags to false");

const imageAnalysisErrorDebugRecord = {
  imageAnalysisStarted: false,
  imageAnalysisFinished: false,
  imageAnalysisTimedOut: false,
  imageAnalysisError: ""
};
assert(
  applyImageAnalysisErrorDebugState(imageAnalysisErrorDebugRecord, imageAnalysisErrorState) === imageAnalysisErrorDebugRecord,
  "Image analysis error debug sync should return the debug record"
);
assert(imageAnalysisErrorDebugRecord.imageAnalysisStarted === true, "Image analysis error debug sync should mark analysis started");
assert(imageAnalysisErrorDebugRecord.imageAnalysisFinished === true, "Image analysis error debug sync should mark analysis finished");
assert(imageAnalysisErrorDebugRecord.imageAnalysisTimedOut === true, "Image analysis error debug sync should write timeout flags");
assert(imageAnalysisErrorDebugRecord.imageAnalysisError === "analysis failed", "Image analysis error debug sync should write analysis errors");
assert(
  applyImageAnalysisErrorDebugState(null, imageAnalysisErrorState) === null,
  "Image analysis error debug sync should ignore missing debug records"
);

console.log("Prompt conversation event utility checks passed.");
