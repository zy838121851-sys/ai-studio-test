export function createCanvasMenuStateWorkflow({
  elements = {},
  services = {}
} = {}) {
  const {
    addNodeMenu = null,
    canvasContextMenu = null
  } = elements;

  const {
    attachDragBlocker = (node) => {}
  } = services;

  function hideAddNodeMenu() {
    addNodeMenu?.classList.remove("open");
  }

  function hideCanvasContextMenu() {
    canvasContextMenu?.classList.remove("open");
  }

  function stopNativeDrag(node) {
    if (!node) return;
    node.draggable = false;
    attachDragBlocker(node);
  }

  return {
    hideAddNodeMenu,
    hideCanvasContextMenu,
    stopNativeDrag
  };
}
