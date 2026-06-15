import {
  getNodeScreenRectFromWorld,
  viewportCenterToWorldPoint,
  viewportPointToWorldPoint
} from "../canvas-geometry.js";

export function createCanvasCoordinateWorkflow({
  elements = {},
  state = {}
} = {}) {
  const {
    canvasViewport = null
  } = elements;

  const {
    getPan = () => ({ x: 0, y: 0 }),
    getZoom = () => 1,
    getNextCanvasNodeId = () => "node-1"
  } = state;

  function nextCanvasNodeId() {
    return getNextCanvasNodeId();
  }

  function getCanvasNodeScreenRect(node) {
    if (!node) return null;
    const domRect = node.getBoundingClientRect?.();
    if (domRect && (domRect.width || domRect.height)) {
      return {
        left: domRect.left,
        top: domRect.top,
        width: domRect.width,
        height: domRect.height
      };
    }
    const { x, y } = getPan();
    const zoom = getZoom();
    return getNodeScreenRectFromWorld({
      node,
      viewportRect: canvasViewport?.getBoundingClientRect(),
      pan: { x, y },
      zoom
    });
  }

  function viewportPointToWorld(clientX, clientY) {
    const { x, y } = getPan();
    const zoom = getZoom();
    return viewportPointToWorldPoint({
      clientX,
      clientY,
      viewportRect: canvasViewport?.getBoundingClientRect(),
      pan: { x, y },
      zoom
    });
  }

  function viewportCenterPoint() {
    const { x, y } = getPan();
    return viewportCenterToWorldPoint({
      viewportRect: canvasViewport?.getBoundingClientRect(),
      pan: { x, y },
      zoom: getZoom()
    });
  }

  return {
    nextCanvasNodeId,
    getCanvasNodeScreenRect,
    viewportPointToWorld,
    viewportCenterPoint
  };
}
