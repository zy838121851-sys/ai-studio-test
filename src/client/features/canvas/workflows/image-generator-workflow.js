import {
  getDroppedExternalImageUrl,
  importExternalImageUrl
} from "../canvas-viewport-events.js";
import {
  formatModelUsage,
  getImageModelDisplayName,
  getModelType,
  getSelectedModelId
} from "../../ai/model-catalog.js?v=20260627-library-bulk-select-1";
import { renderModelPreferenceMenu } from "../../ai/model-preference-menu.js";

const GENERATOR_SELECTOR = ".node-image-generator";
const GENERATOR_POPOVER_SELECTOR = "#imageGeneratorPopover";
const OUTPUT_SIZE = "1024*1024";
const DEFAULT_GENERATOR_MODEL = "doubao-seedream-5-0-lite-260128";
const DEFAULT_GENERATOR_RATIO = "1:1";
const DEFAULT_GENERATOR_COUNT = "1";
const MIDJOURNEY_IMAGE_COUNT = 4;
const GENERATOR_FIXED_SIZES = {
  "1:1": { width: 1024, height: 1024 },
  "4:3": { width: 1024, height: 768 },
  "3:4": { width: 768, height: 1024 },
  "16:9": { width: 1344, height: 768 },
  "9:16": { width: 768, height: 1344 }
};

