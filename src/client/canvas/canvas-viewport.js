export const DEFAULT_CANVAS_PAN = Object.freeze({ x: -900, y: -600 });
export const DEFAULT_CANVAS_ZOOM = 0.5;
export const MIN_CANVAS_ZOOM = 0.2;
export const MAX_CANVAS_ZOOM = 2.5;

export function clampCanvasZoom(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_CANVAS_ZOOM;
  return Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, numeric));
}

export function getCanvasTransformStyle(pan, zoom) {
  return `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
}

export function syncZoomControls({ zoom, zoomText, zoomRange }) {
  const percent = Math.round(zoom * 100);
  if (zoomText) zoomText.textContent = `${percent}%`;
  if (zoomRange) zoomRange.value = percent;
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
