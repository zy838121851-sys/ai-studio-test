import { getRecentCanvasEvents } from "../../../canvas/canvas-events.js";
import {
  DEFAULT_3D_MODEL,
  formatModelUsage,
  getModelType,
  resolveImageModelId
} from "../../../ai/model-catalog.js?v=20260627-library-bulk-select-1";
import { getChatPreviewAttachmentFile } from "../components/chat-image-preview.js?v=20260627-chat-agent-2";
import {
  getResultImageUrls,
  getResultUrls,
  getResultVideoUrls,
  isMidjourneyModel
} from "./prompt-result-utils.js";
import {
  classifyGenerationClientError,
  getRetryAfterDelayMs
} from "./prompt-error-utils.js";
import {
  logSubmittedModel,
  warnIfModelMismatch
} from "./prompt-model-log-utils.js";
import {
  buildAgentCompletionSummary,
  buildAgentProgressBlocks,
  buildAgentResultBlocks
} from "./prompt-agent-block-utils.js";
import {
  summarizeConversationPayload,
  summarizeDataUrl,
  summarizeFiles,
  summarizeGeneratePayload,
  summarizeGenerationResult,
  summarizePrompt,
  summarizeReferenceImages
} from "./prompt-debug-summary-utils.js";
import {
  clearComposerAttachments,
  copyReferenceFiles,
  getChatPreviewDomSummaries,
  inferSubmitTriggerSource,
  restoreComposerAttachmentsOnFailure
} from "./prompt-input-utils.js";
import {
  getGenerationPlacement,
  resolveGenerationMetrics
} from "./prompt-generation-metrics-utils.js";
import {
  imageSourceToDataUrl,
  inferMimeTypeFromDataUrl,
  readSelectedImageReference
} from "./prompt-reference-image-utils.js";

const MIDJOURNEY_IMAGE_COUNT = 4;
const CONVERSATION_THINKING_STEPS = [
  { key: "context", label: "读取上下文" },
  { key: "references", label: "图片分析" },
  { key: "prompt", label: "优化提示词" },
  { key: "tool", label: "执行生成" },
  { key: "final", label: "整理结果" }
];
const conversationIdsByProject = new Map();
let restoredConversationProjects = new Set();
let currentConversationAbort = null;
let activeChatAgentRunId = "";
let lastConversationPrompt = "";
const CONVERSATION_STREAM_TIMEOUT_MS = 0;
const CHAT_AGENT_WORKFLOW_VERSION = "20260628-boot-inline-1";

if (globalThis.window) {
  globalThis.__chatAgentWorkflowVersion = CHAT_AGENT_WORKFLOW_VERSION;
  console.debug("[chat-agent] workflow.version", CHAT_AGENT_WORKFLOW_VERSION);
}

const CHAT_AGENT_CONFIG = {
  autoExecute: true
};
const CHAT_AGENT_DEBUG_PREFIX = "[chat-agent]";

function isChatAgentDev() {
  const host = globalThis.location?.hostname || "";
  return ["localhost", "127.0.0.1"].includes(host);
}

function createAgentDebugRecord(input = {}) {
  return {
    runId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    startedAt: new Date().toISOString(),
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
    autoExecute: CHAT_AGENT_CONFIG.autoExecute,
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

function logAgentDebug(record, label, data = {}) {
  if (!isChatAgentDev()) return;
  const payload = sanitizeDebugValue(data);
  console.debug(CHAT_AGENT_DEBUG_PREFIX, label, {
    runId: record?.runId || "",
    ...payload
  });
}

function setAgentGenerationStage(record, stage, data = {}) {
  if (!record || !stage) return;
  record.generationStage = stage;
  if (!Array.isArray(record.stageHistory)) record.stageHistory = [];
  record.stageHistory.push({
    stage,
    at: Date.now(),
    ...sanitizeDebugValue(data)
  });
  if (record.stageHistory.length > 40) record.stageHistory.splice(0, record.stageHistory.length - 40);
  logAgentDebug(record, `stage.${stage}`, data);
  updateAgentDebugPanel(record);
}

function logMessageDoneGenerationDecision(record, data = {}) {
  console.debug("[message.done] generation decision", {
    runId: record?.runId || "",
    activeRunId: activeChatAgentRunId || "",
    intent: record?.intent || "",
    shouldGenerate: Boolean(record?.shouldGenerate),
    generationType: record?.generationType || "",
    autoExecute: CHAT_AGENT_CONFIG.autoExecute,
    generationStarted: Boolean(record?.generationStarted),
    executeGeneration: Boolean(record?.executeGeneration),
    pendingPreviewCreated: Boolean(record?.pendingPreviewCreated),
    messageDoneHandled: Boolean(record?.messageDoneHandled),
    skipReason: record?.messageDoneSkipReason || "",
    ...sanitizeDebugValue(data)
  });
}

function sanitizeDebugValue(value) {
  if (typeof value === "string") return summarizeDataUrl(value);
  if (Array.isArray(value)) return value.map(sanitizeDebugValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeDebugValue(item)]));
}

function updateAgentDebugPanel(record) {
  if (!record || !isChatAgentDev()) return;
  const panel = ensureAgentDebugPanel();
  if (!panel) return;
  const pre = panel.querySelector("[data-agent-debug-output]");
  if (!pre) return;
  pre.textContent = JSON.stringify({
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
    workflowVersion: CHAT_AGENT_WORKFLOW_VERSION,
    loadedWorkflowVersion: globalThis.__chatAgentWorkflowVersion || "",
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
  }, null, 2);
}

function ensureAgentDebugPanel() {
  if (!isChatAgentDev()) return null;
  let panel = globalThis.document?.querySelector?.("#chatAgentDebugPanel");
  if (panel) {
    positionAgentDebugPanel(panel);
    return panel;
  }
  panel = globalThis.document.createElement("section");
  panel.id = "chatAgentDebugPanel";
  panel.style.cssText = [
    "position:fixed",
    "left:16px",
    "bottom:24px",
    "z-index:9999",
    "width:360px",
    "max-height:44vh",
    "font:12px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace",
    "color:#111827",
    "background:rgba(255,255,255,.96)",
    "border:1px solid rgba(15,23,42,.16)",
    "border-radius:10px",
    "box-shadow:0 16px 45px rgba(15,23,42,.18)",
    "overflow:hidden"
  ].join(";");
  panel.innerHTML = `
    <button type="button" data-agent-debug-toggle style="width:100%;border:0;background:#111827;color:#fff;padding:7px 10px;text-align:left;font:inherit;cursor:pointer;">Agent Debug</button>
    <pre data-agent-debug-output style="margin:0;padding:10px;max-height:calc(42vh - 32px);overflow:auto;white-space:pre-wrap;"></pre>
  `;
  const output = panel.querySelector("[data-agent-debug-output]");
  if (output) output.hidden = true;
  panel.querySelector("[data-agent-debug-toggle]")?.addEventListener("click", () => {
    const pre = panel.querySelector("[data-agent-debug-output]");
    if (pre) {
      pre.hidden = !pre.hidden;
      panel.dataset.userExpandedOnNarrow = pre.hidden ? "" : "true";
    }
  });
  globalThis.document.body.append(panel);
  positionAgentDebugPanel(panel);
  if (!globalThis.__chatAgentDebugPanelPositionBound) {
    globalThis.__chatAgentDebugPanelPositionBound = true;
    globalThis.addEventListener("resize", () => {
      const current = globalThis.document?.querySelector?.("#chatAgentDebugPanel");
      if (current) positionAgentDebugPanel(current);
    });
  }
  return panel;
}

function positionAgentDebugPanel(panel) {
  if (!panel) return;
  const viewportWidth = globalThis.innerWidth || 0;
  const viewportHeight = globalThis.innerHeight || 0;
  const gutter = 16;
  const gap = 18;
  const preferredWidth = 360;
  const promptRect = globalThis.document?.querySelector?.("#promptForm")?.getBoundingClientRect?.();
  const availableLeftWidth = promptRect ? Math.max(0, promptRect.left - gap - gutter) : viewportWidth - gutter * 2;
  const wideEnough = availableLeftWidth >= 280;
  const width = wideEnough
    ? Math.min(preferredWidth, availableLeftWidth)
    : Math.min(320, Math.max(240, viewportWidth - gutter * 2));
  const left = wideEnough && promptRect
    ? Math.max(gutter, promptRect.left - gap - width)
    : gutter;
  const bottom = promptRect
    ? Math.max(gutter, viewportHeight - promptRect.bottom)
    : 24;
  panel.style.left = `${left}px`;
  panel.style.right = "auto";
  panel.style.bottom = `${bottom}px`;
  panel.style.width = `${width}px`;
  panel.style.maxHeight = wideEnough ? "44vh" : "30vh";
  const pre = panel.querySelector("[data-agent-debug-output]");
  if (pre) {
    pre.style.maxHeight = wideEnough ? "calc(44vh - 32px)" : "calc(30vh - 32px)";
    if (!wideEnough && !panel.dataset.userExpandedOnNarrow) pre.hidden = true;
  }
}

