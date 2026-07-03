import {
  getDroppedExternalImageUrl,
  importExternalImageUrl
} from "../canvas-viewport-events.js";
import {
  getImageModelDisplayName,
  getModelType,
  getSelectedModelId
} from "../../ai/model-catalog.js?v=20260627-library-bulk-select-1";
import { renderModelPreferenceMenu } from "../../ai/model-preference-menu.js";
import {
  applyGeneratedImageNodeResult,
  applyGeneratedImageNodeSize,
  getMissingGeneratorResultError,
  getMissingGeneratorResultMessage,
  getGeneratorResultTitle,
  getResultImageUrls,
  parseGeneratorResult
} from "./image-generator-result-utils.js";
import {
  logGeneratorJobPoll,
  logSubmittedGeneratorModel
} from "./image-generator-debug-log-utils.js";
import {
  buildGeneratorMissingUrlProgressPayload,
  buildGeneratorRateLimitProgressPayload,
  buildInitialGeneratorJobPayload,
  delayGeneratorJobPoll,
  getGeneratorJobRequestError,
  getGeneratorJobStatusPath,
  getRetryAfterDelayMs,
  getTerminalGeneratorJobPollDecision,
  isTerminalGeneratorJobStatus,
  mergeGeneratorJobPayload
} from "./image-generator-job-polling-utils.js";
import {
  buildGeneratorImagePreviewReplacementOptions,
  buildGeneratorVideoPreviewReplacementOptions,
  ensureGeneratorPreviewReplacement,
  replaceGeneratorImagePreviewNode
} from "./image-generator-preview-replacement-utils.js";
import {
  applyGeneratorPreviewBatchMetadata,
  applyGeneratorPreviewDimensions,
  buildGeneratorPreviewJobMeta,
  getGeneratorPreviewDescription,
  getGeneratorPreviewNodeWidth as getPreviewNodeWidth,
  getGeneratorPreviewBatchIndex,
  getPendingGeneratorPreviewGroups,
  getRecoveredGeneratorPreviewUrl,
  markGeneratorPreviewFailed,
  tagGeneratorPreviewJobs,
  updateGeneratorPreviewStatus as updatePreviewStatus
} from "./image-generator-preview-job-utils.js";
import {
  getGeneratorReferences,
  mergeGeneratorReferences,
  readGeneratorReferenceFiles
} from "./image-generator-reference-utils.js";
import {
  closeGeneratorCustomSelects as closeGeneratorCustomSelectState,
  createGeneratorCustomSelect,
  getGeneratorCountSelectState,
  getGeneratorSelectByKind,
  getGeneratorSelectKind,
  getGeneratorSelectTriggerText,
  renderGeneratorSelectOptions,
  toggleGeneratorCustomSelect as toggleGeneratorCustomSelectState
} from "./image-generator-select-utils.js";
import {
  getGeneratorOutputDimensions,
  resolveGeneratorOutputSize,
  syncGeneratorFrameToRatio as syncGeneratorFrameStateToRatio
} from "./image-generator-sizing-utils.js";
import {
  fileToDataUrl,
  readImageDataUrlMetrics
} from "./image-generator-image-read-utils.js";
import {
  clearGeneratorReferences,
  hasGeneratorDropData,
  removeGeneratorReference,
  renderGeneratorReferences,
  resetGeneratorInput,
  setGeneratorBusy,
  setGeneratorReferences,
  updateGeneratorStatus
} from "./image-generator-dom-state-utils.js";
import {
  getElementOffsetWithinNode,
  getGeneratorPopoverMetrics,
  getVisibleGeneratorPopoverPosition
} from "./image-generator-popover-position-utils.js";
import {
  getGeneratedImagePlacement,
  getGeneratorReplacementPlacement
} from "./image-generator-placement-utils.js";
import {
  getGeneratorControls as getGeneratorControlsFromPopover,
  getGeneratorCountValue,
  getGeneratorRatioValueFromControls,
  getSyncedGeneratorModelValue,
  isMidjourneyGeneratorModel as isMidjourneyModel,
  resolveGeneratorModelValue,
  saveGeneratorControlDataset,
  setGeneratorModelSelectValue,
  setSelectValue
} from "./image-generator-control-state-utils.js";

