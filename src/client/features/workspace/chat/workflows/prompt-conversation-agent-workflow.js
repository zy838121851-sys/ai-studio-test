import { getModelType } from "../../../ai/model-catalog.js?v=20260627-library-bulk-select-1";
import { summarizeConversationPayload, summarizePrompt } from "./prompt-debug-summary-utils.js";
import { markAgentGuardSkip } from "./prompt-agent-debug-utils.js";
import {
  applyConversationIntentDebugState,
  applyGenerationToolDebugState,
  applyImageAnalysisDebugState,
  applyImageAnalysisErrorDebugState,
  applyImageAnalysisStartDebugState,
  applyMessageDoneDebugState,
  applyPromptOptimizedDebugState,
  applyPromptOptimizerStartDebugState,
  buildConversationAgentResult,
  buildConversationIntentEventResult,
  buildConversationIntentState,
  buildConversationDoneDebugPayload,
  buildMissingProjectConversationResult,
  buildGenerationToolState,
  buildImageAnalysisErrorState,
  buildImageAnalysisState,
  buildMessageDoneReceivedPayload,
  buildMessageDoneState,
  buildPromptOptimizedState,
  buildPromptOptimizerStartState,
  buildConversationRunPayload,
  createConversationAgentState,
  getGenerationToolNameFromEvent,
  shouldIgnoreStaleConversationEvent,
  shouldRenderAssistantDelta
} from "./prompt-conversation-event-utils.js";
import {
  applyCaughtStreamErrorDebugState,
  applyStreamEventErrorDebugState,
  applyStreamFinishedDebugState
} from "./prompt-stream-debug-utils.js";
import {
  CHAT_AGENT_CONFIG,
  CONVERSATION_STREAM_TIMEOUT_MS
} from "./prompt-workflow-constants.js";

