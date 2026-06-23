export function createCanvasToolWorkflow({
  elements = {},
  state = {},
  services = {}
} = {}) {
  const {
    canvasViewport = null,
    assetUploadInput = null
  } = elements;

  const {
    getActiveCanvasTool = () => "",
    setActiveCanvasTool = () => {},
    setPendingUploadPoint = () => {},
    setActiveRailButton = () => {}
  } = state;

  const {
    viewportCenterPoint = () => ({ x: 0, y: 0 })
  } = services;

  function setActiveCanvasToolInternal(tool) {
    setActiveCanvasTool(tool);
  }

  function resetCanvasTool() {
    setActiveCanvasToolInternal("");
    canvasViewport?.classList.remove("tool-draw", "tool-text", "tool-eraser");
    setActiveRailButton("select");
  }

  function runCanvasTool(tool) {
    if (tool === "select") {
      resetCanvasTool();
      return;
    }
    if (tool === "shape") {
      setShapeTool("rect");
      return;
    }
    if (tool === "image") {
      const nextPoint = viewportCenterPoint();
      setPendingUploadPoint(nextPoint);
      if (assetUploadInput?.dataset) assetUploadInput.dataset.uploadIntent = "canvas";
      assetUploadInput?.click();
      return;
    }
    if (tool === "eraser") {
      setActiveCanvasToolInternal("eraser");
      canvasViewport?.classList.remove("tool-draw", "tool-text");
      canvasViewport?.classList.add("tool-eraser");
      return;
    }
    setActiveCanvasToolInternal(tool);
    canvasViewport?.classList.toggle("tool-text", tool === "text");
    canvasViewport?.classList.toggle("tool-draw", tool !== "text");
    canvasViewport?.classList.remove("tool-eraser");
  }

  function setShapeTool(tool) {
    setActiveCanvasToolInternal(tool);
    canvasViewport?.classList.add("tool-draw");
    canvasViewport?.classList.remove("tool-text", "tool-eraser");
    setActiveRailButton("shape");
  }

  return {
    resetCanvasTool,
    runCanvasTool,
    setShapeTool
  };
}
