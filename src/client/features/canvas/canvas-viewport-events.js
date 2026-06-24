export function bindCanvasViewportEvents({ canvasViewport, appRoot, state, actions }) {
  const {
    getPan,
    getZoom,
    setZoom,
    setPan,
    getPanStart,
    setPanStart,
    getIsPanning,
    setIsPanning,
    getSelectionDrag,
    setSelectionDrag,
    getCanvasDrawing,
    getEraserDrag,
    getUploadDragDepth,
    setUploadDragDepth
  } = state;

  const {
    clampCanvasZoom,
    panForZoomAroundWorldPoint,
    viewportPointToWorld,
    applyTransform,
    showCanvasContextMenu,
    isPointInAICore,
    setAICoreState,
    updateAICoreDragState,
    uploadIntoAICore,
    uploadAsReference,
    addChat = () => {},
    hideAddNodeMenu,
    hideCanvasContextMenu,
    hideImageEditPopover,
    selectNode,
    addCanvasToolNode,
    createDrawingPreview,
    updateDrawingPreview,
    finishCanvasDrawing,
    startEraserDrag,
    updateEraserDrag,
    finishEraserDrag,
    createSelectionBox,
    updateSelectionBox,
    finishSelectionBox,
    addNode,
    getActiveCanvasTool,
    getLibraryAssets
  } = actions;

  const resolvedCanvasViewport = canvasViewport || globalThis.document?.querySelector("#canvasViewport");
  if (!resolvedCanvasViewport) {
    globalThis.console?.warn?.("[legacy-migration] bindCanvasViewportEvents: missing canvasViewport");
    return;
  }
  const resolvedAppRoot = appRoot || globalThis.document?.querySelector(".app");

  function capturePointer(event) {
    try {
      resolvedCanvasViewport.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic and some interrupted pointer streams may not be capturable.
    }
  }

  function finishPointerInteraction() {
    if (getCanvasDrawing()) finishCanvasDrawing();
    if (getEraserDrag()) finishEraserDrag();
    if (getSelectionDrag()) finishSelectionBox();
    setIsPanning(false);
    resolvedCanvasViewport.classList.remove("dragging");
  }

  resolvedCanvasViewport.addEventListener("wheel", (event) => {
    if (event.target.closest(".model-viewer")) return;
    event.preventDefault();
    const before = viewportPointToWorld(event.clientX, event.clientY);
    setZoom(clampCanvasZoom(getZoom() * (event.deltaY > 0 ? 0.92 : 1.08)));
    const rect = resolvedCanvasViewport.getBoundingClientRect();
    setPan(
      panForZoomAroundWorldPoint({
        clientX: event.clientX,
        clientY: event.clientY,
        viewportRect: rect,
        worldPoint: before,
        zoom: getZoom()
      })
    );
    applyTransform();
  }, { passive: false });

  resolvedCanvasViewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.button !== 1) return;
    if (event.button === 0 && getActiveCanvasTool() === "eraser") {
      event.preventDefault();
      event.stopPropagation();
      hideAddNodeMenu();
      hideCanvasContextMenu();
      hideImageEditPopover();
      startEraserDrag(event);
      capturePointer(event);
      return;
    }
    if (event.button === 0 && getActiveCanvasTool() && !event.target.closest(".node-card, .canvas-object")) {
      event.preventDefault();
      event.stopPropagation();
      hideAddNodeMenu();
      hideCanvasContextMenu();
      hideImageEditPopover();
      selectNode(null);
      if (getActiveCanvasTool() === "text") {
        const point = viewportPointToWorld(event.clientX, event.clientY);
        addCanvasToolNode("text", { x: point.x, y: point.y, size: { width: 240, height: 86 } });
        return;
      }
      createDrawingPreview(event.clientX, event.clientY, getActiveCanvasTool());
      capturePointer(event);
      return;
    }

    if (event.button === 1) event.preventDefault();
    hideAddNodeMenu();
    hideCanvasContextMenu();
    hideImageEditPopover();
    selectNode(null);

    if (event.button === 0) {
      const rect = resolvedCanvasViewport.getBoundingClientRect();
      setSelectionDrag({
        box: createSelectionBox(),
        startX: event.clientX - rect.left,
        startY: event.clientY - rect.top,
        currentX: event.clientX - rect.left,
        currentY: event.clientY - rect.top,
        startClientX: event.clientX,
        startClientY: event.clientY,
        currentClientX: event.clientX,
        currentClientY: event.clientY
      });
      resolvedCanvasViewport.classList.add("selecting");
      updateSelectionBox();
      capturePointer(event);
      return;
    }

    setIsPanning(true);
    resolvedCanvasViewport.classList.add("dragging");
    setPanStart({ x: event.clientX - getPan().x, y: event.clientY - getPan().y });
    capturePointer(event);
  });

  resolvedCanvasViewport.addEventListener("pointermove", (event) => {
    if (getCanvasDrawing()) {
      const rect = resolvedCanvasViewport.getBoundingClientRect();
      const currentDrawing = getCanvasDrawing();
      currentDrawing.currentX = event.clientX - rect.left;
      currentDrawing.currentY = event.clientY - rect.top;
      currentDrawing.currentClientX = event.clientX;
      currentDrawing.currentClientY = event.clientY;
      updateDrawingPreview();
      return;
    }
    if (getEraserDrag()) {
      updateEraserDrag(event);
      return;
    }
    if (getSelectionDrag()) {
      const rect = resolvedCanvasViewport.getBoundingClientRect();
      const currentSelection = getSelectionDrag();
      currentSelection.currentX = event.clientX - rect.left;
      currentSelection.currentY = event.clientY - rect.top;
      currentSelection.currentClientX = event.clientX;
      currentSelection.currentClientY = event.clientY;
      updateSelectionBox();
      return;
    }
    if (!getIsPanning()) return;
    setPan({ x: event.clientX - getPanStart().x, y: event.clientY - getPanStart().y });
    applyTransform();
  });

  resolvedCanvasViewport.addEventListener("pointerup", finishPointerInteraction);
  window.addEventListener("pointerup", finishPointerInteraction);
  window.addEventListener("pointercancel", finishPointerInteraction);

  resolvedCanvasViewport.addEventListener("contextmenu", (event) => {
    if (event.target.closest(".add-node-menu") || event.target.closest(".image-edit-popover")) return;
    const node = event.target.closest(".node-card, .canvas-object");
    event.preventDefault();
    if (node) {
      event.stopPropagation();
      if (!node.classList.contains("selected")) selectNode(node);
      showCanvasContextMenu(event.clientX, event.clientY, node);
      return;
    }
    showCanvasContextMenu(event.clientX, event.clientY);
  });

  resolvedCanvasViewport.addEventListener("auxclick", (event) => {
    if (event.button === 1) event.preventDefault();
  });

  resolvedCanvasViewport.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (!hasCanvasImageDropData(event.dataTransfer)) return;
    event.dataTransfer.dropEffect = "copy";
    updateAICoreDragState(event.clientX, event.clientY);
  });

  resolvedCanvasViewport.addEventListener("dragenter", (event) => {
    if (!hasCanvasImageDropData(event.dataTransfer)) return;
    event.preventDefault();
    setUploadDragDepth(getUploadDragDepth() + 1);
    updateAICoreDragState(event.clientX, event.clientY);
  });

  resolvedCanvasViewport.addEventListener("dragleave", (event) => {
    if (!hasCanvasImageDropData(event.dataTransfer)) return;
    setUploadDragDepth(Math.max(0, getUploadDragDepth() - 1));
    const outsideWindow = event.clientX <= 0
      || event.clientY <= 0
      || event.clientX >= window.innerWidth
      || event.clientY >= window.innerHeight;
    if (!getUploadDragDepth() && outsideWindow) {
      if (resolvedAppRoot?.classList) resolvedAppRoot.classList.remove("ai-core-awake");
      setAICoreState("idle");
    }
  });

  resolvedCanvasViewport.addEventListener("drop", (event) => {
    event.preventDefault();
    if (event.target.closest(".node-card, .canvas-object")) return;
    if (event.dataTransfer.files.length) {
      event.stopPropagation();
      const point = viewportPointToWorld(event.clientX, event.clientY);
      if (isPointInAICore(event.clientX, event.clientY)) {
        uploadIntoAICore(event.dataTransfer.files, point);
      } else {
        uploadAsReference(event.dataTransfer.files, point);
        setAICoreState("idle");
      }
      if (resolvedAppRoot?.classList) resolvedAppRoot.classList.remove("ai-core-awake");
      setUploadDragDepth(0);
      return;
    }

    const asset = getLibraryAssets().find((item) => item.id === event.dataTransfer.getData("text/plain"));
    const point = viewportPointToWorld(event.clientX, event.clientY);
    if (!asset) {
      const externalImageUrl = getDroppedExternalImageUrl(event.dataTransfer);
      if (!externalImageUrl) return;
      event.stopPropagation();
      importExternalImageUrl(externalImageUrl)
        .then((file) => {
          if (isPointInAICore(event.clientX, event.clientY)) {
            uploadIntoAICore([file], point);
          } else {
            uploadAsReference([file], point);
            setAICoreState("idle");
          }
        })
        .catch((error) => {
          console.warn("[canvas] Failed to import dropped external image", error);
          addChat("assistant", "无法导入这个网页图片。请尝试打开原图后拖拽，或先保存到本地再导入。");
        })
        .finally(() => {
          if (resolvedAppRoot?.classList) resolvedAppRoot.classList.remove("ai-core-awake");
          setUploadDragDepth(0);
        });
      return;
    }

    const kind = asset.type === "model3d" ? "model" : (asset.type === "image" ? "image" : asset.type);
    addNode({
      kind,
      title: asset.title,
      desc: asset.desc || asset.prompt || asset.source || "Asset library item",
      x: point.x,
      y: point.y,
      media: {
        url: asset.url || asset.thumbnailUrl,
        name: asset.title,
        type: asset.mimeType || (kind === "image" ? "image/png" : "")
      }
    });
  });
}

