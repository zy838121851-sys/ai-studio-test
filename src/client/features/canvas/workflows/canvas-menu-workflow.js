export function createCanvasMenuWorkflow({
  elements = {},
  services = {}
} = {}) {
  const {
    addNodeMenu,
    canvasContextMenu,
    canvasViewport,
    width = 360,
    contextWidth = 230,
    contextHeight = 390,
    contextAddNodeHeight = 520
  } = elements;

  const {
    hideAddNodeMenu = () => {},
    hideImageEditPopover = () => {},
    showViewportMenu = () => {},
    viewportPointToWorld = () => ({ x: 0, y: 0 })
  } = services;

  let addMenuPoint = null;
  let contextMenuPoint = null;
  let contextMenuTargetNode = null;

  function showAddNodeMenu(clientX, clientY) {
    addMenuPoint = viewportPointToWorld(clientX, clientY);
    showViewportMenu({
      menu: addNodeMenu,
      clientX,
      clientY,
      viewport: canvasViewport,
      width,
      height: contextAddNodeHeight
    });
  }

  function showCanvasContextMenu(clientX, clientY, targetNode = null) {
    contextMenuPoint = viewportPointToWorld(clientX, clientY);
    contextMenuTargetNode = targetNode || null;
    if (canvasContextMenu) {
      canvasContextMenu.dataset.contextMode = contextMenuTargetNode ? "node" : "canvas";
      canvasContextMenu.dataset.contextNodeId = contextMenuTargetNode?.dataset?.nodeId || "";
      const lockButton = canvasContextMenu.querySelector('[data-context-action="lock"] strong');
      if (lockButton) {
        lockButton.textContent = contextMenuTargetNode?.dataset?.locked === "true" ? "解锁" : "锁定";
      }
    }
    hideAddNodeMenu();
    hideImageEditPopover();
    showViewportMenu({
      menu: canvasContextMenu,
      clientX,
      clientY,
      viewport: canvasViewport,
      width: contextWidth,
      height: contextHeight
    });
  }

  return {
    showAddNodeMenu,
    showCanvasContextMenu,
    getAddMenuPoint: () => addMenuPoint,
    setAddMenuPoint: (point) => {
      addMenuPoint = point;
    },
    getContextMenuPoint: () => contextMenuPoint,
    setContextMenuPoint: (point) => {
      contextMenuPoint = point;
    },
    getContextMenuTargetNode: () => contextMenuTargetNode
  };
}
