export function createCanvasMenuWorkflow({
  elements = {},
  services = {}
} = {}) {
  const {
    addNodeMenu,
    canvasContextMenu,
    canvasViewport,
    width = 360,
    contextWidth = 300,
    contextHeight = 445,
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

  function showCanvasContextMenu(clientX, clientY) {
    contextMenuPoint = viewportPointToWorld(clientX, clientY);
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
    }
  };
}