export function hasCanvasImageDropData(dataTransfer) {
  const types = getDataTransferTypes(dataTransfer);
  return types.includes("Files")
    || types.includes("text/html")
    || types.includes("text/uri-list")
    || hasImageLikePlainText(dataTransfer);
}

function getDataTransferTypes(dataTransfer) {
  return Array.from(dataTransfer?.types || []);
}

function hasImageLikePlainText(dataTransfer) {
  if (!getDataTransferTypes(dataTransfer).includes("text/plain")) return false;
  const value = dataTransfer.getData?.("text/plain") || "";
  return isImportableImageSource(value);
}

export function getDroppedExternalImageUrl(dataTransfer) {
  const htmlSource = dataTransfer.getData?.("text/html") || "";
  const htmlImage = extractImageUrlFromHtml(htmlSource);
  if (htmlImage) return htmlImage;

  const uriList = dataTransfer.getData?.("text/uri-list") || "";
  const uriImage = uriList
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#") && isImportableImageSource(line));
  if (uriImage) return uriImage;

  const plainText = dataTransfer.getData?.("text/plain") || "";
  return isImportableImageSource(plainText) ? plainText.trim() : "";
}

function extractImageUrlFromHtml(htmlSource = "") {
  if (!htmlSource.trim()) return "";
  try {
    const documentRef = new DOMParser().parseFromString(htmlSource, "text/html");
    const image = documentRef.querySelector("img[src], img[data-src], img[data-original]");
    const source = image?.getAttribute("src")
      || image?.getAttribute("data-src")
      || image?.getAttribute("data-original")
      || "";
    return isImportableImageSource(source) ? source.trim() : "";
  } catch {
    const match = htmlSource.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
    const source = match?.[1] || "";
    return isImportableImageSource(source) ? source.trim() : "";
  }
}

