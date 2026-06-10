export function createSelectionBoxElement(parent) {
  const box = document.createElement("div");
  box.className = "selection-box";
  parent?.appendChild(box);
  return box;
}

export function getSelectionBoxRect(drag) {
  if (!drag) return null;
  const left = Math.min(drag.startX, drag.currentX);
  const top = Math.min(drag.startY, drag.currentY);
  const width = Math.abs(drag.currentX - drag.startX);
  const height = Math.abs(drag.currentY - drag.startY);
  return { left, top, width, height };
}

export function getWorldSelectionArea(drag, viewportPointToWorld) {
  if (!drag) return null;
  const start = viewportPointToWorld(drag.startClientX, drag.startClientY);
  const end = viewportPointToWorld(drag.currentClientX, drag.currentClientY);
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  };
}

export function applySelectionBoxRect(box, rect) {
  if (!box || !rect) return;
  Object.assign(box.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`
  });
}