export async function runConversationAgent({
  projectId,
  prompt,
  model,
  images = [],
  files = [],
  attachments = [],
  canvasContext = {},
  debugRecord = null,
  thinking,
  addChat,
  updateChat,
  updateThinking,
  setThinkingSummary,
  onAgentEvent = null,
  onShouldGenerateIntent = null
} = {}, {
  ensureConversation,
  conversationStreamRunner,
  getActiveRunId = () => "",
  logAgentDebug = () => {},
  updateAgentDebugPanel = () => {}
} = {}) {
  if (!projectId) {
    return buildMissingProjectConversationResult({
      prompt,
      outputType: getModelType(model)
    });
  }

  const conversation = await ensureConversation(projectId);
  let {
    assistantMessage,
    assistantText,
    shouldGenerate,
    optimizedPrompt,
    qwenVlMode,
    promptOptimizerMode,
    skippedOptimizer,
    optimizerError,
    usedFallbackPrompt,
    totalBudgetExceeded,
    intent,
    taskType,
    promptStrategy,
    outputType,
    imageAnalysis,
    imageAnalysisError,
    sawMessageDone
  } = createConversationAgentState({
    outputType: getModelType(model)
  });
  const runId = debugRecord?.runId || "";

  const conversationPayload = buildConversationRunPayload({
    runId,
    prompt,
    model,
    attachments,
    images,
    files,
    canvasContext
  });
  logAgentDebug(debugRecord, "conversation.request", summarizeConversationPayload(conversationPayload));
  updateAgentDebugPanel(debugRecord);

  try {
    await conversationStreamRunner.run(conversation.id, conversationPayload, (event) => {
    if (shouldIgnoreStaleConversationEvent({ runId, activeRunId: getActiveRunId() })) {
      if (debugRecord) {
        markAgentGuardSkip(debugRecord, "skipped because runId mismatch");
        debugRecord.streamAbortReason = `stale event ignored: ${event.type || ""}`;
      }
      if (event.type === "message.done") {
        console.debug("[message.done] received", buildMessageDoneReceivedPayload({
          runId,
          activeRunId: getActiveRunId(),
          intent: event.intent || event.message?.content?.intent || "",
          shouldGenerate: Boolean(event.shouldGenerate),
          generationType: event.generationType || "",
          autoExecute: CHAT_AGENT_CONFIG.autoExecute,
          generationStarted: false
        }));
      }
      logAgentDebug(debugRecord, "conversation.event.stale_ignored", {
        activeRunId: getActiveRunId(),
        type: event.type || ""
      });
      return;
    }
    logAgentDebug(debugRecord, "conversation.event", { type: event.type || "" });
    onAgentEvent?.(event);
    if (event.type === "thinking.step" && event.steps) {
      updateThinking(thinking, event.steps);
      updateAgentDebugPanel(debugRecord);
      return;
    }
    if (event.type === "thinking.summary") {
      setThinkingSummary(thinking, event.summary || "");
      updateAgentDebugPanel(debugRecord);
      return;
    }
    if (event.type === "agent.intent") {
      const intentResult = buildConversationIntentEventResult(event, {
        intent,
        taskType,
        promptStrategy,
        qwenVlMode,
        promptOptimizerMode,
        shouldGenerate,
        outputType
      }, {
        autoExecute: CHAT_AGENT_CONFIG.autoExecute,
        strategyTags: debugRecord?.strategyTags || []
      });
      const intentState = intentResult.state;
      ({
        intent,
        taskType,
        promptStrategy,
        qwenVlMode,
        promptOptimizerMode,
        shouldGenerate,
        outputType
      } = intentState);
      if (debugRecord) {
        applyConversationIntentDebugState(debugRecord, intentState, { includeStrategyTags: true });
      }
      logAgentDebug(debugRecord, "conversation.intent", intentResult.logPayload);
      if (intentResult.shouldNotifyGenerateIntent && typeof onShouldGenerateIntent === "function") {
        onShouldGenerateIntent(intentResult.generateIntentPayload);
      }
      updateAgentDebugPanel(debugRecord);
      return;
    }
    if (event.type === "image.analysis.start") {
      const intentState = buildConversationIntentState(event, {
        intent,
        taskType,
        promptStrategy,
        qwenVlMode,
        promptOptimizerMode,
        shouldGenerate,
        outputType
      });
      ({
        intent,
        taskType,
        promptStrategy,
        qwenVlMode,
        promptOptimizerMode,
        shouldGenerate,
        outputType
      } = intentState);
      if (debugRecord) {
        applyImageAnalysisStartDebugState(debugRecord, intentState);
      }
      updateAgentDebugPanel(debugRecord);
      return;
    }
    if (event.type === "prompt.optimized") {
      const optimizedState = buildPromptOptimizedState(event, {
        optimizedPrompt,
        taskType,
        promptStrategy,
        qwenVlMode,
        promptOptimizerMode,
        skippedOptimizer,
        optimizerError,
        usedFallbackPrompt,
        totalBudgetExceeded
      });
      ({
        optimizedPrompt,
        taskType,
        promptStrategy,
        qwenVlMode,
        promptOptimizerMode,
        skippedOptimizer,
        optimizerError,
        usedFallbackPrompt,
        totalBudgetExceeded
      } = optimizedState);
      if (debugRecord) {
        applyPromptOptimizedDebugState(debugRecord, optimizedState);
      }
      updateAgentDebugPanel(debugRecord);
      return;
    }
    if (event.type === "prompt.optimizer.start") {
      const optimizerStartState = buildPromptOptimizerStartState(event, {
        qwenVlMode,
        promptOptimizerMode
      });
      ({ qwenVlMode, promptOptimizerMode } = optimizerStartState);
      if (debugRecord) {
        applyPromptOptimizerStartDebugState(debugRecord, optimizerStartState);
      }
      updateAgentDebugPanel(debugRecord);
      return;
    }
    if (event.type === "image.analysis") {
      const imageAnalysisState = buildImageAnalysisState(event, { imageAnalysis });
      ({ imageAnalysis } = imageAnalysisState);
      if (debugRecord) {
        applyImageAnalysisDebugState(debugRecord, imageAnalysisState);
      }
      updateAgentDebugPanel(debugRecord);
      return;
    }
    if (event.type === "image.analysis.error") {
      const imageAnalysisErrorState = buildImageAnalysisErrorState(event);
      ({ imageAnalysisError } = imageAnalysisErrorState);
      if (debugRecord) {
        applyImageAnalysisErrorDebugState(debugRecord, imageAnalysisErrorState);
      }
      updateAgentDebugPanel(debugRecord);
      return;
    }
    if (event.type === "assistant.delta") {
      assistantText += event.delta || "";
      if (!shouldRenderAssistantDelta({ shouldGenerate, intent })) return;
      if (!assistantMessage) assistantMessage = addChat("assistant", "");
      updateChat(assistantMessage, assistantText);
      return;
    }
    const generationTool = getGenerationToolNameFromEvent(event);
    if (generationTool) {
      const generationToolState = buildGenerationToolState(generationTool, {
        shouldGenerate,
        outputType
      });
      ({ shouldGenerate, outputType } = generationToolState);
      if (debugRecord) {
        applyGenerationToolDebugState(debugRecord, generationToolState);
      }
      updateAgentDebugPanel(debugRecord);
    }
    if (event.type === "message.done") {
      sawMessageDone = true;
      const messageDoneState = buildMessageDoneState(event, {
        intent,
        taskType,
        promptStrategy,
        optimizedPrompt,
        qwenVlMode,
        promptOptimizerMode,
        skippedOptimizer,
        optimizerError,
        usedFallbackPrompt,
        totalBudgetExceeded,
        imageAnalysis,
        imageAnalysisError,
        shouldGenerate,
        outputType
      });
      ({
        intent,
        taskType,
        promptStrategy,
        optimizedPrompt,
        qwenVlMode,
        promptOptimizerMode,
        skippedOptimizer,
        optimizerError,
        usedFallbackPrompt,
        totalBudgetExceeded,
        imageAnalysis,
        imageAnalysisError,
        shouldGenerate,
        outputType
      } = messageDoneState);
      if (debugRecord) {
        applyMessageDoneDebugState(debugRecord, messageDoneState, { fallbackPrompt: prompt });
      }
      console.debug("[message.done] received", buildMessageDoneReceivedPayload({
        runId,
        activeRunId: getActiveRunId(),
        intent,
        taskType,
        promptStrategy,
        shouldGenerate,
        generationType: outputType,
        autoExecute: CHAT_AGENT_CONFIG.autoExecute,
        generationStarted: false
      }));
      logAgentDebug(debugRecord, "conversation.done", buildConversationDoneDebugPayload({
        intent,
        taskType,
        promptStrategy,
        shouldGenerate,
        optimizedPrompt,
        qwenVlMode,
        promptOptimizerMode,
        skippedOptimizer,
        optimizerError,
        usedFallbackPrompt,
        totalBudgetExceeded,
        imageAnalysis,
        imageAnalysisError
      }, { fallbackPrompt: prompt, summarizePrompt }));
      updateAgentDebugPanel(debugRecord);
      return false;
    }
    if (event.type === "error") {
      if (debugRecord) {
        applyStreamEventErrorDebugState(debugRecord, event.message, { updateAgentDebugPanel });
      }
      throw new Error(event.message || "Conversation run failed");
    }
  }, { runId, timeoutMs: CONVERSATION_STREAM_TIMEOUT_MS, debugRecord });
    if (debugRecord) {
      applyStreamFinishedDebugState(debugRecord, { updateAgentDebugPanel });
    }
  } catch (error) {
    if (debugRecord) {
      applyCaughtStreamErrorDebugState(debugRecord, error, {
        timeoutMessage: "Agent 流程超时，请重试",
        updateAgentDebugPanel
      });
    }
    throw error;
  }

  if (!sawMessageDone) {
    throw new Error("Conversation stream ended before message.done");
  }

  return buildConversationAgentResult({
    shouldGenerate,
    message: assistantMessage,
    text: assistantText,
    intent,
    taskType,
    promptStrategy,
    optimizedPrompt: optimizedPrompt || prompt,
    qwenVlMode,
    promptOptimizerMode,
    skippedOptimizer,
    optimizerError,
    usedFallbackPrompt,
    totalBudgetExceeded,
    outputType,
    imageAnalysis,
    imageAnalysisError
  }, { fallbackPrompt: prompt });
}
