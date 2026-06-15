import { getCanvasTransformStyle, syncZoomControls } from "../canvas-viewport.js";

export function readCanvasViewState(runtime = {}) {
  const transform = runtime.canvasWorld
    ? getComputedStyle(runtime.canvasWorld).transform
    : "";

  if (transform && transform !== "none" && typeof DOMMatrixReadOnly !== "undefined") {
    const matrix = new DOMMatrixReadOnly(transform);
    return {
      pan: { x: matrix.e, y: matrix.f },
      zoom: matrix.a || 1
    };
  }

  return {
    pan: runtime.getPan?.() || { x: 0, y: 0 },
    zoom: runtime.getZoom?.() || 1
  };
}

export function writeCanvasViewState(runtime = {}, next = {}) {
  const current = readCanvasViewState(runtime);
  const pan = next.pan || current.pan;
  const zoom = next.zoom ?? current.zoom;

  runtime.setPan?.(pan);
  runtime.setZoom?.(zoom);

  if (runtime.canvasWorld) {
    runtime.canvasWorld.style.transform = getCanvasTransformStyle(pan, zoom);
  }

  syncZoomControls({
    zoom,
    zoomText: runtime.zoomText || document.querySelector("#zoomText"),
    zoomRange: runtime.zoomRange || document.querySelector("#zoomRange")
  });
}

export function syncCanvasViewStateFromRuntime({
  canvasWorld,
  zoomText,
  zoomRange,
  getPan,
  setPan,
  getZoom,
  setZoom
} = {}) {
  return writeCanvasViewState({
    canvasWorld,
    zoomText,
    zoomRange,
    getPan,
    setPan,
    getZoom,
    setZoom
  }, {
    pan: getPan?.(),
    zoom: getZoom?.()
  });
}

export function createCanvasViewStateSynchronizer(runtime = {}) {
  return function syncCanvasViewState() {
    return syncCanvasViewStateFromRuntime(runtime);
  };
}
