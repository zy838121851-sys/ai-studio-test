const SHAPE_SIZES = {
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

const SHAPE_NAMES = {
  rect: "矩形",
  circle: "圆形",
  triangle: "三角形",
  star: "星形",
  arrow: "箭头",
  line: "线段",
  pen: "画笔",
  text: "文字",
  "text-rect": "文字",
  "text-circle": "文字",
  speech: "文字",
  "left-arrow": "文字",
  "right-arrow": "文字"
};

export function getShapeSize(tool, override) {
  const size = { ...(override || SHAPE_SIZES[tool] || SHAPE_SIZES.rect) };
  if (["circle", "diamond", "star"].includes(tool)) {
    const side = Math.min(size.width, size.height);
    size.width = side;
    size.height = side;
  }
  return size;
}

export function getShapeLabel(tool, shapeTextTools = new Set()) {
  return tool === "text" || shapeTextTools.has(tool) ? "" : SHAPE_NAMES[tool];
}

export function createDrawNodeElement({
  tool,
  point,
  size,
  x,
  y,
  isLinear,
  isFixedStroke,
  shapeTextTools = new Set(),
  svgMarkup = "",
  renderSvg = () => ""
} = {}) {
  const node = document.createElement("article");
  node.className = `node-card node-draw canvas-object canvas-${tool === "text" ? "text" : "shape"} canvas-tool-${tool}`;
  node.style.left = `${x ?? (point.x - size.width / 2)}px`;
  node.style.top = `${y ?? (point.y - size.height / 2)}px`;
  node.style.width = `${size.width}px`;
  node.style.minHeight = `${size.height}px`;
  node.style.setProperty("--shape-fill", isLinear || isFixedStroke ? "transparent" : "#ffffff");
  node.style.setProperty("--shape-stroke", isFixedStroke ? "#050505" : "#1f2933");
  node.style.setProperty("--shape-stroke-width", isFixedStroke ? "4" : "3");
  node.dataset.kind = "draw";
  node.dataset.tool = tool;

  if (tool === "text") {
    node.innerHTML = `<div class="canvas-text-editor" contenteditable="false" spellcheck="false" data-placeholder="输入文字"></div>`;
  } else if (shapeTextTools.has(tool)) {
    node.innerHTML = `
      <div class="draw-shape" aria-hidden="true">${renderSvg(tool)}</div>
      <div class="canvas-text-editor shape-text-editor" contenteditable="false" spellcheck="false" data-placeholder="输入文字"></div>
    `;
  } else {
    node.innerHTML = `<div class="draw-shape" aria-hidden="true">${svgMarkup || renderSvg(tool)}</div>`;
  }

  node.classList.toggle("node-text-tool", tool === "text");
  node.classList.toggle("node-shape-text", shapeTextTools.has(tool));
  node.dataset.manualSize = "true";
  return node;
}

export function hideShapeToolbar(toolbar = document.querySelector("#shapeFormatToolbar")) {
  toolbar?.classList.remove("open", "picker-open");
}

export function getActiveShapeNode(selectedNode, root = document) {
  return selectedNode?.classList.contains("canvas-shape")
    ? selectedNode
    : root.querySelector(".canvas-shape.selected");
}

export function getShapeToolbarNode(toolbar, activeShape, root = document) {
  if (activeShape) return activeShape;
  const nodeId = toolbar?.dataset.nodeId;
  if (!nodeId) return null;
  return Array.from(root.querySelectorAll(".canvas-shape")).find((node) => node.dataset.nodeId === nodeId) || null;
}

export function getShapeToolbarColorTarget(toolbar) {
  return toolbar?.dataset.colorTarget === "stroke" ? "stroke" : "fill";
}

export function hasShapeNodeInSet(node, selectedNodes) {
  return node?.classList.contains("canvas-shape")
    || Array.from(selectedNodes || []).some((item) => item.classList.contains("canvas-shape"));
}

export function syncShapeSvgStyles(node) {
  const svg = node?.querySelector(".draw-shape svg");
  if (!svg) return;
  const computed = getComputedStyle(node);
  const fill = node.style.getPropertyValue("--shape-fill").trim()
    || computed.getPropertyValue("--shape-fill").trim()
    || "transparent";
  const stroke = node.style.getPropertyValue("--shape-stroke").trim()
    || computed.getPropertyValue("--shape-stroke").trim()
    || "#1f2933";
  const strokeWidth = node.style.getPropertyValue("--shape-stroke-width").trim()
    || computed.getPropertyValue("--shape-stroke-width").trim()
    || "3";
  svg.style.background = "transparent";
  svg.style.setProperty("fill", fill, "important");
  svg.style.setProperty("stroke", stroke, "important");
  svg.style.setProperty("stroke-width", strokeWidth, "important");
  svg.querySelectorAll("*").forEach((shape) => {
    shape.setAttribute("fill", fill);
    shape.setAttribute("stroke", stroke);
    shape.setAttribute("stroke-width", strokeWidth);
    shape.setAttribute("vector-effect", "non-scaling-stroke");
    shape.style.setProperty("fill", fill, "important");
    shape.style.setProperty("stroke", stroke, "important");
    shape.style.setProperty("stroke-width", strokeWidth, "important");
  });
}

export function positionShapeToolbar({ toolbar, node, nodeRect, isLinear }) {
  if (!toolbar || !node || !nodeRect) return false;
  const fill = getComputedStyle(node).getPropertyValue("--shape-fill").trim() || "#ffffff";
  const stroke = getComputedStyle(node).getPropertyValue("--shape-stroke").trim() || "#1f2933";
  const strokeWidth = getComputedStyle(node).getPropertyValue("--shape-stroke-width").trim() || "3";
  toolbar.dataset.nodeId = node.dataset.nodeId || "";
  toolbar.querySelector('[data-shape-style="strokeWidth"]').value = parseFloat(strokeWidth) || 3;
  toolbar.querySelector(".fill-swatch").style.background = fill;
  toolbar.querySelector(".stroke-swatch").style.background = stroke;
  toolbar.querySelector(".fill-swatch").classList.toggle("is-none", fill === "transparent" || fill === "none");
  toolbar.querySelector(".stroke-swatch").classList.toggle("is-none", stroke === "transparent" || stroke === "none");
  toolbar.classList.toggle("line-style-only", Boolean(isLinear));
  if (isLinear) toolbar.dataset.colorTarget = "stroke";
  toolbar.style.left = `${nodeRect.left + nodeRect.width / 2}px`;
  toolbar.style.top = `${Math.max(16, nodeRect.top - 58)}px`;
  toolbar.classList.add("open");
  return true;
}

export function createDrawingPreviewElement({ viewportRect, tool, renderSvg, buildPenSvg }) {
  const preview = document.createElement("div");
  preview.className = `canvas-drawing-preview preview-${tool}`;
  preview.innerHTML = tool === "pen" ? buildPenSvg(viewportRect) : renderSvg(tool);
  return preview;
}

export function createDrawingState({ tool, preview, startClientX, startClientY, viewportRect }) {
  const x = startClientX - viewportRect.left;
  const y = startClientY - viewportRect.top;
  return {
    tool,
    preview,
    startClientX,
    startClientY,
    currentClientX: startClientX,
    currentClientY: startClientY,
    startX: x,
    startY: y,
    currentX: x,
    currentY: y,
    points: [{ x, y }]
  };
}

export function updateDrawingPreviewElement(drawing, pointsToPath) {
  if (!drawing) return;
  if (drawing.tool === "pen") {
    const last = drawing.points[drawing.points.length - 1];
    if (!last || Math.hypot(drawing.currentX - last.x, drawing.currentY - last.y) > 2) {
      drawing.points.push({ x: drawing.currentX, y: drawing.currentY });
    }
    Object.assign(drawing.preview.style, {
      left: "0px",
      top: "0px",
      width: "100%",
      height: "100%"
    });
    drawing.preview.querySelector("path")?.setAttribute("d", pointsToPath(drawing.points));
    return;
  }
  const left = Math.min(drawing.startX, drawing.currentX);
  const top = Math.min(drawing.startY, drawing.currentY);
  const width = Math.max(1, Math.abs(drawing.currentX - drawing.startX));
  const height = Math.max(1, Math.abs(drawing.currentY - drawing.startY));
  Object.assign(drawing.preview.style, {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`
  });
}