export function bindPromptSubmit({
  promptForm,
  promptInput,
  chatImageFilesRef,
  setChatImageFiles,
  renderChatImagePreview,
  canvasViewport,
  viewportPointToWorld,
  addThinking,
  updateThinking,
  setThinkingSummary = () => {},
  addChat,
  updateChat,
  addChatImage,
  addChatBlocks = null,
  addGenerationPreview,
  replacePreviewWithImage,
  replacePreviewWithModel = null,
  replacePreviewWithVideo = null,
  updateActiveProject,
  saveCurrentProject = null,
  saveCurrentProjectAfterGeneration = saveCurrentProject,
  getActiveProject,
  makeProjectTitle,
  postJsonRequest,
  buildChatImagePayload,
  readFileAsDataUrl,
  readImageSourceAsDataUrl = null,
  recordCanvasEvent,
  chatModelSelect,
  setChatCollapsed,
  detectGenerationKind,
  getPendingHomeGenerationFocus = () => false,
  setPendingHomeGenerationFocus = () => {},
  centerViewOnNode = () => {},
  onProjectTitleRefresh = () => {}
}) {
  const resolvedPromptForm = promptForm || globalThis.document?.querySelector("#promptForm");
  const resolvedPromptInput = promptInput || globalThis.document?.querySelector("#promptInput");
  const resolvedCanvasViewport = canvasViewport || globalThis.document?.querySelector("#canvasViewport");
  const resolvedChatModelSelect = chatModelSelect || globalThis.document?.querySelector("#chatModelSelect");
  if (!resolvedPromptForm || !resolvedPromptInput || !resolvedCanvasViewport || !resolvedChatModelSelect) {
    return;
  }

  window.setTimeout(() => {
    restoreProjectConversation({
      projectId: getActiveProject?.()?.id,
      addChat,
      addChatImage
    }).catch((error) => {
      console.warn("[conversation] Failed to restore messages", error);
    });
  }, 600);
  bindConversationControls({
    getProjectId: () => getActiveProject?.()?.id,
    promptInput: resolvedPromptInput,
    promptForm: resolvedPromptForm,
    addChat,
    addChatImage
  });
  bindImageTo3DRequests({
    root: resolvedPromptForm.ownerDocument || document,
    canvasViewport: resolvedCanvasViewport,
    viewportPointToWorld,
    addChat,
    updateChat,
    addGenerationPreview,
    replacePreviewWithModel,
    postJsonRequest,
    chatModelSelect: resolvedChatModelSelect,
    updateActiveProject,
    getActiveProject,
    makeProjectTitle,
    saveCurrentProjectAfterGeneration,
    notify: (message) => addChat("assistant", message)
  });

  resolvedPromptForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = resolvedPromptInput.value.trim();
    const triggerSource = inferSubmitTriggerSource(event, resolvedPromptForm);
    const pendingHomeFiles = Array.isArray(resolvedPromptForm.__pendingHomeGenerationFiles)
      ? resolvedPromptForm.__pendingHomeGenerationFiles
      : [];
    const pendingHomeModel = String(resolvedPromptForm.__pendingHomeGenerationModel || "").trim();
    const rawCurrentFiles = chatImageFilesRef();
    const currentFiles = Array.isArray(rawCurrentFiles) ? rawCurrentFiles : [];
    const domPreviewAttachments = getChatPreviewDomSummaries();
    const referenceFiles = currentFiles.length ? currentFiles : pendingHomeFiles;
    console.debug("[chat-submit] trigger source", {
      source: triggerSource,
      composerAttachmentCount: currentFiles.length,
      pendingHomeAttachmentCount: pendingHomeFiles.length,
      domPreviewAttachmentCount: domPreviewAttachments.length,
      composerAttachments: summarizeFiles(currentFiles),
      pendingHomeAttachments: summarizeFiles(pendingHomeFiles),
      domPreviewAttachments
    });
    const agentDebug = createAgentDebugRecord({
      originalPrompt: prompt,
      modelId: pendingHomeModel || resolvedChatModelSelect.dataset.selectedModelId || resolvedChatModelSelect.value,
      composerAttachmentCount: currentFiles.length,
      pendingHomeAttachmentCount: pendingHomeFiles.length,
      addChatBlocksAvailable: typeof addChatBlocks === "function"
    });
    activeChatAgentRunId = agentDebug.runId;
    logAgentDebug(agentDebug, "submit.before", {
      triggerSource,
      composerAttachmentCount: currentFiles.length,
      pendingHomeAttachmentCount: pendingHomeFiles.length,
      domPreviewAttachmentCount: domPreviewAttachments.length,
      selectedSource: currentFiles.length ? "composer" : (pendingHomeFiles.length ? "pending-home" : (domPreviewAttachments.length ? "dom-preview" : "none")),
      composerAttachments: summarizeFiles(currentFiles),
      domPreviewAttachments
    });

    if (!prompt && !referenceFiles.length && !domPreviewAttachments.length) {
      resolvedPromptForm.__pendingHomeGenerationModel = "";
      updateAgentDebugPanel(agentDebug);
      return;
    }
    if (prompt) lastConversationPrompt = prompt;

    const selectedChatModel = resolvedChatModelSelect.dataset.selectedModelId || resolvedChatModelSelect.value;
    const model = resolveImageModelId(pendingHomeModel || selectedChatModel, "chat");
    agentDebug.modelId = model;
    if (resolvedChatModelSelect.value !== model) {
      resolvedChatModelSelect.value = model;
      resolvedChatModelSelect.dataset.modelUserSelected = "true";
      resolvedChatModelSelect.dataset.selectedModelId = model;
      resolvedChatModelSelect.__compactSelectSync?.();
    }
    if (model !== (pendingHomeModel || selectedChatModel)) {
      console.warn("[models] Submitted model was normalized", {
        selected: pendingHomeModel || selectedChatModel,
        submitted: model
      });
    }

    recordCanvasEvent("prompt_submitted", {
      source: "chat-panel",
      hasPrompt: Boolean(prompt),
      imageCount: referenceFiles.length || domPreviewAttachments.length,
      model
    });

    setChatCollapsed(false);
    const submittedReferenceCount = referenceFiles.length || domPreviewAttachments.length;
    const attachmentText = submittedReferenceCount ? ` Attached ${submittedReferenceCount} reference image(s)` : "";
    addChat("user", `${prompt || "[image reference]"} ${attachmentText}`);
    resolvedPromptInput.value = "";

    const files = copyReferenceFiles(referenceFiles);
    agentDebug.copiedAttachmentCount = files.length;
    logAgentDebug(agentDebug, "attachments.copied", summarizeFiles(files));
    const generationMetrics = await resolveGenerationMetrics(files);
    resolvedPromptForm.__pendingHomeGenerationFiles = [];
    resolvedPromptForm.__pendingHomeGenerationModel = "";

    const thinking = addThinking("Thinking", CONVERSATION_THINKING_STEPS);
    let progress = null;
    let previewNodes = [];
    let previewNode = null;
    let previewCount = 1;
    let generationStarted = false;
    let pendingPreviewCreationStarted = false;
    let agentBlocksMessage = null;
    const agentBlocksState = {
      hasReference: false,
      analysisStatus: "idle",
      imageAnalysis: null,
      imageAnalysisError: "",
      promptStatus: "idle",
      prompt,
      optimizedPrompt: "",
      promptError: "",
      resultStatus: "idle",
      resultError: "",
      imageUrls: [],
      videoUrls: [],
      model,
      modelUsage: "",
      generationType: getModelType(model) === "3d" ? "3d" : (getModelType(model) === "video" ? "video" : "image"),
      taskType: "",
      size: "",
      jobId: "",
      summary: ""
    };
    const refreshAgentBlocks = () => {
      if (typeof addChatBlocks !== "function") return;
      const blocks = buildAgentProgressBlocks(agentBlocksState);
      if (!blocks.length) return;
      if (!agentBlocksMessage) {
        agentBlocksMessage = addChatBlocks("assistant", blocks);
        return;
      }
      agentBlocksMessage.__updateBlocks?.(blocks);
    };
    const handleAgentStreamEvent = (event = {}) => {
      if (activeChatAgentRunId !== agentDebug.runId) return;
      if (event.type === "agent.intent") {
        agentBlocksState.taskType = event.taskType || agentBlocksState.taskType;
        agentBlocksState.generationType = event.generationType || agentBlocksState.generationType;
        if (event.shouldGenerate) {
          agentBlocksState.resultStatus = "pending";
          refreshAgentBlocks();
        }
        return;
      }
      if (event.type === "image.analysis.start") {
        agentBlocksState.hasReference = true;
        agentBlocksState.analysisStatus = "pending";
        refreshAgentBlocks();
        return;
      }
      if (event.type === "image.analysis") {
        agentBlocksState.hasReference = true;
        agentBlocksState.analysisStatus = "done";
        agentBlocksState.imageAnalysis = event.analysis || event.summary || "";
        agentBlocksState.imageAnalysisError = "";
        refreshAgentBlocks();
        return;
      }
      if (event.type === "image.analysis.error") {
        agentBlocksState.hasReference = true;
        agentBlocksState.analysisStatus = "error";
        agentBlocksState.imageAnalysisError = "图片分析未完成，已继续优化提示词并生成。";
        refreshAgentBlocks();
        return;
      }
      if (event.type === "prompt.optimizer.start") {
        agentBlocksState.promptStatus = "pending";
        refreshAgentBlocks();
        return;
      }
      if (event.type === "prompt.optimized") {
        agentBlocksState.promptStatus = "done";
        agentBlocksState.optimizedPrompt = event.optimizedPrompt || agentBlocksState.optimizedPrompt || prompt;
        agentBlocksState.taskType = event.taskType || agentBlocksState.taskType;
        agentBlocksState.promptError = event.optimizerError || "";
        refreshAgentBlocks();
      }
    };
    const createPendingPreviewForRun = ({ outputType = "" } = {}) => {
      if (activeChatAgentRunId !== agentDebug.runId) return false;
      if (previewNodes.length || pendingPreviewCreationStarted) return Boolean(previewNodes.length);
      pendingPreviewCreationStarted = true;
      agentDebug.previewCreationAttempted = true;
      try {
        if (typeof addGenerationPreview !== "function") {
          throw new Error("missing createPreview function");
        }
        const videoModel = getModelType(model) === "video" || outputType === "video";
        const target = viewportPointToWorld(
          resolvedCanvasViewport.getBoundingClientRect().left + resolvedCanvasViewport.clientWidth / 2,
          resolvedCanvasViewport.getBoundingClientRect().top + resolvedCanvasViewport.clientHeight / 2
        );
        const placement = getGenerationPlacement(generationMetrics, target);
        previewCount = videoModel ? 1 : (isMidjourneyModel(model) ? MIDJOURNEY_IMAGE_COUNT : 1);
        previewNodes = createPromptPreviewBatch({
          addGenerationPreview,
          placement,
          generationMetrics,
          files,
          count: previewCount,
          outputType: videoModel ? "video" : "image"
        });
        if (!previewNodes.length) {
          throw new Error("Unable to create pending generation preview.");
        }
        previewNode = previewNodes[0];
        agentDebug.generationType = videoModel ? "video" : "image";
        agentBlocksState.generationType = agentDebug.generationType;
        agentBlocksState.resultStatus = "pending";
        agentBlocksState.size = generationMetrics.outputSize || "";
        refreshAgentBlocks();
        agentDebug.pendingPreviewCreated = true;
        agentDebug.previewCreationError = "";
        logAgentDebug(agentDebug, "preview.created_from_intent", {
          count: previewNodes.length,
          generationType: agentDebug.generationType
        });
        updateAgentDebugPanel(agentDebug);
        return true;
      } catch (error) {
        pendingPreviewCreationStarted = false;
        agentDebug.previewCreationError = error.message || String(error);
        logAgentDebug(agentDebug, "preview.create_failed", {
          message: agentDebug.previewCreationError
        });
        updateAgentDebugPanel(agentDebug);
        return false;
      }
    };

    try {
      logAgentDebug(agentDebug, "workflow.attachments.received", {
        copiedFileCount: files.length,
        domPreviewAttachmentCount: domPreviewAttachments.length,
        copiedFiles: summarizeFiles(files),
        domPreviewAttachments
      });
      const referenceBundle = await collectReferenceImages({
        files,
        domPreviewAttachments,
        readFileAsDataUrl,
        readImageSourceAsDataUrl,
        debugRecord: agentDebug
      });
      const imageAttachments = referenceBundle.attachments;
      const images = referenceBundle.images;
      agentDebug.referenceImages = summarizeReferenceImages(imageAttachments);
      agentDebug.referenceImageCount = imageAttachments.length;
      agentBlocksState.hasReference = imageAttachments.length > 0;
      if (agentBlocksState.hasReference) {
        agentBlocksState.analysisStatus = "pending";
        refreshAgentBlocks();
      }
      logAgentDebug(agentDebug, "attachments.final", {
        referenceImageCount: imageAttachments.length,
        sources: imageAttachments.map((item) => item.source || "unknown")
      });
      updateAgentDebugPanel(agentDebug);
      setAgentGenerationStage(agentDebug, "saveProject", {
        projectId: getActiveProject?.()?.id || ""
      });
      const projectReady = await ensureActiveProjectReadyForGeneration({
        saveCurrentProject,
        getActiveProject,
        debugRecord: agentDebug
      });
      if (!projectReady.ok) {
        agentDebug.error = projectReady.message;
        logAgentDebug(agentDebug, "project.persistence.failed", {
          message: projectReady.message
        });
        updateAgentDebugPanel(agentDebug);
        throw new Error(projectReady.message);
      }
      if (getModelType(model) === "3d") {
        if (typeof addGenerationPreview !== "function" || typeof replacePreviewWithModel !== "function") {
          throw new Error("3D canvas generation workflow is unavailable.");
        }
        const tripoReference = imageAttachments[0] || null;
        const isImageTo3D = Boolean(tripoReference?.dataUrl);
        if (!isImageTo3D && model === "tripo-p1") {
          throw new Error("Tripo P1 only supports image-to-3D. Please upload a reference image first.");
        }
        generationStarted = true;
        agentDebug.generationStarted = true;
        agentDebug.generationType = "3d";
        agentDebug.intent = "generate_3d";
        agentDebug.taskType = isImageTo3D ? "image_to_3d" : "text_to_3d";
        agentDebug.shouldGenerate = true;
        agentDebug.executeGeneration = true;
        agentDebug.messageDoneHandled = true;
        agentBlocksState.generationType = "3d";
        agentBlocksState.resultStatus = "pending";
        agentBlocksState.optimizedPrompt = prompt;
        refreshAgentBlocks();
        setAgentGenerationStage(agentDebug, "generateRequest", {
          model,
          generationType: "3d"
        });
        progress = addChat("assistant", "创建 3D 任务中...");
        progress?.classList?.add("loading");
        const target = viewportPointToWorld(
          resolvedCanvasViewport.getBoundingClientRect().left + resolvedCanvasViewport.clientWidth / 2,
          resolvedCanvasViewport.getBoundingClientRect().top + resolvedCanvasViewport.clientHeight / 2
        );
        const placement = getGenerationPlacement(generationMetrics, target);
        previewNodes = createPromptPreviewBatch({
          addGenerationPreview,
          placement,
          generationMetrics,
          files,
          count: 1,
          outputType: "3d"
        });
        previewNode = previewNodes[0];
        if (!previewNode) throw new Error("Unable to create pending 3D preview.");
        agentDebug.previewCreationAttempted = true;
        agentDebug.pendingPreviewCreated = true;
        agentDebug.generatePayload = {
          modelId: model,
          generationType: "3d",
          prompt,
          taskType: isImageTo3D ? "image_to_3d" : "text_to_3d",
          imageCount: isImageTo3D ? 1 : 0,
          texture: true
        };
        if (isImageTo3D) {
          agentDebug.generatePayload.image = summarizeReferenceImages([tripoReference])[0] || null;
        }
        agentDebug.generatePayloadBuilt = true;
        agentDebug.generateRequestStarted = true;
        updateAgentDebugPanel(agentDebug);
        const createPayload = isImageTo3D
          ? {
            prompt,
            modelId: model,
            imageDataUrl: tripoReference.dataUrl,
            imageName: tripoReference.name || "reference.png",
            imageMimeType: tripoReference.type || "",
            texture: true
          }
          : {
            prompt,
            modelId: model,
            texture: true
          };
        const createResult = await postJsonRequest(
          isImageTo3D ? "/api/ai/3d/image-to-model" : "/api/ai/3d/text-to-model",
          createPayload
        );
        agentDebug.generateResult = {
          taskId: createResult.taskId || "",
          status: createResult.status || "",
          provider: createResult.provider || "tripo"
        };
        agentBlocksState.jobId = createResult.taskId || "";
        updateChat(progress, "3D 模型生成中 0%");
        setAgentGenerationStage(agentDebug, "jobPoll", {
          taskId: createResult.taskId || "",
          status: createResult.status || "queued"
        });
        const finalResult = await waitForTripo3DTask(createResult.taskId, {
          onProgress: (payload) => {
            const percent = Math.max(0, Math.min(99, Math.round(Number(payload?.progress || 0))));
            updateChat(progress, `3D 模型生成中 ${percent}%`);
            updatePromptPreviewStatus(previewNode, `3D model generation ${percent}%...`);
            setAgentGenerationStage(agentDebug, "jobPoll", {
              taskId: payload?.taskId || createResult.taskId || "",
              status: payload?.status || "running",
              progress: percent
            });
            updateAgentDebugPanel(agentDebug);
          }
        });
        const modelUrl = finalResult.localModelUrl || finalResult.modelUrl || "";
        if (!modelUrl) throw new Error("3D 模型生成完成，但没有返回模型地址。");
        updateChat(progress, "3D 模型生成完成\n正在添加到画布...");
        setAgentGenerationStage(agentDebug, "outputPersist", {
          taskId: finalResult.taskId || createResult.taskId || "",
          outputCount: 1
        });
        const modelNode = replacePreviewWithModel(previewNode, {
          title: "Tripo 3D Model",
          desc: "Generated 3D model from your prompt.",
          url: modelUrl,
          width: previewNode?.offsetWidth || 360,
          aspectRatio: "1 / 1",
          prompt,
          actionType: isImageTo3D ? "image_to_3d" : "text_to_3d",
          model
        });
        if (getPendingHomeGenerationFocus()) {
          setPendingHomeGenerationFocus(false);
          centerViewOnNode(modelNode, 1);
        }
        updateActiveProject({
          title: getActiveProject()?.title || makeProjectTitle(prompt),
          prompt,
          thumbnail: finalResult.renderedImageUrl || modelUrl,
          itemCount: (getActiveProject()?.itemCount || 0) + 1
        });
        await saveCurrentProjectAfterGeneration?.();
        onProjectTitleRefresh();
        progress?.classList?.remove("loading");
        updateChat(progress, "3D 模型生成完成");
        updateThinking(thinking, CONVERSATION_THINKING_STEPS.length, true);
        setAgentGenerationStage(agentDebug, "done", {
          taskId: finalResult.taskId || createResult.taskId || "",
          outputCount: 1
        });
        window.dispatchEvent(new CustomEvent("ai-studio-credits-refresh"));
        return;
      }
      setAgentGenerationStage(agentDebug, "conversation", {
        projectId: projectReady.projectId
      });
      const conversationResult = await runConversationAgent({
        projectId: projectReady.projectId,
        prompt,
        model,
        images,
        files,
        attachments: imageAttachments,
        canvasContext: collectCanvasContext(),
        debugRecord: agentDebug,
        thinking,
        addChat,
        updateChat,
        updateThinking,
        setThinkingSummary,
        onAgentEvent: handleAgentStreamEvent,
        onShouldGenerateIntent: ({ outputType } = {}) => {
          agentBlocksState.generationType = outputType || agentBlocksState.generationType;
          agentBlocksState.resultStatus = "pending";
          refreshAgentBlocks();
          createPendingPreviewForRun({ outputType });
        }
      });
      agentDebug.intent = conversationResult.intent || agentDebug.intent || "";
      agentDebug.taskType = conversationResult.taskType || agentDebug.taskType || "";
      agentDebug.promptStrategy = conversationResult.promptStrategy || agentDebug.promptStrategy || "";
      agentDebug.optimizedPrompt = conversationResult.optimizedPrompt || agentDebug.optimizedPrompt || prompt;
      agentDebug.qwenVlMode = conversationResult.qwenVlMode || agentDebug.qwenVlMode || "";
      agentDebug.promptOptimizerMode = conversationResult.promptOptimizerMode || agentDebug.promptOptimizerMode || "";
      agentDebug.skippedOptimizer = Boolean(conversationResult.skippedOptimizer || agentDebug.skippedOptimizer);
      agentDebug.optimizerError = conversationResult.optimizerError || agentDebug.optimizerError || "";
      agentDebug.usedFallbackPrompt = Boolean(conversationResult.usedFallbackPrompt || agentDebug.usedFallbackPrompt);
      agentDebug.totalBudgetExceeded = Boolean(conversationResult.totalBudgetExceeded || agentDebug.totalBudgetExceeded);
      agentDebug.imageAnalysisPresent = Boolean(conversationResult.imageAnalysis);
      agentDebug.imageAnalysisError = conversationResult.imageAnalysisError || agentDebug.imageAnalysisError || "";
      agentDebug.generationType = conversationResult.outputType || agentDebug.generationType || "";
      agentDebug.shouldGenerate = Boolean(conversationResult.shouldGenerate);
      logMessageDoneGenerationDecision(agentDebug, {
        stage: "conversation-result-returned",
        messageDoneReceived: agentDebug.messageDoneReceived,
        conversationShouldGenerate: Boolean(conversationResult.shouldGenerate)
      });
      if (activeChatAgentRunId !== agentDebug.runId) {
        agentDebug.messageDoneSkipReason = "skipped because runId mismatch";
        logMessageDoneGenerationDecision(agentDebug, {
          stage: "guard.skip",
          reason: agentDebug.messageDoneSkipReason
        });
        logAgentDebug(agentDebug, "run.stale_after_conversation", {
          activeRunId: activeChatAgentRunId,
          reason: agentDebug.messageDoneSkipReason
        });
        updateAgentDebugPanel(agentDebug);
        return;
      }

      agentDebug.startGenerationAttempted = true;
      logMessageDoneGenerationDecision(agentDebug, {
        stage: "start-generation-attempted"
      });
      if (!conversationResult.shouldGenerate) {
        agentDebug.autoExecute = CHAT_AGENT_CONFIG.autoExecute;
        agentDebug.shouldGenerate = false;
        agentDebug.executeGeneration = false;
        agentDebug.messageDoneSkipReason = "skipped because shouldGenerate false";
        logMessageDoneGenerationDecision(agentDebug, {
          stage: "guard.skip",
          reason: agentDebug.messageDoneSkipReason
        });
        logAgentDebug(agentDebug, "generation.skip", {
          intent: agentDebug.intent,
          reason: agentDebug.messageDoneSkipReason
        });
        updateAgentDebugPanel(agentDebug);
        updateThinking(thinking, CONVERSATION_THINKING_STEPS.length, true);
        return;
      }

      agentDebug.intent = conversationResult.intent || "";
      agentDebug.taskType = conversationResult.taskType || agentDebug.taskType || "";
      agentDebug.promptStrategy = conversationResult.promptStrategy || agentDebug.promptStrategy || "";
      agentDebug.optimizedPrompt = conversationResult.optimizedPrompt || prompt;
      agentDebug.qwenVlMode = conversationResult.qwenVlMode || agentDebug.qwenVlMode || "";
      agentDebug.promptOptimizerMode = conversationResult.promptOptimizerMode || agentDebug.promptOptimizerMode || "";
      agentDebug.skippedOptimizer = Boolean(conversationResult.skippedOptimizer || agentDebug.skippedOptimizer);
      agentDebug.optimizerError = conversationResult.optimizerError || agentDebug.optimizerError || "";
      agentDebug.usedFallbackPrompt = Boolean(conversationResult.usedFallbackPrompt || agentDebug.usedFallbackPrompt);
      agentDebug.totalBudgetExceeded = Boolean(conversationResult.totalBudgetExceeded || agentDebug.totalBudgetExceeded);
      agentDebug.imageAnalysisPresent = Boolean(conversationResult.imageAnalysis);
      agentDebug.imageAnalysisError = conversationResult.imageAnalysisError || agentDebug.imageAnalysisError || "";
      agentDebug.autoExecute = CHAT_AGENT_CONFIG.autoExecute;
      agentDebug.shouldGenerate = true;
      agentDebug.executeGeneration = CHAT_AGENT_CONFIG.autoExecute;
      if (!CHAT_AGENT_CONFIG.autoExecute) {
        agentDebug.messageDoneSkipReason = "skipped because autoExecute false";
        logMessageDoneGenerationDecision(agentDebug, {
          stage: "guard.skip",
          reason: agentDebug.messageDoneSkipReason
        });
        logAgentDebug(agentDebug, "generation.waiting_for_confirmation", {
          intent: agentDebug.intent,
          optimizedPrompt: summarizePrompt(agentDebug.optimizedPrompt),
          reason: agentDebug.messageDoneSkipReason
        });
        updateAgentDebugPanel(agentDebug);
        addChat("assistant", "Agent has prepared the generation prompt. Auto execution is disabled for this build.");
        updateThinking(thinking, CONVERSATION_THINKING_STEPS.length, true);
        return;
      }
      if (generationStarted) {
        agentDebug.messageDoneSkipReason = "skipped because generationStarted already true";
        logMessageDoneGenerationDecision(agentDebug, {
          stage: "guard.skip",
          reason: agentDebug.messageDoneSkipReason
        });
        logAgentDebug(agentDebug, "generation.duplicate_ignored", {
          runId: agentDebug.runId,
          reason: agentDebug.messageDoneSkipReason
        });
        updateAgentDebugPanel(agentDebug);
        return;
      }
      if (typeof addGenerationPreview !== "function") {
        agentDebug.messageDoneSkipReason = "skipped because missing preview creation fn";
        logMessageDoneGenerationDecision(agentDebug, {
          stage: "guard.skip",
          reason: agentDebug.messageDoneSkipReason
        });
        throw new Error("missing createPreview function");
      }
      if (typeof replacePreviewWithImage !== "function") {
        agentDebug.messageDoneSkipReason = "skipped because missing replacePreviewWithImage";
        logMessageDoneGenerationDecision(agentDebug, {
          stage: "guard.skip",
          reason: agentDebug.messageDoneSkipReason
        });
        throw new Error("missing replacePreviewWithImage");
      }
      generationStarted = true;
      agentDebug.generationStarted = true;
      agentDebug.executeGeneration = true;
      agentDebug.messageDoneHandled = true;
      agentDebug.messageDoneSkipReason = "";
      updateAgentDebugPanel(agentDebug);
      logMessageDoneGenerationDecision(agentDebug, {
        stage: "guard.pass",
        enterExecuteGeneration: true
      });
      logAgentDebug(agentDebug, "generation.execute", {
        intent: agentDebug.intent,
        optimizedPrompt: summarizePrompt(agentDebug.optimizedPrompt)
      });

      progress = conversationResult.message || (typeof addChatBlocks === "function" ? null : addChat("assistant", "Generating result..."));
      progress?.classList?.add("loading");
      const generationPrompt = conversationResult.optimizedPrompt || prompt;
      const videoModel = getModelType(model) === "video" || conversationResult.outputType === "video";
      if (videoModel && typeof replacePreviewWithVideo !== "function") {
        agentDebug.messageDoneSkipReason = "skipped because missing replacePreviewWithVideo";
        logMessageDoneGenerationDecision(agentDebug, {
          stage: "guard.skip",
          reason: agentDebug.messageDoneSkipReason
        });
        throw new Error("missing replacePreviewWithVideo");
      }
      agentDebug.generationType = videoModel ? "video" : "image";
      agentBlocksState.generationType = agentDebug.generationType;
      agentBlocksState.optimizedPrompt = generationPrompt;
      agentBlocksState.resultStatus = "pending";
      agentBlocksState.size = generationMetrics.outputSize || "";
      refreshAgentBlocks();
      updateChat(progress, `${conversationResult.text || "Generating result..."}\nCalling ${videoModel ? "video" : "image"} generation model...`);

      previewCount = videoModel ? 1 : (isMidjourneyModel(model) ? MIDJOURNEY_IMAGE_COUNT : 1);
      agentDebug.previewCreationAttempted = true;
      updateAgentDebugPanel(agentDebug);
      if (!previewNodes.length) {
        const target = viewportPointToWorld(
          resolvedCanvasViewport.getBoundingClientRect().left + resolvedCanvasViewport.clientWidth / 2,
          resolvedCanvasViewport.getBoundingClientRect().top + resolvedCanvasViewport.clientHeight / 2
        );
        const placement = getGenerationPlacement(generationMetrics, target);
        previewNodes = createPromptPreviewBatch({
          addGenerationPreview,
          placement,
          generationMetrics,
          files,
          count: previewCount,
          outputType: videoModel ? "video" : "image"
        });
      }
      if (!previewNodes.length) {
        agentDebug.previewCreationError = "Unable to create pending generation preview.";
        logMessageDoneGenerationDecision(agentDebug, {
          stage: "preview.failed",
          reason: agentDebug.previewCreationError
        });
        throw new Error(agentDebug.previewCreationError);
      }
      previewNode = previewNodes[0];
      agentDebug.pendingPreviewCreated = true;
      logAgentDebug(agentDebug, "preview.created", {
        count: previewNodes.length,
        generationType: videoModel ? "video" : "image"
      });
      clearComposerAttachments({
        setChatImageFiles,
        renderChatImagePreview
      });

      logSubmittedModel("chat", model);
      const generationPayload = buildChatImagePayload({
        model,
        prompt: generationPrompt,
        images,
        size: generationMetrics.outputSize
      });
      if (!generationPayload?.prompt && !Array.isArray(generationPayload?.images)) {
        agentDebug.messageDoneSkipReason = "skipped because missing payload";
        logMessageDoneGenerationDecision(agentDebug, {
          stage: "guard.skip",
          reason: agentDebug.messageDoneSkipReason
        });
        throw new Error("missing payload");
      }
      agentDebug.generatePayload = summarizeGeneratePayload(generationPayload, videoModel ? "video" : "image");
      agentDebug.generatePayloadBuilt = true;
      logMessageDoneGenerationDecision(agentDebug, {
        stage: "payload.built",
        generatePayloadBuilt: true
      });
      logAgentDebug(agentDebug, "generate.request", agentDebug.generatePayload);
      updateAgentDebugPanel(agentDebug);
      setAgentGenerationStage(agentDebug, "generateRequest", {
        model,
        generationType: videoModel ? "video" : "image"
      });
      agentDebug.generateRequestStarted = true;
      logMessageDoneGenerationDecision(agentDebug, {
        stage: "request.started",
        generateRequestStarted: true
      });
      updateAgentDebugPanel(agentDebug);
      const result = await postJsonRequest("/api/ai/generate", generationPayload);
      agentDebug.generateResult = summarizeGenerationResult(result);
      logAgentDebug(agentDebug, "generate.response.initial", agentDebug.generateResult);
      const finalResult = result.imageUrl || result.videoUrl || !result.jobId
        ? result
        : await waitForAIJob(result.jobId, {
          onProgress: (payload) => {
            if (activeChatAgentRunId !== agentDebug.runId) return;
            setAgentGenerationStage(agentDebug, "jobPoll", {
              jobId: payload?.jobId || result.jobId,
              status: payload?.status || "running",
              progress: payload?.progress || 0
            });
            const status = payload?.status || "running";
            const progressValue = Number(payload?.progress || 0);
            const suffix = progressValue > 0 ? ` (${Math.min(99, progressValue)}%)` : "";
            updateChat(progress, `${videoModel ? "Video" : "Image"} generation is still running${suffix}.\n${formatModelUsage(result, model)}`);
            previewNodes.forEach((node, index) => updatePromptPreviewStatus(node, previewCount > 1
              ? `Waiting for result ${index + 1}/${previewCount}...`
              : (videoModel ? "Waiting for video result..." : "Waiting for generation result...")));
            if (status === "queued" || status === "running") {
              updateThinking(thinking, 4);
            }
          }
        });
      if (activeChatAgentRunId !== agentDebug.runId) {
        logAgentDebug(agentDebug, "generation.result.stale_ignored", {
          activeRunId: activeChatAgentRunId
        });
        return;
      }
      agentDebug.generateResult = summarizeGenerationResult(finalResult);
      logAgentDebug(agentDebug, "generate.response.final", agentDebug.generateResult);
      setAgentGenerationStage(agentDebug, "outputPersist", {
        jobId: finalResult.jobId || finalResult.job?.id || "",
        outputCount: getResultUrls(finalResult).length
      });
      updateAgentDebugPanel(agentDebug);
      const resultModel = finalResult.requestedModel || finalResult.model || model;
      warnIfModelMismatch(model, resultModel, finalResult);
      const modelUsage = formatModelUsage(finalResult, resultModel);
      agentDebug.addChatBlocksAvailable = typeof addChatBlocks === "function";
      updateChat(progress, "正在整理生成结果...");
      updateAgentDebugPanel(agentDebug);

      const videoUrls = getResultVideoUrls(finalResult);
      if (videoModel && videoUrls.length) {
        if (typeof replacePreviewWithVideo !== "function") {
          throw new Error("Video preview workflow is unavailable.");
        }
        const videoNode = replacePreviewWithVideo(previewNode, {
          title: "Generated Video.mp4",
          desc: "Generated video from your prompt.",
          url: videoUrls[0],
          width: previewNode?.offsetWidth || generationMetrics.width,
          aspectRatio: generationMetrics.aspectRatio || "",
          prompt: generationPrompt,
          actionType: "video_generation",
          model: resultModel
        });
        if (getPendingHomeGenerationFocus()) {
          setPendingHomeGenerationFocus(false);
          centerViewOnNode(videoNode, 1);
        }
        updateActiveProject({
          title: getActiveProject()?.title || makeProjectTitle(prompt || generationPrompt),
          prompt: generationPrompt,
          thumbnail: videoUrls[0],
          itemCount: (getActiveProject()?.itemCount || 0) + 1
        });
        await saveCurrentProjectAfterGeneration?.();
        onProjectTitleRefresh();
        videoUrls.length = 0;
        if (typeof addChatBlocks === "function") {
          progress?.remove?.();
          progress = null;
          agentBlocksState.videoUrls = [];
          agentBlocksState.imageUrls = [];
          agentBlocksState.model = resultModel;
          agentBlocksState.modelUsage = modelUsage;
          agentBlocksState.generationType = "video";
          agentBlocksState.taskType = conversationResult.taskType || agentDebug.taskType;
          agentBlocksState.optimizedPrompt = generationPrompt;
          agentBlocksState.size = generationMetrics.outputSize || "";
          agentBlocksState.jobId = finalResult.jobId || finalResult.job?.id || "";
          agentBlocksState.resultStatus = "idle";
          agentBlocksState.summary = buildAgentCompletionSummary({
            hasReference: imageAttachments.length > 0,
            generationType: "video"
          });
          refreshAgentBlocks();
        } else {
          progress?.remove?.();
          progress = null;
          addChat("assistant", `生成视频 · ${modelUsage}\n${videoUrls[0]}`);
        }
        window.dispatchEvent(new CustomEvent("ai-studio-credits-refresh"));
      } else if (getResultImageUrls(finalResult).length) {
        const imageUrls = getResultImageUrls(finalResult);
        const imageNodes = imageUrls.map((imageUrl, index) => replacePreviewWithImage(previewNodes[index] || previewNodes[0], {
          title: imageUrls.length > 1 ? `Generated Image ${index + 1}.png` : "Generated Image.png",
          desc: "Generated image from your prompt.",
          url: imageUrl,
          width: (previewNodes[index] || previewNodes[0])?.offsetWidth || generationMetrics.width,
          aspectRatio: generationMetrics.aspectRatio || "",
          prompt: generationPrompt,
          actionType: detectGenerationKind(generationPrompt),
          model: resultModel
        })).filter(Boolean);
        const imageNode = imageNodes[0] || null;
        if (getPendingHomeGenerationFocus()) {
          setPendingHomeGenerationFocus(false);
          centerViewOnNode(imageNode, 1);
        }
        updateActiveProject({
          title: getActiveProject()?.title || makeProjectTitle(prompt || generationPrompt),
          prompt: generationPrompt,
          thumbnail: imageUrls[0],
          itemCount: (getActiveProject()?.itemCount || 0) + imageUrls.length
        });
        await saveCurrentProjectAfterGeneration?.();
        onProjectTitleRefresh();
        if (typeof addChatBlocks === "function") {
          progress?.remove?.();
          progress = null;
          agentBlocksState.imageUrls = imageUrls;
          agentBlocksState.videoUrls = [];
          agentBlocksState.model = resultModel;
          agentBlocksState.modelUsage = modelUsage;
          agentBlocksState.generationType = "image";
          agentBlocksState.taskType = conversationResult.taskType || agentDebug.taskType;
          agentBlocksState.optimizedPrompt = generationPrompt;
          agentBlocksState.size = generationMetrics.outputSize || "";
          agentBlocksState.jobId = finalResult.jobId || finalResult.job?.id || "";
          agentBlocksState.resultStatus = "succeeded";
          agentBlocksState.summary = buildAgentCompletionSummary({
            hasReference: imageAttachments.length > 0,
            generationType: "image"
          });
          refreshAgentBlocks();
        } else {
          progress?.remove?.();
          progress = null;
          imageUrls.forEach((imageUrl, index) => {
            addChatImage("assistant", imageUrl, imageUrls.length > 1
              ? `\u751f\u6210\u56fe\u7247 ${index + 1}/${imageUrls.length} \u00b7 ${modelUsage}`
              : `\u751f\u6210\u56fe\u7247 \u00b7 ${modelUsage}`);
          });
        }
        window.dispatchEvent(new CustomEvent("ai-studio-credits-refresh"));
      } else {
        throw new Error(videoModel
          ? "Generation completed but no video URL was returned."
          : "Generation completed but no image URL was returned.");
      }

      updateThinking(thinking, 5, true);
      setAgentGenerationStage(agentDebug, "done", {
        jobId: finalResult.jobId || finalResult.job?.id || "",
        outputCount: getResultUrls(finalResult).length
      });
    } catch (error) {
      if (activeChatAgentRunId !== agentDebug.runId) {
        logAgentDebug(agentDebug, "run.stale_error_ignored", {
          activeRunId: activeChatAgentRunId,
          message: error.message || String(error)
        });
        return;
      }
      const failure = classifyGenerationClientError(error, agentDebug);
      agentDebug.error = failure.failureMessage;
      agentDebug.failureCode = failure.failureCode;
      agentDebug.failureMessage = failure.failureMessage;
      setAgentGenerationStage(agentDebug, failure.stage || "failed", {
        failureCode: failure.failureCode,
        failureMessage: failure.failureMessage
      });
      if (agentDebug.previewCreationAttempted && !agentDebug.pendingPreviewCreated && !agentDebug.previewCreationError) {
        agentDebug.previewCreationError = agentDebug.error;
      }
      logAgentDebug(agentDebug, "error", {
        message: agentDebug.error,
        pendingPreviewCreated: previewNodes.length > 0
      });
      updateAgentDebugPanel(agentDebug);
      if (getPendingHomeGenerationFocus()) {
        setPendingHomeGenerationFocus(false);
      }
      if (!previewNodes.length && files.length) {
        restoreComposerAttachmentsOnFailure({
          files,
          setChatImageFiles,
          renderChatImagePreview,
          onRestored: (restoredFiles) => {
            logAgentDebug(agentDebug, "attachments.restored", summarizeFiles(restoredFiles));
          }
        });
      }
      previewNodes.forEach((node) => {
        node?.classList?.add("generation-failed");
        updatePromptPreviewStatus(node, "Generation failed, please try again.");
      });
      if (typeof addChatBlocks === "function" && agentBlocksMessage) {
        agentBlocksState.resultStatus = "failed";
        agentBlocksState.resultError = "生成失败，请重试。";
        refreshAgentBlocks();
      }
      updateThinking(thinking, 0, true);
      const visibleFailureMessage = failure.stage === "attachments"
        ? failure.failureMessage
        : (agentDebug.generationType === "3d"
          ? `3D 模型生成失败：${failure.failureMessage}`
          : `Generation failed: ${failure.failureMessage}`);
      if (progress) {
        updateChat(progress, visibleFailureMessage);
      } else {
        addChat("assistant", visibleFailureMessage);
      }
    }
  });
}

