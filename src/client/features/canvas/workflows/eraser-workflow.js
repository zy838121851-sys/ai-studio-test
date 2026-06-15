export function createEraserWorkflow({
  elements = {},
  services = {}
} = {}) {
  const {
    canvasViewport
  } = elements;

  const {
    buildPointsPath = () => "",
    getCanvasNodeScreenRect = () => null,
    clearSelection = () => {},
    removeNode = () => {},
    recordCanvasEvent = () => {},
    recordUndoAction = () => {}
  } = services;

  let eraserDrag = null;

  function getViewportPoint(event) {
    const rect = canvasViewport?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function createEraserStroke() {
    const rect = canvasViewport?.getBoundingClientRect();
    if (!rect || !canvasViewport) return null;
    const stroke = document.createElement("div");
    stroke.className = "canvas-eraser-stroke";
    stroke.innerHTML = `
      <svg viewBox="0 0 ${rect.width} ${rect.height}" preserveAspectRatio="none"><path /></svg>
      <i class="canvas-eraser-cursor" aria-hidden="true"></i>
    `;
    canvasViewport.appendChild(stroke);
    return stroke;
  }

  function startEraserDrag(event) {
    if (!canvasViewport || !canvasViewport.getBoundingClientRect) return;
    const point = getViewportPoint(event);
    const stroke = createEraserStroke();
    if (!stroke) return;
    eraserDrag = {
      stroke,
      points: [point],
      marked: new Set()
    };
    canvasViewport.classList.add("erasing");
    updateEraserDrag(event);
  }

  function updateEraserDrag(event) {
    if (!eraserDrag) return;
    const rect = canvasViewport?.getBoundingClientRect();
    if (!rect) return;
    const point = getViewportPoint(event);
    const last = eraserDrag.points[eraserDrag.points.length - 1];
    if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 4) {
      eraserDrag.points.push(point);
    }
    eraserDrag.stroke.querySelector("path")?.setAttribute("d", buildPointsPath(eraserDrag.points));
    const cursor = eraserDrag.stroke.querySelector(".canvas-eraser-cursor");
    if (cursor) {
      cursor.style.left = `${point.x}px`;
      cursor.style.top = `${point.y}px`;
    }
    const brush = 18;
    canvasViewport?.querySelectorAll(".node-card")?.forEach((node) => {
      if (eraserDrag.marked.has(node)) return;
      const nodeRect = getCanvasNodeScreenRect(node);
      if (!nodeRect) return;
      const hit = event.clientX >= nodeRect.left - brush
        && event.clientX <= nodeRect.left + nodeRect.width + brush
        && event.clientY >= nodeRect.top - brush
        && event.clientY <= nodeRect.top + nodeRect.height + brush;
      if (hit) {
        eraserDrag.marked.add(node);
        node.classList.add("eraser-marked");
      }
    });
  }

  function finishEraserDrag() {
    if (!eraserDrag) return;
    const marked = Array.from(eraserDrag.marked);
    const stroke = eraserDrag.stroke;
    if (stroke?.classList) {
      stroke.classList.add("fade-out");
      window.setTimeout(() => stroke.remove(), 180);
    }
    eraserDrag = null;
    if (canvasViewport?.classList) {
      canvasViewport.classList.remove("erasing");
    }
    if (!marked.length) return;
    const undoEntries = marked.map((node) => ({
      node,
      parent: node.parentNode,
      nextSibling: node.nextSibling
    }));
    recordUndoAction({
      type: "erase-nodes",
      undo: () => {
        undoEntries.forEach(({ node, parent, nextSibling }) => {
          if (!parent || node.isConnected) return;
          parent.insertBefore(node, nextSibling?.isConnected ? nextSibling : null);
          node.classList.remove("eraser-marked");
        });
      }
    });
    marked.forEach((node) => node.classList.remove("eraser-marked"));
    clearSelection();
    marked.forEach((node) => node.remove());
    recordCanvasEvent("erase", {
      count: marked.length,
      nodeIds: marked.map((node) => node.dataset.nodeId)
    });
  }

  function getEraserDrag() {
    return eraserDrag;
  }

  return {
    startEraserDrag,
    updateEraserDrag,
    finishEraserDrag,
    getEraserDrag
  };
}
