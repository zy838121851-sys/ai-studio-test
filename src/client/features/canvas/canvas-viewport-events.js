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
    showAddNodeMenu,
    showCanvasContextMenu,
    isPointInAICore,
    setAICoreState,
    updateAICoreDragState,
    uploadIntoAICore,
    uploadAsReference,
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
    if (event.button === 0 && getActiveCanvasTool() && !event.target.closest(".node-card")) {
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

  resolvedCanvasViewport.addEventListener("pointerup", () => {
    if (getCanvasDrawing()) finishCanvasDrawing();
    if (getEraserDrag()) finishEraserDrag();
    if (getSelectionDrag()) finishSelectionBox();
    setIsPanning(false);
    resolvedCanvasViewport.classList.remove("dragging");
  });

  resolvedCanvasViewport.addEventListener("dblclick", (event) => {
    if (getActiveCanvasTool()) return;
    if (event.target.closest(".node-card") || event.target.closest(".add-node-menu") || event.target.closest(".canvas-context-menu")) return;
    event.preventDefault();
    showAddNodeMenu(event.clientX, event.clientY);
  });

  resolvedCanvasViewport.addEventListener("contextmenu", (event) => {
    if (event.target.closest(".add-node-menu") || event.target.closest(".image-edit-popover")) return;
    const node = event.target.closest(".node-card");
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
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.dataTransfer.dropEffect = "copy";
    updateAICoreDragState(event.clientX, event.clientY);
  });

  resolvedCanvasViewport.addEventListener("dragenter", (event) => {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    setUploadDragDepth(getUploadDragDepth() + 1);
    updateAICoreDragState(event.clientX, event.clientY);
  });

  resolvedCanvasViewport.addEventListener("dragleave", (event) => {
    if (!event.dataTransfer?.types?.includes("Files")) return;
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
    if (event.target.closest(".node-card")) return;
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
    if (!asset) return;
    const point = viewportPointToWorld(event.clientX, event.clientY);
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