function bindImageTo3DRequests({
  root = document,
  canvasViewport,
  viewportPointToWorld,
  addChat,
  updateChat,
  addGenerationPreview,
  replacePreviewWithModel,
  postJsonRequest,
  chatModelSelect,
  updateActiveProject,
  getActiveProject,
  makeProjectTitle,
  saveCurrentProjectAfterGeneration,
  notify = () => {}
} = {}) {
  if (!root || root.__aiStudioImageTo3DBound) return;
  root.__aiStudioImageTo3DBound = true;
  root.addEventListener("canvas:image-to-3d-requested", async (event) => {
    const node = event.detail?.node;
    const imageUrl = getPublicImageUrlFromNode(node);
    if (!imageUrl) {
      notify("当前图片还没有可访问地址，暂时无法图生 3D。请先上传到素材库或等待后续文件上传能力接入。");
      return;
    }
    if (typeof addGenerationPreview !== "function" || typeof replacePreviewWithModel !== "function") {
      notify("3D 生成工作流暂不可用。");
      return;
    }
    const modelId = getModelType(chatModelSelect?.dataset?.selectedModelId || chatModelSelect?.value) === "3d"
      ? (chatModelSelect.dataset.selectedModelId || chatModelSelect.value)
      : DEFAULT_3D_MODEL;
    let progress = null;
    let previewNode = null;
    try {
      progress = addChat("assistant", "创建 3D 任务中...");
      progress?.classList?.add("loading");
      const target = viewportPointToWorld(
        canvasViewport.getBoundingClientRect().left + canvasViewport.clientWidth / 2,
        canvasViewport.getBoundingClientRect().top + canvasViewport.clientHeight / 2
      );
      previewNode = addGenerationPreview({
        title: "Tripo 3D Model",
        desc: "Waiting for 3D model result...",
        x: target.x,
        y: target.y,
        width: 360,
        aspectRatio: "1 / 1"
      });
      const created = await postJsonRequest("/api/ai/3d/image-to-model", {
        imageUrl,
        modelId,
        texture: true
      });
      updateChat(progress, "3D 模型生成中 0%");
      const finalResult = await waitForTripo3DTask(created.taskId, {
        onProgress: (payload) => {
          const percent = Math.max(0, Math.min(99, Math.round(Number(payload?.progress || 0))));
          updateChat(progress, `3D 模型生成中 ${percent}%`);
          updatePromptPreviewStatus(previewNode, `3D model generation ${percent}%...`);
        }
      });
      const modelUrl = finalResult.localModelUrl || finalResult.modelUrl || "";
      if (!modelUrl) throw new Error("3D 模型生成完成，但没有返回模型地址。");
      updateChat(progress, "3D 模型生成完成\n正在添加到画布...");
      const modelNode = replacePreviewWithModel(previewNode, {
        title: "Tripo 3D Model",
        desc: "Generated 3D model from your image.",
        url: modelUrl,
        width: previewNode?.offsetWidth || 360,
        aspectRatio: "1 / 1",
        prompt: "Image to 3D",
        sourceNode: node,
        actionType: "image_to_3d",
        model: modelId
      });
      updateActiveProject?.({
        title: getActiveProject?.()?.title || makeProjectTitle?.("Image to 3D") || "3D Project",
        prompt: getActiveProject?.()?.prompt || "Image to 3D",
        thumbnail: finalResult.renderedImageUrl || modelUrl,
        itemCount: (getActiveProject?.()?.itemCount || 0) + 1
      });
      await saveCurrentProjectAfterGeneration?.();
      progress?.classList?.remove("loading");
      updateChat(progress, "3D 模型生成完成");
      modelNode?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      window.dispatchEvent(new CustomEvent("ai-studio-credits-refresh"));
    } catch (error) {
      previewNode?.classList?.add("generation-failed");
      updatePromptPreviewStatus(previewNode, "Generation failed, please try again.");
      const message = `3D 模型生成失败：${error?.message || String(error)}`;
      if (progress) updateChat(progress, message);
      else notify(message);
    }
  });
}

