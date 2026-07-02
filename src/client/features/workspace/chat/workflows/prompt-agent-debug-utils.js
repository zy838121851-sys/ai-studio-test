import {
  summarizeDataUrl
} from "./prompt-debug-summary-utils.js";

export function createAgentDebugRecord(input = {}, { autoExecute = false, now = () => new Date(), random = Math.random } = {}) {
  const currentTime = now();
  const timestamp = typeof currentTime?.getTime === "function" ? currentTime.getTime() : Date.now();
  const startedAt = typeof currentTime?.toISOString === "function" ? currentTime.toISOString() : new Date(timestamp).toISOString();
  return {
    runId: `${timestamp.toString(36)}-${random().toString(36).slice(2, 7)}`,
    startedAt,
    originalPrompt: input.originalPrompt || "",
    modelId: input.modelId || "",
    generationType: "",
    composerAttachmentCount: Number(input.composerAttachmentCount || 0),
    pendingHomeAttachmentCount: Number(input.pendingHomeAttachmentCount || 0),
    copiedAttachmentCount: 0,
    dataUrlSuccessCount: 0,
    dataUrlFailureCount: 0,
    referenceImageCount: 0,
    referenceImages: [],
    intent: "",
    taskType: "",
    promptStrategy: "",
    strategyTags: [],
    promptDriftDetected: false,
    usedConservativeFallback: false,
    optimizedPrompt: "",
    qwenVlMode: "",
    promptOptimizerMode: "",
    skippedOptimizer: false,
    optimizerStarted: false,
    optimizerFinished: false,
    optimizerTimedOut: false,
    optimizerError: "",
    usedFallbackPrompt: false,
    totalBudgetExceeded: false,
    imageAnalysisPresent: false,
    imageAnalysisStarted: false,
    imageAnalysisFinished: false,
    imageAnalysisTimedOut: false,
    imageAnalysisError: "",
    messageDoneReceived: false,
    messageDoneHandled: false,
    messageDoneSkipReason: "",
    startGenerationAttempted: false,
    previewCreationAttempted: false,
    previewCreationError: "",
    generatePayloadBuilt: false,
    generateRequestStarted: false,
    addChatBlocksAvailable: Boolean(input.addChatBlocksAvailable),
    streamEventTypes: [],
    lastStreamEventType: "",
    streamAbortReason: "",
    streamParseError: "",
    streamFinished: false,
    streamError: "",
    streamTimeout: false,
    shouldGenerate: false,
    autoExecute,
    executeGeneration: false,
    pendingPreviewCreated: false,
    generationStarted: false,
    generationStage: "idle",
    stageHistory: [],
    failureCode: "",
    failureMessage: "",
    generatePayload: null,
    generateResult: null,
    error: ""
  };
}

export function sanitizeDebugValue(value) {
  if (typeof value === "string") return summarizeDataUrl(value);
  if (Array.isArray(value)) return value.map(sanitizeDebugValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeDebugValue(item)]));
}

export function setAgentGenerationStage(
  record,
  stage,
  data = {},
  {
    now = Date.now,
    logAgentDebug = () => {},
    updateAgentDebugPanel = () => {}
  } = {}
) {
  if (!record || !stage) return;
  record.generationStage = stage;
  if (!Array.isArray(record.stageHistory)) record.stageHistory = [];
  record.stageHistory.push({
    stage,
    at: now(),
    ...sanitizeDebugValue(data)
  });
  if (record.stageHistory.length > 40) {
    record.stageHistory.splice(0, record.stageHistory.length - 40);
  }
  logAgentDebug(record, `stage.${stage}`, data);
  updateAgentDebugPanel(record);
}

export function applyConversationResultToAgentDebug(
  record,
  conversationResult = {},
  {
    prompt = "",
    mode = "merge",
    autoExecute = false
  } = {}
) {
  if (!record) return false;
  const executeMode = mode === "execute";
  record.intent = executeMode
    ? (conversationResult.intent || "")
    : (conversationResult.intent || record.intent || "");
  record.taskType = conversationResult.taskType || record.taskType || "";
  record.promptStrategy = conversationResult.promptStrategy || record.promptStrategy || "";
  record.optimizedPrompt = executeMode
    ? (conversationResult.optimizedPrompt || prompt)
    : (conversationResult.optimizedPrompt || record.optimizedPrompt || prompt);
  record.qwenVlMode = conversationResult.qwenVlMode || record.qwenVlMode || "";
  record.promptOptimizerMode = conversationResult.promptOptimizerMode || record.promptOptimizerMode || "";
  record.skippedOptimizer = Boolean(conversationResult.skippedOptimizer || record.skippedOptimizer);
  record.optimizerError = conversationResult.optimizerError || record.optimizerError || "";
  record.usedFallbackPrompt = Boolean(conversationResult.usedFallbackPrompt || record.usedFallbackPrompt);
  record.totalBudgetExceeded = Boolean(conversationResult.totalBudgetExceeded || record.totalBudgetExceeded);
  record.imageAnalysisPresent = Boolean(conversationResult.imageAnalysis);
  record.imageAnalysisError = conversationResult.imageAnalysisError || record.imageAnalysisError || "";
  if (!executeMode) {
    record.generationType = conversationResult.outputType || record.generationType || "";
    record.shouldGenerate = Boolean(conversationResult.shouldGenerate);
  } else {
    record.autoExecute = autoExecute;
    record.shouldGenerate = true;
    record.executeGeneration = autoExecute;
  }
  return true;
}

