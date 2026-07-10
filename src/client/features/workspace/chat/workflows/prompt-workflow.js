import {
  formatModelUsage,
  getModelType,
  resolveImageModelId
} from "../../../ai/model-catalog.js?v=20260627-library-bulk-select-1";
import {
  buildGeneratedModelNodeOptions,
  buildGeneratedModelProjectPatch,
  buildGeneratedImageChatCaption,
  buildGeneratedMediaProjectPatch,
  createPromptGeneratedImageNodes,
  createPromptGeneratedVideoNode,
  resolvePromptGeneratedMediaResult,
  resolvePromptPreviewCount
} from "./prompt-result-utils.js";
import {
  buildVisibleGenerationFailureMessage,
  classifyGenerationClientError
} from "./prompt-error-utils.js";
import {
  logSubmittedModel,
  resolveGenerationResultModel,
  warnIfModelMismatch
} from "./prompt-model-log-utils.js";
import {
  applyAgentProgressStreamEvent,
  buildAgentProgressResultOptions,
  buildAgentProgressBlocks,
  buildAgentResultBlocks,
  applyAgentProgressFailureState,
  applyAgentProgressResultState,
  createAgentProgressState
} from "./prompt-agent-block-utils.js";
import {
  summarizeFiles,
  summarizeGeneratePayload,
  summarizeGenerationResult,
  summarizePrompt,
  summarizeReferenceImages
} from "./prompt-debug-summary-utils.js";
import {
  applyConversationResultToAgentDebug,
  applyAgentFailureState,
  buildAgentOutputStageData,
  buildMessageDoneGenerationDecisionPayload,
  createAgentDebugRecord,
  markAgentGeneratePayloadBuilt,
  markAgentGenerateRequestStarted,
  markAgentGuardPass,
  markAgentGuardSkip,
  markAgentPreviewCreationFailed,
  storeAgentGenerateResult,
  syncAgentChatBlocksAvailability,
  setAgentGenerationStage as applyAgentGenerationStage
} from "./prompt-agent-debug-utils.js";
import {
  clearComposerAttachments,
  copyReferenceFiles,
  buildPromptSubmitBeforeDebugPayload,
  buildPromptSubmitConsoleDebugPayload,
  getChatPreviewDomSummaries,
  inferSubmitTriggerSource,
  resolvePromptSubmitAttachmentState,
  restoreComposerAttachmentsForPromptFailure
} from "./prompt-input-utils.js";
import {
  getGenerationPlacement,
  resolveGenerationMetrics
} from "./prompt-generation-metrics-utils.js";
import {
  buildPrompt3DGenerationRequest,
  buildPromptGenerationPayload,
  isPrompt3DGeneration,
  isPromptVideoGeneration,
  isPromptGenerationPayloadMissing,
  resolvePromptAgentGenerationType,
  resolvePromptGenerationType,
  resolvePromptModelSelection
} from "./prompt-generation-payload-utils.js";
import {
  collectReferenceImages,
  getSelectedImageReferenceCount
} from "./prompt-reference-image-utils.js";
import {
  collectCanvasContext
} from "./prompt-canvas-context-utils.js";
import {
  buildPromptPreviewWaitingStatus,
  createPromptPreviewBatch,
  markPromptPreviewsFailed,
  resolvePromptViewportCenterTarget,
  updatePromptPreviewStatus
} from "./prompt-preview-utils.js";
import {
  buildAIJobProgressMessage,
  isAIJobRunningStatus,
  shouldUseImmediateAIResult,
  waitForAIJob,
  waitForTripo3DTask
} from "./prompt-job-utils.js";
import {
  bindConversationControls,
  restoreProjectConversation
} from "./prompt-conversation-history-workflow.js";
import {
  ensureProjectConversation
} from "./prompt-conversation-api-utils.js";
import {
  commitGeneratedProjectPatch,
  ensureActiveProjectReadyForGeneration
} from "./prompt-project-persistence-utils.js";
import {
  createConversationStreamRunner
} from "./prompt-conversation-stream-workflow.js";
import { runConversationAgent } from "./prompt-conversation-agent-workflow.js";
import { bindImageTo3DRequests } from "./prompt-image-to-3d-workflow.js";
import {
  logAgentDebug,
  updateAgentDebugPanel
} from "./prompt-agent-debug-panel.js";
import {
  CHAT_AGENT_CONFIG,
  CHAT_AGENT_WORKFLOW_VERSION,
  CONVERSATION_STREAM_TIMEOUT_MS,
  CONVERSATION_THINKING_STEPS,
  MIDJOURNEY_IMAGE_COUNT
} from "./prompt-workflow-constants.js";