function getPublicImageUrlFromNode(node) {
  const image = node?.querySelector?.(".image-frame img, img");
  const candidates = [
    node?.dataset?.objectUrl,
    image?.currentSrc,
    image?.src
  ].map((value) => String(value || "").trim()).filter(Boolean);
  return candidates.find((value) => /^https?:\/\//i.test(value)) || "";
}

async function runConversationAgent({
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
} = {}) {
  if (!projectId) {
    return {
      shouldGenerate: true,
      message: null,
      text: "Generating result...",
      optimizedPrompt: prompt,
      outputType: getModelType(model)
    };
  }

  const conversation = await ensureConversation(projectId);
  let assistantMessage = null;
  let assistantText = "";
  let shouldGenerate = false;
  let optimizedPrompt = "";
  let qwenVlMode = "";
  let promptOptimizerMode = "";
  let skippedOptimizer = false;
  let optimizerError = "";
  let usedFallbackPrompt = false;
  let totalBudgetExceeded = false;
  let intent = "";
  let taskType = "";
  let promptStrategy = "";
  let outputType = getModelType(model);
  let imageAnalysis = null;
  let imageAnalysisError = "";
  let sawMessageDone = false;
  const runId = debugRecord?.runId || "";

  const conversationPayload = {
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
  logAgentDebug(debugRecord, "conversation.request", summarizeConversationPayload(conversationPayload));
  updateAgentDebugPanel(debugRecord);

  try {
    await streamConversationRun(conversation.id, conversationPayload, (event) => {
    if (runId && activeChatAgentRunId !== runId) {
      if (debugRecord) {
        debugRecord.messageDoneSkipReason = "skipped because runId mismatch";
        debugRecord.streamAbortReason = `stale event ignored: ${event.type || ""}`;
      }
      if (event.type === "message.done") {
        console.debug("[message.done] received", {
          runId,
          activeRunId: activeChatAgentRunId,
          intent: event.intent || event.message?.content?.intent || "",
          shouldGenerate: Boolean(event.shouldGenerate),
          generationType: event.generationType || "",
          autoExecute: CHAT_AGENT_CONFIG.autoExecute,
          generationStarted: false,
          enterExecuteGeneration: false,
          skipReason: "skipped because runId mismatch"
        });
      }
      logAgentDebug(debugRecord, "conversation.event.stale_ignored", {
        activeRunId: activeChatAgentRunId,
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
      intent = event.intent || intent;
      taskType = event.taskType || taskType;
      promptStrategy = event.promptStrategy || promptStrategy;
      const nextStrategyTags = Array.isArray(event.strategyTags) ? event.strategyTags : null;
      qwenVlMode = event.qwenVlMode || qwenVlMode;
      promptOptimizerMode = event.promptOptimizerMode || promptOptimizerMode;
      shouldGenerate = Boolean(event.shouldGenerate ?? (isGenerationIntent(intent) || shouldGenerate));
      outputType = event.generationType || outputType;
      if (debugRecord) {
        debugRecord.intent = intent;
        debugRecord.taskType = taskType;
        debugRecord.promptStrategy = promptStrategy;
        if (nextStrategyTags) debugRecord.strategyTags = nextStrategyTags;
        debugRecord.qwenVlMode = qwenVlMode;
        debugRecord.promptOptimizerMode = promptOptimizerMode;
        debugRecord.shouldGenerate = shouldGenerate;
        debugRecord.generationType = outputType;
      }
      logAgentDebug(debugRecord, "conversation.intent", {
        intent,
        taskType,
        promptStrategy,
        strategyTags: nextStrategyTags || debugRecord?.strategyTags || [],
        shouldGenerate,
        generationType: outputType,
        qwenVlMode,
        promptOptimizerMode
      });
      if (shouldGenerate && CHAT_AGENT_CONFIG.autoExecute && typeof onShouldGenerateIntent === "function") {
        onShouldGenerateIntent({
          intent,
          outputType,
          qwenVlMode,
          promptOptimizerMode
        });
      }
      updateAgentDebugPanel(debugRecord);
      return;
    }
    if (event.type === "image.analysis.start") {
      intent = event.intent || intent;
      taskType = event.taskType || taskType;
      promptStrategy = event.promptStrategy || promptStrategy;
      qwenVlMode = event.qwenVlMode || qwenVlMode;
      promptOptimizerMode = event.promptOptimizerMode || promptOptimizerMode;
      shouldGenerate = Boolean(event.shouldGenerate ?? (isGenerationIntent(intent) || shouldGenerate));
      outputType = event.generationType || outputType;
      if (debugRecord) {
        debugRecord.intent = intent;
        debugRecord.taskType = taskType;
        debugRecord.promptStrategy = promptStrategy;
        debugRecord.qwenVlMode = qwenVlMode;
        debugRecord.promptOptimizerMode = promptOptimizerMode;
        debugRecord.shouldGenerate = shouldGenerate;
        debugRecord.generationType = outputType;
        debugRecord.imageAnalysisStarted = true;
        debugRecord.imageAnalysisFinished = false;
        debugRecord.imageAnalysisTimedOut = false;
        debugRecord.imageAnalysisError = "";
      }
      updateAgentDebugPanel(debugRecord);
      return;
    }
    if (event.type === "prompt.optimized") {
      optimizedPrompt = event.optimizedPrompt || optimizedPrompt;
      taskType = event.taskType || taskType;
      promptStrategy = event.promptStrategy || promptStrategy;
      qwenVlMode = event.qwenVlMode || qwenVlMode;
      promptOptimizerMode = event.promptOptimizerMode || promptOptimizerMode;
      skippedOptimizer = Boolean(event.skippedOptimizer ?? skippedOptimizer);
      optimizerError = event.optimizerError || optimizerError;
      usedFallbackPrompt = Boolean(event.usedFallbackPrompt ?? event.fallback ?? usedFallbackPrompt);
      totalBudgetExceeded = Boolean(event.totalBudgetExceeded ?? totalBudgetExceeded);
      if (debugRecord) {
        debugRecord.optimizedPrompt = optimizedPrompt;
        debugRecord.taskType = taskType;
        debugRecord.promptStrategy = promptStrategy;
        debugRecord.strategyTags = Array.isArray(event.strategyTags) ? event.strategyTags : debugRecord.strategyTags;
        debugRecord.promptDriftDetected = Boolean(event.promptDriftDetected);
        debugRecord.usedConservativeFallback = Boolean(event.usedConservativeFallback || usedFallbackPrompt);
        debugRecord.qwenVlMode = qwenVlMode;
        debugRecord.promptOptimizerMode = promptOptimizerMode;
        debugRecord.skippedOptimizer = skippedOptimizer;
        debugRecord.optimizerStarted = true;
        debugRecord.optimizerFinished = true;
        debugRecord.optimizerTimedOut = Boolean(event.optimizerTimedOut);
        debugRecord.optimizerError = optimizerError;
        debugRecord.usedFallbackPrompt = usedFallbackPrompt;
        debugRecord.totalBudgetExceeded = totalBudgetExceeded;
      }
      updateAgentDebugPanel(debugRecord);
      return;
    }
    if (event.type === "prompt.optimizer.start") {
      qwenVlMode = event.qwenVlMode || qwenVlMode;
      promptOptimizerMode = event.promptOptimizerMode || promptOptimizerMode;
      if (debugRecord) {
        debugRecord.qwenVlMode = qwenVlMode;
        debugRecord.promptOptimizerMode = promptOptimizerMode;
        debugRecord.optimizerStarted = true;
        debugRecord.optimizerFinished = false;
        debugRecord.optimizerTimedOut = false;
        debugRecord.optimizerError = "";
      }
      updateAgentDebugPanel(debugRecord);
      return;
    }
    if (event.type === "image.analysis") {
      imageAnalysis = event.analysis || event.summary || imageAnalysis;
      if (debugRecord) {
        debugRecord.imageAnalysisPresent = Boolean(imageAnalysis);
        debugRecord.imageAnalysisStarted = true;
        debugRecord.imageAnalysisFinished = true;
        debugRecord.imageAnalysisTimedOut = false;
        debugRecord.imageAnalysisError = "";
      }
      updateAgentDebugPanel(debugRecord);
      return;
    }
    if (event.type === "image.analysis.error") {
      imageAnalysisError = event.error || "Image analysis failed";
      if (debugRecord) {
        debugRecord.imageAnalysisStarted = true;
        debugRecord.imageAnalysisFinished = true;
        debugRecord.imageAnalysisTimedOut = Boolean(event.timedOut);
        debugRecord.imageAnalysisError = imageAnalysisError;
      }
      updateAgentDebugPanel(debugRecord);
      return;
    }
    if (event.type === "assistant.delta") {
      assistantText += event.delta || "";
      if (shouldGenerate || isGenerationIntent(intent)) return;
      if (!assistantMessage) assistantMessage = addChat("assistant", "");
      updateChat(assistantMessage, assistantText);
      return;
    }
    const generationTool = getGenerationToolNameFromEvent(event);
    if (generationTool) {
      shouldGenerate = true;
      if (generationTool === "generate_video") outputType = "video";
      if (debugRecord) {
        debugRecord.shouldGenerate = true;
        debugRecord.generationType = outputType;
      }
      updateAgentDebugPanel(debugRecord);
    }
    if (event.type === "message.done") {
      sawMessageDone = true;
      intent = event.intent || event.message?.content?.intent || intent;
      taskType = event.taskType || event.message?.content?.taskType || taskType;
      promptStrategy = event.promptStrategy || event.message?.content?.promptStrategy || promptStrategy;
      const nextStrategyTags = event.strategyTags || event.message?.content?.strategyTags;
      optimizedPrompt = event.optimizedPrompt || event.message?.content?.optimizedPrompt || optimizedPrompt;
      qwenVlMode = event.qwenVlMode || event.message?.content?.qwenVlMode || qwenVlMode;
      promptOptimizerMode = event.promptOptimizerMode || event.message?.content?.promptOptimizerMode || promptOptimizerMode;
      skippedOptimizer = Boolean(event.skippedOptimizer ?? event.message?.content?.skippedOptimizer ?? skippedOptimizer);
      optimizerError = event.optimizerError || event.message?.content?.optimizerError || optimizerError;
      usedFallbackPrompt = Boolean(event.usedFallbackPrompt ?? event.message?.content?.usedFallbackPrompt ?? usedFallbackPrompt);
      const promptDriftDetected = Boolean(event.promptDriftDetected ?? event.message?.content?.promptDriftDetected ?? false);
      const usedConservativeFallback = Boolean(event.usedConservativeFallback ?? event.message?.content?.usedConservativeFallback ?? false);
      totalBudgetExceeded = Boolean(event.totalBudgetExceeded ?? event.message?.content?.totalBudgetExceeded ?? totalBudgetExceeded);
      imageAnalysis = event.imageAnalysis || event.message?.content?.imageAnalysis || imageAnalysis;
      imageAnalysisError = event.imageAnalysisError || event.message?.content?.imageAnalysisError || imageAnalysisError;
      shouldGenerate = Boolean(event.shouldGenerate ?? (isGenerationIntent(intent) || shouldGenerate));
      if (event.generationType === "video" || intent === "generate_video") outputType = "video";
      if (debugRecord) {
        debugRecord.intent = intent;
        debugRecord.taskType = taskType;
        debugRecord.promptStrategy = promptStrategy;
        debugRecord.strategyTags = Array.isArray(nextStrategyTags) ? nextStrategyTags : debugRecord.strategyTags;
        debugRecord.promptDriftDetected = promptDriftDetected;
        debugRecord.usedConservativeFallback = usedConservativeFallback || usedFallbackPrompt;
        debugRecord.optimizedPrompt = optimizedPrompt || prompt;
        debugRecord.qwenVlMode = qwenVlMode;
        debugRecord.promptOptimizerMode = promptOptimizerMode;
        debugRecord.skippedOptimizer = skippedOptimizer;
        debugRecord.optimizerError = optimizerError;
        debugRecord.optimizerTimedOut = /timed out|time budget/i.test(optimizerError);
        debugRecord.usedFallbackPrompt = usedFallbackPrompt;
        debugRecord.totalBudgetExceeded = totalBudgetExceeded;
        debugRecord.imageAnalysisPresent = Boolean(imageAnalysis);
        debugRecord.imageAnalysisError = imageAnalysisError;
        debugRecord.imageAnalysisTimedOut = /timed out|time budget/i.test(imageAnalysisError);
        debugRecord.shouldGenerate = shouldGenerate;
        debugRecord.messageDoneReceived = true;
        debugRecord.messageDoneHandled = true;
        debugRecord.generationType = outputType;
      }
      console.debug("[message.done] received", {
        runId,
        activeRunId: activeChatAgentRunId,
        intent,
        taskType,
        promptStrategy,
        shouldGenerate,
        generationType: outputType,
        autoExecute: CHAT_AGENT_CONFIG.autoExecute,
        generationStarted: false,
        enterExecuteGeneration: shouldGenerate && CHAT_AGENT_CONFIG.autoExecute && (!runId || activeChatAgentRunId === runId),
        skipReason: !(!runId || activeChatAgentRunId === runId)
          ? "skipped because runId mismatch"
          : (!CHAT_AGENT_CONFIG.autoExecute
            ? "skipped because autoExecute false"
            : (!shouldGenerate ? "skipped because shouldGenerate false" : ""))
      });
      logAgentDebug(debugRecord, "conversation.done", {
        intent,
        taskType,
        promptStrategy,
        shouldGenerate,
        optimizedPrompt: summarizePrompt(optimizedPrompt || prompt),
        qwenVlMode,
        promptOptimizerMode,
        skippedOptimizer,
        optimizerError,
        usedFallbackPrompt,
        totalBudgetExceeded,
        imageAnalysisPresent: Boolean(imageAnalysis),
        imageAnalysisError
      });
      updateAgentDebugPanel(debugRecord);
      return false;
    }
    if (event.type === "error") {
      if (debugRecord) {
        debugRecord.streamError = event.message || "Conversation run failed";
        updateAgentDebugPanel(debugRecord);
      }
      throw new Error(event.message || "Conversation run failed");
    }
  }, { runId, timeoutMs: CONVERSATION_STREAM_TIMEOUT_MS, debugRecord });
    if (debugRecord) {
      debugRecord.streamFinished = true;
      updateAgentDebugPanel(debugRecord);
    }
  } catch (error) {
    if (debugRecord) {
      debugRecord.streamError = error.streamTimeout
        ? "Agent 流程超时，请重试"
        : (error.message || String(error));
      debugRecord.streamTimeout = Boolean(error.streamTimeout);
      updateAgentDebugPanel(debugRecord);
    }
    throw error;
  }

  if (!sawMessageDone) {
    throw new Error("Conversation stream ended before message.done");
  }

  return {
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
  };
}

async function ensureConversation(projectId, { reset = false } = {}) {
  const cleanProjectId = String(projectId || "").trim();
  if (!cleanProjectId) throw new Error("Missing active project");
  if (!reset && conversationIdsByProject.has(cleanProjectId)) {
    return { id: conversationIdsByProject.get(cleanProjectId), projectId: cleanProjectId };
  }
  const response = await fetch("/api/conversations", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: cleanProjectId, reset })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404) conversationIdsByProject.delete(cleanProjectId);
    const error = new Error(payload?.message || `Conversation request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const conversation = payload.conversation;
  if (!conversation?.id) throw new Error("Conversation response did not include an id");
  conversationIdsByProject.set(cleanProjectId, conversation.id);
  return conversation;
}

async function ensureActiveProjectReadyForGeneration({
  saveCurrentProject,
  getActiveProject,
  debugRecord = null
} = {}) {
  const beforeProjectId = getActiveProject?.()?.id || "";
  if (typeof saveCurrentProject !== "function") {
    return { ok: true, projectId: beforeProjectId };
  }
  try {
    logAgentDebug(debugRecord, "project.persistence.start", { projectId: beforeProjectId });
    const saved = await saveCurrentProject({
      pendingText: "正在保存当前项目...",
      successText: "项目已保存，开始生成",
      failureText: "项目保存失败，无法开始生成"
    });
    const projectId = getActiveProject?.()?.id || beforeProjectId;
    if (!saved || !projectId) {
      return {
        ok: false,
        projectId,
        message: "项目保存失败，无法开始生成"
      };
    }
    logAgentDebug(debugRecord, "project.persistence.ready", { projectId });
    return { ok: true, projectId };
  } catch (error) {
    return {
      ok: false,
      projectId: getActiveProject?.()?.id || beforeProjectId,
      message: error?.message || "项目保存失败，无法开始生成"
    };
  }
}

function recordStreamEvent(debugRecord, eventType = "") {
  if (!debugRecord) return;
  const type = eventType || "unknown";
  debugRecord.lastStreamEventType = type;
  if (!Array.isArray(debugRecord.streamEventTypes)) debugRecord.streamEventTypes = [];
  debugRecord.streamEventTypes.push(type);
  if (debugRecord.streamEventTypes.length > 80) debugRecord.streamEventTypes.splice(0, debugRecord.streamEventTypes.length - 80);
  updateAgentDebugPanel(debugRecord);
}

function parseStreamEventLine(text, debugRecord = null) {
  try {
    const event = JSON.parse(text);
    recordStreamEvent(debugRecord, event?.type || "");
    logAgentDebug(debugRecord, "stream.event.parsed", {
      type: event?.type || "",
      textLength: text.length
    });
    return event;
  } catch (error) {
    if (debugRecord) {
      debugRecord.streamParseError = error.message || String(error);
      debugRecord.lastStreamEventType = "parse.error";
      updateAgentDebugPanel(debugRecord);
    }
    console.warn("[chat-agent] stream event parse failed", {
      message: error.message || String(error),
      textLength: text.length
    });
    throw error;
  }
}

async function streamConversationRun(conversationId, payload, onEvent, { timeoutMs = CONVERSATION_STREAM_TIMEOUT_MS, debugRecord = null } = {}) {
  currentConversationAbort?.abort?.();
  const controller = new AbortController();
  currentConversationAbort = controller;
  let timedOut = false;
  const safeTimeoutMs = Number(timeoutMs || 0);
  const timer = safeTimeoutMs > 0
    ? window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, safeTimeoutMs)
    : null;
  try {
    const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/runs`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload?.message || `Conversation run failed: ${response.status}`);
    }
    const reader = response.body?.getReader?.();
    if (!reader) throw new Error("Conversation stream is not readable");
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const text = line.trim();
        if (!text) continue;
        const event = parseStreamEventLine(text, debugRecord);
        const shouldContinue = onEvent(event);
        logAgentDebug(debugRecord, "stream.event.handled", {
          type: event?.type || "",
          shouldContinue
        });
        if (shouldContinue === false) {
          if (debugRecord) {
            debugRecord.streamAbortReason = `handler stopped after ${event?.type || "unknown"}`;
            updateAgentDebugPanel(debugRecord);
          }
          reader.cancel?.().catch?.(() => {});
          return;
        }
      }
    }
    if (buffer.trim()) {
      const event = parseStreamEventLine(buffer.trim(), debugRecord);
      const shouldContinue = onEvent(event);
      logAgentDebug(debugRecord, "stream.event.handled", {
        type: event?.type || "",
        shouldContinue
      });
      if (shouldContinue === false) {
        if (debugRecord) {
          debugRecord.streamAbortReason = `handler stopped after ${event?.type || "unknown"}`;
          updateAgentDebugPanel(debugRecord);
        }
        reader.cancel?.().catch?.(() => {});
        return;
      }
    }
    if (debugRecord) {
      debugRecord.streamAbortReason = "reader completed";
      updateAgentDebugPanel(debugRecord);
    }
  } catch (error) {
    if (timedOut) {
      const timeoutError = new Error("Agent 流程超时，请重试");
      timeoutError.streamTimeout = true;
      if (debugRecord) {
        debugRecord.streamAbortReason = "timeout";
        updateAgentDebugPanel(debugRecord);
      }
      throw timeoutError;
    }
    if (error?.name === "AbortError") {
      if (debugRecord) {
        debugRecord.streamAbortReason = "aborted by new run or stop";
        updateAgentDebugPanel(debugRecord);
      }
      throw new Error("Conversation run was stopped.");
    }
    throw error;
  } finally {
    if (timer) window.clearTimeout(timer);
    if (currentConversationAbort === controller) currentConversationAbort = null;
  }
}

