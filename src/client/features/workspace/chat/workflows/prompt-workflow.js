import {
  getImageNodePreviewMetrics,
  getPreviewHeight,
  readImageFilePreviewMetrics
} from "../../../canvas/upload-nodes.js";
import { getRecentCanvasEvents } from "../../../canvas/canvas-events.js";
import {
  getQwenImageSizeForDimensions,
  getQwenImageSizeForElement
} from "../../../ai/image-generator.js";
import {
  formatModelUsage,
  getModelType,
  resolveImageModelId
} from "../../../ai/model-catalog.js?v=20260627-library-bulk-select-1";

const MIDJOURNEY_IMAGE_COUNT = 4;
const CONVERSATION_THINKING_STEPS = [
  { key: "context", label: "Read context" },
  { key: "references", label: "Analyze references" },
  { key: "intent", label: "Route intent" },
  { key: "tool", label: "Run tool" },
  { key: "final", label: "Prepare result" }
];
const conversationIdsByProject = new Map();
let restoredConversationProjects = new Set();
let currentConversationAbort = null;
let lastConversationPrompt = "";

function findActiveImageNode(root = globalThis.document) {
  return root?.querySelector?.("#canvasWorld .node-image.selected[data-active-selection='true']")
    || root?.querySelector?.("#canvasWorld .node-image.selected")
    || null;
}

async function resolveGenerationMetrics(files = []) {
  const sourceNode = findActiveImageNode();
  if (sourceNode) {
    const metrics = getImageNodePreviewMetrics(sourceNode);
    return {
      ...metrics,
      sourceNode,
      outputSize: metrics.naturalWidth && metrics.naturalHeight
        ? getQwenImageSizeForDimensions(metrics.naturalWidth, metrics.naturalHeight)
        : (metrics.image ? getQwenImageSizeForElement(metrics.image) : "")
    };
  }

  const fileMetrics = await readImageFilePreviewMetrics(files[0]);
  if (fileMetrics) {
    return {
      ...fileMetrics,
      sourceNode: null,
      outputSize: getQwenImageSizeForDimensions(fileMetrics.naturalWidth, fileMetrics.naturalHeight)
    };
  }

  return {
    width: 320,
    height: 320,
    aspectRatio: "",
    sourceNode: null,
    outputSize: ""
  };
}

