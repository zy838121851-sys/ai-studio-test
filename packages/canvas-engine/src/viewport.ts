export interface Point {
  x: number;
  y: number;
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface WorldBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_VIEWPORT: Readonly<ViewportState> = { x: 0, y: 0, zoom: 1 };
export const MIN_VIEWPORT_ZOOM = 0.1;
export const MAX_VIEWPORT_ZOOM = 4;

export function clampViewportZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return DEFAULT_VIEWPORT.zoom;
  return Math.min(MAX_VIEWPORT_ZOOM, Math.max(MIN_VIEWPORT_ZOOM, zoom));
}

export function screenToWorld(point: Point, viewport: ViewportState): Point {
  const zoom = clampViewportZoom(viewport.zoom);
  return { x: (point.x - viewport.x) / zoom, y: (point.y - viewport.y) / zoom };
}

export function worldToScreen(point: Point, viewport: ViewportState): Point {
  const zoom = clampViewportZoom(viewport.zoom);
  return { x: point.x * zoom + viewport.x, y: point.y * zoom + viewport.y };
}

export function panViewport(viewport: ViewportState, delta: Point): ViewportState {
  return { x: viewport.x + delta.x, y: viewport.y + delta.y, zoom: clampViewportZoom(viewport.zoom) };
}

export function zoomViewportAt(viewport: ViewportState, nextZoom: number, anchor: Point): ViewportState {
  const worldAtAnchor = screenToWorld(anchor, viewport);
  const zoom = clampViewportZoom(nextZoom);
  return {
    zoom,
    x: anchor.x - worldAtAnchor.x * zoom,
    y: anchor.y - worldAtAnchor.y * zoom
  };
}

export function fitBoundsToViewport(bounds: WorldBounds, viewportSize: ViewportSize, padding = 48): ViewportState {
  if (bounds.width <= 0 || bounds.height <= 0 || viewportSize.width <= 0 || viewportSize.height <= 0) {
    return { ...DEFAULT_VIEWPORT };
  }
  const availableWidth = Math.max(1, viewportSize.width - padding * 2);
  const availableHeight = Math.max(1, viewportSize.height - padding * 2);
  const zoom = clampViewportZoom(Math.min(availableWidth / bounds.width, availableHeight / bounds.height));
  return {
    zoom,
    x: (viewportSize.width - bounds.width * zoom) / 2 - bounds.x * zoom,
    y: (viewportSize.height - bounds.height * zoom) / 2 - bounds.y * zoom
  };
}
