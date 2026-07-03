export function getGenerationToolNameFromEvent(event = {}) {
  const names = [
    event.toolCall?.name,
    event.tool?.name,
    event.name,
    ...(Array.isArray(event.toolCalls) ? event.toolCalls.map((item) => item?.name) : []),
    ...(Array.isArray(event.message?.toolCalls) ? event.message.toolCalls.map((item) => item?.name) : [])
  ];
  return names.map((name) => String(name || "").trim()).find(isGenerationTool) || "";
}

export function isGenerationTool(name = "") {
  return ["generate_image", "edit_image", "generate_video"].includes(String(name || "").trim());
}

export function isGenerationIntent(intent = "") {
  return ["generate_image", "edit_image", "generate_video"].includes(String(intent || "").trim());
}

export function buildConversationRunPayload({
  runId = "",
  prompt = "",
  model = "",
  attachments = [],
  images = [],
  files = [],
  canvasContext = {}
} = {}) {
  return {
    runId,
    text: prompt,
    model,
    mode: "auto",
    attachments: attachments.length ? attachments : images.map((dataUrl, index) => ({
      type: files[index]?.type || "image",
      name: files[index]?.name || `Reference ${index + 1}`,
      source: "upload",
      dataUrl
    })),
    canvasContext
  };
}

export function shouldEnterMessageDoneExecution({
  shouldGenerate = false,
  autoExecute = false,
  runId = "",
  activeRunId = ""
} = {}) {
  return Boolean(shouldGenerate && autoExecute && isActiveRun({ runId, activeRunId }));
}

export function getMessageDoneSkipReason({
  shouldGenerate = false,
  autoExecute = false,
  runId = "",
  activeRunId = ""
} = {}) {
  if (!isActiveRun({ runId, activeRunId })) return "skipped because runId mismatch";
  if (!autoExecute) return "skipped because autoExecute false";
  if (!shouldGenerate) return "skipped because shouldGenerate false";
  return "";
}

export function buildMessageDoneReceivedPayload(details = {}) {
  const {
    runId = "",
    activeRunId = "",
    intent = "",
    shouldGenerate = false,
    generationType = "",
    autoExecute = false,
    generationStarted = false
  } = details;
  const payload = {
    runId,
    activeRunId,
    intent,
    shouldGenerate: Boolean(shouldGenerate),
    generationType,
    autoExecute: Boolean(autoExecute),
    generationStarted: Boolean(generationStarted),
    enterExecuteGeneration: shouldEnterMessageDoneExecution({
      shouldGenerate,
      autoExecute,
      runId,
      activeRunId
    }),
    skipReason: getMessageDoneSkipReason({
      shouldGenerate,
      autoExecute,
      runId,
      activeRunId
    })
  };
  if (Object.prototype.hasOwnProperty.call(details, "taskType")) payload.taskType = details.taskType || "";
  if (Object.prototype.hasOwnProperty.call(details, "promptStrategy")) payload.promptStrategy = details.promptStrategy || "";
  return payload;
}

export function buildMessageDoneState(event = {}, current = {}) {
  const content = event?.message?.content || {};
  const intent = event.intent || content.intent || current.intent || "";
  const taskType = event.taskType || content.taskType || current.taskType || "";
  const promptStrategy = event.promptStrategy || content.promptStrategy || current.promptStrategy || "";
  const nextStrategyTags = event.strategyTags || content.strategyTags;
  const optimizedPrompt = event.optimizedPrompt || content.optimizedPrompt || current.optimizedPrompt || "";
  const qwenVlMode = event.qwenVlMode || content.qwenVlMode || current.qwenVlMode || "";
  const promptOptimizerMode = event.promptOptimizerMode || content.promptOptimizerMode || current.promptOptimizerMode || "";
  const skippedOptimizer = Boolean(event.skippedOptimizer ?? content.skippedOptimizer ?? current.skippedOptimizer);
  const optimizerError = event.optimizerError || content.optimizerError || current.optimizerError || "";
  const usedFallbackPrompt = Boolean(event.usedFallbackPrompt ?? content.usedFallbackPrompt ?? current.usedFallbackPrompt);
  const promptDriftDetected = Boolean(event.promptDriftDetected ?? content.promptDriftDetected ?? false);
  const usedConservativeFallback = Boolean(event.usedConservativeFallback ?? content.usedConservativeFallback ?? false);
  const totalBudgetExceeded = Boolean(event.totalBudgetExceeded ?? content.totalBudgetExceeded ?? current.totalBudgetExceeded);
  const imageAnalysis = event.imageAnalysis || content.imageAnalysis || current.imageAnalysis || null;
  const imageAnalysisError = event.imageAnalysisError || content.imageAnalysisError || current.imageAnalysisError || "";
  const shouldGenerate = Boolean(event.shouldGenerate ?? (isGenerationIntent(intent) || current.shouldGenerate));
  let outputType = current.outputType || "";
  if (event.generationType === "video" || intent === "generate_video") outputType = "video";
  return {
    intent,
    taskType,
    promptStrategy,
    nextStrategyTags,
    optimizedPrompt,
    qwenVlMode,
    promptOptimizerMode,
    skippedOptimizer,
    optimizerError,
    usedFallbackPrompt,
    promptDriftDetected,
    usedConservativeFallback,
    totalBudgetExceeded,
    imageAnalysis,
    imageAnalysisError,
    shouldGenerate,
    outputType
  };
}

