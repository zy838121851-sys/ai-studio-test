import {
  createImageCropControls,
  getCropBoxForNode,
  removeImageCropOverlay,
  setCropBoxForNode,
  updateCropRestoreButtonForNode
} from "../image-crop.js";

export function createCanvasCropWorkflow({
  state = {},
  services = {}
} = {}) {
  let cropConfirming = false;
  const {
    getCroppingImageNode = () => null,
    setCroppingImageNode = () => {}
  } = state;

  const {
    centerViewOnNode = () => {},
    hideImageEditPopover = () => {},
    hideCanvasContextMenu = () => {},
    hideAddNodeMenu = () => {},
    selectNode = () => {},
    recordUndoAction = () => {},
    getZoom = () => zoom,
    zoom = 1
  } = services;

  function ensureImageCropControls(node) {
    const controls = createImageCropControls({
      node,
      onPointerDown: handleCropPointerDown,
      onAction: (action) => {
        if (action === "cancel") hideImageCropOverlay();
        if (action === "reset") restoreOriginalImageCrop();
        if (action === "confirm") void confirmImageCrop();
      }
    });
    updateCropRestoreButtonForNode(node);
    return controls;
  }

  function startImageCrop(node) {
    const img = node.querySelector(".image-frame img");
    if (!img) return;
    hideImageCropOverlay();
    hideImageEditPopover();
    hideCanvasContextMenu();
    hideAddNodeMenu();
    selectNode(node);
    centerViewOnNode(node, 1.26);
    window.setTimeout(() => {
      setCroppingImageNode(node);
      node.classList.add("cropping");
      const { frame } = ensureImageCropControls(node);
      const insetX = frame.offsetWidth * 0.08;
      const insetY = frame.offsetHeight * 0.08;
      setCropBox({ x: insetX, y: insetY, width: frame.offsetWidth - insetX * 2, height: frame.offsetHeight - insetY * 2 }, node);
    }, 180);
  }

  function setCropBox(box, node = getCroppingImageNode()) {
    setCropBoxForNode({ node, box, ensureControls: ensureImageCropControls });
  }

  function getCropBox(node = getCroppingImageNode()) {
    return getCropBoxForNode({ node, ensureControls: ensureImageCropControls });
  }

  function handleCropPointerDown(event) {
    const cropBox = event.target.closest(".crop-box");
    const handle = event.target.closest(".crop-corner, .crop-edge");
    if (!cropBox && !handle) return;
    event.preventDefault();
    event.stopPropagation();
    const node = event.currentTarget.closest(".node-card");
    const stage = node.querySelector(".image-frame");
    const start = { x: event.clientX, y: event.clientY };
    const original = getCropBox(node);
    const mode = handle ? Array.from(handle.classList).find((name) => /^crop-[nsew]{1,2}$/.test(name)).replace("crop-", "") : "move";
    const onMove = (moveEvent) => {
      const scale = getSafeZoom();
      const dx = (moveEvent.clientX - start.x) / scale;
      const dy = (moveEvent.clientY - start.y) / scale;
      const next = { ...original };
      if (mode === "move") {
        next.x += dx;
        next.y += dy;
      } else {
        if (mode.includes("e")) next.width += dx;
        if (mode.includes("s")) next.height += dy;
        if (mode.includes("w")) {
          next.x += dx;
          next.width -= dx;
        }
        if (mode.includes("n")) {
          next.y += dy;
          next.height -= dy;
        }
      }
      const stageWidth = stage.offsetWidth;
      const stageHeight = stage.offsetHeight;
      if (mode === "move") {
        next.x = Math.max(0, Math.min(next.x, Math.max(0, stageWidth - next.width)));
        next.y = Math.max(0, Math.min(next.y, Math.max(0, stageHeight - next.height)));
      } else {
        next.x = Math.max(0, Math.min(next.x, stageWidth - 80));
        next.y = Math.max(0, Math.min(next.y, stageHeight - 80));
      }
      setCropBox(next, node);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  }

  function getSafeZoom() {
    const value = Number(getZoom());
    if (Number.isFinite(value) && value > 0) return value;
    const fallback = Number(zoom);
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 1;
  }

  async function confirmImageCrop() {
    if (cropConfirming) return;
    const sourceNode = getCroppingImageNode();
    const sourceImg = sourceNode?.querySelector(".image-frame img");
    if (!sourceImg?.src) return;
    const stage = sourceNode.querySelector(".image-frame");
    const box = getCropBox(sourceNode);
    const before = snapshotImageCropState(sourceNode);
    cropConfirming = true;
    try {
      const cropResult = await cropImageForCanvas(sourceImg, { stage, box });
      if (!sourceNode.dataset.cropOriginalSrc) {
        sourceNode.dataset.cropOriginalSrc = sourceImg.src;
        sourceNode.dataset.cropOriginalAspect = stage.style.aspectRatio || `${cropResult.naturalWidth} / ${cropResult.naturalHeight}`;
        sourceNode.dataset.cropOriginalWidth = sourceNode.style.width || "";
        sourceNode.dataset.cropOriginalManualSize = sourceNode.dataset.manualSize || "";
      }
      sourceImg.src = cropResult.dataUrl;
      const frame = sourceNode.querySelector(".image-frame");
      frame.style.aspectRatio = `${cropResult.width} / ${cropResult.height}`;
      sourceNode.dataset.manualSize = "true";
      cropConfirming = false;
      hideImageCropOverlay();
      recordCropUndo(sourceNode, before);
    } catch (error) {
      console.warn("[image-crop] Failed to confirm image crop", error);
      cropConfirming = false;
    }
  }

  function updateCropRestoreButton(node = getCroppingImageNode()) {
    updateCropRestoreButtonForNode(node);
  }

  function restoreOriginalImageCrop() {
    const node = getCroppingImageNode();
    if (!node) return;
    if (!node.dataset.cropOriginalSrc) {
      updateCropRestoreButton(node);
      return;
    }
    const img = node.querySelector(".image-frame img");
    const frame = node.querySelector(".image-frame");
    if (!img || !frame) return;
    const restoreBox = () => {
      setCropBox({ x: 0, y: 0, width: frame.offsetWidth, height: frame.offsetHeight }, node);
      centerViewOnNode(node, 1.26);
    };
    img.addEventListener("load", restoreBox, { once: true });
    img.src = node.dataset.cropOriginalSrc;
    frame.style.aspectRatio = node.dataset.cropOriginalAspect || `${img.naturalWidth || 1} / ${img.naturalHeight || 1}`;
    if (node.dataset.cropOriginalWidth) node.style.width = node.dataset.cropOriginalWidth;
    if (node.dataset.cropOriginalManualSize) {
      node.dataset.manualSize = node.dataset.cropOriginalManualSize;
    } else {
      delete node.dataset.manualSize;
    }
    delete node.dataset.cropOriginalSrc;
    delete node.dataset.cropOriginalAspect;
    delete node.dataset.cropOriginalWidth;
    delete node.dataset.cropOriginalManualSize;
    updateCropRestoreButton(node);
    if (img.complete) restoreBox();
  }

  function hideImageCropOverlay() {
    const node = getCroppingImageNode();
    if (node) {
      removeImageCropOverlay(node);
    }
    setCroppingImageNode(null);
    cropConfirming = false;
  }

  async function cropImageForCanvas(sourceImg, { stage, box }) {
    const src = sourceImg.currentSrc || sourceImg.src || "";
    if (sourceImg.complete && (sourceImg.naturalWidth || sourceImg.width)) {
      try {
        return cropDrawableImage(sourceImg, { stage, box });
      } catch (error) {
        if (!isHttpUrl(src)) throw error;
      }
    }
    return cropDrawableImage(await loadCanvasSafeImage(src), { stage, box });
  }

  function cropDrawableImage(image, { stage, box }) {
    const naturalWidth = image.naturalWidth || image.width || 1;
    const naturalHeight = image.naturalHeight || image.height || 1;
    const scaleX = naturalWidth / Math.max(1, stage.offsetWidth);
    const scaleY = naturalHeight / Math.max(1, stage.offsetHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(box.width * scaleX));
    canvas.height = Math.max(1, Math.round(box.height * scaleY));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to create crop canvas");
    context.drawImage(
      image,
      box.x * scaleX,
      box.y * scaleY,
      box.width * scaleX,
      box.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );
    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
      naturalWidth,
      naturalHeight
    };
  }

  async function loadCanvasSafeImage(src) {
    if (!src) throw new Error("Missing image source");
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    image.src = src.startsWith("data:") || src.startsWith("blob:")
      ? src
      : await imageSourceToDataUrl(src);
    if (image.decode) {
      await image.decode();
      return image;
    }
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Unable to load image for crop"));
    });
    return image;
  }

  async function imageSourceToDataUrl(src) {
    let response;
    try {
      response = await fetch(src, { credentials: "include" });
    } catch (error) {
      response = await fetchProxiedImage(src, error);
    }
    if (!response?.ok && isHttpUrl(src)) {
      response = await fetchProxiedImage(src);
    }
    if (!response?.ok) throw new Error("Unable to read image for crop");
    return blobToDataUrl(await response.blob());
  }

  async function fetchProxiedImage(src, cause = null) {
    if (!isHttpUrl(src)) {
      if (cause) throw cause;
      throw new Error("Image source cannot be proxied");
    }
    return fetch(`/api/image-proxy?url=${encodeURIComponent(src)}`, { credentials: "include" });
  }

  function isHttpUrl(value = "") {
    return /^https?:\/\//i.test(String(value || ""));
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Unable to read image blob"));
      reader.readAsDataURL(blob);
    });
  }

  function snapshotImageCropState(node) {
    const img = node?.querySelector(".image-frame img");
    const frame = node?.querySelector(".image-frame");
    return {
      nodeStyle: node?.getAttribute("style") || "",
      frameStyle: frame?.getAttribute("style") || "",
      imgSrc: img?.src || "",
      dataset: {
        manualSize: readDatasetValue(node, "manualSize"),
        cropOriginalSrc: readDatasetValue(node, "cropOriginalSrc"),
        cropOriginalAspect: readDatasetValue(node, "cropOriginalAspect"),
        cropOriginalWidth: readDatasetValue(node, "cropOriginalWidth"),
        cropOriginalManualSize: readDatasetValue(node, "cropOriginalManualSize")
      }
    };
  }

  function readDatasetValue(node, key) {
    return {
      exists: Boolean(node && Object.prototype.hasOwnProperty.call(node.dataset, key)),
      value: node?.dataset?.[key] || ""
    };
  }

  function restoreDatasetValue(node, key, snapshot) {
    if (!node) return;
    if (snapshot?.exists) {
      node.dataset[key] = snapshot.value;
    } else {
      delete node.dataset[key];
    }
  }

  function restoreImageCropState(node, snapshot) {
    if (!node?.isConnected || !snapshot) return;
    removeImageCropOverlay(node);
    if (getCroppingImageNode() === node) setCroppingImageNode(null);
    node.setAttribute("style", snapshot.nodeStyle);
    const img = node.querySelector(".image-frame img");
    const frame = node.querySelector(".image-frame");
    if (frame) frame.setAttribute("style", snapshot.frameStyle);
    if (img && snapshot.imgSrc) img.src = snapshot.imgSrc;
    Object.entries(snapshot.dataset || {}).forEach(([key, value]) => restoreDatasetValue(node, key, value));
    updateCropRestoreButtonForNode(node);
    selectNode(node);
  }

  function recordCropUndo(node, before) {
    if (!node?.isConnected || !before) return;
    recordUndoAction({
      type: "crop-image",
      undo: () => restoreImageCropState(node, before)
    });
  }

  return {
    startImageCrop,
    ensureImageCropControls,
    setCropBox,
    getCropBox,
    handleCropPointerDown,
    confirmImageCrop,
    updateCropRestoreButton,
    restoreOriginalImageCrop,
    hideImageCropOverlay
  };
}