async function restoreProjectConversation({ projectId, conversationId = "", addChat, addChatImage, force = false } = {}) {
  const cleanProjectId = String(projectId || "").trim();
  if (!cleanProjectId || (!force && restoredConversationProjects.has(cleanProjectId))) return;
  const conversation = conversationId
    ? { id: String(conversationId || "").trim(), projectId: cleanProjectId }
    : await ensureConversation(cleanProjectId);
  if (!conversation.id) return;
  const response = await fetch(`/api/conversations/${encodeURIComponent(conversation.id)}/messages`, {
    credentials: "include"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `Conversation restore failed: ${response.status}`);
  restoredConversationProjects.add(cleanProjectId);
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  messages.slice(-40).forEach((message) => {
    const text = message?.content?.text || "";
    if (message.role === "assistant" && Array.isArray(message.attachments)) {
      message.attachments
        .filter((item) => item?.type === "image" && item.url)
        .forEach((item) => addChatImage("assistant", item.url, item.caption || "生成图片"));
    }
    if (text) addChat(message.role === "user" ? "user" : "assistant", text);
  });
}

function getGenerationToolNameFromEvent(event = {}) {
  const names = [
    event.toolCall?.name,
    event.tool?.name,
    event.name,
    ...(Array.isArray(event.toolCalls) ? event.toolCalls.map((item) => item?.name) : []),
    ...(Array.isArray(event.message?.toolCalls) ? event.message.toolCalls.map((item) => item?.name) : [])
  ];
  return names.map((name) => String(name || "").trim()).find(isGenerationTool) || "";
}

function isGenerationTool(name = "") {
  return ["generate_image", "edit_image", "generate_video"].includes(String(name || "").trim());
}

function isGenerationIntent(intent = "") {
  return ["generate_image", "edit_image", "generate_video"].includes(String(intent || "").trim());
}

function bindConversationControls({ getProjectId, addChat, addChatImage } = {}) {
  const newButton = globalThis.document?.querySelector?.("#newConversation");
  const historyButton = globalThis.document?.querySelector?.("#conversationHistory");

  newButton?.addEventListener?.("click", async () => {
    const projectId = getProjectId?.();
    if (!projectId) return;
    closeConversationHistoryPopover();
    currentConversationAbort?.abort?.();
    currentConversationAbort = null;
    try {
      const conversation = await ensureConversation(projectId, { reset: true });
      conversationIdsByProject.set(projectId, conversation.id);
      restoredConversationProjects.delete(projectId);
      const chatLog = globalThis.document?.querySelector?.("#chatLog");
      if (chatLog) chatLog.innerHTML = "";
    } catch (error) {
      console.warn("[conversation] Failed to create a new conversation", error);
    }
  });

  historyButton?.addEventListener?.("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const projectId = getProjectId?.();
    if (!projectId) {
      showConversationHistoryMessage(historyButton, "暂无当前项目");
      return;
    }
    await toggleConversationHistoryPopover({
      button: historyButton,
      projectId,
      addChat,
      addChatImage
    });
  });
}

