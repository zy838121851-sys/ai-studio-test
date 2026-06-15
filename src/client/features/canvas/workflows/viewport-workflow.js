export function createViewportWorkflow({
  elements = {},
  state = {},
  services = {}
} = {}) {
  const {
    canvasWorld = null,
    canvasViewport = null,
    zoomText = null,
    zoomRange = null
  } = elements;

  const runtime = { ...services, ...state };

  const {
    getPan = () => ({ x: 0, y: 0 }),
    setPan = () => {},
    getZoom = () => 1,
    setZoom = () => {},
    getDefaultPan = () => ({ x: 0, y: 0 }),
    getSelectedNode = () => null,
    getCanvasNodeRect = () => [],
    isStackMemberHidden = (node) => node?.classList?.contains("stack-member-hidden") || false,
    isImageEditPopoverOpen = () => false,
    isImageTextPanelOpen = () => false,
    positionImageEditPopover = () => {},
    positionTextFormatToolbar = () => {},
    positionShapeFormatToolbar = () => {},
    positionAgentBubble = () => {},
    positionTextPanel = () => {},
    getViewportRect = () => canvasViewport?.getBoundingClientRect(),
    syncZoomControls = () => {},
    getCanvasTransformStyle = () => "",
    clampCanvasZoom = (value) => value,
    centerPanOnWorldPoint = () => ({ x: 0, y: 0 }),
    fitWorldBoundsInViewport = () => ({ pan: { x: 0, y: 0 }, zoom: 1 })
  } = runtime;

  function applyTransform() {
    const pan = getPan();
    const zoom = getZoom();
    canvasWorld.style.transform = getCanvasTransformStyle(pan, zoom);
    syncZoomControls({ zoom, zoomText, zoomRange });
    if (isImageEditPopoverOpen()) {
      positionImageEditPopover();
    }
    if (isImageTextPanelOpen()) {
      positionTextPanel();
    }
    positionTextFormatToolbar();
    positionShapeFormatToolbar();
    positionAgentBubble();
  }

  function centerViewOnNode(node, targetZoom = 1.18) {
    const x = parseFloat(node.style.left || "0") + node.offsetWidth / 2;
    const y = parseFloat(node.style.top || "0") + node.offsetHeight / 2;
    setZoom(clampCanvasZoom(targetZoom));
    setPan(centerPanOnWorldPoint({ x, y }, getZoom()));
    applyTransform();
  }

  function returnViewToContent() {
    const selectedNode = getSelectedNode();
    if (selectedNode && !isStackMemberHidden(selectedNode)) {
      centerViewOnNode(selectedNode, getZoom());
      return;
    }

    const nodes = getCanvasNodeRect().filter((node) => !isStackMemberHidden(node));
    if (!nodes.length) {
      setPan(getDefaultPan());
      setZoom(1);
      applyTransform();
      return;
    }

    const bounds = nodes.reduce((box, node) => {
      const x = parseFloat(node.style.left || "0");
      const y = parseFloat(node.style.top || "0");
      const width = node.offsetWidth || 0;
      const height = node.offsetHeight || 0;
      return {
        minX: Math.min(box.minX, x),
        minY: Math.min(box.minY, y),
        maxX: Math.max(box.maxX, x + width),
        maxY: Math.max(box.maxY, y + height)
      };
    }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

    const viewportRect = getViewportRect();
    if (!viewportRect) return;

    const nextView = fitWorldBoundsInViewport({
      bounds,
      viewportRect
    });
    setZoom(nextView.zoom);
    setPan(nextView.pan);
    applyTransform();
  }

  return {
    applyTransform,
    centerViewOnNode,
    returnViewToContent
  };
}
