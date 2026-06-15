import { hslToHexColor } from "./drawing-tools.js";
import {
  createShapeFormatToolbarElement,
  getActiveShapeNode as getActiveShapeNodeFromSelection,
  getShapeToolbarColorTarget,
  getShapeToolbarNode,
  hideShapeToolbar,
  positionShapeToolbar,
  syncShapeSvgStyles
} from "./shape-tool.js";

export function createShapeToolbarController({
  getCanvasNodeScreenRect,
  getSelectedNode,
  isFixedStrokeToolName,
  isLinearDrawToolName,
  recordUndoAction = () => {}
}) {
  let shapeColorDrag = null;

  const ensureShapeFormatToolbar = () => {
    return createShapeFormatToolbarElement({
      onPointerDown: (event) => {
        event.stopPropagation();
        if (event.target.closest("[data-shape-spectrum], [data-shape-color]")) {
          applyShapeToolbarColor(event, event.currentTarget);
        }
      },
      onInput: (event) => {
        const input = event.target.closest("[data-shape-style]");
        const shapeNode = getActiveShapeNodeFromSelection(getSelectedNode());
        if (!input || !shapeNode) return;
        if (input.dataset.shapeStyle === "strokeWidth") {
          const before = snapshotShapeStyle(shapeNode);
          shapeNode.style.setProperty("--shape-stroke-width", input.value);
          syncShapeSvgStyles(shapeNode);
          recordShapeStyleUndo(shapeNode, before, "shape-stroke-width");
        }
      },
      onClick: handleShapeToolbarClick,
      onPointerMove: handleShapeColorDragMove,
      onPointerUp: handleShapeColorDragEnd
    });
  };

  const setShapeNodeColor = (node, target, color, { record = true } = {}) => {
    const before = snapshotShapeStyle(node);
    node.style.setProperty(target === "stroke" ? "--shape-stroke" : "--shape-fill", color);
    syncShapeSvgStyles(node);
    positionShapeFormatToolbar();
    if (record) recordShapeStyleUndo(node, before, target === "stroke" ? "shape-stroke-color" : "shape-fill-color");
  };

  const setShapeColorFromSpectrum = (event, toolbar, spectrum) => {
    const shapeNode = getShapeToolbarNode(toolbar, getActiveShapeNodeFromSelection(getSelectedNode()));
    if (!shapeNode) return false;
    const rect = spectrum.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    const marker = spectrum.querySelector("i");
    if (marker) {
      marker.style.left = `${x * 100}%`;
      marker.style.top = `${y * 100}%`;
    }
    setShapeNodeColor(shapeNode, getShapeToolbarColorTarget(toolbar), hslToHexColor(x * 360, 82, 88 - y * 76), { record: false });
    return true;
  };

  const applyShapeToolbarColor = (event, toolbar) => {
    const shapeNode = getShapeToolbarNode(toolbar, getActiveShapeNodeFromSelection(getSelectedNode()));
    if (!shapeNode) return false;
    const spectrum = event.target.closest("[data-shape-spectrum]");
    if (spectrum) {
      event.preventDefault();
      event.stopPropagation();
      shapeColorDrag = {
        toolbar,
        spectrum,
        pointerId: event.pointerId,
        node: shapeNode,
        before: snapshotShapeStyle(shapeNode),
        type: getShapeToolbarColorTarget(toolbar) === "stroke" ? "shape-stroke-color" : "shape-fill-color"
      };
      spectrum.setPointerCapture?.(event.pointerId);
      setShapeColorFromSpectrum(event, toolbar, spectrum);
      return true;
    }
    const colorButton = event.target.closest("[data-shape-color]");
    if (colorButton) {
      event.preventDefault();
      event.stopPropagation();
      setShapeNodeColor(shapeNode, getShapeToolbarColorTarget(toolbar), colorButton.dataset.shapeColor);
      toolbar.classList.remove("picker-open");
      return true;
    }
    return false;
  };

  const handleShapeColorDragMove = (event) => {
    if (!shapeColorDrag || event.pointerId !== shapeColorDrag.pointerId) return;
    event.preventDefault();
    setShapeColorFromSpectrum(event, shapeColorDrag.toolbar, shapeColorDrag.spectrum);
  };

  const handleShapeColorDragEnd = (event) => {
    if (!shapeColorDrag || event.pointerId !== shapeColorDrag.pointerId) return;
    recordShapeStyleUndo(shapeColorDrag.node, shapeColorDrag.before, shapeColorDrag.type);
    shapeColorDrag.spectrum.releasePointerCapture?.(event.pointerId);
    shapeColorDrag = null;
  };

  const handleShapeToolbarPointer = (event) => {
    if (event.target.closest('[data-shape-style="strokeWidth"]')) return;
    const toolbar = event.currentTarget;
    const shapeNode = getShapeToolbarNode(toolbar, getActiveShapeNodeFromSelection(getSelectedNode()));
    const trigger = event.target.closest("[data-color-target]");
    if (trigger) {
      event.preventDefault();
      event.stopPropagation();
      toolbar.dataset.colorTarget = trigger.dataset.colorTarget;
      toolbar.classList.toggle("picker-open");
      return;
    }
    const spectrum = event.target.closest("[data-shape-spectrum]");
    if (spectrum && shapeNode) {
      event.preventDefault();
      event.stopPropagation();
      const rect = spectrum.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      const color = hslToHexColor(x * 360, 82, 88 - y * 76);
      setShapeNodeColor(shapeNode, toolbar.dataset.colorTarget === "stroke" ? "stroke" : "fill", color);
      toolbar.classList.remove("picker-open");
      positionShapeFormatToolbar();
      return;
    }
    const colorButton = event.target.closest("[data-shape-color]");
    if (colorButton && shapeNode) {
      event.preventDefault();
      event.stopPropagation();
      setShapeNodeColor(
        shapeNode,
        toolbar.dataset.colorTarget === "stroke" ? "stroke" : "fill",
        colorButton.dataset.shapeColor
      );
      toolbar.classList.remove("picker-open");
      positionShapeFormatToolbar();
      return;
    }
  };

  const handleShapeToolbarClick = (event) => {
    const colorButton = event.target.closest("[data-shape-color]");
    if (colorButton) {
      const toolbar = event.currentTarget;
      const shapeNode = getShapeToolbarNode(toolbar, getActiveShapeNodeFromSelection(getSelectedNode()));
      if (!shapeNode) return;
      event.preventDefault();
      event.stopPropagation();
      setShapeNodeColor(
        shapeNode,
        toolbar.dataset.colorTarget === "stroke" ? "stroke" : "fill",
        colorButton.dataset.shapeColor
      );
      toolbar.classList.remove("picker-open");
      return;
    }
    const trigger = event.target.closest("[data-color-target]");
    if (trigger) {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.dataset.colorTarget = trigger.dataset.colorTarget;
      event.currentTarget.classList.toggle("picker-open");
      return;
    }
    applyShapeToolbarColor(event, event.currentTarget);
  };

  const positionShapeFormatToolbar = () => {
    const toolbar = ensureShapeFormatToolbar();
    const selectedNode = getActiveShapeNodeFromSelection(getSelectedNode());
    if (!selectedNode) {
      hideShapeToolbar();
      return;
    }
    const rect = getCanvasNodeScreenRect(selectedNode) || selectedNode.getBoundingClientRect?.();
    if (!rect) return;
    positionShapeToolbar({
      toolbar,
      node: selectedNode,
      nodeRect: rect,
      isLinear: isLinearDrawToolName(selectedNode.dataset.tool) || isFixedStrokeToolName(selectedNode.dataset.tool)
    });
  };

  const setSelectedShapeColor = (target, color) => {
    const shapeNode = getActiveShapeNodeFromSelection(getSelectedNode());
    if (!shapeNode) return;
    setShapeNodeColor(shapeNode, target, color);
  };

  const snapshotShapeStyle = (node) => ({
    style: node?.getAttribute("style") || ""
  });

  const restoreShapeStyle = (node, snapshot) => {
    if (!node?.isConnected) return;
    node.setAttribute("style", snapshot.style);
    syncShapeSvgStyles(node);
    positionShapeFormatToolbar();
  };

  const recordShapeStyleUndo = (node, before, type) => {
    if (!node?.isConnected || !before) return;
    if ((node.getAttribute("style") || "") === before.style) return;
    recordUndoAction({
      type,
      undo: () => restoreShapeStyle(node, before)
    });
  };

  return {
    ensureShapeFormatToolbar,
    handleShapeToolbarPointer,
    handleShapeColorDragMove,
    handleShapeColorDragEnd,
    handleShapeToolbarClick,
    positionShapeFormatToolbar,
    setShapeNodeColor,
    setSelectedShapeColor,
    setShapeColorFromSpectrum,
    applyShapeToolbarColor
  };
}
