export const DEFAULT_CANVAS_PAN = Object.freeze({ x: -900, y: -600 });
export const DEFAULT_CANVAS_ZOOM = 1;
export const MIN_CANVAS_ZOOM = 0.2;
export const MAX_CANVAS_ZOOM = 2.5;
export const MIN_CANVAS_CONTROL_SCALE = 0.42;
export const MAX_CANVAS_CONTROL_SCALE = 2.6;
export const MIN_CANVAS_PROMPT_SCALE = 0.78;
export const MAX_CANVAS_PROMPT_SCALE = 1.55;

export function clampCanvasZoom(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_CANVAS_ZOOM;
  return Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, numeric));
}

export function getCanvasTransformStyle(pan, zoom) {
  return `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getInverseCanvasUiScale(zoom, min = MIN_CANVAS_CONTROL_SCALE, max = MAX_CANVAS_CONTROL_SCALE) {
  const numeric = Number(zoom);
  const safeZoom = Number.isFinite(numeric) && numeric > 0 ? numeric : DEFAULT_CANVAS_ZOOM;
  return clampValue(1 / safeZoom, min, max);
}

export function syncCanvasUiScale(zoom, root = globalThis.document?.documentElement) {
  if (!root?.style) return;
  const controlScale = getInverseCanvasUiScale(zoom);
  const promptScale = getInverseCanvasUiScale(zoom, MIN_CANVAS_PROMPT_SCALE, MAX_CANVAS_PROMPT_SCALE);
  root.style.setProperty("--canvas-control-scale", controlScale.toFixed(3));
  root.style.setProperty("--canvas-prompt-scale", promptScale.toFixed(3));
}

export function syncZoomControls({ zoom, zoomText, zoomRange }) {
  const percent = Math.round(zoom * 100);
  if (zoomText) zoomText.textContent = `${percent}%`;
  if (zoomRange) zoomRange.value = percent;
  syncCanvasUiScale(zoom);
}

export function centerPanOnWorldPoint(point, zoom) {
  return {
    x: -point.x * zoom,
    y: -point.y * zoom
  };
}

export function fitWorldBoundsInViewport({
  bounds,
  viewportRect,
  minZoom = MIN_CANVAS_ZOOM,
  maxZoom = MAX_CANVAS_ZOOM,
  maxFitZoom = 1.15
}) {
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
  const fitZoom = Math.min(
    (viewportRect.width * 0.72) / contentWidth,
    (viewportRect.height * 0.7) / contentHeight
  );
  const zoom = Math.min(maxZoom, Math.max(minZoom, Math.min(maxFitZoom, fitZoom)));
  return {
    zoom,
    pan: centerPanOnWorldPoint({
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2
    }, zoom)
  };
}

export function panForZoomAroundWorldPoint({ clientX, clientY, viewportRect, worldPoint, zoom }) {
  return {
    x: clientX - viewportRect.left - viewportRect.width / 2 - worldPoint.x * zoom,
    y: clientY - viewportRect.top - viewportRect.height / 2 - worldPoint.y * zoom
  };
}
