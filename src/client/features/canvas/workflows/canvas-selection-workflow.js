import { applySelectionBoxRect, getWorldSelectionArea } from "../selection-box.js";
import { rectsIntersect } from "../canvas-geometry.js";

export function createCanvasSelectionWorkflow({
  elements = {},
  state = {},
  services = {}
} = {}) {
  const { canvasViewport = null } = elements;
  const {
    getSelectionDrag = () => null,
    setSelectionDrag = () => {}
  } = state;
  const {
    createSelectionBoxElement = () => null,
    getSelectionBoxRect = () => ({}),
    getVisibleCanvasNodes = () => [],
    getNodeBounds = () => ({}),
    getWorldSelectionArea = () => ({ width: 0, height: 0 }),
    selectNodes = () => {},
    viewportPointToWorld = () => ({ x: 0, y: 0 })
  } = services;

  function createSelectionBox() {
    return createSelectionBoxElement(canvasViewport);
  }

  function updateSelectionBox() {
    const selectionDrag = getSelectionDrag();
    if (!selectionDrag) return;
    applySelectionBoxRect(selectionDrag.box, getSelectionBoxRect(selectionDrag));
  }

  function finishSelectionBox() {
    const selectionDrag = getSelectionDrag();
    if (!selectionDrag) return;
    const area = getWorldSelectionArea(selectionDrag, viewportPointToWorld);
    const selected = area.width < 4 && area.height < 4
      ? []
      : getVisibleCanvasNodes().filter((node) => rectsIntersect(getNodeBounds(node), area));
    selectNodes(selected);
    selectionDrag.box.remove();
    setSelectionDrag(null);
    canvasViewport?.classList.remove("selecting");
  }

  return {
    createSelectionBox,
    updateSelectionBox,
    finishSelectionBox,
    getSelectionDrag,
    setSelectionDrag
  };
}