export function buildConversationIntentState(event = {}, current = {}) {
  const intent = event.intent || current.intent || "";
  const taskType = event.taskType || current.taskType || "";
  const promptStrategy = event.promptStrategy || current.promptStrategy || "";
  const nextStrategyTags = Array.isArray(event.strategyTags) ? event.strategyTags : null;
  const qwenVlMode = event.qwenVlMode || current.qwenVlMode || "";
  const promptOptimizerMode = event.promptOptimizerMode || current.promptOptimizerMode || "";
  const shouldGenerate = Boolean(event.shouldGenerate ?? (isGenerationIntent(intent) || current.shouldGenerate));
  const outputType = event.generationType || current.outputType || "";
  return {
    intent,
    taskType,
    promptStrategy,
    nextStrategyTags,
    qwenVlMode,
    promptOptimizerMode,
    shouldGenerate,
    outputType
  };
}

export function applyConversationIntentDebugState(debugRecord, state = {}, {
  includeStrategyTags = false
} = {}) {
  if (!debugRecord) return debugRecord;
  debugRecord.intent = state.intent || "";
  debugRecord.taskType = state.taskType || "";
  debugRecord.promptStrategy = state.promptStrategy || "";
  if (includeStrategyTags && state.nextStrategyTags) {
    debugRecord.strategyTags = state.nextStrategyTags;
  }
  debugRecord.qwenVlMode = state.qwenVlMode || "";
  debugRecord.promptOptimizerMode = state.promptOptimizerMode || "";
  debugRecord.shouldGenerate = Boolean(state.shouldGenerate);
  debugRecord.generationType = state.outputType || "";
  return debugRecord;
}

export function applyMessageDoneDebugState(debugRecord, state = {}, {
  fallbackPrompt = ""
} = {}) {
  if (!debugRecord) return debugRecord;
  debugRecord.intent = state.intent || "";
  debugRecord.taskType = state.taskType || "";
  debugRecord.promptStrategy = state.promptStrategy || "";
  debugRecord.strategyTags = Array.isArray(state.nextStrategyTags) ? state.nextStrategyTags : debugRecord.strategyTags;
  debugRecord.promptDriftDetected = state.promptDriftDetected;
  debugRecord.usedConservativeFallback = state.usedConservativeFallback || state.usedFallbackPrompt;
  debugRecord.optimizedPrompt = state.optimizedPrompt || fallbackPrompt;
  debugRecord.qwenVlMode = state.qwenVlMode || "";
  debugRecord.promptOptimizerMode = state.promptOptimizerMode || "";
  debugRecord.skippedOptimizer = Boolean(state.skippedOptimizer);
  debugRecord.optimizerError = state.optimizerError || "";
  debugRecord.optimizerTimedOut = /timed out|time budget/i.test(state.optimizerError || "");
  debugRecord.usedFallbackPrompt = Boolean(state.usedFallbackPrompt);
  debugRecord.totalBudgetExceeded = Boolean(state.totalBudgetExceeded);
  debugRecord.imageAnalysisPresent = Boolean(state.imageAnalysis);
  debugRecord.imageAnalysisError = state.imageAnalysisError || "";
  debugRecord.imageAnalysisTimedOut = /timed out|time budget/i.test(state.imageAnalysisError || "");
  debugRecord.shouldGenerate = Boolean(state.shouldGenerate);
  debugRecord.messageDoneReceived = true;
  debugRecord.messageDoneHandled = true;
  debugRecord.generationType = state.outputType || "";
  return debugRecord;
}

