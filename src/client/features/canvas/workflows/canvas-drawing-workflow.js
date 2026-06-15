import {
  createDrawingPreviewElement,
  createDrawingState,
  syncShapeSvgStyles,
  updateDrawingPreviewElement
} from "../shape-tool.js";
import { buildLinearSvg, buildPointsPath } from "../drawing-tools.js";
import { renderToolSvg } from "../node-icons.js";

export function createCanvasDrawingWorkflow({
  elements = {},
  state = {},
  services = {}
} = {}) {
  const {
    canvasViewport = null,
    canvasWorld = null,
    emptyState = null
  } = elements;

  const {
    getCanvasDrawing = () => null,
    setCanvasDrawing = () => {},
    isDrawingToolShapeTextTools = () => new Set(),
    viewportCenterPoint = () => ({ x: 0, y: 0 })
  } = state;

  const {
    ensureCanvasNodeId = () => {},
    makeDraggable = () => {},
    selectNode = () => null,
    resetCanvasTool = () => {},
    setTextNodeEditing = () => {},
    positionShapeFormatToolbar = () => {},
    isFixedStrokeToolName = () => false,
    isLinearDrawToolName = () => false,
    getNextCanvasNodeId = () => "node-1",
    viewportPointToWorld = () => ({ x: 0, y: 0 }),
    syncCanvasTransform = () => {}
  } = services;

  function addCanvasToolNode(tool, options = {}) {
    const point = options.point || viewportCenterPoint();
    const names = {
      rect: "Rectangle",
      circle: "Circle",
      triangle: "Triangle",
      star: "Star",
      arrow: "Arrow",
      line: "Line",
      pen: "Pen",
      text: "Text",
      "text-rect": "Text",
      "text-circle": "Text",
      speech: "Speech",
      "left-arrow": "Text",
      "right-arrow": "Text"
    };
    const sizes = {
      rect: { width: 220, height: 140 },
      circle: { width: 170, height: 170 },
      triangle: { width: 180, height: 170 },
      star: { width: 180, height: 170 },
      arrow: { width: 260, height: 110 },
      line: { width: 260, height: 80 },
      pen: { width: 260, height: 120 },
      text: { width: 260, height: 96 },
      "text-rect": { width: 220, height: 140 },
      "text-circle": { width: 170, height: 170 },
      speech: { width: 240, height: 150 },
      "left-arrow": { width: 260, height: 140 },
      "right-arrow": { width: 260, height: 140 }
    };
    const shapeTextTools = isDrawingToolShapeTextTools() || new Set();
    const size = options.size || sizes[tool] || sizes.rect;
    if (["circle", "diamond", "star"].includes(tool)) {
      const side = Math.min(size.width, size.height);
      size.width = side;
      size.height = side;
    }
    const label = tool === "text" || shapeTextTools.has(tool) ? "" : names[tool];
    const node = document.createElement("article");
    node.className = `node-card node-draw canvas-object canvas-${tool === "text" ? "text" : "shape"} canvas-tool-${tool}`;
    node.style.left = `${options.x ?? (point.x - size.width / 2)}px`;
    node.style.top = `${options.y ?? (point.y - size.height / 2)}px`;
    node.style.width = `${size.width}px`;
    node.style.minHeight = `${size.height}px`;
    node.style.setProperty("--shape-fill", isLinearDrawToolName(tool) || isFixedStrokeToolName(tool) ? "transparent" : "#ffffff");
    node.style.setProperty("--shape-stroke", isFixedStrokeToolName(tool) ? "#050505" : "#1f2933");
    node.style.setProperty("--shape-stroke-width", isFixedStrokeToolName(tool) ? "4" : "3");
    node.dataset.kind = "draw";
    node.dataset.tool = tool;
    ensureCanvasNodeId(node, { nextId: getNextCanvasNodeId });
    if (tool === "text") {
      node.innerHTML = `
        <div class="canvas-text-editor" contenteditable="false" spellcheck="false" data-placeholder="Input text"></div>
      `;
    } else if (shapeTextTools.has(tool)) {
      node.innerHTML = `
        <div class="draw-shape" aria-hidden="true">${renderToolSvg(tool)}</div>
        <div class="canvas-text-editor shape-text-editor" contenteditable="false" spellcheck="false" data-placeholder="Input text"></div>
      `;
    } else {
      node.innerHTML = `<div class="draw-shape" aria-hidden="true">${options.svgMarkup || renderToolSvg(tool)}</div>`;
    }
    node.classList.toggle("node-text-tool", tool === "text");
    node.classList.toggle("node-shape-text", shapeTextTools.has(tool));
    node.dataset.manualSize = "true";
    emptyState?.classList.add("hidden");
    makeDraggable(node);
    node.querySelector(".node-expand")?.remove();
    canvasWorld?.appendChild(node);
    syncShapeSvgStyles(node);
    syncCanvasTransform();
    selectNode(node);
    if (node.classList.contains("canvas-shape")) {
      window.setTimeout(() => positionShapeFormatToolbar(), 0);
    }
    if (tool === "text" || shapeTextTools.has(tool)) {
      const editable = node.querySelector(".canvas-text-editor");
      editable?.addEventListener("blur", () => setTextNodeEditing(node, false));
      window.setTimeout(() => {
        setTextNodeEditing(node, true);
      }, 0);
    }
    if (tool === "text") resetCanvasTool();
    return node;
  }

  function pointsToPath(points) {
    return buildPointsPath(points);
  }

  function createDrawingPreview(startClientX, startClientY, tool) {
    const rect = canvasViewport.getBoundingClientRect();
    const preview = createDrawingPreviewElement({
      viewportRect: rect,
      tool,
      renderSvg: renderToolSvg,
      buildPenSvg: (viewportRect) => `<svg viewBox="0 0 ${viewportRect.width} ${viewportRect.height}" preserveAspectRatio="none"><path /></svg>`
    });
    canvasViewport.appendChild(preview);
    setCanvasDrawing(createDrawingState({
      tool,
      preview,
      startClientX,
      startClientY,
      viewportRect: rect
    }));
    canvasViewport.classList.add("drawing");
    updateDrawingPreview();
  }

  function updateDrawingPreview() {
    const drawing = getCanvasDrawing();
    updateDrawingPreviewElement(drawing, pointsToPath, buildLinearSvg);
  }

  function finishCanvasDrawing() {
    if (!getCanvasDrawing()) return;
    const drawing = getCanvasDrawing();
    const viewportRect = canvasViewport.getBoundingClientRect();
    const start = viewportPointToWorld(drawing.startClientX, drawing.startClientY);
    const end = viewportPointToWorld(drawing.currentClientX, drawing.currentClientY);
    const width = Math.max(18, Math.abs(end.x - start.x));
    const height = Math.max(18, Math.abs(end.y - start.y));
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const moved = Math.abs(drawing.currentClientX - drawing.startClientX) > 4
      || Math.abs(drawing.currentClientY - drawing.startClientY) > 4;
    const tool = drawing.tool;
    drawing.preview.remove();
    setCanvasDrawing(null);
    canvasViewport.classList.remove("drawing");
    if (!moved) return;
    if (tool === "pen") {
      const worldPoints = drawing.points.map((point) => viewportPointToWorld(viewportRect.left + point.x, viewportRect.top + point.y));
      const minX = Math.min(...worldPoints.map((point) => point.x));
      const minY = Math.min(...worldPoints.map((point) => point.y));
      const maxX = Math.max(...worldPoints.map((point) => point.x));
      const maxY = Math.max(...worldPoints.map((point) => point.y));
      const pad = 10;
      const nodeWidth = Math.max(18, maxX - minX + pad * 2);
      const nodeHeight = Math.max(18, maxY - minY + pad * 2);
      const path = buildPointsPath(worldPoints, minX - pad, minY - pad);
      return addCanvasToolNode("pen", {
        x: minX - pad,
        y: minY - pad,
        size: { width: nodeWidth, height: nodeHeight },
        svgMarkup: `<svg viewBox="0 0 ${nodeWidth} ${nodeHeight}" preserveAspectRatio="none"><path d="${path}" /></svg>`
      });
    }
    if (isLinearDrawToolName(tool)) {
      const pad = 12;
      const nodeWidth = Math.max(18, width + pad * 2);
      const nodeHeight = Math.max(18, height + pad * 2);
      const startRel = { x: start.x <= end.x ? pad : nodeWidth - pad, y: start.y <= end.y ? pad : nodeHeight - pad };
      const endRel = { x: start.x <= end.x ? nodeWidth - pad : pad, y: start.y <= end.y ? nodeHeight - pad : pad };
      return addCanvasToolNode(tool, {
        x: x - pad,
        y: y - pad,
        size: { width: nodeWidth, height: nodeHeight },
        svgMarkup: buildLinearSvg(tool, nodeWidth, nodeHeight, startRel, endRel)
      });
    }
    return addCanvasToolNode(tool, {
      x,
      y,
      size: {
        width,
        height: tool === "line" || tool === "arrow" ? Math.max(28, height) : height
      }
    });
  }

  return {
    addCanvasToolNode,
    createDrawingPreview,
    updateDrawingPreview,
    finishCanvasDrawing,
    getCanvasDrawing,
    setCanvasDrawing
  };
}