const conversationIdsByProject = new Map();
let restoredConversationProjects = new Set();
let activeChatAgentRunId = "";
let lastConversationPrompt = "";
const conversationStreamRunner = createConversationStreamRunner({
  timeoutMs: CONVERSATION_STREAM_TIMEOUT_MS,
  logAgentDebug,
  updateAgentDebugPanel
});

if (globalThis.window) {
  globalThis.__chatAgentWorkflowVersion = CHAT_AGENT_WORKFLOW_VERSION;
  console.debug("[chat-agent] workflow.version", CHAT_AGENT_WORKFLOW_VERSION);
}

function setAgentGenerationStage(record, stage, data = {}) {
  applyAgentGenerationStage(record, stage, data, {
    logAgentDebug,
    updateAgentDebugPanel
  });
}

function logMessageDoneGenerationDecision(record, data = {}) {
  console.debug("[message.done] generation decision", buildMessageDoneGenerationDecisionPayload(record, data, {
    activeRunId: activeChatAgentRunId || "",
    autoExecute: CHAT_AGENT_CONFIG.autoExecute
  }));
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
      addChatImage,
      ensureConversation,
      restoredConversationProjects
    }).catch((error) => {
      console.warn("[conversation] Failed to restore messages", error);
    });
  }, 600);
  bindConversationControls({
    getProjectId: () => getActiveProject?.()?.id,
    addChat,
    addChatImage,
    ensureConversation,
    conversationIdsByProject,
    restoredConversationProjects,
    abortCurrentConversation: conversationStreamRunner.abortCurrentConversation
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

  const commitGeneratedProjectPatchForRun = (patch) => commitGeneratedProjectPatch({
    patch,
    updateActiveProject,
    saveCurrentProjectAfterGeneration,
    onProjectTitleRefresh
  });

  function centerPendingHomeGenerationNode(node) {
    if (!getPendingHomeGenerationFocus()) return false;
    setPendingHomeGenerationFocus(false);
    centerViewOnNode(node, 1);
    return true;
  }

  resolvedPromptForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = resolvedPromptInput.value.trim();
    const triggerSource = inferSubmitTriggerSource(event, resolvedPromptForm);
    const domPreviewAttachments = getChatPreviewDomSummaries();
    const {
      pendingHomeFiles,
      pendingHomeModel,
      currentFiles,
      referenceFiles,
      selectedSource
    } = resolvePromptSubmitAttachmentState({
      form: resolvedPromptForm,
      chatImageFiles: chatImageFilesRef(),
      domPreviewAttachments
    });
    const selectedCanvasReferenceCount = getSelectedImageReferenceCount();
    const submittedReferenceCount = (referenceFiles.length || domPreviewAttachments.length) + selectedCanvasReferenceCount;
    console.debug("[chat-submit] trigger source", buildPromptSubmitConsoleDebugPayload({
      triggerSource,
      currentFiles,
      pendingHomeFiles,
      domPreviewAttachments
    }));
    const agentDebug = createAgentDebugRecord({
      originalPrompt: prompt,
      modelId: pendingHomeModel || resolvedChatModelSelect.dataset.selectedModelId || resolvedChatModelSelect.value,
      composerAttachmentCount: currentFiles.length,
      pendingHomeAttachmentCount: pendingHomeFiles.length,
      addChatBlocksAvailable: typeof addChatBlocks === "function"
    }, {
      autoExecute: CHAT_AGENT_CONFIG.autoExecute
    });
    activeChatAgentRunId = agentDebug.runId;
    logAgentDebug(agentDebug, "submit.before", buildPromptSubmitBeforeDebugPayload({
      triggerSource,
      currentFiles,
      pendingHomeFiles,
      domPreviewAttachments,
      selectedSource,
    }));

    if (!prompt && !submittedReferenceCount) {
      resolvedPromptForm.__pendingHomeGenerationModel = "";
      updateAgentDebugPanel(agentDebug);
      return;
    }
    if (prompt) lastConversationPrompt = prompt;

    const selectedChatModel = resolvedChatModelSelect.dataset.selectedModelId || resolvedChatModelSelect.value;
    const modelSelection = resolvePromptModelSelection({
      pendingHomeModel,
      selectedModel: selectedChatModel,
      resolveModelId: resolveImageModelId
    });
    const model = modelSelection.model;
    agentDebug.modelId = model;
    if (resolvedChatModelSelect.value !== model) {
      resolvedChatModelSelect.value = model;
      resolvedChatModelSelect.dataset.modelUserSelected = "true";
      resolvedChatModelSelect.dataset.selectedModelId = model;
      resolvedChatModelSelect.__compactSelectSync?.();
    }
    if (modelSelection.normalized) {
      console.warn("[models] Submitted model was normalized", {
        selected: modelSelection.requestedModel,
        submitted: model
      });
    }

    recordCanvasEvent("prompt_submitted", {
      source: "chat-panel",
      hasPrompt: Boolean(prompt),
      imageCount: submittedReferenceCount,
      model
    });

    setChatCollapsed(false);
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
    const agentBlocksState = createAgentProgressState({
      prompt,
      model,
      generationType: resolvePromptAgentGenerationType(getModelType(model))
    });
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
    const applyGeneratedAgentProgressResult = ({
      imageUrls = [],
      videoUrls = [],
      generationType = "image",
      resultStatus = "succeeded",
      resultModel = "",
      modelUsage = "",
      conversationResult = {},
      agentDebug = {},
      generationPrompt = "",
      generationMetrics = {},
      finalResult = {},
      hasReference = false
    } = {}) => {
      applyAgentProgressResultState(agentBlocksState, buildAgentProgressResultOptions({
        imageUrls,
        videoUrls,
        model: resultModel,
        modelUsage,
        generationType,
        conversationResult,
        agentDebug,
        generationPrompt,
        generationMetrics,
        finalResult,
        resultStatus,
        hasReference
      }));
      refreshAgentBlocks();
    };
    const createGeneratedVideoNode = ({ url = "", generationPrompt = "", resultModel = "" } = {}) => {
      return createPromptGeneratedVideoNode({
        replacePreviewWithVideo,
        previewNode,
        url,
        generationMetrics,
        generationPrompt,
        model: resultModel
      });
    };
    const createGeneratedImageNodes = ({
      imageUrls = [],
      generationPrompt = "",
      resultModel = ""
    } = {}) => createPromptGeneratedImageNodes({
      replacePreviewWithImage,
      previewNodes,
      imageUrls,
      generationMetrics,
      generationPrompt,
      detectGenerationKind,
      model: resultModel
    });
    const handleAgentStreamEvent = (event = {}) => {
      if (activeChatAgentRunId !== agentDebug.runId) return;
      if (applyAgentProgressStreamEvent(agentBlocksState, event, { prompt })) {
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
        const videoModel = isPromptVideoGeneration({ modelType: getModelType(model), outputType });
        const target = resolvePromptViewportCenterTarget({
          canvasViewport: resolvedCanvasViewport,
          viewportPointToWorld
        });
        const placement = getGenerationPlacement(generationMetrics, target);
        previewCount = resolvePromptPreviewCount({ model, videoModel, midjourneyCount: MIDJOURNEY_IMAGE_COUNT });
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
        debugRecord: agentDebug,
        logDebug: (label, data) => logAgentDebug(agentDebug, label, data)
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
        debugRecord: agentDebug,
        logAgentDebug
      });
      if (!projectReady.ok) {
        agentDebug.error = projectReady.message;
        logAgentDebug(agentDebug, "project.persistence.failed", {
          message: projectReady.message
        });
        updateAgentDebugPanel(agentDebug);
        throw new Error(projectReady.message);
      }
      if (isPrompt3DGeneration({ modelType: getModelType(model) })) {
        if (typeof addGenerationPreview !== "function" || typeof replacePreviewWithModel !== "function") {
          throw new Error("3D canvas generation workflow is unavailable.");
        }
        const tripoReference = imageAttachments[0] || null;
        const tripoRequest = buildPrompt3DGenerationRequest({
          prompt,
          model,
          reference: tripoReference
        });
        const { isImageTo3D, taskType } = tripoRequest;
        if (tripoRequest.requiresReference) {
          throw new Error("Tripo P1 only supports image-to-3D. Please upload a reference image first.");
        }
        generationStarted = true;
        agentDebug.generationStarted = true;
        agentDebug.generationType = "3d";
        agentDebug.intent = "generate_3d";
        agentDebug.taskType = taskType;
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
        const target = resolvePromptViewportCenterTarget({
          canvasViewport: resolvedCanvasViewport,
          viewportPointToWorld
        });
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
          taskType,
          imageCount: isImageTo3D ? 1 : 0,
          texture: true
        };
        if (isImageTo3D) {
          agentDebug.generatePayload.image = summarizeReferenceImages([tripoReference])[0] || null;
        }
        agentDebug.generatePayloadBuilt = true;
        agentDebug.generateRequestStarted = true;
        updateAgentDebugPanel(agentDebug);
        const createResult = await postJsonRequest(tripoRequest.endpoint, tripoRequest.payload);
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
        const modelNode = replacePreviewWithModel(previewNode, buildGeneratedModelNodeOptions({
          url: modelUrl,
          previewWidth: previewNode?.offsetWidth,
          generationPrompt: prompt,
          actionType: taskType,
          model
        }));
        centerPendingHomeGenerationNode(modelNode);
        await commitGeneratedProjectPatchForRun(buildGeneratedModelProjectPatch({
          project: getActiveProject(),
          titlePrompt: prompt,
          storedPrompt: prompt,
          thumbnail: finalResult.renderedImageUrl || modelUrl,
          itemCountIncrement: 1,
          makeProjectTitle
        }));
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
      }, {
        ensureConversation,
        conversationStreamRunner,
        getActiveRunId: () => activeChatAgentRunId,
        logAgentDebug,
        updateAgentDebugPanel
      });
      applyConversationResultToAgentDebug(agentDebug, conversationResult, {
        prompt,
        mode: "merge"
      });
      logMessageDoneGenerationDecision(agentDebug, {
        stage: "conversation-result-returned",
        messageDoneReceived: agentDebug.messageDoneReceived,
        conversationShouldGenerate: Boolean(conversationResult.shouldGenerate)
      });
      if (activeChatAgentRunId !== agentDebug.runId) {
        logMessageDoneGenerationDecision(agentDebug, markAgentGuardSkip(agentDebug, "skipped because runId mismatch"));
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
        logMessageDoneGenerationDecision(agentDebug, markAgentGuardSkip(agentDebug, "skipped because shouldGenerate false"));
        logAgentDebug(agentDebug, "generation.skip", {
          intent: agentDebug.intent,
          reason: agentDebug.messageDoneSkipReason
        });
        updateAgentDebugPanel(agentDebug);
        updateThinking(thinking, CONVERSATION_THINKING_STEPS.length, true);
        return;
      }

      applyConversationResultToAgentDebug(agentDebug, conversationResult, {
        prompt,
        mode: "execute",
        autoExecute: CHAT_AGENT_CONFIG.autoExecute
      });
      if (!CHAT_AGENT_CONFIG.autoExecute) {
        logMessageDoneGenerationDecision(agentDebug, markAgentGuardSkip(agentDebug, "skipped because autoExecute false"));
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
        logMessageDoneGenerationDecision(agentDebug, markAgentGuardSkip(agentDebug, "skipped because generationStarted already true"));
        logAgentDebug(agentDebug, "generation.duplicate_ignored", {
          runId: agentDebug.runId,
          reason: agentDebug.messageDoneSkipReason
        });
        updateAgentDebugPanel(agentDebug);
        return;
      }
      if (typeof addGenerationPreview !== "function") {
        logMessageDoneGenerationDecision(agentDebug, markAgentGuardSkip(agentDebug, "skipped because missing preview creation fn"));
        throw new Error("missing createPreview function");
      }
      if (typeof replacePreviewWithImage !== "function") {
        logMessageDoneGenerationDecision(agentDebug, markAgentGuardSkip(agentDebug, "skipped because missing replacePreviewWithImage"));
        throw new Error("missing replacePreviewWithImage");
      }
      generationStarted = true;
      const guardPassPayload = markAgentGuardPass(agentDebug);
      updateAgentDebugPanel(agentDebug);
      logMessageDoneGenerationDecision(agentDebug, guardPassPayload);
      logAgentDebug(agentDebug, "generation.execute", {
        intent: agentDebug.intent,
        optimizedPrompt: summarizePrompt(agentDebug.optimizedPrompt)
      });

      progress = conversationResult.message || (typeof addChatBlocks === "function" ? null : addChat("assistant", "Generating result..."));
      progress?.classList?.add("loading");
      const generationPrompt = conversationResult.optimizedPrompt || prompt;
      const videoModel = isPromptVideoGeneration({
        modelType: getModelType(model),
        outputType: conversationResult.outputType
      });
      const generationType = resolvePromptGenerationType(videoModel);
      if (videoModel && typeof replacePreviewWithVideo !== "function") {
        logMessageDoneGenerationDecision(agentDebug, markAgentGuardSkip(agentDebug, "skipped because missing replacePreviewWithVideo"));
        throw new Error("missing replacePreviewWithVideo");
      }
      agentDebug.generationType = generationType;
      agentBlocksState.generationType = agentDebug.generationType;
      agentBlocksState.optimizedPrompt = generationPrompt;
      agentBlocksState.resultStatus = "pending";
      agentBlocksState.size = generationMetrics.outputSize || "";
      refreshAgentBlocks();
      updateChat(progress, `${conversationResult.text || "Generating result..."}\nCalling ${generationType} generation model...`);

      previewCount = resolvePromptPreviewCount({ model, videoModel, midjourneyCount: MIDJOURNEY_IMAGE_COUNT });
      agentDebug.previewCreationAttempted = true;
      updateAgentDebugPanel(agentDebug);
      if (!previewNodes.length) {
        const target = resolvePromptViewportCenterTarget({
          canvasViewport: resolvedCanvasViewport,
          viewportPointToWorld
        });
        const placement = getGenerationPlacement(generationMetrics, target);
        previewNodes = createPromptPreviewBatch({
          addGenerationPreview,
          placement,
          generationMetrics,
          files,
          count: previewCount,
          outputType: generationType
        });
      }
      if (!previewNodes.length) {
        logMessageDoneGenerationDecision(agentDebug, markAgentPreviewCreationFailed(agentDebug, "Unable to create pending generation preview."));
        throw new Error(agentDebug.previewCreationError);
      }
      previewNode = previewNodes[0];
      agentDebug.pendingPreviewCreated = true;
      logAgentDebug(agentDebug, "preview.created", {
        count: previewNodes.length,
        generationType
      });
      clearComposerAttachments({
        setChatImageFiles,
        renderChatImagePreview
      });

      logSubmittedModel("chat", model);
      const generationPayload = buildPromptGenerationPayload({
        buildChatImagePayload,
        model,
        prompt: generationPrompt,
        images,
        size: generationMetrics.outputSize
      });
      if (isPromptGenerationPayloadMissing(generationPayload)) {
        logMessageDoneGenerationDecision(agentDebug, markAgentGuardSkip(agentDebug, "skipped because missing payload"));
        throw new Error("missing payload");
      }
      logMessageDoneGenerationDecision(agentDebug, markAgentGeneratePayloadBuilt(
        agentDebug,
        summarizeGeneratePayload(generationPayload, generationType)
      ));
      logAgentDebug(agentDebug, "generate.request", agentDebug.generatePayload);
      updateAgentDebugPanel(agentDebug);
      setAgentGenerationStage(agentDebug, "generateRequest", {
        model,
        generationType
      });
      logMessageDoneGenerationDecision(agentDebug, markAgentGenerateRequestStarted(agentDebug));
      updateAgentDebugPanel(agentDebug);
      const result = await postJsonRequest("/api/ai/generate", generationPayload);
      storeAgentGenerateResult(agentDebug, summarizeGenerationResult(result));
      logAgentDebug(agentDebug, "generate.response.initial", agentDebug.generateResult);
      const finalResult = shouldUseImmediateAIResult(result)
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
            updateChat(progress, buildAIJobProgressMessage({
              generationType,
              progress: payload?.progress,
              modelUsage: formatModelUsage(result, model)
            }));
            previewNodes.forEach((node, index) => updatePromptPreviewStatus(node, buildPromptPreviewWaitingStatus({
              index,
              count: previewCount,
              outputType: generationType
            })));
            if (isAIJobRunningStatus(status)) {
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
      storeAgentGenerateResult(agentDebug, summarizeGenerationResult(finalResult));
      logAgentDebug(agentDebug, "generate.response.final", agentDebug.generateResult);
      const mediaResult = resolvePromptGeneratedMediaResult({ result: finalResult, videoModel });
      setAgentGenerationStage(agentDebug, "outputPersist", buildAgentOutputStageData({
        jobId: finalResult.jobId || finalResult.job?.id || "",
        outputCount: mediaResult.outputCount
      }));
      updateAgentDebugPanel(agentDebug);
      const resultModel = resolveGenerationResultModel(finalResult, model);
      warnIfModelMismatch(model, resultModel, finalResult);
      const modelUsage = formatModelUsage(finalResult, resultModel);
      syncAgentChatBlocksAvailability(agentDebug, addChatBlocks);
      updateChat(progress, "正在整理生成结果...");
      updateAgentDebugPanel(agentDebug);

      if (!mediaResult.missing && mediaResult.generationType === "video") {
        const videoUrls = mediaResult.videoUrls;
        const videoNode = createGeneratedVideoNode({
          url: videoUrls[0],
          generationPrompt,
          resultModel
        });
        centerPendingHomeGenerationNode(videoNode);
        await commitGeneratedProjectPatchForRun(buildGeneratedMediaProjectPatch({
          project: getActiveProject(),
          prompt,
          generationPrompt,
          urls: videoUrls,
          makeProjectTitle
        }));
        videoUrls.length = 0;
        if (typeof addChatBlocks === "function") {
          progress?.remove?.();
          progress = null;
          applyGeneratedAgentProgressResult({
            videoUrls: [],
            imageUrls: [],
            resultModel,
            modelUsage,
            generationType: "video",
            conversationResult,
            agentDebug,
            generationPrompt,
            generationMetrics,
            finalResult,
            resultStatus: "idle",
            hasReference: imageAttachments.length > 0
          });
        } else {
          progress?.remove?.();
          progress = null;
          addChat("assistant", `生成视频 · ${modelUsage}\n${videoUrls[0]}`);
        }
        window.dispatchEvent(new CustomEvent("ai-studio-credits-refresh"));
      } else if (!mediaResult.missing && mediaResult.generationType === "image") {
        const imageUrls = mediaResult.imageUrls;
        const imageNodes = createGeneratedImageNodes({
          imageUrls,
          generationPrompt,
          resultModel
        });
        const imageNode = imageNodes[0] || null;
        centerPendingHomeGenerationNode(imageNode);
        await commitGeneratedProjectPatchForRun(buildGeneratedMediaProjectPatch({
          project: getActiveProject(),
          prompt,
          generationPrompt,
          urls: imageUrls,
          makeProjectTitle
        }));
        if (typeof addChatBlocks === "function") {
          progress?.remove?.();
          progress = null;
          applyGeneratedAgentProgressResult({
            imageUrls,
            videoUrls: [],
            resultModel,
            modelUsage,
            generationType: "image",
            conversationResult,
            agentDebug,
            generationPrompt,
            generationMetrics,
            finalResult,
            resultStatus: "succeeded",
            hasReference: imageAttachments.length > 0
          });
        } else {
          progress?.remove?.();
          progress = null;
          imageUrls.forEach((imageUrl, index) => {
            addChatImage("assistant", imageUrl, buildGeneratedImageChatCaption({
              index,
              total: imageUrls.length,
              modelUsage
            }));
          });
        }
        window.dispatchEvent(new CustomEvent("ai-studio-credits-refresh"));
      } else {
        throw new Error(mediaResult.errorMessage);
      }

      updateThinking(thinking, 5, true);
      setAgentGenerationStage(agentDebug, "done", buildAgentOutputStageData({
        jobId: finalResult.jobId || finalResult.job?.id || "",
        outputCount: mediaResult.outputCount
      }));
    } catch (error) {
      if (activeChatAgentRunId !== agentDebug.runId) {
        logAgentDebug(agentDebug, "run.stale_error_ignored", {
          activeRunId: activeChatAgentRunId,
          message: error.message || String(error)
        });
        return;
      }
      const failure = classifyGenerationClientError(error, agentDebug);
      const failureState = applyAgentFailureState(agentDebug, failure);
      setAgentGenerationStage(agentDebug, failureState.stage, failureState.data);
      logAgentDebug(agentDebug, "error", {
        message: agentDebug.error,
        pendingPreviewCreated: previewNodes.length > 0
      });
      updateAgentDebugPanel(agentDebug);
      if (getPendingHomeGenerationFocus()) {
        setPendingHomeGenerationFocus(false);
      }
      restoreComposerAttachmentsForPromptFailure({
        files,
        previewNodes,
        setChatImageFiles,
        renderChatImagePreview,
        logAgentDebug,
        agentDebug
      });
      markPromptPreviewsFailed(previewNodes);
      if (typeof addChatBlocks === "function" && agentBlocksMessage) {
        applyAgentProgressFailureState(agentBlocksState);
        refreshAgentBlocks();
      }
      updateThinking(thinking, 0, true);
      const visibleFailureMessage = buildVisibleGenerationFailureMessage(failure, agentDebug);
      if (progress) {
        updateChat(progress, visibleFailureMessage);
      } else {
        addChat("assistant", visibleFailureMessage);
      }
    }
  });
}


async function ensureConversation(projectId, { reset = false } = {}) {
  return ensureProjectConversation(projectId, { conversationIdsByProject, reset });
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