function getGenerationPlacement(metrics, target) {
  const width = metrics.width || 320;
  const height = metrics.height || getPreviewHeight(width, metrics.aspectRatio, width);
  if (metrics.sourceNode) {
    const sourceX = Number.parseFloat(metrics.sourceNode.style.left || "0");
    const sourceY = Number.parseFloat(metrics.sourceNode.style.top || "0");
    return {
      x: sourceX + (metrics.sourceNode.offsetWidth || width) + 48,
      y: sourceY
    };
  }
  return {
    x: target.x - width / 2,
    y: target.y - height / 2
  };
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
  addGenerationPreview,
  replacePreviewWithImage,
  updateActiveProject,
  saveCurrentProject = null,
  saveCurrentProjectAfterGeneration = saveCurrentProject,
  getActiveProject,
  makeProjectTitle,
  postJsonRequest,
  buildChatImagePayload,
  readFileAsDataUrl,
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

  resolvedPromptForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = resolvedPromptInput.value.trim();
    const pendingHomeFiles = Array.isArray(resolvedPromptForm.__pendingHomeGenerationFiles)
      ? resolvedPromptForm.__pendingHomeGenerationFiles
      : [];
    const pendingHomeModel = String(resolvedPromptForm.__pendingHomeGenerationModel || "").trim();
    const currentFiles = chatImageFilesRef();
    const referenceFiles = currentFiles.length ? currentFiles : pendingHomeFiles;

    if (!prompt && !referenceFiles.length) {
      resolvedPromptForm.__pendingHomeGenerationModel = "";
      return;
    }
    if (prompt) lastConversationPrompt = prompt;

    const selectedChatModel = resolvedChatModelSelect.dataset.selectedModelId || resolvedChatModelSelect.value;
    const model = resolveImageModelId(pendingHomeModel || selectedChatModel, "chat");
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
      imageCount: referenceFiles.length,
      model
    });

    setChatCollapsed(false);
    const attachmentText = referenceFiles.length ? ` Attached ${referenceFiles.length} reference image(s)` : "";
    addChat("user", `${prompt || "[image reference]"} ${attachmentText}`);
    resolvedPromptInput.value = "";

    const files = referenceFiles.slice();
    const generationMetrics = await resolveGenerationMetrics(files);
    resolvedPromptForm.__pendingHomeGenerationFiles = [];
    resolvedPromptForm.__pendingHomeGenerationModel = "";
    setChatImageFiles([]);
    renderChatImagePreview();

    const thinking = addThinking("Thinking", CONVERSATION_THINKING_STEPS);
    let progress = null;
    let previewNodes = [];
    let previewNode = null;
    let previewCount = 1;

    try {
      const images = await Promise.all(files.map(readFileAsDataUrl));
      const conversationResult = await runConversation({
        projectId: getActiveProject()?.id,
        prompt,
        model,
        images,
        files,
        canvasContext: collectCanvasContext(),
        thinking,
        addChat,
        updateChat,
        updateThinking,
        setThinkingSummary
      });

      if (!conversationResult.shouldGenerate) {
        updateThinking(thinking, CONVERSATION_THINKING_STEPS.length, true);
        return;
      }

      progress = conversationResult.message || addChat("assistant", "Generating result...");
      progress.classList.add("loading");
      updateChat(progress, `${conversationResult.text || "Generating result..."}\nCalling generation model...`);

      const target = viewportPointToWorld(
        resolvedCanvasViewport.getBoundingClientRect().left + resolvedCanvasViewport.clientWidth / 2,
        resolvedCanvasViewport.getBoundingClientRect().top + resolvedCanvasViewport.clientHeight / 2
      );
      const placement = getGenerationPlacement(generationMetrics, target);
      previewCount = isMidjourneyModel(model) ? MIDJOURNEY_IMAGE_COUNT : 1;
      previewNodes = createPromptPreviewBatch({
        addGenerationPreview,
        placement,
        generationMetrics,
        files,
        count: previewCount
      });
      previewNode = previewNodes[0];

      logSubmittedModel("chat", model);
      const result = await postJsonRequest("/api/ai/generate", buildChatImagePayload({
        model,
        prompt,
        images,
        size: generationMetrics.outputSize
      }));
      const finalResult = result.imageUrl || !result.jobId
        ? result
        : await waitForAIJob(result.jobId, {
          onProgress: (payload) => {
            const status = payload?.status || "running";
            const progressValue = Number(payload?.progress || 0);
            const suffix = progressValue > 0 ? ` (${Math.min(99, progressValue)}%)` : "";
            updateChat(progress, `Generation is still running${suffix}.\n${formatModelUsage(result, model)}`);
            previewNodes.forEach((node, index) => updatePromptPreviewStatus(node, previewCount > 1
              ? `Waiting for result ${index + 1}/${previewCount}...`
              : "Waiting for generation result..."));
            if (status === "queued" || status === "running") {
              updateThinking(thinking, 3);
            }
          }
        });
      const resultModel = finalResult.requestedModel || finalResult.model || model;
      warnIfModelMismatch(model, resultModel, finalResult);
      const modelUsage = formatModelUsage(finalResult, resultModel);
      updateChat(progress, `${finalResult.text || finalResult.message || "Generation finished."}\n${modelUsage}`);

      if (finalResult.videoUrl && getModelType(model) === "video") {
        previewNode?.classList?.add("generation-failed");
        const statusText = previewNode?.querySelector?.(".generation-frame span");
        if (statusText) statusText.textContent = "Video generated in task results.";
        addChat("assistant", `Video task completed: ${finalResult.videoUrl}`);
        window.dispatchEvent(new CustomEvent("ai-studio-credits-refresh"));
      } else if (getResultImageUrls(finalResult).length) {
        const imageUrls = getResultImageUrls(finalResult);
        const imageNodes = imageUrls.map((imageUrl, index) => replacePreviewWithImage(previewNodes[index] || previewNodes[0], {
          title: imageUrls.length > 1 ? `Generated Image ${index + 1}.png` : "Generated Image.png",
          desc: "Generated image from your prompt.",
          url: imageUrl,
          width: (previewNodes[index] || previewNodes[0])?.offsetWidth || generationMetrics.width,
          aspectRatio: generationMetrics.aspectRatio || "",
          prompt,
          actionType: detectGenerationKind(prompt),
          model: resultModel
        })).filter(Boolean);
        const imageNode = imageNodes[0] || null;
        if (getPendingHomeGenerationFocus()) {
          setPendingHomeGenerationFocus(false);
          centerViewOnNode(imageNode, 1);
        }
        updateActiveProject({
          title: getActiveProject()?.title || makeProjectTitle(prompt),
          prompt,
          thumbnail: imageUrls[0],
          itemCount: (getActiveProject()?.itemCount || 0) + imageUrls.length
        });
        await saveCurrentProjectAfterGeneration?.();
        onProjectTitleRefresh();
        imageUrls.forEach((imageUrl, index) => {
          addChatImage("assistant", imageUrl, imageUrls.length > 1
            ? `\u751f\u6210\u56fe\u7247 ${index + 1}/${imageUrls.length} \u00b7 ${modelUsage}`
            : `\u751f\u6210\u56fe\u7247 \u00b7 ${modelUsage}`);
        });
        window.dispatchEvent(new CustomEvent("ai-studio-credits-refresh"));
      } else {
        throw new Error("Generation completed but no image URL was returned.");
      }

      updateThinking(thinking, 4, true);
    } catch (error) {
      if (getPendingHomeGenerationFocus()) {
        setPendingHomeGenerationFocus(false);
      }
      previewNodes.forEach((node) => {
        node?.classList?.add("generation-failed");
        updatePromptPreviewStatus(node, "Generation failed, please try again.");
      });
      updateThinking(thinking, 0, true);
      if (progress) {
        updateChat(progress, `Generation failed: ${error.message}`);
      } else {
        addChat("assistant", `Conversation failed: ${error.message}`);
      }
    }
  });
}

