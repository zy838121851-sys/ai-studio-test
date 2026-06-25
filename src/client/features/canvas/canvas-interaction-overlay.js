const OVERLAY_ID = "canvasInteractionOverlay";

export function ensureCanvasInteractionOverlay(canvasViewport) {
  const ownerDocument = canvasViewport?.ownerDocument || globalThis.document;
  if (!ownerDocument || !canvasViewport?.getBoundingClientRect) return null;
  let overlay = ownerDocument.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = ownerDocument.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "canvas-interaction-overlay";
    ownerDocument.body?.appendChild(overlay);
  }
  syncCanvasInteractionOverlay(overlay, canvasViewport);
  return overlay;
}

export function syncCanvasInteractionOverlay(overlay, canvasViewport) {
  if (!overlay || !canvasViewport?.getBoundingClientRect) return;
  const rect = canvasViewport.getBoundingClientRect();
  Object.assign(overlay.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: "28",
    transform: "none",
    translate: "none",
    scale: "none",
    rotate: "none",
    zoom: "1"
  });
}

export function cleanupCanvasInteractionOverlay(overlay) {
  if (!overlay || overlay.children.length) return;
  overlay.remove();
}
