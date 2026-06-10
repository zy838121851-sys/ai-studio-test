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

  canvasViewport.addEventListener("wheel", (event) => {
    if (event.target.closest(".model-viewer")) return;
    event.preventDefault();
    const before = viewportPointToWorld(event.clientX, event.clientY);
    setZoom(clampCanvasZoom(getZoom() * (event.deltaY > 0 ? 0.92 : 1.08)));
    const rect = canvasViewport.getBoundingClientRect();
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

  canvasViewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.button !== 1) return;
    if (event.button === 0 && getActiveCanvasTool() === "eraser") {
      event.preventDefault();
      event.stopPropagation();
      hideAddNodeMenu();
      hideCanvasContextMenu();
      hideImageEditPopover();
      startEraserDrag(event);
      canvasViewport.setPointerCapture(event.pointerId);
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
      canvasViewport.setPointerCapture(event.pointerId);
      return;
    }

    if (event.button === 1) event.preventDefault();
    hideAddNodeMenu();
    hideCanvasContextMenu();
    hideImageEditPopover();
    selectNode(null);

    if (event.button === 0) {
      const rect = canvasViewport.getBoundingClientRect();
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
      canvasViewport.classList.add("selecting");
      updateSelectionBox();
      canvasViewport.setPointerCapture(event.pointerId);
      return;
    }

    setIsPanning(true);
    canvasViewport.classList.add("dragging");
    setPanStart({ x: event.clientX - getPan().x, y: event.clientY - getPan().y });
    canvasViewport.setPointerCapture(event.pointerId);
  });

  canvasViewport.addEventListener("pointermove", (event) => {
    if (getCanvasDrawing()) {
      const rect = canvasViewport.getBoundingClientRect();
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
      const rect = canvasViewport.getBoundingClientRect();
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

  canvasViewport.addEventListener("pointerup", () => {
    if (getCanvasDrawing()) finishCanvasDrawing();
    if (getEraserDrag()) finishEraserDrag();
    if (getSelectionDrag()) finishSelectionBox();
    setIsPanning(false);
    canvasViewport.classList.remove("dragging");
  });

  canvasViewport.addEventListener("dblclick", (event) => {
    if (getActiveCanvasTool()) return;
    if (event.target.closest(".node-card") || event.target.closest(".add-node-menu") || event.target.closest(".canvas-context-menu")) return;
    event.preventDefault();
    showAddNodeMenu(event.clientX, event.clientY);
  });

  canvasViewport.addEventListener("contextmenu", (event) => {
    if (event.target.closest(".node-card") || event.target.closest(".add-node-menu") || event.target.closest(".image-edit-popover")) return;
    event.preventDefault();
    showCanvasContextMenu(event.clientX, event.clientY);
  });

  canvasViewport.addEventListener("auxclick", (event) => {
    if (event.button === 1) event.preventDefault();
  });

  canvasViewport.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.dataTransfer.dropEffect = "copy";
    updateAICoreDragState(event.clientX, event.clientY);
  });

  canvasViewport.addEventListener("dragenter", (event) => {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    setUploadDragDepth(getUploadDragDepth() + 1);
    updateAICoreDragState(event.clientX, event.clientY);
  });

  canvasViewport.addEventListener("dragleave", (event) => {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    setUploadDragDepth(Math.max(0, getUploadDragDepth() - 1));
    const outsideWindow = event.clientX <= 0
      || event.clientY <= 0
      || event.clientX >= window.innerWidth
      || event.clientY >= window.innerHeight;
    if (!getUploadDragDepth() && outsideWindow) {
      appRoot.classList.remove("ai-core-awake");
      setAICoreState("idle");
    }
  });

  canvasViewport.addEventListener("drop", (event) => {
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
      appRoot.classList.remove("ai-core-awake");
      setUploadDragDepth(0);
      return;
    }

    const asset = getLibraryAssets().find((item) => item.id === event.dataTransfer.getData("text/plain"));
    if (!asset) return;
    const point = viewportPointToWorld(event.clientX, event.clientY);
    addNode({
      kind: asset.type,
      title: asset.title,
      desc: asset.desc,
      x: point.x,
      y: point.y
    });
  });
}
