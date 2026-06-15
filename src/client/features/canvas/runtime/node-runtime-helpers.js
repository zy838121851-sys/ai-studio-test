export function createNodeRuntimeHelpers(deps) {
  const {
    directorActions,
    directorViewCount,
    renderNodeTemplate = () => null,
    getRenderNodeTemplate = null,
    createWorkspaceNode = null,
    getEmptyState = null,
    getCanvasWorld = null,
    ensureCanvasNodeId = null,
    getNextCanvasNodeId = null,
    getMakeDraggable = () => () => {},
    getSelectNode = () => () => {},
    getInitModelViewer = () => () => {},
    getIsEditingImageNode = () => () => false,
    getIsImageEditPopoverOpen = () => () => false,
    getPositionImageEditPopover = () => () => {},
    getHideCanvasContextMenu = () => () => {},
    getHideAddNodeMenu = () => () => {},
    getShowImageEditPopover = () => () => {},
    getElementWorldBounds,
    nodeControlsManager = null
  } = deps;

  function nodeTemplate(kind, title, desc, media = {}) {
    const render = typeof getRenderNodeTemplate === "function"
      ? getRenderNodeTemplate()
      : renderNodeTemplate;
    return render({
      kind,
      title,
      desc,
      media,
      directorActions,
      directorViewCount
    });
  }

  function ensureResizeHandles(node) {
    return nodeControlsManager.ensureResizeHandles(node);
  }

  function ensureNodeControls(node) {
    return nodeControlsManager.ensureNodeControls(node);
  }

  function getNodeBounds(node) {
    return getElementWorldBounds(node);
  }

  function addNode({ kind, title, desc, x, y, media }) {
    const workspaceCreator = createWorkspaceNode;
    if (typeof workspaceCreator !== "function") return null;
    return workspaceCreator({
      config: { kind, title, desc, x, y, media },
      renderTemplate: nodeTemplate,
      emptyState: getEmptyState?.(),
      canvasWorld: getCanvasWorld?.(),
      ensureNodeId: (node) => {
        const nextCanvasId = getNextCanvasNodeId?.() || (() => 0);
        return ensureCanvasNodeId(node, { nextId: nextCanvasId });
      },
      makeDraggable: getMakeDraggable(),
      selectNode: getSelectNode(),
      initModelViewer: getInitModelViewer(),
      onImageLoaded: (node, image) => {
        const frame = node.querySelector(".image-frame");
        if (!node.dataset.manualSize) {
          frame.style.aspectRatio = `${image.naturalWidth} / ${Math.max(1, image.naturalHeight)}`;
          const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
          node.style.width = `${Math.min(560, Math.max(260, 320 * ratio))}px`;
        }
        if (getIsEditingImageNode()(node) && getIsImageEditPopoverOpen()) {
          getPositionImageEditPopover()(node);
        }
      },
      onImageDoubleClick: (event, node) => {
        if (event.button !== 0 || event.target.closest(".resize-handle")) return;
        event.preventDefault();
        event.stopPropagation();
        const closeContextMenu = getHideCanvasContextMenu();
        const closeAddNodeMenu = getHideAddNodeMenu();
        closeContextMenu();
        closeAddNodeMenu();
        getSelectNode()(node);
        getShowImageEditPopover()(node);
      }
    });
  }

  return {
    nodeTemplate,
    ensureResizeHandles,
    ensureNodeControls,
    getNodeBounds,
    addNode
  };
}