export function markAgentGuardSkip(record, reason = "") {
  const skipReason = String(reason || "");
  if (record) record.messageDoneSkipReason = skipReason;
  return {
    stage: "guard.skip",
    reason: skipReason
  };
}

export function markAgentGuardPass(record) {
  if (record) {
    record.generationStarted = true;
    record.executeGeneration = true;
    record.messageDoneHandled = true;
    record.messageDoneSkipReason = "";
  }
  return {
    stage: "guard.pass",
    enterExecuteGeneration: true
  };
}

export function buildMessageDoneGenerationDecisionPayload(record, data = {}, {
  activeRunId = "",
  autoExecute = false
} = {}) {
  return {
    runId: record?.runId || "",
    activeRunId,
    intent: record?.intent || "",
    shouldGenerate: Boolean(record?.shouldGenerate),
    generationType: record?.generationType || "",
    autoExecute,
    generationStarted: Boolean(record?.generationStarted),
    executeGeneration: Boolean(record?.executeGeneration),
    pendingPreviewCreated: Boolean(record?.pendingPreviewCreated),
    messageDoneHandled: Boolean(record?.messageDoneHandled),
    skipReason: record?.messageDoneSkipReason || "",
    ...sanitizeDebugValue(data)
  };
}

export function buildAgentDebugPanelSnapshot(record, {
  workflowVersion = "",
  loadedWorkflowVersion = ""
} = {}) {
  return {
    runId: record.runId,
    originalPrompt: record.originalPrompt,
    intent: record.intent,
    taskType: record.taskType,
    promptStrategy: record.promptStrategy,
    optimizedPrompt: record.optimizedPrompt,
    qwenVlMode: record.qwenVlMode,
    promptOptimizerMode: record.promptOptimizerMode,
    skippedOptimizer: record.skippedOptimizer,
    optimizerStarted: record.optimizerStarted,
    optimizerFinished: record.optimizerFinished,
    optimizerTimedOut: record.optimizerTimedOut,
    optimizerError: record.optimizerError,
    usedFallbackPrompt: record.usedFallbackPrompt,
    totalBudgetExceeded: record.totalBudgetExceeded,
    imageAnalysisPresent: record.imageAnalysisPresent,
    imageAnalysisStarted: record.imageAnalysisStarted,
    imageAnalysisFinished: record.imageAnalysisFinished,
    imageAnalysisTimedOut: record.imageAnalysisTimedOut,
    imageAnalysisError: record.imageAnalysisError,
    referenceImageCount: record.referenceImageCount,
    referenceImagesCount: record.referenceImageCount,
    referenceImages: record.referenceImages,
    generatePayload: record.generatePayload,
    modelId: record.modelId,
    generationType: record.generationType || record.generatePayload?.generationType || "",
    generateResult: record.generateResult,
    autoExecute: record.autoExecute,
    shouldGenerate: record.shouldGenerate,
    messageDoneReceived: record.messageDoneReceived,
    messageDoneHandled: record.messageDoneHandled,
    messageDoneSkipReason: record.messageDoneSkipReason,
    startGenerationAttempted: record.startGenerationAttempted,
    executeGeneration: record.executeGeneration,
    previewCreationAttempted: record.previewCreationAttempted,
    pendingPreviewCreated: record.pendingPreviewCreated,
    previewCreationError: record.previewCreationError,
    generatePayloadBuilt: record.generatePayloadBuilt,
    generateRequestStarted: record.generateRequestStarted,
    addChatBlocksAvailable: record.addChatBlocksAvailable,
    workflowVersion,
    loadedWorkflowVersion,
    streamEventTypes: record.streamEventTypes,
    lastStreamEventType: record.lastStreamEventType,
    streamAbortReason: record.streamAbortReason,
    streamParseError: record.streamParseError,
    generationStarted: record.generationStarted,
    generationStage: record.generationStage,
    stageHistory: record.stageHistory,
    failureCode: record.failureCode,
    failureMessage: record.failureMessage,
    streamFinished: record.streamFinished,
    streamError: record.streamError,
    streamTimeout: record.streamTimeout,
    error: record.error
  };
}