export async function importExternalImageUrl(sourceUrl) {
  const url = String(sourceUrl || "").trim();
  if (!isImportableImageSource(url)) throw new Error("Unsupported image URL");
  const response = url.startsWith("data:")
    ? await fetch(url)
    : await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`, { credentials: "include" });
  if (!response?.ok) throw new Error(`Image fetch failed: ${response?.status || "unknown"}`);
  const blob = await response.blob();
  const type = normalizeImageMimeType(blob.type) || "image/png";
  if (!type.startsWith("image/")) throw new Error("Dropped URL did not return an image");
  return new File([blob], getExternalImageFileName(url, type), { type });
}

function isImportableImageSource(value = "") {
  const source = String(value || "").trim();
  if (!source) return false;
  if (source.startsWith("data:image/")) return true;
  return /^https?:\/\//i.test(source);
}

function normalizeImageMimeType(value = "") {
  const type = String(value || "").split(";")[0].trim().toLowerCase();
  return type.startsWith("image/") ? type : "";
}

function getExternalImageFileName(sourceUrl = "", mimeType = "image/png") {
  const extension = getImageExtensionFromMimeType(mimeType);
  try {
    const url = new URL(sourceUrl);
    const lastSegment = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
    const cleanName = sanitizeFileName(lastSegment.split("?")[0]);
    if (cleanName && /\.[a-z0-9]{2,5}$/i.test(cleanName)) return cleanName;
    if (cleanName) return `${cleanName}.${extension}`;
  } catch {
    // Data URLs and malformed drag payloads get a generated file name below.
  }
  return `dropped-image-${Date.now()}.${extension}`;
}

function getImageExtensionFromMimeType(mimeType = "") {
  const type = normalizeImageMimeType(mimeType);
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "image/svg+xml") return "svg";
  if (type === "image/avif") return "avif";
  return "png";
}

function sanitizeFileName(value = "") {
  return String(value || "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}
