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
  line: "线条",
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
  const lookupRoot = root || selectedNode?.ownerDocument || globalThis.document;
  const activeShape = lookupRoot?.querySelector?.(".canvas-shape.selected[data-active-selection='true']");
  if (activeShape) return activeShape;
  if (
    selectedNode?.isConnected
    && selectedNode.classList.contains("canvas-shape")
    && selectedNode.classList.contains("selected")
  ) {
    return selectedNode;
  }
  const selectedShapes = Array.from(lookupRoot?.querySelectorAll?.(".canvas-shape.selected") || []);
  return selectedShapes[selectedShapes.length - 1] || null;
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

export function createShapeFormatToolbarElement({
  onPointerDown,
  onInput,
  onClick,
  onPointerMove,
  onPointerUp
} = {}) {
  let toolbar = document.querySelector("#shapeFormatToolbar");
  if (toolbar) return toolbar;
  toolbar = document.createElement("div");
  toolbar.id = "shapeFormatToolbar";
  toolbar.className = "shape-format-toolbar";
  toolbar.innerHTML = `
    <button type="button" class="shape-color-trigger" data-color-target="fill" title="填充颜色">
      <span class="shape-swatch fill-swatch"></span>
    </button>
    <button type="button" class="shape-color-trigger" data-color-target="stroke" title="描边颜色">
      <span class="shape-swatch stroke-swatch"></span>
    </button>
    <label class="stroke-width-control" title="描边宽度">
      <span>粗细</span>
      <input type="range" data-shape-style="strokeWidth" min="1" max="12" value="3" />
    </label>
    <div class="shape-color-popover">
      <div class="shape-color-spectrum" data-shape-spectrum><i></i></div>
      <button type="button" data-shape-color="transparent" class="color-none">清除颜色</button>
      <button type="button" data-shape-color="#ffffff" class="shape-color-token-white"></button>
      <button type="button" data-shape-color="#1f2933" class="shape-color-token-ink"></button>
      <button type="button" data-shape-color="#b98f8f" class="shape-color-token-rose"></button>
      <button type="button" data-shape-color="#4f6f9f" class="shape-color-token-blue"></button>
      <button type="button" data-shape-color="#4f7d5a" class="shape-color-token-green"></button>
      <button type="button" data-shape-color="#d89a3d" class="shape-color-token-gold"></button>
      <button type="button" data-shape-color="#8b5cf6" class="shape-color-token-purple"></button>
      <button type="button" data-shape-color="#ef4444" class="shape-color-token-red"></button>
    </div>
  `;
  toolbar.dataset.colorTarget = "fill";
  if (onPointerDown) toolbar.addEventListener("pointerdown", onPointerDown);
  if (onInput) toolbar.addEventListener("input", onInput);
  if (onClick) toolbar.addEventListener("click", onClick);
  if (onPointerMove) window.addEventListener("pointermove", onPointerMove);
  if (onPointerUp) window.addEventListener("pointerup", onPointerUp);
  document.body.appendChild(toolbar);
  return toolbar;
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
  preview.innerHTML = tool === "pen" || tool === "laser" ? buildPenSvg(viewportRect) : renderSvg(tool);
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

export function updateDrawingPreviewElement(drawing, pointsToPath, buildLinearPreviewSvg) {
  if (!drawing) return;
  if (drawing.tool === "pen" || drawing.tool === "laser") {
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
  if ((drawing.tool === "line" || drawing.tool === "arrow") && typeof buildLinearPreviewSvg === "function") {
    const svgWidth = Math.max(24, width);
    const svgHeight = Math.max(24, height);
    const sx = drawing.startX <= drawing.currentX ? 12 : svgWidth - 12;
    const sy = drawing.startY <= drawing.currentY ? 12 : svgHeight - 12;
    const ex = drawing.startX <= drawing.currentX ? svgWidth - 12 : 12;
    const ey = drawing.startY <= drawing.currentY ? svgHeight - 12 : 12;
    drawing.preview.innerHTML = buildLinearPreviewSvg(drawing.tool, svgWidth, svgHeight, { x: sx, y: sy }, { x: ex, y: ey });
  }
}
