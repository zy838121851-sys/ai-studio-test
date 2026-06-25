import {
  createDrawingPreviewElement,
  createDrawingState,
  syncShapeSvgStyles,
  updateDrawingPreviewElement
} from "../shape-tool.js";
import { buildLinearSvg, buildPointsPath } from "../drawing-tools.js";
import { renderToolSvg } from "../node-icons.js";
import {
  cleanupCanvasInteractionOverlay,
  ensureCanvasInteractionOverlay
} from "../canvas-interaction-overlay.js";

const FREEHAND_DRAW_TOOLS = new Set(["pen", "laser"]);
const LASER_TRAIL_LIFETIME = 1500;
const LASER_POINT_MIN_DISTANCE = 1.6;

function buildLaserTrailSvg(viewportRect) {
  return `
    <svg viewBox="0 0 ${viewportRect.width} ${viewportRect.height}" preserveAspectRatio="none">
      <g class="laser-trail" data-laser-trail></g>
    </svg>
  `;
}

function syncLaserPreviewFrame(preview) {
  if (!preview) return;
  Object.assign(preview.style, {
    left: "0px",
    top: "0px",
    width: "100%",
    height: "100%"
  });
}

function startLaserTrailLoop(drawing) {
  drawing.laserActive = true;
  drawing.laserFrameId = window.requestAnimationFrame(() => animateLaserTrail(drawing));
}

function stopLaserTrailLoop(drawing) {
  if (drawing?.laserFrameId) window.cancelAnimationFrame(drawing.laserFrameId);
  drawing.laserFrameId = 0;
}

function removeLaserTrailPreview(drawing) {
  stopLaserTrailLoop(drawing);
  removeDrawingPreview(drawing?.preview);
}

function animateLaserTrail(drawing) {
  if (!drawing?.preview?.isConnected) return;
  const hasVisibleTrail = renderLaserTrail(drawing, performance.now());
  if (drawing.laserActive || hasVisibleTrail) {
    drawing.laserFrameId = window.requestAnimationFrame(() => animateLaserTrail(drawing));
    return;
  }
  removeDrawingPreview(drawing.preview);
}

function removeDrawingPreview(preview) {
  const overlay = preview?.parentElement;
  preview?.remove?.();
  cleanupCanvasInteractionOverlay(overlay);
}

function appendLaserPoint(drawing, now = performance.now()) {
  if (!drawing) return;
  const next = { x: drawing.currentX, y: drawing.currentY, time: now };
  const last = drawing.points[drawing.points.length - 1];
  if (!last || now - (last.time || 0) > LASER_TRAIL_LIFETIME) {
    drawing.points = [next];
    return;
  }
  if (Math.hypot(next.x - last.x, next.y - last.y) >= LASER_POINT_MIN_DISTANCE) {
    drawing.points.push(next);
  }
}