async function runConversation({
  projectId,
  prompt,
  model,
  images = [],
  files = [],
  canvasContext = {},
  thinking,
  addChat,
  updateChat,
  updateThinking,
  setThinkingSummary
} = {}) {
  if (!projectId) {
    return {
      shouldGenerate: true,
      message: null,
      text: "Generating result..."
    };
  }

  const conversation = await ensureConversation(projectId);
  let assistantMessage = null;
  let assistantText = "";
  let shouldGenerate = false;

  await streamConversationRun(conversation.id, {
    text: prompt,
    model,
    mode: "auto",
    attachments: images.map((dataUrl, index) => ({
      type: files[index]?.type || "image",
      name: files[index]?.name || `Reference ${index + 1}`,
      source: "upload",
      dataUrl
    })),
    canvasContext
  }, (event) => {
    if (event.type === "thinking.step" && event.steps) {
      updateThinking(thinking, event.steps);
      return;
    }
    if (event.type === "thinking.summary") {
      setThinkingSummary(thinking, event.summary || "");
      return;
    }
    if (event.type === "assistant.delta") {
      assistantText += event.delta || "";
      if (!assistantMessage) assistantMessage = addChat("assistant", "");
      updateChat(assistantMessage, assistantText);
      return;
    }
    if (event.type === "tool.call" && isGenerationTool(event.toolCall?.name)) {
      shouldGenerate = true;
    }
    if (event.type === "error") {
      throw new Error(event.message || "Conversation run failed");
    }
  });

  return {
    shouldGenerate,
    message: assistantMessage,
    text: assistantText
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
  if (!response.ok) throw new Error(payload?.message || `Conversation request failed: ${response.status}`);
  const conversation = payload.conversation;
  if (!conversation?.id) throw new Error("Conversation response did not include an id");
  conversationIdsByProject.set(cleanProjectId, conversation.id);
  return conversation;
}

async function streamConversationRun(conversationId, payload, onEvent) {
  currentConversationAbort?.abort?.();
  currentConversationAbort = new AbortController();
  try {
    const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/runs`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: currentConversationAbort.signal
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
        onEvent(JSON.parse(text));
      }
    }
    if (buffer.trim()) onEvent(JSON.parse(buffer.trim()));
  } finally {
    currentConversationAbort = null;
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
        .forEach((item) => addChatImage("assistant", item.url, item.caption || "鐢熸垚鍥剧墖"));
    }
    if (text) addChat(message.role === "user" ? "user" : "assistant", text);
  });
}

function isGenerationTool(name = "") {
  return ["generate_image", "edit_image"].includes(String(name || "").trim());
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
  count = 1
} = {}) {
  const safeCount = Math.max(1, Math.ceil(Number(count || 1)));
  const gap = 28;
  return Array.from({ length: safeCount }, (_, index) => {
    const desc = safeCount > 1
      ? `Waiting for result ${index + 1}/${safeCount}...`
      : (generationMetrics.sourceNode
        ? "Generating from the selected image"
        : (files.length ? "Generating from reference images" : "Generating from prompt"));
    return addGenerationPreview({
      title: safeCount > 1 ? `Generated Image ${index + 1}.png` : "Generated Image.png",
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

function getResultImageUrls(result = {}) {
  const urls = [];
  if (Array.isArray(result?.imageUrls)) urls.push(...result.imageUrls);
  if (Array.isArray(result?.outputs)) {
    result.outputs.forEach((output) => {
      if (output?.type === "image" && output.url) urls.push(output.url);
    });
  }
  if (result?.imageUrl) urls.unshift(result.imageUrl);
  return Array.from(new Set(urls.filter(Boolean)));
}

function isMidjourneyModel(model = "") {
  return String(model || "").trim().toLowerCase() === "midjourney";
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
    if (!response.ok) throw new Error(payload?.message || `Job request failed: ${response.status}`);
    lastPayload = payload;
    if (["succeeded", "failed", "cancelled", "timeout", "save_failed"].includes(payload?.status)) {
      if (payload.status !== "succeeded") throw new Error(payload.error || payload.status);
      return payload;
    }
    onProgress?.(payload);
  }
  throw new Error(`Generation is still running. Job ID: ${lastPayload.jobId || jobId}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterDelayMs(response, fallbackMs = 4000) {
  const value = Number.parseInt(response?.headers?.get?.("Retry-After") || "", 10);
  if (Number.isFinite(value) && value > 0) return value * 1000;
  return fallbackMs;
}

function warnIfModelMismatch(selectedModel, returnedModel, result = {}) {
  const selected = String(selectedModel || "").trim();
  const returned = String(returnedModel || "").trim();
  if (!selected || !returned || selected === returned) return;
  console.warn("[models] Response model does not match selected model", {
    selectedModel: selected,
    returnedModel: returned,
    jobId: result?.jobId || result?.job?.id || ""
  });
}

function logSubmittedModel(surface, model) {
  if (!["localhost", "127.0.0.1"].includes(globalThis.location?.hostname || "")) return;
  console.debug("[models] submitting generation", {
    surface,
    selectedModel: model,
    payloadModel: model
  });
}

export function bindPromptShortcuts({
  queryAll,
  promptInput,
  labelSelector = "[data-prompt]"
}) {
  queryAll(labelSelector).forEach((button) => {
    button.addEventListener("click", () => {
      promptInput.value = button.dataset.prompt;
      promptInput.focus();
    });
  });
}
