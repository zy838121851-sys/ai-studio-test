import {
  getCachedImageModels,
  getModelType,
  getSelectedModelId
} from "../../ai/model-catalog.js?v=20260627-library-bulk-select-1";
import {
  escapeAttribute,
  escapeHtml
} from "./video-generator-escape-utils.js";
import {
  isVideoGenerationBusy,
  restoreVideoDraftState,
  saveVideoDraftState,
  setVideoBusyState,
  setVideoStatusText
} from "./video-generator-form-state-utils.js";
import {
  buildVideoGenerationInputs,
  getResultVideoUrl,
  hasVideoGenerationInput,
  hasVideoGenerationModel,
  hasVideoGenerationServices,
  postVideoJson,
  runVideoRequest
} from "./video-generator-job-utils.js";
import {
  formatRatioLabel,
  getVideoGenerationModels,
  getModeOptions,
  getVideoModelByIdFromList,
  getVideoOptionGroupValue,
  getVideoSavedOption,
  getSelectedVideoOptionsFromModel,
  getVideoSelectedModelId,
  chooseVideoOptionElement,
  renderVideoOptionGroup,
  renderVideoModelSelect,
  toOptions
} from "./video-generator-option-utils.js";
import {
  createVideoPreviewNode,
  getVideoProgressStatusText,
  markVideoPreviewFailed,
  replaceVideoPreviewWithResult,
  updatePreviewStatus
} from "./video-generator-preview-utils.js";
import {
  applyVideoPopoverPosition,
  getVideoPopoverPositionStyle
} from "./video-generator-position-utils.js";
import {
  getVideoReferences,
  mergeVideoReferences,
  readVideoReferenceFiles,
  removeVideoReferenceAt,
  renderVideoReferenceThumbnails
} from "./video-generator-reference-utils.js";

const VIDEO_SELECTOR = ".node-video";
const VIDEO_POPOVER_SELECTOR = "#videoGeneratorPopover";
const DEFAULT_VIDEO_RATIO = "16:9";