export function createImageGeneratorWorkflow({
  elements = {},
  services = {}
} = {}) {
  const {
    canvasWorld = globalThis.document?.querySelector?.("#canvasWorld"),
    canvasViewport = globalThis.document?.querySelector?.("#canvasViewport")
  } = elements;

  const {
    addNode = null,
    addGenerationPreview = null,
    addChat = () => {},
    buildChatImagePayload = ({ model, prompt, images = [], size } = {}) => ({ model, prompt, images, size }),
    detectGenerationKind = () => "2d",
    getZoom = () => 1,
    postJsonRequest = (path, payload) => fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    }).then((response) => response.json()),
    readFileAsDataUrl = (file) => fileToDataUrl(file),
    readImageSourceAsDataUrl = null,
    recordCanvasEvent = () => {},
    registerGeneratedAsset = null,
    replacePreviewWithImage = null,
    replacePreviewWithVideo = null,
    saveCurrentProject = null,
    saveCurrentProjectAfterGeneration = saveCurrentProject,
    selectNode = () => {}
  } = services;

  let activeGeneratorNode = null;
  let popoverObserver = null;
  let popoverMutationObserver = null;
  let positionFrame = 0;

  if (!canvasWorld) {
    return {
      addReferenceFilesToGenerator: () => Promise.resolve([])
    };
  }

  const popover = getGeneratorPopover();
  initGeneratorCustomSelects();
  popover?.addEventListener("pointerdown", (event) => event.stopPropagation());
  popover?.addEventListener("dblclick", (event) => event.stopPropagation());
  popover?.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  popover?.addEventListener("click", handlePopoverClick);
  popover?.addEventListener("change", handlePopoverChange);
  popover?.addEventListener("submit", handlePopoverSubmit);

  const ownerDocument = canvasWorld.ownerDocument || globalThis.document;
  ownerDocument?.addEventListener?.("pointerdown", (event) => {
    const generatorNode = event.target.closest(GENERATOR_SELECTOR);
    if (generatorNode) {
      if (activeGeneratorNode && activeGeneratorNode !== generatorNode) hideGeneratorPopover();
      return;
    }
    if (getGeneratorPopover()?.contains(event.target)) return;
    hideGeneratorPopover();
  }, true);

  ownerDocument?.addEventListener?.("contextmenu", (event) => {
    if (getGeneratorPopover()?.contains(event.target)) return;
    const generatorNode = event.target.closest(GENERATOR_SELECTOR);
    if (generatorNode) {
      if (activeGeneratorNode && activeGeneratorNode !== generatorNode) hideGeneratorPopover();
      return;
    }
    hideGeneratorPopover();
  }, true);

  canvasWorld.addEventListener("dblclick", (event) => {
    if (event.button !== 0) return;
    if (event.target.closest(".resize-handle")) return;
    const generatorNode = event.target.closest(GENERATOR_SELECTOR);
    if (!generatorNode || getGeneratorPopover()?.contains(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    selectNode(generatorNode);
    showGeneratorPopover(generatorNode);
  });

  canvasWorld.addEventListener("pointerdown", (event) => {
    const generatorNode = event.target.closest(GENERATOR_SELECTOR);
    if (generatorNode && getGeneratorPopover()?.classList.contains("open") && activeGeneratorNode === generatorNode) {
      showGeneratorPopover(generatorNode);
      return;
    }
    if (getGeneratorPopover()?.contains(event.target)) return;
    hideGeneratorPopover();
  }, true);

  canvasWorld.addEventListener("dragover", (event) => {
    const node = event.target.closest(GENERATOR_SELECTOR);
    if (!node || !hasGeneratorDropData(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    node.classList.add("generator-drop-active");
    refreshGeneratorPopoverIfOpen(node);
  });

  canvasWorld.addEventListener("dragleave", (event) => {
    const node = event.target.closest(GENERATOR_SELECTOR);
    if (!node) return;
    const related = event.relatedTarget;
    if (related && node.contains(related)) return;
    node.classList.remove("generator-drop-active");
  });

  canvasWorld.addEventListener("drop", (event) => {
    const node = event.target.closest(GENERATOR_SELECTOR);
    if (!node || !hasGeneratorDropData(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    node.classList.remove("generator-drop-active");
    handleDrop(node, event.dataTransfer);
  });

  globalThis.document?.addEventListener?.("canvas:image-generator-selected", (event) => {
    const node = event.detail?.node;
    if (!node?.matches?.(GENERATOR_SELECTOR)) return;
    if (activeGeneratorNode && activeGeneratorNode !== node) {
      hideGeneratorPopover();
    }
    if (event.detail?.openPopover) {
      showGeneratorPopover(node);
      if (event.detail?.focusPrompt) {
        requestAnimationFrame(() => focusGeneratorPrompt());
      }
      return;
    }
    refreshGeneratorPopoverIfOpen(node);
  });

  globalThis.document?.addEventListener?.("canvas:image-generator-deleted", (event) => {
    const deletedNodes = Array.from(event.detail?.nodes || []);
    if (!activeGeneratorNode) return;
    if (!activeGeneratorNode.isConnected || deletedNodes.includes(activeGeneratorNode)) {
      hideGeneratorPopover();
    }
  });

  globalThis.document?.addEventListener?.("canvas:selection-changed", (event) => {
    handleGeneratorSelectionChange(event.detail?.activeNode || null);
  });

  globalThis.document?.addEventListener?.("canvas:context-overlay-close", () => {
    hideGeneratorPopover();
  });

  globalThis.document?.addEventListener?.("canvas:image-generator-reference-files", (event) => {
    const node = getActiveGeneratorNode();
    if (!node) return;
    addReferenceFilesToGenerator(node, event.detail?.files || []);
  });

  globalThis.document?.addEventListener?.("canvas:image-generator-add-image-node", (event) => {
    const generatorNode = event.detail?.generatorNode;
    const sourceNode = event.detail?.sourceNode;
    addReferenceNodeToGenerator(generatorNode, sourceNode);
  });

  globalThis.document?.addEventListener?.("canvas:view-transformed", () => {
    if (!activeGeneratorNode || !getGeneratorPopover()?.classList.contains("open")) return;
    closeGeneratorCustomSelects();
    scheduleGeneratorPopoverPosition();
  });

  globalThis.window?.addEventListener?.("focus", () => {
    resumePendingGeneratorPreviews();
  });

  globalThis.document?.addEventListener?.("visibilitychange", () => {
    if (globalThis.document?.visibilityState === "visible") resumePendingGeneratorPreviews();
  });

  globalThis.document?.addEventListener?.("ai-studio-models-updated", () => {
    syncGeneratorModelFromGlobal();
    syncGeneratorFrameToRatio(activeGeneratorNode, getGeneratorRatioValue(activeGeneratorNode));
    syncGeneratorCustomSelects();
  });

  globalThis.document?.addEventListener?.("ai-studio-model-selection-changed", () => {
    syncGeneratorModelFromGlobal();
    syncGeneratorCustomSelects();
    globalThis.document?.dispatchEvent?.(new Event("change"));
  });

  function handlePopoverClick(event) {
    const controls = getGeneratorControls();
    const node = activeGeneratorNode;
    if (!node) return;

    const selectTrigger = event.target.closest("[data-generator-select-trigger]");
    if (selectTrigger) {
      event.preventDefault();
      toggleGeneratorCustomSelect(selectTrigger);
      return;
    }

    const selectOption = event.target.closest("[data-generator-select-option]");
    if (selectOption) {
      event.preventDefault();
      chooseGeneratorCustomSelectOption(selectOption);
      return;
    }

    closeGeneratorCustomSelects();

    const addButton = event.target.closest("[data-generator-add-reference]");
    if (addButton) {
      event.preventDefault();
      controls.referenceInput?.click();
      return;
    }

    const cancelButton = event.target.closest("[data-generator-cancel]");
    if (cancelButton) {
      event.preventDefault();
      resetGeneratorInput(node);
      syncGeneratorFrameToRatio(node, getGeneratorRatioValue(node));
      focusGeneratorPrompt(controls.promptInput);
      return;
    }

    const expandButton = event.target.closest("[data-generator-expand]");
    if (expandButton) {
      event.preventDefault();
      controls.popover?.classList.toggle("generator-panel-expanded");
      focusGeneratorPrompt(controls.promptInput);
      positionGeneratorPopover();
      return;
    }

    const referenceThumb = event.target.closest("[data-generator-reference-index]");
    if (referenceThumb) {
      event.preventDefault();
      const index = Number(referenceThumb.dataset.generatorReferenceIndex);
      removeGeneratorReference(node, index);
      syncGeneratorFrameToRatio(node, getGeneratorRatioValue(node));
    }
  }

  function handlePopoverChange(event) {
    const input = event.target.closest("[data-generator-reference-input]");
    if (input && activeGeneratorNode) {
      addReferenceFilesToGenerator(activeGeneratorNode, Array.from(input.files || []));
      input.value = "";
      return;
    }

    const select = event.target.closest("[data-generator-model], [data-generator-ratio], [data-generator-count]");
    if (!select || !activeGeneratorNode) return;
    saveGeneratorControlState(activeGeneratorNode);
    syncGeneratorCustomSelect(select);
    if (select.matches("[data-generator-model]")) {
      syncGeneratorCustomSelect(getGeneratorControls().countSelect);
    }
    if (select.matches("[data-generator-ratio]")) {
      syncGeneratorFrameToRatio(activeGeneratorNode, select.value);
    }
  }

  function handlePopoverSubmit(event) {
    if (!event.target.closest("[data-image-generator-form]")) return;
    event.preventDefault();
    runGenerator(activeGeneratorNode);
  }

  async function runGenerator(node) {
    if (!node || node.dataset.generatorBusy === "true") return;
    const controls = getGeneratorControls();
    const promptInput = controls.promptInput;
    const prompt = promptInput?.value?.trim?.() || "";
    const references = getGeneratorReferences(node);
    if (!prompt && !references.length) {
      updateGeneratorStatus(node, "请输入提示词，或拖入参考图");
      focusGeneratorPrompt(promptInput);
      return;
    }

    node._generatorPromptDraft = prompt;
    await runGeneratorBatch(node, { prompt, references });
    return;

    const model = getGeneratorModel();
    const images = references.map((item) => item.dataUrl).filter(Boolean);
    const size = resolveGeneratorOutputSize(node, references);
    setGeneratorBusy(node, true);
    updateGeneratorStatus(node, images.length ? `图生图 · ${images.length} 张参考图` : "文生图");
    recordCanvasEvent("prompt_submitted", {
      source: "image-generator-node",
      hasPrompt: Boolean(prompt),
      imageCount: images.length,
      model
    });

    try {
      const result = await runImageGenerationRequest({
        model,
        prompt,
        images,
        size
      });
      const imageUrl = getPrimaryResultImageUrl(result);
      if (!imageUrl) throw new Error(getMissingGeneratorResultMessage(result));

      const displayUrl = await persistGeneratorResult({
        node,
        sourceUrl: imageUrl,
        prompt,
        model
      });
      applyGeneratorResult(node, displayUrl || imageUrl, { prompt, model });
      recordCanvasEvent("generation_created", {
        nodeId: node.dataset.nodeId,
        sourceId: "",
        actionType: detectGenerationKind(prompt),
        model
      });
      await saveCurrentProjectAfterGeneration?.();
      addChat("assistant", "图像生成器已生成结果。");
    } catch (error) {
      console.error("[canvas] Image generator failed", error);
      node.classList.add("generation-failed");
      updateGeneratorStatus(node, `生成失败：${error.message}`);
      addChat("assistant", `图像生成失败：${error.message}`);
    } finally {
      setGeneratorBusy(node, false);
    }
  }

  async function runGeneratorBatch(node, { prompt = "", references = [] } = {}) {
    const model = getGeneratorModel();
    const videoModel = getModelType(model) === "video";
    let resultModel = model;
    let modelUsage = `模型：${getImageModelDisplayName(model)}`;
    const midjourney = isMidjourneyModel(model);
    const count = videoModel ? 1 : (midjourney ? MIDJOURNEY_IMAGE_COUNT : getGeneratorCount());
    const images = references.map((item) => item.dataUrl).filter(Boolean);
    const size = resolveGeneratorOutputSize(node, references);
    const dimensions = getGeneratorOutputDimensions(node, getGeneratorRatioValue(node), references);
    const aspectRatio = `${dimensions.width} / ${dimensions.height}`;
    const actionType = detectGenerationKind(prompt);
    const sourceNodeId = node?.dataset?.nodeId || "";
    let previewNodes = [];
    let firstSuccessfulNode = null;
    setGeneratorBusy(node, true);
    updateGeneratorStatus(node, count > 1
      ? `正在生成 1/${count}`
      : (images.length ? `图生图 · ${images.length} 张参考图` : "文生图"));
    recordCanvasEvent("prompt_submitted", {
      source: "image-generator-node",
      hasPrompt: Boolean(prompt),
      imageCount: images.length,
      model,
      count
    });

    try {
      if (
        typeof addGenerationPreview !== "function"
        || typeof replacePreviewWithImage !== "function"
        || (videoModel && typeof replacePreviewWithVideo !== "function")
      ) {
        throw new Error("Image generator preview workflow is unavailable");
      }
      previewNodes = createGeneratorPreviewBatch(node, {
        count,
        prompt,
        dimensions,
        aspectRatio
      });
      if (!previewNodes.length) throw new Error("Unable to create generation previews");

      hideGeneratorPopover();
      if (node.isConnected) node.remove();

      const createdNodes = [];
      const registerGeneratedNode = (createdNode, index = 0, { trackBatch = false } = {}) => {
        if (sourceNodeId) createdNode.dataset.generatorSourceNodeId = sourceNodeId;
        if (trackBatch) {
          createdNode.dataset.generatorBatchCount = String(count);
          createdNode.dataset.generatorBatchIndex = String(index + 1);
        }
        createdNodes.push(createdNode);
        if (!firstSuccessfulNode) firstSuccessfulNode = createdNode;
        return createdNode;
      };
      const replaceGeneratorImagePreview = (previewNode, url, index = 0) => {
        const createdNode = replaceGeneratorImagePreviewNode(previewNode, {
          title: getGeneratorResultTitle(index, count),
          desc: prompt || "Image generator result",
          url,
          aspectRatio,
          prompt,
          actionType,
          model: resultModel
        });
        if (!createdNode) throw new Error("Unable to replace generation preview");
        applyGeneratedImageNodeResult(createdNode, url, {
          prompt,
          model: resultModel,
          dimensions,
          sourceNode: null
        });
        return registerGeneratedNode(createdNode, index, { trackBatch: true });
      };
      const replaceGeneratorVideoPreview = (previewNode, url) => {
        const createdNode = replacePreviewWithVideo(previewNode, {
          title: "Generated Video.mp4",
          desc: prompt || "Image generator video result",
          url,
          width: getPreviewNodeWidth(previewNode),
          aspectRatio,
          prompt,
          sourceNode: null,
          actionType: "video_generation",
          model: resultModel
        });
        if (!createdNode) throw new Error("Unable to replace generation preview");
        return registerGeneratedNode(createdNode);
      };
      if (videoModel) {
        updatePreviewStatus(previewNodes[0], "Waiting for video result...");
        const result = await runImageGenerationRequest({
          model,
          prompt,
          images,
          size,
          expectedType: "video",
          onJobCreated: (payload) => tagGeneratorPreviewJobs(previewNodes, payload, buildGeneratorPreviewJobMeta({
            prompt,
            model,
            actionType: "video_generation",
            aspectRatio,
            dimensions
          })),
          onProgress: (payload) => {
            const progress = Number(payload?.progress || 0);
            updatePreviewStatus(previewNodes[0], progress > 0
              ? `Waiting for video result (${Math.min(99, progress)}%)`
              : "Waiting for video result...");
          }
        });
        const videoUrl = getPrimaryGeneratorResultUrl(result, "video");
        if (!videoUrl) throw getMissingGeneratorResultError(result, "video");
        resultModel = getGeneratorResultModel(result, model);
        warnIfGeneratorModelMismatch(model, resultModel, result);
        modelUsage = formatModelUsage(result, resultModel);
        replaceGeneratorVideoPreview(previewNodes[0], videoUrl);
      } else if (midjourney) {
        previewNodes.forEach((previewNode, index) => {
          updatePreviewStatus(previewNode, `正在等待第 ${index + 1}/${count} 张结果`);
        });
        const result = await runImageGenerationRequest({
          model,
          prompt,
          images,
          size,
          onJobCreated: (payload) => tagGeneratorPreviewJobs(previewNodes, payload, buildGeneratorPreviewJobMeta({
            prompt,
            model,
            actionType,
            aspectRatio,
            dimensions
          })),
          onProgress: (payload) => {
            const progress = Number(payload?.progress || 0);
            previewNodes.forEach((previewNode, index) => {
              updatePreviewStatus(previewNode, progress > 0
                ? `正在等待第 ${index + 1}/${count} 张结果 (${Math.min(99, progress)}%)`
                : `正在等待第 ${index + 1}/${count} 张结果`);
            });
          }
        });
        const resultUrls = getResultImageUrls(result);
        if (resultUrls.length < count) throw new Error(`Midjourney returned ${resultUrls.length || 0}/${count} images`);
        resultModel = getGeneratorResultModel(result, model);
        warnIfGeneratorModelMismatch(model, resultModel, result);
        modelUsage = formatModelUsage(result, resultModel);
        resultUrls.slice(0, count).forEach((url, index) => {
          replaceGeneratorImagePreview(previewNodes[index], url, index);
        });
      } else {
      for (let index = 0; index < count; index += 1) {
        const previewNode = previewNodes[index];
        if (count > 1) updatePreviewStatus(previewNode, `正在生成第 ${index + 1}/${count} 张`);
        if (count > 1) updateGeneratorStatus(node, `正在生成 ${index + 1}/${count}`);
        const result = await runImageGenerationRequest({
          model,
          prompt,
          images,
          size,
          onJobCreated: (payload) => tagGeneratorPreviewJobs([previewNode], payload, buildGeneratorPreviewJobMeta({
            prompt,
            model,
            actionType,
            aspectRatio,
            dimensions
          })),
          onProgress: (payload) => {
            const progress = Number(payload?.progress || 0);
            updatePreviewStatus(previewNode, progress > 0
              ? `正在生成第 ${index + 1}/${count} 张 (${Math.min(99, progress)}%)`
              : `正在生成第 ${index + 1}/${count} 张`);
          }
        });
        const imageUrl = getPrimaryGeneratorResultUrl(result);
        if (!imageUrl) throw getMissingGeneratorResultError(result);
        resultModel = getGeneratorResultModel(result, model);
        warnIfGeneratorModelMismatch(model, resultModel, result);
        modelUsage = formatModelUsage(result, resultModel);

        replaceGeneratorImagePreview(previewNode, imageUrl, index);
      }
      }

      if (createdNodes.length) {
        selectNode(createdNodes[0]);
        window.dispatchEvent(new CustomEvent("ai-studio-credits-refresh"));
      }
      await saveCurrentProjectAfterGeneration?.();
      addChat("assistant", videoModel
        ? `Video generation completed.\n${modelUsage}`
        : (count > 1
          ? `Image generator completed ${count} results.\n${modelUsage}`
          : `Image generator completed.\n${modelUsage}`));
    } catch (error) {
      console.error("[canvas] Image generator failed", error);
      if (previewNodes.length) {
        previewNodes
          .filter((previewNode) => previewNode?.isConnected)
          .forEach((previewNode) => markGeneratorPreviewFailed(previewNode, error));
        if (firstSuccessfulNode) selectNode(firstSuccessfulNode);
        addChat("assistant", `鍥惧儚鐢熸垚澶辫触锛?{error.message}`);
        return;
      }
      node.classList.add("generation-failed");
      updateGeneratorStatus(node, `生成失败：${error.message}`);
      addChat("assistant", `图像生成失败：${error.message}`);
    } finally {
      if (node?.isConnected) setGeneratorBusy(node, false);
    }
  }

  function replaceGeneratorImagePreviewNode(previewNode, {
    title = "Image Generator Result.png",
    desc = "Image generator result",
    url = "",
    aspectRatio = "",
    prompt = "",
    actionType = "",
    model = ""
  } = {}) {
    return replacePreviewWithImage(previewNode, {
      title,
      desc,
      url,
      width: getPreviewNodeWidth(previewNode),
      aspectRatio,
      prompt,
      sourceNode: null,
      actionType,
      model
    });
  }

  function createGeneratorPreviewBatch(node, {
    count = 1,
    prompt = "",
    dimensions = {},
    aspectRatio = ""
  } = {}) {
    if (!node || typeof addGenerationPreview !== "function") return [];
    const placement = getGeneratorReplacementPlacement(node);
    const gap = 28;
    return Array.from({ length: count }, (_, index) => {
      const title = getGeneratorResultTitle(index, count);
      const desc = getGeneratorPreviewDescription(prompt, index, count);
      const previewNode = addGenerationPreview({
        title,
        desc,
        x: placement.x + index * (placement.width + gap),
        y: placement.y,
        width: placement.width,
        aspectRatio: aspectRatio || `${dimensions.width || 1024} / ${dimensions.height || 1024}`
      });
      if (previewNode) {
        previewNode.dataset.generatorPreview = "true";
        applyGeneratorPreviewBatchMetadata(previewNode, { count, index });
        applyGeneratorPreviewDimensions(previewNode, dimensions);
        if (count > 1) updatePreviewStatus(previewNode, `正在生成第 ${index + 1}/${count} 张`);
      }
      return previewNode;
    }).filter(Boolean);
  }

  function getGeneratorResultTitle(index = 0, count = 1) {
    return count > 1
      ? `Image Generator Result ${index + 1}.png`
      : "Image Generator Result.png";
  }

  function getGeneratorPreviewDescription(prompt = "", index = 0, count = 1) {
    if (count > 1) return `正在生成第 ${index + 1}/${count} 张`;
    return prompt ? "正在根据当前提示生成结果" : "正在生成图片";
  }

  function getPreviewNodeWidth(previewNode) {
    const frame = previewNode?.querySelector?.(".image-frame");
    return Math.max(160, frame?.offsetWidth || previewNode?.offsetWidth || 560);
  }

  function updatePreviewStatus(previewNode, text = "") {
    const statusText = previewNode?.querySelector?.(".generation-frame span");
    if (statusText && text) statusText.textContent = text;
  }

  function markGeneratorPreviewFailed(previewNode, error) {
    if (!previewNode) return;
    previewNode.dataset.generatorFailed = "true";
    previewNode.classList.add("generation-failed");
    const title = previewNode.querySelector(".generation-frame strong");
    const statusText = previewNode.querySelector(".generation-frame span");
    if (title) title.textContent = "生成失败";
    if (statusText) statusText.textContent = error?.message || "生成失败，请重试";
  }

  function tagGeneratorPreviewJobs(previewNodes = [], payload = {}, meta = {}) {
    const jobId = String(payload?.jobId || payload?.job?.id || "").trim();
    if (!jobId) return;
    previewNodes.filter(Boolean).forEach((previewNode) => {
      applyGeneratorPreviewJobMetadata(previewNode, { jobId, payload, meta });
    });
  }

  function buildGeneratorPreviewJobMeta({
    prompt = "",
    model = "",
    actionType = "image_generation",
    aspectRatio = "",
    dimensions = {}
  } = {}) {
    return {
      prompt,
      model,
      actionType,
      aspectRatio,
      dimensions
    };
  }

  function applyGeneratorPreviewBatchMetadata(previewNode, { count = 1, index = 0 } = {}) {
    if (!previewNode) return;
    previewNode.dataset.generatorBatchCount = String(count);
    previewNode.dataset.generatorBatchIndex = String(index + 1);
  }

  function applyGeneratorPreviewDimensions(previewNode, dimensions = {}) {
    if (!previewNode) return;
    if (dimensions.width > 0) previewNode.dataset.outputWidth = String(dimensions.width);
    if (dimensions.height > 0) previewNode.dataset.outputHeight = String(dimensions.height);
  }

  function applyGeneratorPreviewJobMetadata(previewNode, { jobId = "", payload = {}, meta = {} } = {}) {
    if (!previewNode || !jobId) return;
    previewNode.dataset.generatorJobId = jobId;
    previewNode.dataset.generatorJobStatus = payload?.status || payload?.job?.status || "queued";
    previewNode.dataset.generatorPrompt = meta.prompt || "";
    previewNode.dataset.generatorModel = meta.model || payload?.model || payload?.requestedModel || "";
    previewNode.dataset.generatorActionType = meta.actionType || "";
    previewNode.dataset.generatorAspectRatio = meta.aspectRatio || "";
    applyGeneratorPreviewDimensions(previewNode, meta.dimensions);
  }

  function resumePendingGeneratorPreviews() {
    const root = canvasWorld?.ownerDocument || globalThis.document;
    const previews = Array.from(root?.querySelectorAll?.(".node-loading-image[data-generator-job-id]") || [])
      .filter((previewNode) => (
        previewNode.isConnected
        && previewNode.dataset.generatorResuming !== "true"
        && previewNode.dataset.generatorFailed !== "true"
      ));
    if (!previews.length) return;
    const groups = groupGeneratorPreviewsByJob(previews);
    groups.forEach((nodes, jobId) => resumeGeneratorPreviewGroup(jobId, nodes));
  }

  function groupGeneratorPreviewsByJob(previews = []) {
    const groups = new Map();
    previews.forEach((previewNode) => {
      const jobId = previewNode?.dataset?.generatorJobId;
      if (!jobId) return;
      if (!groups.has(jobId)) groups.set(jobId, []);
      groups.get(jobId).push(previewNode);
    });
    return groups;
  }

  function resumeGeneratorPreviewGroup(jobId, nodes = []) {
    nodes.forEach((node) => {
      node.dataset.generatorResuming = "true";
      updatePreviewStatus(node, "正在恢复生成结果...");
    });
    waitForImageGenerationJob(jobId, {
      attempts: 20,
      delayMs: 1500,
      fallback: { jobId },
      onProgress: (payload) => {
        const progress = Number(payload?.progress || 0);
        nodes.forEach((node) => updatePreviewStatus(node, progress > 0
          ? `正在恢复生成结果 (${Math.min(99, progress)}%)`
          : "正在恢复生成结果..."));
      }
    }).then((result) => {
      completeRecoveredGeneratorPreviewGroup(jobId, nodes, result);
    }).catch((error) => {
      nodes.forEach((node) => {
        delete node.dataset.generatorResuming;
        if (node.isConnected) markGeneratorPreviewFailed(node, error);
      });
    });
  }

  function completeRecoveredGeneratorPreviewGroup(jobId, nodes = [], result = {}) {
    const urls = getResultImageUrls(result);
    nodes.forEach((previewNode, index) => replaceRecoveredGeneratorPreview(previewNode, {
      jobId,
      result,
      url: getRecoveredGeneratorPreviewUrl(previewNode, urls, index),
      index,
      count: urls.length || nodes.length || 1
    }));
    window.dispatchEvent(new CustomEvent("ai-studio-credits-refresh"));
    saveCurrentProjectAfterGeneration?.();
  }

  function getRecoveredGeneratorPreviewUrl(previewNode, urls = [], index = 0) {
    return urls[getGeneratorPreviewBatchIndex(previewNode, index)] || urls[index] || urls[0] || "";
  }

  function replaceRecoveredGeneratorPreview(previewNode, { jobId, result = {}, url = "", index = 0, count = 1 } = {}) {
    if (!previewNode?.isConnected) return null;
    if (!url) throw new Error(getMissingGeneratorResultMessage(result));
    const batchIndex = getGeneratorPreviewBatchIndex(previewNode, index);
    const createdNode = replaceGeneratorImagePreviewNode(previewNode, {
      title: getGeneratorResultTitle(batchIndex, count),
      desc: previewNode.dataset.generatorPrompt || "Image generator result",
      url,
      aspectRatio: previewNode.dataset.generatorAspectRatio || "",
      prompt: previewNode.dataset.generatorPrompt || "",
      actionType: previewNode.dataset.generatorActionType || "",
      model: result.requestedModel || result.model || previewNode.dataset.generatorModel || ""
    });
    if (!createdNode) throw new Error("Unable to replace generation preview");
    createdNode.dataset.generatorJobId = jobId;
    return createdNode;
  }

  function getGeneratorPreviewBatchIndex(previewNode, fallbackIndex = 0) {
    return Math.max(0, Number(previewNode?.dataset?.generatorBatchIndex || fallbackIndex + 1) - 1);
  }

  async function addGeneratedImageBesideGenerator(node, {
    sourceUrl = "",
    prompt = "",
    model = "",
    index = 0,
    count = 1
  } = {}) {
    const placement = getGeneratedImagePlacement(node, index);
    const dimensions = getGeneratorOutputDimensions(node, getGeneratorRatioValue(node), getGeneratorReferences(node));
    const title = count > 1
      ? `Image Generator Result ${index + 1}.png`
      : "Image Generator Result.png";
    const createdNode = addNode?.({
      kind: "image",
      title,
      desc: prompt || "Image generator result",
      x: placement.x,
      y: placement.y,
      media: {
        url: sourceUrl,
        name: title,
        type: "image/png"
      }
    });
    if (!createdNode) return null;
    applyGeneratedImageNodeSize(createdNode, {
      width: placement.width,
      dimensions
    });
    const displayUrl = await persistGeneratorResult({
      node: createdNode,
      sourceUrl,
      prompt,
      model
    });
    applyGeneratedImageNodeResult(createdNode, displayUrl || sourceUrl, {
      prompt,
      model,
      dimensions,
      sourceNode: node
    });
    return createdNode;
  }

  async function replaceGeneratorWithImageNode(node, {
    sourceUrl = "",
    prompt = "",
    model = "",
    count = 1
  } = {}) {
    if (!node || typeof addNode !== "function") return null;
    const dimensions = getGeneratorOutputDimensions(node, getGeneratorRatioValue(node), getGeneratorReferences(node));
    const placement = getGeneratorReplacementPlacement(node);
    const title = count > 1 ? "Image Generator Result 1.png" : "Image Generator Result.png";
    const createdNode = addNode({
      kind: "image",
      title,
      desc: prompt || "Image generator result",
      x: placement.x,
      y: placement.y,
      media: {
        url: sourceUrl,
        name: title,
        type: "image/png"
      }
    });
    if (!createdNode) return null;
    applyGeneratedImageNodeSize(createdNode, {
      width: placement.width,
      dimensions
    });
    const displayUrl = await persistGeneratorResult({
      node: createdNode,
      sourceUrl,
      prompt,
      model
    });
    applyGeneratedImageNodeResult(createdNode, displayUrl || sourceUrl, {
      prompt,
      model,
      dimensions,
      sourceNode: node
    });
    hideGeneratorPopover();
    if (node.isConnected) node.remove();
    return createdNode;
  }

  function getGeneratorReplacementPlacement(node) {
    const frame = node.querySelector(".image-generator-frame");
    return {
      x: Number.parseFloat(node.style.left || "0"),
      y: Number.parseFloat(node.style.top || "0"),
      width: Math.max(160, frame?.offsetWidth || node.offsetWidth || 560)
    };
  }

  function getGeneratedImagePlacement(node, index = 0) {
    const frame = node.querySelector(".image-generator-frame") || node.querySelector(".image-frame");
    const nodeX = Number.parseFloat(node.style.left || "0");
    const nodeY = Number.parseFloat(node.style.top || "0");
    const frameOffset = getElementOffsetWithinNode(frame, node);
    const frameWidth = Math.max(160, frame?.offsetWidth || node.offsetWidth || 560);
    const gap = 28;
    return {
      x: nodeX + frameOffset.left + frameWidth + gap + index * (frameWidth + gap),
      y: nodeY + frameOffset.top,
      width: frameWidth
    };
  }

  function applyGeneratedImageNodeSize(node, { width, dimensions } = {}) {
    if (!node) return;
    if (width) node.style.width = `${Math.round(width)}px`;
    const frame = node.querySelector(".image-frame");
    if (frame && dimensions?.width > 0 && dimensions?.height > 0) {
      frame.style.aspectRatio = `${dimensions.width} / ${dimensions.height}`;
    }
    node.dataset.manualSize = "true";
    if (dimensions?.width > 0) node.dataset.imageNaturalWidth = String(dimensions.width);
    if (dimensions?.height > 0) node.dataset.imageNaturalHeight = String(dimensions.height);
  }

  function applyGeneratedImageNodeResult(node, url, {
    prompt = "",
    model = "",
    dimensions = {},
    sourceNode = null
  } = {}) {
    if (!node || !url) return;
    const image = node.querySelector(".image-frame img");
    if (image) {
      image.src = url;
      image.removeAttribute?.("srcset");
      image.dataset.localSourceReady = "true";
    }
    node.dataset.objectUrl = url;
    node.dataset.sourceMode = "generated";
    node.dataset.generationPrompt = prompt;
    node.dataset.generationModel = model;
    if (sourceNode?.dataset?.nodeId) node.dataset.generatorSourceNodeId = sourceNode.dataset.nodeId;
    if (dimensions?.width > 0) node.dataset.outputWidth = String(dimensions.width);
    if (dimensions?.height > 0) node.dataset.outputHeight = String(dimensions.height);
  }

  async function handleDrop(node, dataTransfer) {
    const files = Array.from(dataTransfer?.files || []).filter((file) => file?.type?.startsWith("image/"));
    if (files.length) {
      await addReferenceFilesToGenerator(node, files);
      return;
    }
    const externalImageUrl = getDroppedExternalImageUrl(dataTransfer);
    if (!externalImageUrl) return;
    try {
      const file = await importExternalImageUrl(externalImageUrl);
      await addReferenceFilesToGenerator(node, [file]);
    } catch (error) {
      console.warn("[canvas] Failed to import generator reference", error);
      updateGeneratorStatus(node, "无法导入参考图");
    }
  }

  async function addReferenceFilesToGenerator(node, files = []) {
    if (!node || !files.length) return [];
    try {
      const references = await Promise.all(files
        .filter((file) => file?.type?.startsWith("image/"))
        .slice(0, 3)
        .map(async (file) => {
          const dataUrl = await readFileAsDataUrl(file);
          const metrics = await readImageDataUrlMetrics(dataUrl);
          return {
            name: file.name || "reference image",
            dataUrl,
            width: metrics.width,
            height: metrics.height
          };
        }));
      setGeneratorReferences(node, mergeGeneratorReferences(node, references));
      syncGeneratorFrameToRatio(node, getGeneratorRatioValue(node));
      selectNode(node);
      refreshGeneratorPopoverIfOpen(node);
      return references;
    } catch (error) {
      console.warn("[canvas] Failed to read generator reference", error);
      updateGeneratorStatus(node, "参考图读取失败");
      return [];
    }
  }

  async function addReferenceNodeToGenerator(generatorNode, sourceNode) {
    if (!generatorNode || !sourceNode?.classList?.contains("node-image")) return;
    const image = sourceNode.querySelector(".image-frame img");
    const src = image?.src || sourceNode.dataset.objectUrl || "";
    if (!src) return;
    try {
      const dataUrl = typeof readImageSourceAsDataUrl === "function"
        ? await readImageSourceAsDataUrl(src)
        : src;
      setGeneratorReferences(generatorNode, mergeGeneratorReferences(generatorNode, [{
        name: image?.alt || sourceNode.dataset.title || "canvas image",
        dataUrl,
        width: image?.naturalWidth || Number(sourceNode.dataset.imageNaturalWidth || 0) || 0,
        height: image?.naturalHeight || Number(sourceNode.dataset.imageNaturalHeight || 0) || 0
      }]));
      syncGeneratorFrameToRatio(generatorNode, getGeneratorRatioValue(generatorNode));
      selectNode(generatorNode);
      refreshGeneratorPopoverIfOpen(generatorNode);
    } catch (error) {
      console.warn("[canvas] Failed to use canvas image as generator reference", error);
      updateGeneratorStatus(generatorNode, "无法读取画布参考图");
    }
  }

  async function persistGeneratorResult({ node, sourceUrl, prompt, model }) {
    let dataUrl = "";
    if (typeof readImageSourceAsDataUrl === "function") {
      try {
        dataUrl = await readImageSourceAsDataUrl(sourceUrl);
      } catch (error) {
        console.warn("[canvas] Failed to localize image generator result", error);
      }
    }
    if (!dataUrl || typeof registerGeneratedAsset !== "function") return dataUrl || sourceUrl;
    try {
      const result = await registerGeneratedAsset({
        title: "Image Generator Result.png",
        url: dataUrl,
        dataUrl,
        thumbnailUrl: "",
        type: "image",
        source: "generated",
        prompt,
        modelName: model,
        libraryVisible: false
      });
      const asset = result?.asset || result;
      if (asset?.id) node.dataset.assetId = asset.id;
      if (asset?.url || asset?.thumbnailUrl) {
        node.dataset.objectUrl = asset.url || asset.thumbnailUrl;
        node.dataset.uploadPersisted = "true";
        return asset.url || asset.thumbnailUrl;
      }
    } catch (error) {
      console.warn("[canvas] Failed to persist image generator result", error);
    }
    return dataUrl || sourceUrl;
  }

  function showGeneratorPopover(node) {
    if (!node?.matches?.(GENERATOR_SELECTOR) || !node.isConnected) return;
    const nextPopover = getGeneratorPopover();
    if (!nextPopover) return;
    const previous = activeGeneratorNode;
    if (previous && previous !== node) saveGeneratorDraft(previous);
    activeGeneratorNode = node;
    const popoverHost = globalThis.document?.body || canvasViewport || canvasWorld;
    if (nextPopover.parentElement !== popoverHost) popoverHost.appendChild(nextPopover);
    globalThis.document?.querySelector?.("#imageEditPopover")?.classList.remove("open");
    closeGeneratorCustomSelects();
    nextPopover.classList.add("open");
    nextPopover.classList.toggle("generator-panel-expanded", node.dataset.generatorExpanded === "true");
    const controls = getGeneratorControls();
    if (controls.promptInput && previous !== node) {
      controls.promptInput.value = node._generatorPromptDraft || node.dataset.generationPrompt || "";
    }
    restoreGeneratorControlState(node);
    syncGeneratorFrameToRatio(node, getGeneratorRatioValue(node));
    renderGeneratorReferences(node, getGeneratorReferences(node));
    setGeneratorBusy(node, node.dataset.generatorBusy === "true");
    positionGeneratorPopover();
    observeGeneratorPosition(node);
  }

  function refreshGeneratorPopoverIfOpen(node) {
    const nextPopover = getGeneratorPopover();
    if (!node?.matches?.(GENERATOR_SELECTOR) || !nextPopover?.classList.contains("open")) return;
    if (activeGeneratorNode !== node) return;
    showGeneratorPopover(node);
  }

  function handleGeneratorSelectionChange(activeNode) {
    const nextPopover = getGeneratorPopover();
    if (!nextPopover?.classList.contains("open") && !activeGeneratorNode) return;
    if (activeNode === activeGeneratorNode) {
      refreshGeneratorPopoverIfOpen(activeNode);
      return;
    }
    if (activeNode?.matches?.(GENERATOR_SELECTOR)) {
      showGeneratorPopover(activeNode);
      return;
    }
    hideGeneratorPopover();
  }

  function hideGeneratorPopover() {
    const nextPopover = getGeneratorPopover();
    if (activeGeneratorNode) saveGeneratorDraft(activeGeneratorNode);
    activeGeneratorNode = null;
    closeGeneratorCustomSelects();
    nextPopover?.classList.remove("open", "generator-panel-expanded");
    teardownPositionObserver();
  }

  async function runImageGenerationRequest({ model, prompt, images = [], size, expectedType = "image", onJobCreated = null, onProgress = null } = {}) {
    logSubmittedGeneratorModel(model);
    const result = await postJsonRequest("/api/ai/generate", buildChatImagePayload({
      model,
      prompt,
      images,
      size
    }));
    if (result?.jobId) onJobCreated?.(result);
    if (result?.imageUrl || result?.videoUrl || !result?.jobId) return result;
    return waitForImageGenerationJob(result.jobId, { onProgress, fallback: result, expectedType });
  }

  async function waitForImageGenerationJob(jobId, {
    attempts = 180,
    delayMs = 2000,
    onProgress = null,
    fallback = {},
    expectedType = "image",
    missingUrlRetries = 4
  } = {}) {
    let lastPayload = { jobId, ...fallback };
    let missingUrlAttempts = 0;
    for (let index = 0; index < attempts; index += 1) {
      await delay(delayMs);
      const response = await fetch(`/api/ai/jobs/${encodeURIComponent(jobId)}`, {
        credentials: "include"
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 429) {
        const retryDelay = getRetryAfterDelayMs(response, delayMs * 2);
        onProgress?.(buildGeneratorRateLimitProgressPayload(lastPayload, payload));
        await delay(retryDelay);
        continue;
      }
      if (!response.ok) throw new Error(payload?.failureMessage || payload?.errorMessage || payload?.message || `Job request failed: ${response.status}`);
      lastPayload = { ...fallback, ...payload };
      logGeneratorJobPoll(lastPayload);
      if (isTerminalGeneratorJobStatus(payload?.status)) {
        const terminalResult = getTerminalGeneratorJobResult(lastPayload, expectedType);
        if (terminalResult.retryMissingUrl) {
          missingUrlAttempts += 1;
          if (missingUrlAttempts <= missingUrlRetries) {
            onProgress?.(buildGeneratorMissingUrlProgressPayload(lastPayload, expectedType));
            continue;
          }
        }
        if (terminalResult.error) throw terminalResult.error;
        return lastPayload;
      }
      onProgress?.(payload);
    }
    throw new Error(`Generation is still running. Job ID: ${lastPayload.jobId || jobId}`);
  }

  function buildGeneratorRateLimitProgressPayload(lastPayload = {}, payload = {}) {
    return {
      ...lastPayload,
      status: "running",
      rateLimited: true,
      message: payload?.message || "Waiting for job status"
    };
  }

  function isTerminalGeneratorJobStatus(status = "") {
    return ["succeeded", "failed", "cancelled", "timeout", "save_failed"].includes(status);
  }

  function getTerminalGeneratorJobResult(lastPayload = {}, expectedType = "image") {
    if (lastPayload.status !== "succeeded") {
      return {
        retryMissingUrl: false,
        error: getFailedGeneratorJobError(lastPayload)
      };
    }
    const resultUrls = getGeneratorResultUrls(lastPayload, expectedType);
    return {
      retryMissingUrl: !resultUrls.length,
      error: resultUrls.length ? null : getMissingGeneratorResultError(lastPayload, expectedType)
    };
  }

  function buildGeneratorMissingUrlProgressPayload(lastPayload = {}, expectedType = "image") {
    return {
      ...lastPayload,
      status: "running",
      message: expectedType === "video" ? "Waiting for saved video URL" : "Waiting for saved image URL"
    };
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getRetryAfterDelayMs(response, fallbackMs = 4000) {
    const value = Number.parseInt(response?.headers?.get?.("Retry-After") || "", 10);
    if (Number.isFinite(value) && value > 0) return value * 1000;
    return fallbackMs;
  }

  function getGeneratorResultModel(result = {}, fallbackModel = "") {
    return result?.requestedModel || result?.model || fallbackModel;
  }

  function warnIfGeneratorModelMismatch(selectedModel, returnedModel, result = {}) {
    const selected = String(selectedModel || "").trim();
    const returned = String(returnedModel || "").trim();
    if (!selected || !returned || selected === returned) return;
    console.warn("[models] Image generator response model does not match selected model", {
      selectedModel: selected,
      returnedModel: returned,
      jobId: result?.jobId || result?.job?.id || ""
    });
  }

  function logSubmittedGeneratorModel(model) {
    if (!["localhost", "127.0.0.1"].includes(globalThis.location?.hostname || "")) return;
    console.debug("[models] submitting generation", {
      surface: "generator",
      selectedModel: model,
      payloadModel: model
    });
  }

  function logGeneratorJobPoll(payload = {}) {
    if (!["localhost", "127.0.0.1"].includes(globalThis.location?.hostname || "")) return;
    console.debug("[generator] job poll", {
      jobId: payload.jobId || payload.job?.id || "",
      remoteTaskId: payload.remoteTaskId || payload.job?.remoteTaskId || "",
      status: payload.status || payload.job?.status || "",
      progress: payload.progress || payload.job?.progress || 0,
      imageUrls: getResultImageUrls(payload),
      videoUrls: getResultVideoUrls(payload),
      outputCount: payload.outputCount ?? payload.outputs?.length ?? 0,
      updatedAt: payload.updatedAt || payload.job?.updatedAt || ""
    });
  }

  function getResultImageUrls(result = {}) {
    const urls = [];
    if (Array.isArray(result?.imageUrls)) urls.push(...result.imageUrls);
    if (Array.isArray(result?.outputs)) {
      result.outputs.forEach((output) => {
        const type = String(output?.type || "").toLowerCase();
        const mimeType = String(output?.mimeType || output?.mime_type || "").toLowerCase();
        if (output?.url && (type === "image" || mimeType.startsWith("image/") || (!type && !mimeType))) {
          urls.push(output.url);
        }
      });
    }
    if (result?.imageUrl) urls.unshift(result.imageUrl);
    return Array.from(new Set(urls.filter(Boolean)));
  }

  function getPrimaryResultImageUrl(result = {}) {
    return getResultImageUrls(result)[0] || "";
  }

  function getGeneratorResultUrls(result = {}, expectedType = "image") {
    return expectedType === "video"
      ? getResultVideoUrls(result)
      : getResultImageUrls(result);
  }

  function getPrimaryGeneratorResultUrl(result = {}, expectedType = "image") {
    return getGeneratorResultUrls(result, expectedType)[0] || "";
  }

  function getResultVideoUrls(result = {}) {
    const urls = [];
    if (Array.isArray(result?.videoUrls)) urls.push(...result.videoUrls);
    if (Array.isArray(result?.outputs)) {
      result.outputs.forEach((output) => {
        const type = String(output?.type || "").toLowerCase();
        const mimeType = String(output?.mimeType || output?.mime_type || "").toLowerCase();
        if (output?.url && (type === "video" || mimeType.startsWith("video/"))) {
          urls.push(output.url);
        }
      });
    }
    if (result?.videoUrl) urls.unshift(result.videoUrl);
    return Array.from(new Set(urls.filter(Boolean)));
  }

  function getPrimaryResultVideoUrl(result = {}) {
    return getResultVideoUrls(result)[0] || "";
  }

  function getFailedGeneratorJobError(result = {}) {
    return new Error(result?.failureMessage || result?.errorMessage || result?.error || result?.status);
  }

  function getMissingGeneratorResultError(result = {}, expectedType = "image") {
    return new Error(getMissingGeneratorResultMessage(result, expectedType));
  }

  function getMissingGeneratorResultMessage(result = {}, expectedType = "image") {
    const fallback = expectedType === "video"
      ? "Model returned without a video URL"
      : "Model returned without an image URL";
    const message = String(result?.failureMessage || result?.errorMessage || result?.error || result?.message || fallback).trim();
    const details = [
      result?.jobId ? `jobId=${result.jobId}` : "",
      result?.status ? `status=${result.status}` : ""
    ].filter(Boolean).join(", ");
    return details ? `${message} (${details})` : message;
  }

  function isMidjourneyModel(model = "") {
    return String(model || "").trim().toLowerCase() === "midjourney";
  }

  function saveGeneratorDraft(node) {
    if (!node) return;
    const controls = getGeneratorControls();
    if (controls.promptInput) node._generatorPromptDraft = controls.promptInput.value;
    saveGeneratorControlState(node);
    node.dataset.generatorExpanded = controls.popover?.classList.contains("generator-panel-expanded") ? "true" : "false";
  }

  function saveGeneratorControlState(node) {
    if (!node) return;
    const controls = getGeneratorControls();
    if (controls.ratioSelect) node.dataset.generatorRatio = controls.ratioSelect.value || DEFAULT_GENERATOR_RATIO;
    if (controls.countSelect) node.dataset.generatorCount = controls.countSelect.value || DEFAULT_GENERATOR_COUNT;
  }

  function restoreGeneratorControlState(node) {
    const controls = getGeneratorControls();
    setGeneratorModelSelectValue(controls.modelSelect, getSyncedGeneratorModel());
    setSelectValue(controls.ratioSelect, node?.dataset.generatorRatio || DEFAULT_GENERATOR_RATIO);
    setSelectValue(controls.countSelect, node?.dataset.generatorCount || DEFAULT_GENERATOR_COUNT);
    syncGeneratorCustomSelects();
    closeGeneratorCustomSelects();
  }

  function syncGeneratorModelFromGlobal() {
    const controls = getGeneratorControls();
    if (!controls.popover?.classList?.contains("open") && !activeGeneratorNode) return;
    setGeneratorModelSelectValue(controls.modelSelect, getSyncedGeneratorModel());
    syncGeneratorCustomSelect(controls.modelSelect);
    syncGeneratorCustomSelect(controls.countSelect);
  }

  function getSyncedGeneratorModel() {
    return getSelectedModelId() || DEFAULT_GENERATOR_MODEL;
  }

  function setGeneratorModelSelectValue(select, value) {
    if (!select) return;
    setSelectValue(select, value);
    select.dataset.selectedModelId = select.value || "";
    select.dataset.modelUserSelected = "true";
    select.dataset.modelAuto = "false";
  }

  function setSelectValue(select, value) {
    if (!select) return;
    const hasValue = Array.from(select.options || []).some((option) => option.value === value);
    select.value = hasValue ? value : select.options?.[0]?.value || "";
  }

  function getGeneratorRatioValue(node) {
    return getGeneratorControls().ratioSelect?.value || node?.dataset.generatorRatio || DEFAULT_GENERATOR_RATIO;
  }

  function getGeneratorCount() {
    const value = Number.parseInt(getGeneratorControls().countSelect?.value || DEFAULT_GENERATOR_COUNT, 10);
    if (!Number.isFinite(value) || value <= 0) return Number(DEFAULT_GENERATOR_COUNT);
    return Math.max(1, Math.min(4, value));
  }

  function syncGeneratorFrameToRatio(node, ratio = DEFAULT_GENERATOR_RATIO) {
    if (!node) return null;
    const dimensions = getGeneratorOutputDimensions(node, ratio, getGeneratorReferences(node));
    const stage = node.querySelector(".image-generator-stage");
    const frame = node.querySelector(".image-generator-frame");
    const aspectRatio = `${dimensions.width} / ${dimensions.height}`;
    if (stage) stage.style.aspectRatio = aspectRatio;
    if (frame) frame.style.aspectRatio = aspectRatio;
    node.dataset.generatorRatio = ratio || DEFAULT_GENERATOR_RATIO;
    node.dataset.outputWidth = String(dimensions.width);
    node.dataset.outputHeight = String(dimensions.height);
    updateGeneratorSizeLabel(node, dimensions);
    scheduleGeneratorPopoverPosition();
    return dimensions;
  }

  function updateGeneratorSizeLabel(node, { width, height } = {}) {
    const label = node?.querySelector?.(".image-generator-size") || node?.querySelector?.(".image-generator-head > span:last-child");
    if (!label) return;
    label.textContent = `${Math.round(width || 1024)} × ${Math.round(height || 1024)}`;
  }

  function initGeneratorCustomSelects() {
    const nextPopover = getGeneratorPopover();
    nextPopover?.querySelectorAll?.("[data-generator-model], [data-generator-ratio], [data-generator-count]")
      .forEach((select) => {
        if (select.dataset.generatorCustomReady === "true") return;
        const kind = getGeneratorSelectKind(select);
        select.dataset.generatorCustomReady = "true";
        select.classList.add("generator-native-select");
        const wrap = document.createElement("div");
        wrap.className = "generator-select-wrap";
        wrap.dataset.generatorSelectKind = kind;
        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "generator-select-trigger";
        trigger.dataset.generatorSelectTrigger = kind;
        const menu = document.createElement("div");
        menu.className = "generator-select-menu";
        menu.dataset.generatorSelectMenu = kind;
        menu.setAttribute("role", "listbox");
        wrap.append(trigger, menu);
        select.after(wrap);
        select.__generatorSelectRebuild = () => syncGeneratorCustomSelect(select);
        syncGeneratorCustomSelect(select);
      });
  }

  function syncGeneratorCustomSelects() {
    getGeneratorPopover()?.querySelectorAll?.("[data-generator-model], [data-generator-ratio], [data-generator-count]")
      .forEach(syncGeneratorCustomSelect);
  }

  function syncGeneratorCustomSelect(select) {
    if (!select) return;
    const kind = getGeneratorSelectKind(select);
    const wrap = getGeneratorPopover()?.querySelector?.(`[data-generator-select-kind="${kind}"]`);
    const trigger = wrap?.querySelector?.("[data-generator-select-trigger]");
    const menu = wrap?.querySelector?.("[data-generator-select-menu]");
    if (!wrap || !trigger || !menu) return;
    wrap.classList.remove("open");
    const selectedOption = select.selectedOptions?.[0] || select.options?.[select.selectedIndex] || select.options?.[0];
    trigger.textContent = selectedOption?.dataset?.modelLabel || selectedOption?.textContent || "";
    trigger.disabled = select.disabled;
    trigger.dataset.value = select.value || "";
    menu.classList.remove("model-preference-menu");
    if (kind === "model") {
      renderModelPreferenceMenu({
        menu,
        select,
        surface: "generator",
        models: select.__modelPreferenceModels || [],
        allowVideo: true,
        onClose: closeGeneratorCustomSelects
      });
      return;
    }
    if (kind === "count" && getModelType(getGeneratorModel()) === "video") {
      trigger.textContent = "1 video";
      trigger.disabled = true;
      trigger.dataset.value = "video-default-1";
      menu.innerHTML = "";
      return;
    }
    if (kind === "count" && isMidjourneyModel(getGeneratorModel())) {
      trigger.textContent = "默认4张";
      trigger.disabled = true;
      trigger.dataset.value = "midjourney-default-4";
      menu.innerHTML = "";
      return;
    }
    menu.innerHTML = Array.from(select.options || []).map((option) => `
      <button type="button"
        class="generator-select-option${option.value === select.value ? " selected" : ""}"
        data-generator-select-option="${escapeAttribute(kind)}"
        data-value="${escapeAttribute(option.value)}"
        role="option"
        aria-selected="${option.value === select.value ? "true" : "false"}">
        ${escapeHtml(option.textContent || option.value)}
      </button>
    `).join("");
  }

  function toggleGeneratorCustomSelect(trigger) {
    const wrap = trigger.closest(".generator-select-wrap");
    if (!wrap || trigger.disabled) return;
    const isOpen = wrap.classList.contains("open");
    closeGeneratorCustomSelects();
    wrap.classList.toggle("open", !isOpen);
  }

  function chooseGeneratorCustomSelectOption(option) {
    const kind = option.dataset.generatorSelectOption;
    const select = getGeneratorSelectByKind(kind);
    if (!select) return;
    select.value = option.dataset.value || "";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    closeGeneratorCustomSelects();
  }

  function closeGeneratorCustomSelects() {
    getGeneratorPopover()?.querySelectorAll?.(".generator-select-wrap.open")
      .forEach((wrap) => wrap.classList.remove("open"));
  }

  function getGeneratorSelectByKind(kind) {
    const controls = getGeneratorControls();
    if (kind === "model") return controls.modelSelect;
    if (kind === "ratio") return controls.ratioSelect;
    if (kind === "count") return controls.countSelect;
    return null;
  }

  function getGeneratorSelectKind(select) {
    if (select?.matches?.("[data-generator-model]")) return "model";
    if (select?.matches?.("[data-generator-ratio]")) return "ratio";
    if (select?.matches?.("[data-generator-count]")) return "count";
    return "unknown";
  }

  function observeGeneratorPosition(node) {
    teardownPositionObserver();
    if (typeof ResizeObserver === "function") {
      popoverObserver = new ResizeObserver(() => scheduleGeneratorPopoverPosition());
      popoverObserver.observe(node);
      const frame = node.querySelector(".image-generator-frame");
      if (frame) popoverObserver.observe(frame);
      popoverObserver.observe(getGeneratorPopover());
    }
    if (typeof MutationObserver === "function") {
      popoverMutationObserver = new MutationObserver(() => scheduleGeneratorPopoverPosition());
      popoverMutationObserver.observe(node, {
        attributes: true,
        attributeFilter: ["style", "class"]
      });
    }
  }

  function teardownPositionObserver() {
    popoverObserver?.disconnect?.();
    popoverObserver = null;
    popoverMutationObserver?.disconnect?.();
    popoverMutationObserver = null;
    if (positionFrame) cancelAnimationFrame(positionFrame);
    positionFrame = 0;
  }

  function scheduleGeneratorPopoverPosition() {
    if (positionFrame) return;
    positionFrame = requestAnimationFrame(() => {
      positionFrame = 0;
      positionGeneratorPopover();
    });
  }

  function positionGeneratorPopover() {
    resetCanvasViewportScroll();
    const node = activeGeneratorNode;
    const nextPopover = getGeneratorPopover();
    if (!node || !nextPopover?.classList.contains("open")) return null;
    if (!node.isConnected) {
      hideGeneratorPopover();
      return null;
    }
    const frame = node.querySelector(".image-generator-frame");
    const nodeX = Number.parseFloat(node.style.left || "0");
    const nodeY = Number.parseFloat(node.style.top || "0");
    const frameOffset = getElementOffsetWithinNode(frame, node);
    const frameLeft = nodeX + frameOffset.left;
    const frameTop = nodeY + frameOffset.top;
    const frameWidth = frame?.offsetWidth || node.offsetWidth || 560;
    const frameHeight = frame?.offsetHeight || frameWidth;
    const safeZoom = Math.max(0.2, Math.min(2.5, Number(getZoom?.()) || 1));
    const screenNodeWidth = frameWidth * safeZoom;
    const minScreenWidth = 430;
    const maxScreenWidth = 620;
    const preferredScreenWidth = screenNodeWidth + 132;
    const targetScreenWidth = Math.max(minScreenWidth, Math.min(maxScreenWidth, preferredScreenWidth));
    const minScreenHeight = 168;
    const maxScreenHeight = 268;
    const expanded = nextPopover.classList.contains("generator-panel-expanded");
    const targetScreenHeight = expanded
      ? 292
      : Math.max(minScreenHeight, Math.min(maxScreenHeight, targetScreenWidth * 0.42));
    const popoverWidth = Math.round(targetScreenWidth);
    const popoverHeight = Math.round(targetScreenHeight);
    const scaledGap = 22;

    const position = getVisibleGeneratorPopoverPosition({
      frameLeft,
      frameTop,
      frameWidth,
      frameHeight,
      popoverWidth,
      popoverHeight,
      screenWidth: targetScreenWidth,
      screenHeight: targetScreenHeight,
      gap: scaledGap,
      zoom: safeZoom
    });

    nextPopover.style.width = `${popoverWidth}px`;
    nextPopover.style.height = `${popoverHeight}px`;
    nextPopover.style.minHeight = `${popoverHeight}px`;
    nextPopover.style.setProperty("--edit-scale", "1");
    nextPopover.style.position = "fixed";
    nextPopover.style.zIndex = "12070";
    nextPopover.style.left = `${position.left}px`;
    nextPopover.style.top = `${position.top}px`;
    resetCanvasViewportScroll();
    return { popoverWidth, popoverHeight, editScale: 1 };
  }

  function getVisibleGeneratorPopoverPosition({
    frameLeft,
    frameTop,
    frameWidth,
    frameHeight,
    popoverWidth,
    popoverHeight,
    screenWidth,
    screenHeight,
    gap,
    zoom
  } = {}) {
    let left = frameLeft + frameWidth / 2 - popoverWidth / 2;
    let top = frameTop + frameHeight + gap;
    const viewportRect = canvasViewport?.getBoundingClientRect?.();
    const worldRect = canvasWorld?.getBoundingClientRect?.();
    if (!viewportRect || !worldRect || !Number.isFinite(zoom) || zoom <= 0) {
      return { left, top };
    }

    const margin = 16;
    const frameScreenLeft = worldRect.left + frameLeft * zoom;
    const frameScreenTop = worldRect.top + frameTop * zoom;
    const frameScreenWidth = frameWidth * zoom;
    const frameScreenHeight = frameHeight * zoom;
    const screenLeft = frameScreenLeft + frameScreenWidth / 2 - popoverWidth / 2;
    const belowScreenTop = frameScreenTop + frameScreenHeight + gap;
    const clampedScreenLeft = clampScreenPosition(
      screenLeft,
      viewportRect.left + margin,
      viewportRect.right - screenWidth - margin
    );

    left = clampedScreenLeft;
    top = belowScreenTop;
    return { left, top };
  }

  function clampScreenPosition(value, min, max) {
    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : safeMin;
    if (safeMax < safeMin) return safeMin;
    return Math.min(safeMax, Math.max(safeMin, value));
  }

  function focusGeneratorPrompt(input = getGeneratorControls().promptInput) {
    if (!input?.focus) return;
    resetCanvasViewportScroll();
    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
    resetCanvasViewportScroll();
  }

  function resetCanvasViewportScroll() {
    if (!canvasViewport) return;
    if (canvasViewport.scrollLeft) canvasViewport.scrollLeft = 0;
    if (canvasViewport.scrollTop) canvasViewport.scrollTop = 0;
  }

  function getElementOffsetWithinNode(element, node) {
    let left = 0;
    let top = 0;
    let current = element;
    while (current && current !== node) {
      left += current.offsetLeft || 0;
      top += current.offsetTop || 0;
      current = current.offsetParent;
    }
    return { left, top };
  }

  function getGeneratorPopover() {
    return canvasWorld?.ownerDocument?.querySelector?.(GENERATOR_POPOVER_SELECTOR)
      || globalThis.document?.querySelector?.(GENERATOR_POPOVER_SELECTOR)
      || null;
  }

  function getGeneratorControls() {
    const nextPopover = getGeneratorPopover();
    return {
      popover: nextPopover,
      promptInput: nextPopover?.querySelector?.("[data-image-generator-prompt]") || null,
      referenceInput: nextPopover?.querySelector?.("[data-generator-reference-input]") || null,
      referenceList: nextPopover?.querySelector?.("[data-generator-reference-list]") || null,
      modelSelect: nextPopover?.querySelector?.("[data-generator-model]") || null,
      ratioSelect: nextPopover?.querySelector?.("[data-generator-ratio]") || null,
      countSelect: nextPopover?.querySelector?.("[data-generator-count]") || null,
      submitButton: nextPopover?.querySelector?.("[data-generator-submit]") || null
    };
  }

  return {
    addReferenceFilesToGenerator,
    hideGeneratorPopover,
    positionGeneratorPopover,
    showGeneratorPopover
  };
}

function hasGeneratorDropData(dataTransfer) {
  const types = Array.from(dataTransfer?.types || []);
  return types.includes("Files")
    || types.includes("text/html")
    || types.includes("text/uri-list")
    || types.includes("text/plain");
}

function getGeneratorReferences(node) {
  return Array.isArray(node?._generatorReferences) ? node._generatorReferences : [];
}

function mergeGeneratorReferences(node, nextReferences = []) {
  return [...getGeneratorReferences(node), ...nextReferences]
    .filter((item) => item?.dataUrl)
    .slice(0, 3);
}

function setGeneratorReferences(node, references = []) {
  if (!node) return;
  node._generatorReferences = references;
  node.dataset.generatorReferenceCount = String(references.length);
  const status = references.length
    ? `图生图 · ${references.length} 张参考图`
    : "文生图";
  updateGeneratorStatus(node, status);
  renderGeneratorReferences(node, references);
  node.classList.toggle("has-generator-reference", references.length > 0);
}

function clearGeneratorReferences(node) {
  setGeneratorReferences(node, []);
}

function removeGeneratorReference(node, index) {
  const references = getGeneratorReferences(node);
  if (!Number.isInteger(index) || index < 0 || index >= references.length) return;
  setGeneratorReferences(node, references.filter((_, itemIndex) => itemIndex !== index));
}

function resetGeneratorInput(node) {
  if (!node) return;
  const popover = globalThis.document?.querySelector?.(GENERATOR_POPOVER_SELECTOR);
  const promptInput = popover?.querySelector?.("[data-image-generator-prompt]");
  if (promptInput) promptInput.value = "";
  node._generatorPromptDraft = "";
  clearGeneratorReferences(node);
  updateGeneratorStatus(node, "文生图");
}

function renderGeneratorReferences(node, references = []) {
  const popover = globalThis.document?.querySelector?.(GENERATOR_POPOVER_SELECTOR);
  const list = popover?.querySelector?.("[data-generator-reference-list]");
  if (!list || (node && !node.matches?.(GENERATOR_SELECTOR))) return;
  list.innerHTML = references.map((reference, index) => `
    <button type="button" class="image-generator-reference-thumb" data-generator-reference-index="${index}" title="${escapeAttribute(reference.name || "参考图")}">
      <img src="${reference.dataUrl}" alt="${escapeAttribute(reference.name || "参考图")}" />
    </button>
  `).join("");
}

function updateGeneratorStatus(node, text) {
  if (node) node.dataset.generatorStatus = text || "";
  const popover = globalThis.document?.querySelector?.(GENERATOR_POPOVER_SELECTOR);
  if (popover) popover.dataset.generatorStatus = text || "";
}

function setGeneratorBusy(node, busy) {
  if (!node) return;
  node.dataset.generatorBusy = busy ? "true" : "false";
  node.classList.toggle("generator-busy", busy);
  const loading = node.querySelector(".image-generator-loading");
  const popover = globalThis.document?.querySelector?.(GENERATOR_POPOVER_SELECTOR);
  const submit = popover?.querySelector?.("[data-generator-submit]");
  if (loading) loading.hidden = !busy;
  if (submit) submit.disabled = busy;
  popover?.querySelectorAll?.("[data-generator-model], [data-generator-ratio], [data-generator-count], [data-generator-add-reference], [data-generator-cancel]")
    .forEach((control) => {
      control.disabled = busy;
    });
  popover?.querySelectorAll?.("[data-generator-model], [data-generator-ratio], [data-generator-count]")
    .forEach((select) => {
      const kind = select.matches("[data-generator-model]")
        ? "model"
        : (select.matches("[data-generator-ratio]") ? "ratio" : "count");
      const trigger = popover.querySelector(`[data-generator-select-trigger="${kind}"]`);
      if (trigger) trigger.disabled = busy;
    });
}

function applyGeneratorResult(node, url, { prompt = "", model = "" } = {}) {
  const image = node?.querySelector?.(".image-generator-result");
  const placeholder = node?.querySelector?.("[data-generator-placeholder]");
  if (!image || !url) return;
  image.src = url;
  image.hidden = false;
  if (placeholder) placeholder.hidden = true;
  node.classList.remove("generation-failed");
  node.classList.add("has-generator-result");
  node.dataset.objectUrl = url;
  node.dataset.sourceMode = "generated";
  node.dataset.generationPrompt = prompt;
  node.dataset.generationModel = model;
  updateGeneratorStatus(node, getGeneratorReferences(node).length ? "图生图 · 已生成" : "文生图 · 已生成");
}

function getActiveGeneratorNode() {
  const active = globalThis.document?.activeElement?.closest?.(GENERATOR_SELECTOR);
  if (active) return active;
  return globalThis.document?.querySelector?.(`${GENERATOR_SELECTOR}.selected[data-active-selection='true']`)
    || globalThis.document?.querySelector?.(`${GENERATOR_SELECTOR}.selected`)
    || null;
}

function getGeneratorModel() {
  const generatorSelect = globalThis.document?.querySelector?.(`${GENERATOR_POPOVER_SELECTOR} [data-generator-model]`);
  const chatSelect = globalThis.document?.querySelector?.("#chatModelSelect");
  return generatorSelect?.dataset?.selectedModelId
    || generatorSelect?.value
    || chatSelect?.dataset?.selectedModelId
    || chatSelect?.value
    || DEFAULT_GENERATOR_MODEL;
}

function resolveGeneratorOutputSize(node, references = []) {
  const dimensions = getGeneratorOutputDimensions(
    node,
    node?.dataset?.generatorRatio
      || globalThis.document?.querySelector?.(`${GENERATOR_POPOVER_SELECTOR} [data-generator-ratio]`)?.value
      || DEFAULT_GENERATOR_RATIO,
    references
  );
  return `${dimensions.width}*${dimensions.height}`;
}

function getGeneratorOutputDimensions(node, ratio = DEFAULT_GENERATOR_RATIO, references = []) {
  if (ratio === "original" || ratio === "auto") {
    return GENERATOR_FIXED_SIZES[DEFAULT_GENERATOR_RATIO] || parseImageSize(OUTPUT_SIZE);
  }
  if (GENERATOR_FIXED_SIZES[ratio]) return GENERATOR_FIXED_SIZES[ratio];
  const width = Number(node?.dataset?.outputWidth || 0);
  const height = Number(node?.dataset?.outputHeight || 0);
  if (width > 0 && height > 0) return { width, height };
  return parseImageSize(OUTPUT_SIZE);
}

function parseImageSize(value = OUTPUT_SIZE) {
  const [width, height] = String(value || OUTPUT_SIZE)
    .split("*")
    .map((part) => Number.parseInt(part, 10));
  return {
    width: Number.isFinite(width) && width > 0 ? width : 1024,
    height: Number.isFinite(height) && height > 0 ? height : 1024
  };
}

function readImageDataUrlMetrics(dataUrl) {
  if (!dataUrl || typeof Image !== "function") return Promise.resolve({ width: 0, height: 0 });
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({
      width: image.naturalWidth || 0,
      height: image.naturalHeight || 0
    });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = dataUrl;
  });
}

function escapeAttribute(value = "") {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeHtml(value = "") {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read image file"));
    reader.readAsDataURL(file);
  });
}
