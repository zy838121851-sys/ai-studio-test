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
  restoreVideoDraftState,
  saveVideoDraftState,
  setVideoBusyState,
  setVideoStatusText
} from "./video-generator-form-state-utils.js";
import {
  delay,
  getResultVideoUrl,
  getRetryAfterDelayMs,
  isTerminalVideoJobStatus
} from "./video-generator-job-utils.js";
import {
  formatRatioLabel,
  getVideoGenerationModels,
  getModeOptions,
  getVideoModelByIdFromList,
  getVideoOptionGroupValue,
  getVideoSavedOption,
  getVideoSelectedModelId,
  chooseVideoOptionElement,
  renderVideoOptionGroup,
  toOptions
} from "./video-generator-option-utils.js";
import {
  getPreviewNodeWidth,
  getVideoPreviewPlacement,
  markVideoPreviewFailed,
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
  removeVideoReferenceAt
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
    postJsonRequest = postJson,
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
    if (!node || node.dataset.videoGeneratorBusy === "true") return;
    const controls = getVideoControls();
    const prompt = controls.promptInput?.value?.trim?.() || "";
    const references = getVideoReferences(node);
    if (!prompt && !references.length) {
      setVideoStatus("Enter a prompt or add a reference image.");
      controls.promptInput?.focus?.();
      return;
    }
    if (typeof addGenerationPreview !== "function" || typeof replacePreviewWithVideo !== "function") {
      setVideoStatus("Video generation workflow is unavailable.");
      return;
    }

    const model = getSelectedVideoModelId();
    if (!model) {
      setVideoStatus("No video model is available.");
      return;
    }
    const modelConfig = getVideoModelById(model);
    const videoOptions = getSelectedVideoOptions(modelConfig);
    const images = references.map((item) => item.dataUrl).filter(Boolean);
    const aspectRatio = ratioToAspect(videoOptions.size || DEFAULT_VIDEO_RATIO);
    const previewNode = createVideoPreviewNode(node, { prompt, aspectRatio });
    if (!previewNode) {
      setVideoStatus("Unable to create video preview.");
      return;
    }

    setVideoBusy(node, true);
    setVideoStatus("Generating video...");
    saveVideoDraft(node);
    try {
      const result = await runVideoRequest({
        model,
        prompt,
        images,
        videoOptions,
        onProgress: (payload) => {
          const progress = Number(payload?.progress || 0);
          updatePreviewStatus(previewNode, progress > 0 ? `Waiting for video (${Math.min(99, progress)}%)` : "Waiting for video...");
        }
      });
      const videoUrl = getResultVideoUrl(result);
      if (!videoUrl) throw new Error(result?.failureMessage || result?.errorMessage || result?.error || "Model returned without a video URL");
      const createdNode = replacePreviewWithVideo(previewNode, {
        title: "Generated Video.mp4",
        desc: prompt || "Generated video",
        url: videoUrl,
        width: getPreviewNodeWidth(previewNode),
        aspectRatio,
        prompt,
        sourceNode: node,
        actionType: "video_generation",
        model: result.requestedModel || result.model || model
      });
      if (!createdNode) throw new Error("Unable to replace video preview");
      createdNode.dataset.videoGeneratorSourceNodeId = node.dataset.nodeId || "";
      selectNode(createdNode);
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

  async function runVideoRequest({ model, prompt, images = [], videoOptions = {}, onProgress = null } = {}) {
    const result = await postJsonRequest("/api/ai/generate", {
      model,
      prompt,
      images,
      size: videoOptions.size || DEFAULT_VIDEO_RATIO,
      videoOptions
    });
    if (result?.videoUrl || !result?.jobId) return result;
    return waitForVideoJob(result.jobId, { fallback: result, onProgress });
  }

  async function waitForVideoJob(jobId, {
    attempts = 180,
    delayMs = 2000,
    fallback = {},
    onProgress = null,
    missingUrlRetries = 4
  } = {}) {
    let lastPayload = { jobId, ...fallback };
    let missingUrlAttempts = 0;
    for (let index = 0; index < attempts; index += 1) {
      await delay(delayMs);
      const response = await fetch(`/api/ai/jobs/${encodeURIComponent(jobId)}`, { credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 429) {
        await delay(getRetryAfterDelayMs(response, delayMs * 2));
        continue;
      }
      if (!response.ok) throw new Error(payload?.failureMessage || payload?.errorMessage || payload?.message || `Job request failed: ${response.status}`);
      lastPayload = { ...fallback, ...payload };
      onProgress?.(lastPayload);
      if (isTerminalVideoJobStatus(payload?.status)) {
        if (payload.status !== "succeeded") throw new Error(payload.failureMessage || payload.errorMessage || payload.error || payload.status);
        const videoUrl = getResultVideoUrl(lastPayload);
        if (!videoUrl) {
          missingUrlAttempts += 1;
          if (missingUrlAttempts <= missingUrlRetries) continue;
          throw new Error(lastPayload.failureMessage || lastPayload.errorMessage || lastPayload.error || "Generation completed without a video URL");
        }
        return { ...lastPayload, videoUrl };
      }
    }
    throw new Error(`Generation is still running. Job ID: ${lastPayload.jobId || jobId}`);
  }

  function createVideoPreviewNode(node, { prompt = "", aspectRatio = "16 / 9" } = {}) {
    const placement = getVideoPreviewPlacement(node);
    const previewNode = addGenerationPreview({
      title: "Generated Video.mp4",
      desc: prompt || "Generating video",
      x: placement.x,
      y: placement.y,
      width: placement.width,
      aspectRatio
    });
    if (previewNode) {
      previewNode.dataset.videoGeneratorPreview = "true";
      updatePreviewStatus(previewNode, "Waiting for video...");
    }
    return previewNode;
  }

  function refreshVideoModelOptions() {
    const controls = getVideoControls();
    const select = controls.modelSelect;
    if (!select) return;
    const models = getVideoModels();
    const current = select.dataset.selectedModelId || select.value || getSelectedVideoModelId(models);
    select.innerHTML = models.map((model) => `
      <option value="${escapeAttribute(model.id)}"${model.id === current ? " selected" : ""}>${escapeHtml(model.label || model.id)}</option>
    `).join("");
    select.value = models.some((model) => model.id === current) ? current : (models[0]?.id || "");
    select.dataset.selectedModelId = select.value || "";
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
    const allowed = model?.allowedOptions || {};
    const output = {};
    if (Array.isArray(allowed.size) && allowed.size.length) output.size = getGroupValue("size") || allowed.size[0];
    if (Array.isArray(allowed.resolution) && allowed.resolution.length) output.resolution = getGroupValue("resolution") || allowed.resolution[0];
    if (Array.isArray(allowed.duration) && allowed.duration.length) output.duration = Number(getGroupValue("duration") || allowed.duration[0]);
    if (Array.isArray(allowed.return_last_frame) && allowed.return_last_frame.length) {
      output.return_last_frame = getGroupValue("mode") === "last-frame";
    }
    if (Array.isArray(allowed.generate_audio) && allowed.generate_audio.length) {
      output.generate_audio = getGroupValue("audio") === "true";
    }
    return output;
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
    list.innerHTML = references.map((reference, index) => `
      <button type="button" class="video-generator-reference-thumb" data-video-reference-index="${index}" title="${escapeAttribute(reference.name)}">
        <img src="${escapeAttribute(reference.dataUrl)}" alt="${escapeAttribute(reference.name)}" />
      </button>
    `).join("");
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

function ratioToAspect(value = DEFAULT_VIDEO_RATIO) {
  return String(value || DEFAULT_VIDEO_RATIO).replace(":", " / ");
}

async function postJson(path, payload = {}) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.failureMessage || data.errorMessage || data.message || `Request failed: ${response.status}`);
  return data;
}