const GENERATOR_SELECTOR = ".node-image-generator";
const GENERATOR_POPOVER_SELECTOR = "#imageGeneratorPopover";
const DEFAULT_GENERATOR_MODEL = "doubao-seedream-5-0-lite-260128";
const DEFAULT_GENERATOR_RATIO = "1:1";
const DEFAULT_GENERATOR_COUNT = "1";
const MIDJOURNEY_IMAGE_COUNT = 4;

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
        const createdNode = ensureGeneratorPreviewReplacement(replaceGeneratorImagePreviewNode(previewNode, buildGeneratorImagePreviewReplacementOptions({
          replacePreviewWithImage,
          getPreviewNodeWidth,
          title: getGeneratorResultTitle(index, count),
          desc: prompt || "Image generator result",
          url,
          aspectRatio,
          prompt,
          actionType,
          model: resultModel
        })));
        applyGeneratedImageNodeResult(createdNode, url, {
          prompt,
          model: resultModel,
          dimensions,
          sourceNode: null
        });
        return registerGeneratedNode(createdNode, index, { trackBatch: true });
      };
      const replaceGeneratorVideoPreview = (previewNode, url) => {
        const createdNode = ensureGeneratorPreviewReplacement(replacePreviewWithVideo(previewNode, buildGeneratorVideoPreviewReplacementOptions(previewNode, {
          getPreviewNodeWidth,
          title: "Generated Video.mp4",
          desc: prompt || "Image generator video result",
          url,
          aspectRatio,
          prompt,
          actionType: "video_generation",
          model: resultModel
        })));
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
        const parsedResult = parseGeneratorResult(result, model, "video");
        const videoUrl = parsedResult.primaryUrl;
        if (!videoUrl) throw getMissingGeneratorResultError(result, "video");
        ({ resultModel, modelUsage } = parsedResult);
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
        const parsedResult = parseGeneratorResult(result, model);
        const resultUrls = parsedResult.urls;
        if (resultUrls.length < count) throw new Error(`Midjourney returned ${resultUrls.length || 0}/${count} images`);
        ({ resultModel, modelUsage } = parsedResult);
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
        const parsedResult = parseGeneratorResult(result, model);
        const imageUrl = parsedResult.primaryUrl;
        if (!imageUrl) throw getMissingGeneratorResultError(result);
        ({ resultModel, modelUsage } = parsedResult);

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

  function resumePendingGeneratorPreviews() {
    const root = canvasWorld?.ownerDocument || globalThis.document;
    const groups = getPendingGeneratorPreviewGroups(root);
    if (!groups.size) return;
    groups.forEach((nodes, jobId) => resumeGeneratorPreviewGroup(jobId, nodes));
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

  function replaceRecoveredGeneratorPreview(previewNode, { jobId, result = {}, url = "", index = 0, count = 1 } = {}) {
    if (!previewNode?.isConnected) return null;
    if (!url) throw new Error(getMissingGeneratorResultMessage(result));
    const batchIndex = getGeneratorPreviewBatchIndex(previewNode, index);
    const createdNode = ensureGeneratorPreviewReplacement(replaceGeneratorImagePreviewNode(previewNode, buildGeneratorImagePreviewReplacementOptions({
      replacePreviewWithImage,
      getPreviewNodeWidth,
      title: getGeneratorResultTitle(batchIndex, count),
      desc: previewNode.dataset.generatorPrompt || "Image generator result",
      url,
      aspectRatio: previewNode.dataset.generatorAspectRatio || "",
      prompt: previewNode.dataset.generatorPrompt || "",
      actionType: previewNode.dataset.generatorActionType || "",
      model: result.requestedModel || result.model || previewNode.dataset.generatorModel || ""
    })));
    createdNode.dataset.generatorJobId = jobId;
    return createdNode;
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
    const title = getGeneratorResultTitle(index, count);
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
    const title = getGeneratorResultTitle(0, count);
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
      const references = await readGeneratorReferenceFiles(files, {
        readFileAsDataUrl,
        readImageDataUrlMetrics
      });
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
    let lastPayload = buildInitialGeneratorJobPayload(jobId, fallback);
    let missingUrlAttempts = 0;
    for (let index = 0; index < attempts; index += 1) {
      await delayGeneratorJobPoll(delayMs);
      const response = await fetch(getGeneratorJobStatusPath(jobId), {
        credentials: "include"
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 429) {
        const retryDelay = getRetryAfterDelayMs(response, delayMs * 2);
        onProgress?.(buildGeneratorRateLimitProgressPayload(lastPayload, payload));
        await delayGeneratorJobPoll(retryDelay);
        continue;
      }
      if (!response.ok) throw getGeneratorJobRequestError(payload, response.status);
      lastPayload = mergeGeneratorJobPayload(fallback, payload);
      logGeneratorJobPoll(lastPayload);
      if (isTerminalGeneratorJobStatus(payload?.status)) {
        const decision = getTerminalGeneratorJobPollDecision({
          lastPayload,
          expectedType,
          missingUrlAttempts,
          missingUrlRetries
        });
        missingUrlAttempts = decision.missingUrlAttempts;
        if (decision.shouldRetryMissingUrl) {
          onProgress?.(buildGeneratorMissingUrlProgressPayload(lastPayload, expectedType));
          continue;
        }
        if (decision.error) throw decision.error;
        return lastPayload;
      }
      onProgress?.(payload);
    }
    throw new Error(`Generation is still running. Job ID: ${lastPayload.jobId || jobId}`);
  }

  function saveGeneratorDraft(node) {
    if (!node) return;
    const controls = getGeneratorControls();
    if (controls.promptInput) node._generatorPromptDraft = controls.promptInput.value;
    saveGeneratorControlState(node);
    node.dataset.generatorExpanded = controls.popover?.classList.contains("generator-panel-expanded") ? "true" : "false";
  }

  function saveGeneratorControlState(node) {
    saveGeneratorControlDataset(node, getGeneratorControls(), {
      defaultRatio: DEFAULT_GENERATOR_RATIO,
      defaultCount: DEFAULT_GENERATOR_COUNT
    });
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
    return getSyncedGeneratorModelValue(getSelectedModelId(), DEFAULT_GENERATOR_MODEL);
  }

  function getGeneratorRatioValue(node) {
    return getGeneratorRatioValueFromControls(getGeneratorControls(), node, DEFAULT_GENERATOR_RATIO);
  }

  function getGeneratorCount() {
    return getGeneratorCountValue(getGeneratorControls(), DEFAULT_GENERATOR_COUNT);
  }

  function syncGeneratorFrameToRatio(node, ratio = DEFAULT_GENERATOR_RATIO) {
    return syncGeneratorFrameStateToRatio(node, ratio, {
      defaultRatio: DEFAULT_GENERATOR_RATIO,
      onSync: scheduleGeneratorPopoverPosition
    });
  }

  function initGeneratorCustomSelects() {
    const nextPopover = getGeneratorPopover();
    nextPopover?.querySelectorAll?.("[data-generator-model], [data-generator-ratio], [data-generator-count]")
      .forEach((select) => {
        if (select.dataset.generatorCustomReady === "true") return;
        createGeneratorCustomSelect(select, {
          documentRef: document,
          onRebuild: syncGeneratorCustomSelect
        });
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
    trigger.textContent = getGeneratorSelectTriggerText(select);
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
    if (kind === "count") {
      const model = getGeneratorModel();
      const countState = getGeneratorCountSelectState({
        kind,
        modelType: getModelType(model),
        isMidjourney: isMidjourneyModel(model)
      });
      if (countState) {
        trigger.textContent = countState.text;
        trigger.disabled = countState.disabled;
        trigger.dataset.value = countState.value;
        if (countState.clearMenu) menu.innerHTML = "";
        return;
      }
    }
    menu.innerHTML = renderGeneratorSelectOptions(select, kind);
  }

  function toggleGeneratorCustomSelect(trigger) {
    toggleGeneratorCustomSelectState(trigger, {
      closeSelects: closeGeneratorCustomSelects
    });
  }

  function chooseGeneratorCustomSelectOption(option) {
    const kind = option.dataset.generatorSelectOption;
    const select = getGeneratorSelectByKind(getGeneratorControls(), kind);
    if (!select) return;
    select.value = option.dataset.value || "";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    closeGeneratorCustomSelects();
  }

  function closeGeneratorCustomSelects() {
    closeGeneratorCustomSelectState(getGeneratorPopover());
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
    const {
      safeZoom,
      screenWidth,
      screenHeight,
      popoverWidth,
      popoverHeight,
      gap
    } = getGeneratorPopoverMetrics({
      frameWidth,
      zoom: getZoom?.(),
      expanded: nextPopover.classList.contains("generator-panel-expanded")
    });

    const position = getVisibleGeneratorPopoverPosition({
      frameLeft,
      frameTop,
      frameWidth,
      frameHeight,
      popoverWidth,
      popoverHeight,
      screenWidth,
      screenHeight,
      gap,
      zoom: safeZoom,
      viewportRect: canvasViewport?.getBoundingClientRect?.(),
      worldRect: canvasWorld?.getBoundingClientRect?.()
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

  function getGeneratorPopover() {
    return canvasWorld?.ownerDocument?.querySelector?.(GENERATOR_POPOVER_SELECTOR)
      || globalThis.document?.querySelector?.(GENERATOR_POPOVER_SELECTOR)
      || null;
  }

  function getGeneratorControls() {
    return getGeneratorControlsFromPopover(getGeneratorPopover());
  }

  return {
    addReferenceFilesToGenerator,
    hideGeneratorPopover,
    positionGeneratorPopover,
    showGeneratorPopover
  };
}

function getActiveGeneratorNode() {
  const active = globalThis.document?.activeElement?.closest?.(GENERATOR_SELECTOR);
  if (active) return active;
  return globalThis.document?.querySelector?.(`${GENERATOR_SELECTOR}.selected[data-active-selection='true']`)
    || globalThis.document?.querySelector?.(`${GENERATOR_SELECTOR}.selected`)
    || null;
}

function getGeneratorModel() {
  return resolveGeneratorModelValue({
    popoverSelector: GENERATOR_POPOVER_SELECTOR,
    defaultModel: DEFAULT_GENERATOR_MODEL
  });
}

