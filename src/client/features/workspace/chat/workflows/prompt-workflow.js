import {
  getImageNodePreviewMetrics,
  getPreviewHeight,
  readImageFilePreviewMetrics
} from "../../../canvas/upload-nodes.js";
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
    promptInput.value = "";

    const files = referenceFiles.slice();
    const generationMetrics = await resolveGenerationMetrics(files);
    resolvedPromptForm.__pendingHomeGenerationFiles = [];
    resolvedPromptForm.__pendingHomeGenerationModel = "";
    setChatImageFiles([]);
    renderChatImagePreview();

    const thinking = addThinking("Generating", [
      "Analyzing input and assembling style context",
      "Adjusting composition and prompt details",
      "Calling generation model",
      "Preparing output"
    ]);

    const progress = addChat("assistant", "Generating result...");
    progress.classList.add("loading");
    updateThinking(thinking, 1);

    const target = viewportPointToWorld(
      resolvedCanvasViewport.getBoundingClientRect().left + resolvedCanvasViewport.clientWidth / 2,
      resolvedCanvasViewport.getBoundingClientRect().top + resolvedCanvasViewport.clientHeight / 2
    );
    const placement = getGenerationPlacement(generationMetrics, target);
    const previewCount = isMidjourneyModel(model) ? MIDJOURNEY_IMAGE_COUNT : 1;
    const previewNodes = createPromptPreviewBatch({
      addGenerationPreview,
      placement,
      generationMetrics,
      files,
      count: previewCount
    });
    const previewNode = previewNodes[0];

    updateThinking(thinking, 2);

    try {
      const images = await Promise.all(files.map(readFileAsDataUrl));
      updateThinking(thinking, 3);

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
        previewNode.classList.add("generation-failed");
        const statusText = previewNode.querySelector(".generation-frame span");
        if (statusText) statusText.textContent = "Video generated in task results.";
        addChat("assistant", `视频任务完成：${finalResult.videoUrl}`);
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
      updateChat(progress, `Generation failed: ${error.message}`);
    }
  });
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
      ? `正在等待第 ${index + 1}/${safeCount} 张结果`
      : (generationMetrics.sourceNode
        ? "正在根据当前图片生成结果"
        : (files.length ? "正在根据参考图生成结果" : "正在根据提示词生成结果"));
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