function showConversationHistoryMessage(button, message) {
  const popover = ensureConversationHistoryPopover();
  popover.hidden = false;
  positionConversationHistoryPopover(button, popover);
  popover.innerHTML = `<strong>历史对话</strong><div class="conversation-history-empty">${escapeHtml(message)}</div>`;
}

async function toggleConversationHistoryPopover({ button, projectId, addChat, addChatImage } = {}) {
  const popover = ensureConversationHistoryPopover();
  if (!popover.hidden) {
    closeConversationHistoryPopover();
    return;
  }
  popover.hidden = false;
  positionConversationHistoryPopover(button, popover);
  popover.innerHTML = '<strong>历史对话</strong><div class="conversation-history-empty">正在加载...</div>';
  try {
    const conversations = await listProjectConversations(projectId);
    renderConversationHistoryPopover(popover, {
      projectId,
      conversations,
      addChat,
      addChatImage
    });
    positionConversationHistoryPopover(button, popover);
  } catch (error) {
    popover.innerHTML = `<strong>历史对话</strong><div class="conversation-history-empty">${escapeHtml(error.message || "加载失败")}</div>`;
  }
}

function ensureConversationHistoryPopover() {
  let popover = globalThis.document?.querySelector?.("#conversationHistoryPopover");
  if (popover) return popover;
  popover = globalThis.document.createElement("div");
  popover.id = "conversationHistoryPopover";
  popover.className = "conversation-history-popover";
  popover.hidden = true;
  globalThis.document.body.append(popover);
  globalThis.document.addEventListener("pointerdown", (event) => {
    if (event.target.closest("#conversationHistoryPopover, #conversationHistory")) return;
    closeConversationHistoryPopover();
  });
  globalThis.window.addEventListener("resize", closeConversationHistoryPopover);
  globalThis.document.addEventListener("canvas:view-transformed", closeConversationHistoryPopover);
  return popover;
}

