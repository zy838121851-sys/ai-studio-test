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
        const naturalWidth = Number(image.naturalWidth || 0);
        const naturalHeight = Number(image.naturalHeight || 0);
        node.dataset.imageNaturalWidth = String(naturalWidth || "");
        node.dataset.imageNaturalHeight = String(naturalHeight || "");
        if (node.dataset.sourceMode === "generated") {
          if (naturalWidth > 0) node.dataset.outputWidth = String(naturalWidth);
          if (naturalHeight > 0) node.dataset.outputHeight = String(naturalHeight);
        }
        const naturalAspect = `${naturalWidth} / ${Math.max(1, naturalHeight)}`;
        const naturalRatio = naturalWidth / Math.max(1, naturalHeight);
        const currentRatio = parseAspectRatio(frame?.style?.aspectRatio || "");
        const shouldRepairGeneratedAspect = node.dataset.sourceMode === "generated"
          && naturalWidth > 0
          && naturalHeight > 0
          && !node.dataset.cropOriginalAspect
          && (!currentRatio || Math.abs(currentRatio - naturalRatio) > 0.01);
        if (shouldRepairGeneratedAspect) {
          frame.style.aspectRatio = naturalAspect;
        }
        if (!node.dataset.manualSize) {
          frame.style.aspectRatio = naturalAspect;
          node.style.width = `${Math.min(560, Math.max(260, 320 * naturalRatio))}px`;
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

function parseAspectRatio(value = "") {
  const text = String(value || "").trim();
  if (!text) return 0;
  if (text.includes("/")) {
    const [width, height] = text.split("/").map((part) => Number.parseFloat(part.trim()));
    return width > 0 && height > 0 ? width / height : 0;
  }
  const numeric = Number.parseFloat(text);
  return numeric > 0 ? numeric : 0;
}