export function createVideoGeneratorWorkflow({
  elements = {},
  services = {}
} = {}) {
  const {
    canvasWorld = globalThis.document?.querySelector?.("#canvasWorld")
  } = elements;

  const {
    addGenerationPreview = null,
    postJsonRequest = postVideoJson,
    replacePreviewWithVideo = null,
    saveCurrentProjectAfterGeneration = null,
    selectNode = () => {}
  } = services;

  let activeVideoNode = null;
  let popoverObserver = null;
  let positionFrame = 0;

  if (!canvasWorld) {
    return {
      hideVideoGeneratorPopover: () => {},
      showVideoGeneratorPopover: () => {}
    };
  }

  const popover = getVideoPopover();
  popover?.addEventListener("pointerdown", (event) => event.stopPropagation());
  popover?.addEventListener("dblclick", (event) => event.stopPropagation());
  popover?.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  popover?.addEventListener("click", handlePopoverClick);
  popover?.addEventListener("change", handlePopoverChange);
  popover?.addEventListener("submit", handlePopoverSubmit);

  const ownerDocument = canvasWorld.ownerDocument || globalThis.document;
  ownerDocument?.addEventListener?.("pointerdown", (event) => {
    if (getVideoPopover()?.contains(event.target)) return;
    if (event.target.closest?.(VIDEO_SELECTOR)) return;
    hideVideoGeneratorPopover();
  }, true);

  ownerDocument?.addEventListener?.("canvas:selection-changed", (event) => {
    const node = event.detail?.activeNode || null;
    if (node?.matches?.(VIDEO_SELECTOR)) {
      showVideoGeneratorPopover(node);
      return;
    }
    hideVideoGeneratorPopover();
  });

  ownerDocument?.addEventListener?.("canvas:image-generator-selected", () => {
    hideVideoGeneratorPopover();
  });

  ownerDocument?.addEventListener?.("canvas:video-generator-deleted", (event) => {
    const deletedNodes = Array.from(event.detail?.nodes || []);
    if (!activeVideoNode) return;
    if (!activeVideoNode.isConnected || deletedNodes.includes(activeVideoNode)) hideVideoGeneratorPopover();
  });

  ownerDocument?.addEventListener?.("canvas:context-overlay-close", hideVideoGeneratorPopover);
  ownerDocument?.addEventListener?.("canvas:view-transformed", scheduleVideoPopoverPosition);
  ownerDocument?.addEventListener?.("ai-studio-models-updated", refreshVideoModelOptions);
  ownerDocument?.addEventListener?.("ai-studio-model-selection-changed", refreshVideoModelOptions);
  globalThis.window?.addEventListener?.("resize", scheduleVideoPopoverPosition, { passive: true });

  function showVideoGeneratorPopover(node) {
    if (!node?.matches?.(VIDEO_SELECTOR) || !node.isConnected) return;
    const nextPopover = getVideoPopover();
    if (!nextPopover) return;
    if (activeVideoNode && activeVideoNode !== node) saveVideoDraft(activeVideoNode);
    activeVideoNode = node;
    const host = globalThis.document?.body || canvasWorld;
    if (nextPopover.parentElement !== host) host.appendChild(nextPopover);
    globalThis.document?.querySelector?.("#imageGeneratorPopover")?.classList.remove("open", "generator-panel-expanded");
    nextPopover.classList.add("open");
    restoreVideoDraft(node);
    refreshVideoModelOptions();
    renderVideoReferences(node);
    setVideoBusy(node, node.dataset.videoGeneratorBusy === "true");
    positionVideoPopover();
    observeVideoPosition(node);
  }

  function hideVideoGeneratorPopover() {
    const nextPopover = getVideoPopover();
    if (activeVideoNode) saveVideoDraft(activeVideoNode);
    activeVideoNode = null;
    nextPopover?.classList.remove("open");
    teardownVideoPositionObserver();
  }

  function handlePopoverClick(event) {
    const addButton = event.target.closest("[data-video-generator-add-reference]");
    if (addButton) {
      event.preventDefault();
      getVideoControls().referenceInput?.click();
      return;
    }
    const option = event.target.closest("[data-video-option]");
    if (option) {
      event.preventDefault();
      chooseVideoOption(option);
    }
  }

  function handlePopoverChange(event) {
    const input = event.target.closest("[data-video-generator-reference-input]");
    if (input && activeVideoNode) {
      addVideoReferenceFiles(activeVideoNode, Array.from(input.files || []));
      input.value = "";
      return;
    }
    const select = event.target.closest("[data-video-generator-model]");
    if (select && activeVideoNode) {
      select.dataset.selectedModelId = select.value || "";
      syncVideoOptionGroups();
      saveVideoDraft(activeVideoNode);
    }
  }

  function handlePopoverSubmit(event) {
    if (!event.target.closest("[data-video-generator-form]")) return;
    event.preventDefault();
    runVideoGeneration(activeVideoNode);
  }

  async function runVideoGeneration(node) {
    if (!node || isVideoGenerationBusy(node)) return;
    const controls = getVideoControls();
    const prompt = controls.promptInput?.value?.trim?.() || "";
    const references = getVideoReferences(node);
    if (!hasVideoGenerationInput(prompt, references)) {
      setVideoStatus("Enter a prompt or add a reference image.");
      controls.promptInput?.focus?.();
      return;
    }
    if (!hasVideoGenerationServices({ addGenerationPreview, replacePreviewWithVideo })) {
      setVideoStatus("Video generation workflow is unavailable.");
      return;
    }

    const model = getSelectedVideoModelId();
    if (!hasVideoGenerationModel(model)) {
      setVideoStatus("No video model is available.");
      return;
    }
    const modelConfig = getVideoModelById(model);
    const videoOptions = getSelectedVideoOptions(modelConfig);
    const generationInputs = buildVideoGenerationInputs({
      model,
      prompt,
      references,
      videoOptions,
      defaultRatio: DEFAULT_VIDEO_RATIO
    });
    const previewNode = createVideoPreviewNode(addGenerationPreview, node, {
      prompt: generationInputs.prompt,
      aspectRatio: generationInputs.aspectRatio
    });
    if (!previewNode) {
      setVideoStatus("Unable to create video preview.");
      return;
    }

    setVideoBusy(node, true);
    setVideoStatus("Generating video...");
    saveVideoDraft(node);
    try {
      const result = await runVideoRequest({
        model: generationInputs.model,
        prompt: generationInputs.prompt,
        images: generationInputs.images,
        videoOptions: generationInputs.videoOptions,
        defaultSize: DEFAULT_VIDEO_RATIO,
        postJsonRequest,
        onProgress: (payload) => {
          updatePreviewStatus(previewNode, getVideoProgressStatusText(payload?.progress));
        }
      });
      const videoUrl = getResultVideoUrl(result);
      if (!videoUrl) throw new Error(result?.failureMessage || result?.errorMessage || result?.error || "Model returned without a video URL");
      const createdNode = replaceVideoPreviewWithResult({
        replacePreviewWithVideo,
        selectNode,
        previewNode,
        prompt: generationInputs.prompt,
        videoUrl,
        aspectRatio: generationInputs.aspectRatio,
        sourceNode: node,
        result,
        model: generationInputs.model
      });
      if (!createdNode) throw new Error("Unable to replace video preview");
      hideVideoGeneratorPopover();
      await saveCurrentProjectAfterGeneration?.();
      globalThis.window?.dispatchEvent?.(new CustomEvent("ai-studio-credits-refresh"));
    } catch (error) {
      markVideoPreviewFailed(previewNode, error);
      setVideoStatus(error?.message || "Video generation failed.");
    } finally {
      if (node?.isConnected) setVideoBusy(node, false);
    }
  }

  function refreshVideoModelOptions() {
    const controls = getVideoControls();
    const select = controls.modelSelect;
    if (!select) return;
    const models = getVideoModels();
    const current = select.dataset.selectedModelId || select.value || getSelectedVideoModelId(models);
    renderVideoModelSelect(select, { models, current, escapeAttribute, escapeHtml });
    syncVideoOptionGroups();
  }

  function syncVideoOptionGroups() {
    const model = getVideoModelById(getSelectedVideoModelId());
    const allowed = model?.allowedOptions || {};
    renderOptionGroup("mode", getModeOptions(allowed), getSavedOption("mode") || "reference");
    renderOptionGroup("size", toOptions(allowed.size, formatRatioLabel), getSavedOption("size") || allowed.size?.[0] || DEFAULT_VIDEO_RATIO);
    renderOptionGroup("resolution", toOptions(allowed.resolution), getSavedOption("resolution") || allowed.resolution?.[0] || "");
    renderOptionGroup("duration", toOptions(allowed.duration, (value) => `${value}s`), getSavedOption("duration") || String(allowed.duration?.[0] || ""));
    const audioOptions = Array.isArray(allowed.generate_audio) && allowed.generate_audio.includes(true)
      ? [{ value: "false", label: "Audio off" }, { value: "true", label: "Audio on" }]
      : [];
    renderOptionGroup("audio", audioOptions, getSavedOption("audio") || "false");
    saveVideoDraft(activeVideoNode);
  }

  function renderOptionGroup(kind, options = [], selectedValue = "") {
    const group = getVideoPopover()?.querySelector?.(`[data-video-option-group="${kind}"]`);
    renderVideoOptionGroup(group, { kind, options, selectedValue, escapeAttribute, escapeHtml });
  }

  function chooseVideoOption(option) {
    chooseVideoOptionElement(option);
    saveVideoDraft(activeVideoNode);
  }

  function getSelectedVideoOptions(model = getVideoModelById(getSelectedVideoModelId())) {
    return getSelectedVideoOptionsFromModel(model, getGroupValue);
  }

  function addVideoReferenceFiles(node, files = []) {
    readVideoReferenceFiles(files).then((items) => {
      node._videoGeneratorReferences = mergeVideoReferences(getVideoReferences(node), items);
      renderVideoReferences(node);
      saveVideoDraft(node);
    }).catch((error) => {
      setVideoStatus(error?.message || "Unable to read reference image.");
    });
  }

  function renderVideoReferences(node = activeVideoNode) {
    const list = getVideoControls().referenceList;
    if (!list) return;
    const references = getVideoReferences(node);
    list.innerHTML = renderVideoReferenceThumbnails(references, escapeAttribute);
    list.querySelectorAll("[data-video-reference-index]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const index = Number(button.dataset.videoReferenceIndex);
        node._videoGeneratorReferences = removeVideoReferenceAt(getVideoReferences(node), index);
        renderVideoReferences(node);
        saveVideoDraft(node);
      });
    });
  }

  function positionVideoPopover() {
    const node = activeVideoNode;
    const nextPopover = getVideoPopover();
    if (!node || !nextPopover?.classList.contains("open")) return;
    if (!node.isConnected) {
      hideVideoGeneratorPopover();
      return;
    }
    const frame = node.querySelector(".video-file-preview") || node;
    const rect = frame.getBoundingClientRect();
    applyVideoPopoverPosition(
      nextPopover,
      getVideoPopoverPositionStyle(rect, globalThis.innerWidth || 1280)
    );
  }

  function scheduleVideoPopoverPosition() {
    if (!activeVideoNode || !getVideoPopover()?.classList.contains("open")) return;
    if (positionFrame) return;
    positionFrame = requestAnimationFrame(() => {
      positionFrame = 0;
      positionVideoPopover();
    });
  }

  function observeVideoPosition(node) {
    teardownVideoPositionObserver();
    if (typeof ResizeObserver !== "function") return;
    popoverObserver = new ResizeObserver(scheduleVideoPopoverPosition);
    popoverObserver.observe(node);
    const frame = node.querySelector(".video-file-preview");
    if (frame) popoverObserver.observe(frame);
    const popover = getVideoPopover();
    if (popover) popoverObserver.observe(popover);
  }

  function teardownVideoPositionObserver() {
    popoverObserver?.disconnect?.();
    popoverObserver = null;
    if (positionFrame) cancelAnimationFrame(positionFrame);
    positionFrame = 0;
  }

  function saveVideoDraft(node) {
    saveVideoDraftState(node, {
      controls: getVideoControls(),
      optionKinds: ["mode", "size", "resolution", "duration", "audio"],
      getOptionValue: getGroupValue
    });
  }

  function restoreVideoDraft(node) {
    restoreVideoDraftState(node, getVideoControls());
  }

  function setVideoBusy(node, busy) {
    setVideoBusyState(node, getVideoPopover(), busy);
  }

  function setVideoStatus(text = "") {
    setVideoStatusText(getVideoControls().status, text);
  }

  function getSelectedVideoModelId(models = getVideoModels()) {
    const controls = getVideoControls();
    return getVideoSelectedModelId({
      controls,
      models,
      selectedModelId: getSelectedModelId()
    });
  }

  function getVideoModels() {
    return getVideoGenerationModels(getCachedImageModels("home"), getModelType);
  }

  function getVideoModelById(modelId) {
    return getVideoModelByIdFromList(getVideoModels(), modelId);
  }

  function getVideoControls() {
    const nextPopover = getVideoPopover();
    return {
      popover: nextPopover,
      promptInput: nextPopover?.querySelector?.("[data-video-generator-prompt]") || null,
      referenceInput: nextPopover?.querySelector?.("[data-video-generator-reference-input]") || null,
      referenceList: nextPopover?.querySelector?.("[data-video-generator-reference-list]") || null,
      modelSelect: nextPopover?.querySelector?.("[data-video-generator-model]") || null,
      status: nextPopover?.querySelector?.("[data-video-generator-status]") || null
    };
  }

  function getVideoPopover() {
    return canvasWorld?.ownerDocument?.querySelector?.(VIDEO_POPOVER_SELECTOR)
      || globalThis.document?.querySelector?.(VIDEO_POPOVER_SELECTOR)
      || null;
  }

  return {
    hideVideoGeneratorPopover,
    showVideoGeneratorPopover,
    positionVideoPopover
  };
}

function getGroupValue(kind) {
  const group = globalThis.document?.querySelector?.(`${VIDEO_POPOVER_SELECTOR} [data-video-option-group="${kind}"]`);
  return getVideoOptionGroupValue(group);
}

function getSavedOption(kind) {
  const active = globalThis.document?.querySelector?.(`${VIDEO_SELECTOR}.selected[data-active-selection='true']`)
    || globalThis.document?.querySelector?.(`${VIDEO_SELECTOR}.selected`);
  return getVideoSavedOption(active, kind);
}