function renderLaserTrail(drawing, now = performance.now()) {
  const group = drawing?.preview?.querySelector?.("[data-laser-trail]");
  if (!group) return false;
  pruneLaserPoints(drawing, now);
  const points = drawing.points || [];
  if (points.length < 2) {
    group.innerHTML = "";
    return false;
  }
  const cutoff = now - LASER_TRAIL_LIFETIME;
  const visibleStartTime = Math.max(cutoff, points[0]?.time || cutoff);
  const visibleEndTime = points[points.length - 1]?.time || visibleStartTime;
  const visibleSpan = Math.max(1, visibleEndTime - visibleStartTime);
  const paths = [];
  for (let index = 1; index < points.length; index += 1) {
    const rawStart = points[index - 1];
    const end = points[index];
    if (!end || end.time <= cutoff) continue;
    const start = rawStart.time < cutoff ? interpolateLaserPoint(rawStart, end, cutoff) : rawStart;
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    if (distance < 0.4) continue;
    const strokePosition = clamp01((end.time - visibleStartTime) / visibleSpan);
    const agePosition = clamp01((end.time - cutoff) / LASER_TRAIL_LIFETIME);
    const width = getLaserStrokeWidth(strokePosition);
    const opacity = getLaserStrokeOpacity(agePosition);
    const d = `M${formatNumber(start.x)} ${formatNumber(start.y)}L${formatNumber(end.x)} ${formatNumber(end.y)}`;
    paths.push(`<path class="laser-trail-glow" d="${d}" stroke-width="${formatNumber(width + 8)}" opacity="${formatNumber(opacity * 0.24)}" />`);
    paths.push(`<path class="laser-trail-core" d="${d}" stroke-width="${formatNumber(width)}" opacity="${formatNumber(opacity)}" />`);
  }
  const head = points[points.length - 1];
  const headAge = now - (head?.time || 0);
  if (head && headAge <= LASER_TRAIL_LIFETIME) {
    const headPosition = clamp01((head.time - cutoff) / LASER_TRAIL_LIFETIME);
    const headOpacity = getLaserStrokeOpacity(headPosition) * clamp01(1 - headAge / LASER_TRAIL_LIFETIME);
    paths.push(`<circle class="laser-trail-head" cx="${formatNumber(head.x)}" cy="${formatNumber(head.y)}" r="${formatNumber(2.2 + headPosition * 2.4)}" opacity="${formatNumber(headOpacity)}" />`);
  }
  group.innerHTML = paths.join("");
  return paths.length > 0;
}

function pruneLaserPoints(drawing, now = performance.now()) {
  const points = drawing?.points;
  if (!Array.isArray(points) || !points.length) return;
  const cutoff = now - LASER_TRAIL_LIFETIME;
  while (points.length > 1 && (points[1].time || 0) < cutoff) points.shift();
  if (points.length === 1 && (points[0].time || 0) < cutoff) points.shift();
}

function interpolateLaserPoint(start, end, cutoff) {
  const span = Math.max(1, (end.time || 0) - (start.time || 0));
  const progress = clamp01((cutoff - (start.time || 0)) / span);
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
    time: cutoff
  };
}

function getLaserStrokeWidth(position) {
  const taper = Math.sin(clamp01(position) * Math.PI);
  return 1.3 + 4.9 * Math.pow(Math.max(0, taper), 0.58);
}

function getLaserStrokeOpacity(position) {
  return 0.1 + 0.9 * Math.pow(clamp01(position), 0.72);
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : "0";
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

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
      laser: "Laser",
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
      laser: { width: 260, height: 120 },
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
    const overlay = ensureCanvasInteractionOverlay(canvasViewport) || canvasViewport;
    const preview = createDrawingPreviewElement({
      viewportRect: rect,
      tool,
      renderSvg: renderToolSvg,
      buildPenSvg: (viewportRect) => tool === "laser"
        ? buildLaserTrailSvg(viewportRect)
        : `<svg viewBox="0 0 ${viewportRect.width} ${viewportRect.height}" preserveAspectRatio="none"><path /></svg>`
    });
    overlay.appendChild(preview);
    const drawingState = createDrawingState({
      tool,
      preview,
      startClientX,
      startClientY,
      viewportRect: rect
    });
    if (tool === "laser") {
      syncLaserPreviewFrame(preview);
      drawingState.points = drawingState.points.map((point) => ({ ...point, time: performance.now() }));
      startLaserTrailLoop(drawingState);
    }
    setCanvasDrawing(drawingState);
    canvasViewport.classList.add("drawing");
    updateDrawingPreview();
  }

  function updateDrawingPreview() {
    const drawing = getCanvasDrawing();
    if (drawing?.tool === "laser") {
      syncLaserPreviewFrame(drawing.preview);
      appendLaserPoint(drawing);
      renderLaserTrail(drawing);
      return;
    }
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
    setCanvasDrawing(null);
    canvasViewport.classList.remove("drawing");
    if (tool === "laser") {
      drawing.laserActive = false;
      if (!moved) {
        removeLaserTrailPreview(drawing);
        return;
      }
      renderLaserTrail(drawing);
      return;
    }
    removeDrawingPreview(drawing.preview);
    if (!moved) return;
    if (FREEHAND_DRAW_TOOLS.has(tool)) {
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