function closeConversationHistoryPopover() {
  const popover = globalThis.document?.querySelector?.("#conversationHistoryPopover");
  if (popover) popover.hidden = true;
}

function positionConversationHistoryPopover(button, popover) {
  if (!button || !popover) return;
  const rect = button.getBoundingClientRect();
  const viewportWidth = globalThis.innerWidth || 0;
  const viewportHeight = globalThis.innerHeight || 0;
  const gutter = 16;
  const gap = 10;
  const width = Math.min(320, viewportWidth - gutter * 2);
  const left = Math.max(gutter, Math.min(rect.right - width, viewportWidth - gutter - width));
  const top = Math.min(rect.bottom + gap, viewportHeight - gutter - 120);
  popover.style.left = `${left}px`;
  popover.style.top = `${Math.max(gutter, top)}px`;
}

async function listProjectConversations(projectId) {
  const response = await fetch(`/api/conversations?projectId=${encodeURIComponent(projectId)}`, {
    credentials: "include"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `Conversation history failed: ${response.status}`);
  return Array.isArray(payload.conversations) ? payload.conversations : [];
}

function renderConversationHistoryPopover(popover, { projectId, conversations, addChat, addChatImage } = {}) {
  const cleanProjectId = String(projectId || "").trim();
  const currentId = conversationIdsByProject.get(cleanProjectId) || "";
  if (!conversations.length) {
    popover.innerHTML = '<strong>历史对话</strong><div class="conversation-history-empty">暂无历史对话</div>';
    return;
  }
  popover.innerHTML = `<strong>历史对话</strong><div class="conversation-history-list">${
    conversations.map((conversation) => `
      <button class="conversation-history-item${conversation.id === currentId ? " active" : ""}" type="button" data-conversation-id="${escapeHtml(conversation.id)}">
        <span><b>${escapeHtml(conversation.title || "Project chat")}</b><i>${formatConversationTime(conversation.updatedAt)}</i></span>
        <small>${escapeHtml(conversation.summary || (conversation.archived ? "历史会话" : "当前会话"))}</small>
      </button>
    `).join("")
  }</div>`;
  popover.querySelectorAll("[data-conversation-id]").forEach((item) => {
    item.addEventListener("click", async () => {
      const conversationId = item.dataset.conversationId || "";
      if (!conversationId) return;
      await restoreConversationFromHistory({
        projectId: cleanProjectId,
        conversationId,
        addChat,
        addChatImage
      });
      closeConversationHistoryPopover();
    });
  });
}

async function restoreConversationFromHistory({ projectId, conversationId, addChat, addChatImage } = {}) {
  const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/restore`, {
    method: "POST",
    credentials: "include"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `Conversation restore failed: ${response.status}`);
  const conversation = payload.conversation;
  if (!conversation?.id) throw new Error("Conversation restore did not include an id");
  conversationIdsByProject.set(projectId, conversation.id);
  restoredConversationProjects.delete(projectId);
  const chatLog = globalThis.document?.querySelector?.("#chatLog");
  if (chatLog) chatLog.innerHTML = "";
  await restoreProjectConversation({
    projectId,
    conversationId: conversation.id,
    addChat,
    addChatImage,
    force: true
  });
}

function formatConversationTime(value) {
  const timestamp = Number(value || 0);
  if (!timestamp) return "";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function collectCanvasContext(root = globalThis.document) {
  const nodes = Array.from(root?.querySelectorAll?.("#canvasWorld .node-card") || [])
    .filter((node) => !node.classList.contains("stack-member-hidden"))
    .slice(-20)
    .map((node) => snapshotCanvasNode(node));
  const selected = nodes.filter((node) => node.selected);
  return {
    target: selected[0] || nodes[nodes.length - 1] || null,
    selected,
    nodes,
    recentEvents: getRecentCanvasEvents(12)
  };
}

function snapshotCanvasNode(node) {
  const image = node?.querySelector?.("img");
  return {
    id: node?.dataset?.nodeId || "",
    kind: node?.dataset?.kind || "",
    title: node?.dataset?.title || node?.querySelector?.(".node-title")?.textContent?.trim?.() || "",
    assetType: node?.dataset?.assetType || "",
    productName: node?.dataset?.productName || "",
    sourceMode: node?.dataset?.sourceMode || "",
    createdBy: node?.dataset?.createdBy || "",
    generationPrompt: node?.dataset?.generationPrompt || node?.dataset?.editPrompt || "",
    generationModel: node?.dataset?.generationModel || node?.dataset?.editModel || "",
    analysisStatus: node?.dataset?.aiCoreAnalysisStatus || "",
    analysis: parseDatasetJson(node?.dataset?.aiCoreAnalysis),
    selected: node?.classList?.contains("selected") || node?.dataset?.activeSelection === "true",
    hasImage: Boolean(image?.src),
    imageUrl: image?.src?.startsWith?.("data:") ? "" : (image?.src || "")
  };
}

async function collectReferenceImages({
  files = [],
  domPreviewAttachments = [],
  readFileAsDataUrl,
  readImageSourceAsDataUrl,
  debugRecord = null
} = {}) {
  const attachments = [];
  let successCount = 0;
  let failureCount = 0;
  logAgentDebug(debugRecord, "attachments.collect.input", {
    fileCount: files.length,
    domPreviewAttachmentCount: domPreviewAttachments.length,
    files: summarizeFiles(files),
    domPreviewAttachments
  });

  for (const [index, file] of files.entries()) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) throw new Error("empty dataURL");
      successCount += 1;
      attachments.push({
        type: file?.type || "image",
        name: file?.name || `Reference ${index + 1}`,
        source: "upload",
        dataUrl
      });
    } catch (error) {
      failureCount += 1;
      logAgentDebug(debugRecord, "attachments.dataurl_failed", {
        index,
        name: file?.name || "",
        type: file?.type || "",
        size: Number(file?.size || 0),
        error: error.message || String(error)
      });
    }
  }

  if (files.length && !attachments.length) {
    throw new Error("No uploaded reference images could be converted to dataURL.");
  }

  if (!attachments.length && !files.length && domPreviewAttachments.length) {
    const domReferences = await readDomPreviewReferences({
      debugRecord,
      readFileAsDataUrl
    });
    attachments.push(...domReferences);
    if (!attachments.length) {
      const error = new Error("参考图读取失败，请重新上传参考图。");
      error.failureCode = "REFERENCE_ATTACHMENT_UNREADABLE";
      error.stage = "attachments";
      throw error;
    }
  }

  if (!attachments.length && !files.length && !domPreviewAttachments.length) {
    const selectedReference = await readSelectedImageReference(readImageSourceAsDataUrl);
    if (selectedReference) attachments.push(selectedReference);
  }

  if (debugRecord) {
    debugRecord.dataUrlSuccessCount = successCount;
    debugRecord.dataUrlFailureCount = failureCount;
  }
  logAgentDebug(debugRecord, "attachments.dataurl_complete", {
    successCount,
    failureCount,
    finalReferenceCount: attachments.length,
    sources: attachments.map((item) => item.source || "unknown")
  });

  return {
    attachments,
    images: attachments.map((item) => item.dataUrl).filter(Boolean)
  };
}

async function readDomPreviewReferences({
  debugRecord = null,
  readFileAsDataUrl = null,
  root = globalThis.document
} = {}) {
  const items = Array.from(root?.querySelectorAll?.(".chat-image-preview button") || []);
  const references = [];
  for (const [index, button] of items.entries()) {
    const image = button.querySelector("img");
    const attachmentId = button.dataset.attachmentId || "";
    const registeredFile = getChatPreviewAttachmentFile(attachmentId);
    if (registeredFile && typeof readFileAsDataUrl === "function") {
      try {
        const dataUrl = await readFileAsDataUrl(registeredFile);
        if (!dataUrl) throw new Error("empty dataURL");
        references.push({
          type: registeredFile.type || button.dataset.attachmentType || inferMimeTypeFromDataUrl(dataUrl) || "image",
          name: registeredFile.name || button.dataset.attachmentName || image?.alt || `Reference ${index + 1}`,
          source: "upload",
          attachmentId,
          dataUrl
        });
        continue;
      } catch (error) {
        logAgentDebug(debugRecord, "attachments.dom_registry_failed", {
          index,
          attachmentId,
          name: registeredFile.name || button.dataset.attachmentName || image?.alt || "",
          type: registeredFile.type || button.dataset.attachmentType || "",
          size: Number(registeredFile.size || button.dataset.attachmentSize || 0),
          error: error.message || String(error)
        });
      }
    }
    const source = image?.currentSrc || image?.src || "";
    if (!source) continue;
    try {
      const dataUrl = await imageSourceToDataUrl(source);
      if (!dataUrl) throw new Error("empty dataURL");
      references.push({
        type: button.dataset.attachmentType || inferMimeTypeFromDataUrl(dataUrl) || "image",
        name: button.dataset.attachmentName || image?.alt || `Reference ${index + 1}`,
        source: "upload",
        attachmentId,
        dataUrl
      });
    } catch (error) {
      logAgentDebug(debugRecord, "attachments.dom_preview_failed", {
        index,
        attachmentId,
        name: button.dataset.attachmentName || image?.alt || "",
        src: summarizeDataUrl(source),
        error: error.message || String(error)
      });
    }
  }
  logAgentDebug(debugRecord, "attachments.dom_preview_complete", {
    domPreviewCount: items.length,
    recoveredReferenceCount: references.length,
    sources: references.map((item) => item.source)
  });
  return references;
}

function parseDatasetJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function createPromptPreviewBatch({
  addGenerationPreview,
  placement,
  generationMetrics,
  files = [],
  count = 1,
  outputType = "image"
} = {}) {
  const safeCount = Math.max(1, Math.ceil(Number(count || 1)));
  const gap = 28;
  return Array.from({ length: safeCount }, (_, index) => {
    const desc = safeCount > 1
      ? `Waiting for result ${index + 1}/${safeCount}...`
      : (outputType === "3d"
        ? "Waiting for 3D model result..."
        : outputType === "video"
        ? "Waiting for video result..."
        : generationMetrics.sourceNode
        ? "Generating from the selected image"
        : (files.length ? "Generating from reference images" : "Generating from prompt"));
    return addGenerationPreview({
      title: outputType === "3d"
        ? "Tripo 3D Model"
        : outputType === "video"
        ? "Generated Video.mp4"
        : (safeCount > 1 ? `Generated Image ${index + 1}.png` : "Generated Image.png"),
      desc,
      x: placement.x + index * ((generationMetrics.width || 320) + gap),
      y: placement.y,
      width: generationMetrics.width,
      aspectRatio: generationMetrics.aspectRatio
    });
  }).filter(Boolean);
}

function updatePromptPreviewStatus(previewNode, text = "") {
  const statusText = previewNode?.querySelector?.(".generation-frame span");
  if (statusText && text) statusText.textContent = text;
}

async function waitForAIJob(jobId, { attempts = 180, delayMs = 2000, onProgress = null } = {}) {
  let lastPayload = { jobId };
  for (let index = 0; index < attempts; index += 1) {
    await delay(delayMs);
    const response = await fetch(`/api/ai/jobs/${encodeURIComponent(jobId)}`, {
      credentials: "include"
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 429) {
      const retryDelay = getRetryAfterDelayMs(response, delayMs * 2);
      onProgress?.({
        ...lastPayload,
        status: "running",
        rateLimited: true,
        message: payload?.message || "Waiting for job status"
      });
      await delay(retryDelay);
      continue;
    }
    if (!response.ok) {
      const error = new Error(payload?.failureMessage || payload?.errorMessage || payload?.message || `Job request failed: ${response.status}`);
      error.status = response.status;
      error.failureCode = payload?.failureCode || payload?.errorCode || "";
      error.failureMessage = payload?.failureMessage || payload?.errorMessage || payload?.message || "";
      error.stage = payload?.stage || "jobPoll";
      throw error;
    }
    lastPayload = payload;
    if (["succeeded", "failed", "cancelled", "timeout", "save_failed"].includes(payload?.status)) {
      if (payload.status !== "succeeded") {
        const error = new Error(payload.failureMessage || payload.errorMessage || payload.error || payload.status);
        error.failureCode = payload.failureCode || payload.errorCode || payload.status?.toUpperCase?.() || "AI_JOB_FAILED";
        error.failureMessage = payload.failureMessage || payload.errorMessage || payload.error || payload.status;
        error.stage = payload.status === "save_failed" ? "outputPersist" : "jobPoll";
        throw error;
      }
      return payload;
    }
    onProgress?.(payload);
  }
  throw new Error(`Generation is still running. Job ID: ${lastPayload.jobId || jobId}`);
}

async function waitForTripo3DTask(taskId, { attempts = 180, delayMs = 2000, onProgress = null } = {}) {
  const id = String(taskId || "").trim();
  if (!id) throw new Error("Missing 3D task id");
  let lastPayload = { taskId: id };
  for (let index = 0; index < attempts; index += 1) {
    await delay(delayMs);
    const response = await fetch(`/api/ai/3d/tasks/${encodeURIComponent(id)}`, {
      credentials: "include"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.errorMessage || payload?.message || `3D task request failed: ${response.status}`);
      error.status = response.status;
      error.failureCode = payload?.failureCode || payload?.errorCode || "";
      error.failureMessage = payload?.errorMessage || payload?.message || "";
      error.stage = "jobPoll";
      throw error;
    }
    lastPayload = {
      ...payload,
      taskId: payload.taskId || id
    };
    onProgress?.(lastPayload);
    const status = String(payload.status || "").toLowerCase();
    if (status === "success") return lastPayload;
    if (["failed", "cancelled", "canceled", "banned"].includes(status)) {
      const error = new Error(payload.errorMessage || `3D task ${status}`);
      error.failureCode = payload.failureCode || payload.errorCode || status.toUpperCase();
      error.failureMessage = payload.errorMessage || `3D task ${status}`;
      error.stage = "jobPoll";
      throw error;
    }
  }
  throw new Error("3D 模型生成超时，请稍后在任务日志中查看结果。");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function bindPromptShortcuts({
  queryAll,
  promptInput,
  labelSelector = "[data-prompt]"
}) {
  queryAll(labelSelector).forEach((button) => {
    button.addEventListener("click", () => {
      console.debug("[chat-submit] trigger source", {
        source: "quick-action",
        action: "fill-prompt-only",
        prompt: summarizePrompt(button.dataset.prompt || "")
      });
      promptInput.value = button.dataset.prompt;
      promptInput.focus();
    });
  });
}
