import {
  getDroppedExternalImageUrl,
  importExternalImageUrl
} from "../canvas-viewport-events.js";
import { getInverseCanvasUiScale } from "../canvas-viewport.js";

const GENERATOR_SELECTOR = ".node-image-generator";
const GENERATOR_POPOVER_SELECTOR = "#imageGeneratorPopover";
const OUTPUT_SIZE = "1024*1024";
const DEFAULT_GENERATOR_MODEL = "qwen-image-2.0-pro";
const DEFAULT_GENERATOR_RATIO = "1:1";
const DEFAULT_GENERATOR_COUNT = "1";
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
    canvasWorld = globalThis.document?.querySelector?.("#canvasWorld")
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
    saveCurrentProject = null,
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
        requestAnimationFrame(() => getGeneratorControls().promptInput?.focus?.());
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
    scheduleGeneratorPopoverPosition();
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
      controls.promptInput?.focus();
      return;
    }

    const expandButton = event.target.closest("[data-generator-expand]");
    if (expandButton) {
      event.preventDefault();
      controls.popover?.classList.toggle("generator-panel-expanded");
      controls.promptInput?.focus();
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
      promptInput?.focus();
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
      const result = await postJsonRequest("/api/chat", buildChatImagePayload({
        model,
        prompt,
        images,
        size
      }));
      if (!result?.imageUrl) throw new Error(result?.message || "Model returned without an image URL");

      const displayUrl = await persistGeneratorResult({
        node,
        sourceUrl: result.imageUrl,
        prompt,
        model
      });
      applyGeneratorResult(node, displayUrl || result.imageUrl, { prompt, model });
      recordCanvasEvent("generation_created", {
        nodeId: node.dataset.nodeId,
        sourceId: "",
        actionType: detectGenerationKind(prompt),
        model
      });
      await saveCurrentProject?.();
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
    const count = getGeneratorCount();
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
      if (typeof addGenerationPreview !== "function" || typeof replacePreviewWithImage !== "function") {
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
      for (let index = 0; index < count; index += 1) {
        const previewNode = previewNodes[index];
        if (count > 1) updatePreviewStatus(previewNode, `正在生成第 ${index + 1}/${count} 张`);
        if (count > 1) updateGeneratorStatus(node, `正在生成 ${index + 1}/${count}`);
        const result = await postJsonRequest("/api/chat", buildChatImagePayload({
          model,
          prompt,
          images,
          size
        }));
        if (!result?.imageUrl) throw new Error(result?.message || "Model returned without an image URL");

        const createdNode = replacePreviewWithImage(previewNode, {
          title: getGeneratorResultTitle(index, count),
          desc: prompt || "Image generator result",
          url: result.imageUrl,
          width: getPreviewNodeWidth(previewNode),
          aspectRatio,
          prompt,
          sourceNode: null,
          actionType,
          model
        });
        if (!createdNode) throw new Error("Unable to replace generation preview");
        applyGeneratedImageNodeResult(createdNode, result.imageUrl, {
          prompt,
          model,
          dimensions,
          sourceNode: null
        });
        if (sourceNodeId) createdNode.dataset.generatorSourceNodeId = sourceNodeId;
        createdNode.dataset.generatorBatchCount = String(count);
        createdNode.dataset.generatorBatchIndex = String(index + 1);
        createdNodes.push(createdNode);
        if (!firstSuccessfulNode) firstSuccessfulNode = createdNode;
      }

      if (createdNodes.length) {
        selectNode(createdNodes[0]);
      }
      await saveCurrentProject?.();
      addChat("assistant", count > 1 ? `图像生成器已生成 ${count} 张结果。` : "图像生成器已生成结果。");
    } catch (error) {
      console.error("[canvas] Image generator failed", error);
      if (previewNodes.length) {
        previewNodes
          .filter((previewNode) => previewNode?.isConnected)
          .forEach((previewNode) => markGeneratorPreviewFailed(previewNode, error));
        if (firstSuccessfulNode) selectNode(firstSuccessfulNode);
        await saveCurrentProject?.();
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
        previewNode.dataset.generatorBatchCount = String(count);
        previewNode.dataset.generatorBatchIndex = String(index + 1);
        if (dimensions.width > 0) previewNode.dataset.outputWidth = String(dimensions.width);
        if (dimensions.height > 0) previewNode.dataset.outputHeight = String(dimensions.height);
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
    previewNode.classList.add("generation-failed");
    const title = previewNode.querySelector(".generation-frame strong");
    const statusText = previewNode.querySelector(".generation-frame span");
    if (title) title.textContent = "生成失败";
    if (statusText) statusText.textContent = error?.message || "生成失败，请重试";
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
        modelName: model
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
    if (nextPopover.parentElement !== canvasWorld) canvasWorld.appendChild(nextPopover);
    globalThis.document?.querySelector?.("#imageEditPopover")?.classList.remove("open");
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

  function hideGeneratorPopover() {
    const nextPopover = getGeneratorPopover();
    if (activeGeneratorNode) saveGeneratorDraft(activeGeneratorNode);
    activeGeneratorNode = null;
    nextPopover?.classList.remove("open", "generator-panel-expanded");
    teardownPositionObserver();
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
    if (controls.modelSelect) node.dataset.generatorModel = controls.modelSelect.value || DEFAULT_GENERATOR_MODEL;
    if (controls.ratioSelect) node.dataset.generatorRatio = controls.ratioSelect.value || DEFAULT_GENERATOR_RATIO;
    if (controls.countSelect) node.dataset.generatorCount = controls.countSelect.value || DEFAULT_GENERATOR_COUNT;
  }

  function restoreGeneratorControlState(node) {
    const controls = getGeneratorControls();
    setSelectValue(controls.modelSelect, node?.dataset.generatorModel || DEFAULT_GENERATOR_MODEL);
    setSelectValue(controls.ratioSelect, node?.dataset.generatorRatio || DEFAULT_GENERATOR_RATIO);
    setSelectValue(controls.countSelect, node?.dataset.generatorCount || DEFAULT_GENERATOR_COUNT);
    syncGeneratorCustomSelects();
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
    const selectedOption = select.selectedOptions?.[0] || select.options?.[select.selectedIndex] || select.options?.[0];
    trigger.textContent = selectedOption?.textContent || "";
    trigger.disabled = select.disabled;
    trigger.dataset.value = select.value || "";
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
    const editScreenScale = Math.max(0.76, Math.min(1.22, 1 / safeZoom));
    const screenNodeWidth = frameWidth * safeZoom;
    const minScreenWidth = Math.max(330, 430 * editScreenScale);
    const maxScreenWidth = Math.min(680, 600 * editScreenScale);
    const preferredScreenWidth = screenNodeWidth + 132 * editScreenScale;
    const targetScreenWidth = Math.max(minScreenWidth, Math.min(maxScreenWidth, preferredScreenWidth));
    const minScreenHeight = Math.max(150, 168 * editScreenScale);
    const maxScreenHeight = Math.min(292, 248 * editScreenScale);
    const expanded = nextPopover.classList.contains("generator-panel-expanded");
    const targetScreenHeight = expanded
      ? Math.max(maxScreenHeight, 292 * editScreenScale)
      : Math.max(minScreenHeight, Math.min(maxScreenHeight, targetScreenWidth * 0.42));
    const popoverWidth = Math.round(targetScreenWidth / safeZoom);
    const popoverHeight = Math.round(targetScreenHeight / safeZoom);
    const editScale = getInverseCanvasUiScale(safeZoom);
    const scaledGap = (22 * editScreenScale) / safeZoom;

    nextPopover.style.width = `${popoverWidth}px`;
    nextPopover.style.height = `${popoverHeight}px`;
    nextPopover.style.minHeight = `${popoverHeight}px`;
    nextPopover.style.setProperty("--edit-scale", editScale.toFixed(3));
    nextPopover.style.left = `${frameLeft + frameWidth / 2 - popoverWidth / 2}px`;
    nextPopover.style.top = `${frameTop + frameHeight + scaledGap}px`;
    return { popoverWidth, popoverHeight, editScale };
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
  return globalThis.document?.querySelector?.(`${GENERATOR_POPOVER_SELECTOR} [data-generator-model]`)?.value
    || globalThis.document?.querySelector?.("#chatModelSelect")?.value
    || "qwen-image-2.0-pro";
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