export function applyPromptOptimizedDebugState(debugRecord, state = {}) {
  if (!debugRecord) return debugRecord;
  debugRecord.optimizedPrompt = state.optimizedPrompt || "";
  debugRecord.taskType = state.taskType || "";
  debugRecord.promptStrategy = state.promptStrategy || "";
  debugRecord.strategyTags = state.nextStrategyTags || debugRecord.strategyTags;
  debugRecord.promptDriftDetected = state.promptDriftDetected;
  debugRecord.usedConservativeFallback = state.usedConservativeFallback;
  debugRecord.qwenVlMode = state.qwenVlMode || "";
  debugRecord.promptOptimizerMode = state.promptOptimizerMode || "";
  debugRecord.skippedOptimizer = Boolean(state.skippedOptimizer);
  debugRecord.optimizerStarted = true;
  debugRecord.optimizerFinished = true;
  debugRecord.optimizerTimedOut = Boolean(state.optimizerTimedOut);
  debugRecord.optimizerError = state.optimizerError || "";
  debugRecord.usedFallbackPrompt = Boolean(state.usedFallbackPrompt);
  debugRecord.totalBudgetExceeded = Boolean(state.totalBudgetExceeded);
  return debugRecord;
}

export function buildPromptOptimizerStartState(event = {}, current = {}) {
  return {
    qwenVlMode: event.qwenVlMode || current.qwenVlMode || "",
    promptOptimizerMode: event.promptOptimizerMode || current.promptOptimizerMode || ""
  };
}

export function applyPromptOptimizerStartDebugState(debugRecord, state = {}) {
  if (!debugRecord) return debugRecord;
  debugRecord.qwenVlMode = state.qwenVlMode || "";
  debugRecord.promptOptimizerMode = state.promptOptimizerMode || "";
  debugRecord.optimizerStarted = true;
  debugRecord.optimizerFinished = false;
  debugRecord.optimizerTimedOut = false;
  debugRecord.optimizerError = "";
  return debugRecord;
}

export function buildImageAnalysisState(event = {}, current = {}) {
  return {
    imageAnalysis: event.analysis || event.summary || current.imageAnalysis || null
  };
}

export function applyImageAnalysisDebugState(debugRecord, state = {}) {
  if (!debugRecord) return debugRecord;
  debugRecord.imageAnalysisPresent = Boolean(state.imageAnalysis);
  debugRecord.imageAnalysisStarted = true;
  debugRecord.imageAnalysisFinished = true;
  debugRecord.imageAnalysisTimedOut = false;
  debugRecord.imageAnalysisError = "";
  return debugRecord;
}

export function buildImageAnalysisErrorState(event = {}) {
  return {
    imageAnalysisError: event.error || "Image analysis failed",
    imageAnalysisTimedOut: Boolean(event.timedOut)
  };
}

export function applyImageAnalysisErrorDebugState(debugRecord, state = {}) {
  if (!debugRecord) return debugRecord;
  debugRecord.imageAnalysisStarted = true;
  debugRecord.imageAnalysisFinished = true;
  debugRecord.imageAnalysisTimedOut = Boolean(state.imageAnalysisTimedOut);
  debugRecord.imageAnalysisError = state.imageAnalysisError || "";
  return debugRecord;
}

export function buildPromptOptimizedState(event = {}, current = {}) {
  const optimizedPrompt = event.optimizedPrompt || current.optimizedPrompt || "";
  const taskType = event.taskType || current.taskType || "";
  const promptStrategy = event.promptStrategy || current.promptStrategy || "";
  const nextStrategyTags = Array.isArray(event.strategyTags) ? event.strategyTags : null;
  const promptDriftDetected = Boolean(event.promptDriftDetected);
  const qwenVlMode = event.qwenVlMode || current.qwenVlMode || "";
  const promptOptimizerMode = event.promptOptimizerMode || current.promptOptimizerMode || "";
  const skippedOptimizer = Boolean(event.skippedOptimizer ?? current.skippedOptimizer);
  const optimizerTimedOut = Boolean(event.optimizerTimedOut);
  const optimizerError = event.optimizerError || current.optimizerError || "";
  const usedFallbackPrompt = Boolean(event.usedFallbackPrompt ?? event.fallback ?? current.usedFallbackPrompt);
  const usedConservativeFallback = Boolean(event.usedConservativeFallback || usedFallbackPrompt);
  const totalBudgetExceeded = Boolean(event.totalBudgetExceeded ?? current.totalBudgetExceeded);
  return {
    optimizedPrompt,
    taskType,
    promptStrategy,
    nextStrategyTags,
    promptDriftDetected,
    usedConservativeFallback,
    qwenVlMode,
    promptOptimizerMode,
    skippedOptimizer,
    optimizerTimedOut,
    optimizerError,
    usedFallbackPrompt,
    totalBudgetExceeded
  };
}

function isActiveRun({ runId = "", activeRunId = "" } = {}) {
  return !runId || activeRunId === runId;
}
