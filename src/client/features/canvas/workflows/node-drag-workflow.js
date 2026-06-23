export function createNodeDragWorkflow({
  elements = {},
  services = {}
} = {}) {
  const enableDragStacking = false;
  const {
    getActiveCanvasTool = () => "",
    stopNativeDrag = () => {},
    ensureResizeHandles = () => {},
    ensureNodeControls = () => {},
    selectNode = () => {},
    hideAddNodeMenu = () => {},
    hideShapeToolbar = () => {},
    hideTextToolbar = () => {},
    hasShapeNodeInSet = () => false,
    hasTextNodeInSet = () => false,
    getTextFormatToolbar = () => null,
    getSelectedNodes = () => new Set(),
    getSelectedNode = () => null,
    getZoom = () => 1,
    getPointerCaptureTarget = () => null,
    getNodeBounds = (node) => ({ x: 0, y: 0, width: 0, height: 0 }),
    getVisibleCanvasNodes = () => [],
    positionTextFormatToolbar = () => {},
    positionShapeFormatToolbar = () => {},
    startEraserDrag = () => {},
    updateEraserDrag = () => {},
    positionDirectorCard = () => {},
    positionCanvasSuggestionBubble = () => {},
    positionAgentBubble = () => {},
    isEditingImageNode = () => false,
    isTextEditingImageNode = () => false,
    isImageTextPanelOpen = () => false,
    isImageEditPopoverOpen = () => false,
    positionImageEditPopover = () => {},
    positionImageTextPanel = () => {},
    setTextNodeEditing = () => {},
    setAICoreState = () => {},
    updateAICoreDragState = () => {},
    findCanvasNodeById = () => null,
    setAICoreAwakeClass = () => {},
    getNextCanvasNodeId = () => "",
    ensureCanvasNodeId = () => {},
    getNodeThumbnail = () => "",
    getNodeTitle = () => "",
    escapeHtmlText = (value = "") => String(value),
    recordUndoAction = () => {}
  } = services;

  let activeStackTarget = null;

  function ensureStackControls(node) {
    let button = node.querySelector(":scope > .stack-toggle");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "stack-toggle";
      button.addEventListener("pointerdown", (event) => event.stopPropagation());
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        node.classList.toggle("stack-expanded");
        renderStackTray(node);
      });
      node.appendChild(button);
    }

    let tray = node.querySelector(":scope > .stack-tray");
    if (!tray) {
      tray = document.createElement("div");
      tray.className = "stack-tray";
      tray.addEventListener("pointerdown", (event) => event.stopPropagation());
      tray.addEventListener("click", (event) => {
        const row = event.target.closest(".stack-row");
        if (!row) return;
        event.stopPropagation();
        const child = (node._stackChildren || []).find((item) => item.dataset.nodeId === row.dataset.childId);
        if (child) releaseStackChild(node, child);
      });
      node.appendChild(tray);
    }
    return { button, tray };
  }

  function renderStackTray(node) {
    const children = node._stackChildren || [];
    const { button, tray } = ensureStackControls(node);
    button.textContent = `+${children.length}`;
    tray.innerHTML = children.map((child) => {
      ensureCanvasNodeId(child, { nextId: getNextCanvasNodeId });
      const thumb = getNodeThumbnail(child);
      const title = escapeHtmlText(getNodeTitle(child));
      const tag = escapeHtmlText(child.querySelector(".node-label")?.textContent.trim() || "Image");
      return `
        <button class="stack-row" type="button" data-child-id="${child.dataset.nodeId}" title="Open grouped element">
          <span class="stack-thumb">${thumb ? `<img src="${thumb}" alt="${title}" />` : ""}</span>
          <strong>${title}</strong>
          <small>${tag}</small>
        </button>
      `;
    }).join("");
  }

  function findStackTarget(dragged) {
    if (!enableDragStacking) return null;
    const draggedBounds = getNodeBounds(dragged);
    const draggedCenterX = draggedBounds.x + draggedBounds.width / 2;
    let best = null;
    let bestScore = Infinity;
    getVisibleCanvasNodes().forEach((node) => {
      if (node === dragged || getSelectedNodes().has(node)) return false;
      const bounds = getNodeBounds(node);
      const inX = draggedCenterX >= bounds.x - 90 && draggedCenterX <= bounds.x + bounds.width + 90;
      const draggedTop = draggedBounds.y;
      const draggedBottom = draggedBounds.y + draggedBounds.height;
      const dropTop = bounds.y + bounds.height - 72;
      const dropBottom = bounds.y + bounds.height + 180;
      const nearBottom = draggedBottom >= dropTop && draggedTop <= dropBottom;
      if (!inX || !nearBottom) return;
      const targetX = bounds.x + bounds.width / 2;
      const targetY = bounds.y + bounds.height + 48;
      const score = Math.abs(draggedCenterX - targetX) + Math.abs(draggedBottom - targetY);
      if (score < bestScore) {
        bestScore = score;
        best = node;
      }
    });
    return best;
  }

  function setActiveStackTarget(node) {
    if (!enableDragStacking) {
      if (activeStackTarget) activeStackTarget.classList.remove("stack-drop-target");
      activeStackTarget = null;
      return;
    }
    if (activeStackTarget === node) return;
    if (activeStackTarget) activeStackTarget.classList.remove("stack-drop-target");
    activeStackTarget = node;
    if (activeStackTarget) activeStackTarget.classList.add("stack-drop-target");
  }

  function releaseStackChild(parent, child) {
    parent._stackChildren = (parent._stackChildren || []).filter((item) => item !== child);
    child.classList.remove("stack-member-hidden");
    delete child.dataset.stackParent;
    const parentBounds = getNodeBounds(parent);
    child.style.left = `${parentBounds.x + parentBounds.width + 36}px`;
    child.style.top = `${parentBounds.y + Math.max(0, parent._stackChildren.length * 28)}px`;
    if (parent._stackChildren.length) {
      renderStackTray(parent);
    } else {
      parent.classList.remove("has-stack", "stack-expanded");
      parent.querySelector(":scope > .stack-toggle")?.remove();
      parent.querySelector(":scope > .stack-tray")?.remove();
    }
    selectNode(child);
  }

  function stackNode(target, child) {
    if (!target || !child || target === child) return false;
    ensureCanvasNodeId(target, { nextId: getNextCanvasNodeId });
    ensureCanvasNodeId(child, { nextId: getNextCanvasNodeId });
    if (!target._stackChildren) target._stackChildren = [];
    if (target._stackChildren.includes(child)) return false;
    target._stackChildren.push(child);
    child.dataset.stackParent = target.dataset.nodeId;
    child.classList.add("stack-member-hidden");
    child.classList.remove("selected");
    target.classList.add("has-stack");
    renderStackTray(target);
    selectNode(target);
    return true;
  }

  function safelyCapturePointer(target, pointerId) {
    try {
      target?.setPointerCapture?.(pointerId);
    } catch {
      // Synthetic pointer events used in tests may not have an active pointer.
    }
  }

  function makeDraggable(node) {
    stopNativeDrag(node);
    ensureResizeHandles(node);
    ensureNodeControls(node);
    let dragging = false;
    let resizing = false;
    let start = { x: 0, y: 0 };
    let original = { x: 0, y: 0 };
    let groupOriginals = [];
    let originalSize = { width: 0, height: 0 };
    let resizeCorner = "";
    let dragSnapshots = [];
    let resizeSnapshot = null;

    const getSafeZoom = () => {
      const value = Number(getZoom());
      return Number.isFinite(value) && value > 0 ? value : 1;
    };
    const isLocked = () => node.dataset.locked === "true" || node.classList.contains("node-locked");

    node.addEventListener("pointerdown", (event) => {
      if (getActiveCanvasTool() === "eraser" && event.button === 0) {
        event.preventDefault();
        event.stopPropagation();
        startEraserDrag(event);
        updateEraserDrag(event);
        const captureTarget = node;
        safelyCapturePointer(captureTarget, event.pointerId);
        return;
      }
      if (event.target.isContentEditable && node.classList.contains("text-editing")) {
        if (!getSelectedNodes().has(node)) selectNode(node);
        event.stopPropagation();
        return;
      }
      if (isLocked()) {
        if (event.button === 0) {
          event.preventDefault();
          event.stopPropagation();
          hideAddNodeMenu();
          if (!getSelectedNodes().has(node)) selectNode(node, event.shiftKey);
        }
        return;
      }
      const resizeHandle = event.target.closest(".resize-handle");
      if (resizeHandle) {
        event.stopPropagation();
        hideAddNodeMenu();
        selectNode(node);
        resizing = true;
        if (node.classList.contains("canvas-shape")) hideShapeToolbar();
        if (node.classList.contains("canvas-text")) hideTextToolbar(getTextFormatToolbar());
        resizeCorner = resizeHandle.dataset.resize;
        const captureTarget = node;
        safelyCapturePointer(captureTarget, event.pointerId);
        start = { x: event.clientX, y: event.clientY };
        original = {
          x: parseFloat(node.style.left || "0"),
          y: parseFloat(node.style.top || "0")
        };
        originalSize = {
          width: node.offsetWidth,
          height: node.offsetHeight
        };
        resizeSnapshot = snapshotNodeStyle(node);
        return;
      }

      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      hideAddNodeMenu();
      const selectedBeforeDrag = getCurrentDragSelection();
      if (event.shiftKey) {
        selectNode(node, true);
      } else if (!selectedBeforeDrag.has(node)) {
        selectNode(node);
      }
      dragging = true;
      if (hasShapeNodeInSet(node, getSelectedNodes())) hideShapeToolbar();
      if (hasTextNodeInSet(node, getSelectedNodes())) hideTextToolbar(getTextFormatToolbar());
      const captureTarget = node;
      safelyCapturePointer(captureTarget, event.pointerId);
      start = { x: event.clientX, y: event.clientY };
      original = {
        x: parseFloat(node.style.left || "0"),
        y: parseFloat(node.style.top || "0")
      };
      const dragSelection = getCurrentDragSelection(node);
      const dragNodes = expandDragNodesWithGroups(
        dragSelection,
        node
      );
      groupOriginals = Array.from(dragNodes).map((item) => ({
        node: item,
        x: parseFloat(item.style.left || "0"),
        y: parseFloat(item.style.top || "0")
      }));
      dragSnapshots = groupOriginals.map(({ node }) => snapshotNodeStyle(node));
    });

    node.addEventListener("pointermove", (event) => {
      if (resizing) {
        const deltaX = (event.clientX - start.x) / getSafeZoom();
        const deltaY = (event.clientY - start.y) / getSafeZoom();
        const fromLeft = resizeCorner.includes("w");
        const fromTop = resizeCorner.includes("n");
        const minWidth = node.classList.contains("canvas-object") ? 24 : 160;
        const minHeight = node.classList.contains("canvas-object") ? 24 : 120;
        const width = Math.max(minWidth, originalSize.width + (fromLeft ? -deltaX : deltaX));
        const height = Math.max(minHeight, originalSize.height + (fromTop ? -deltaY : deltaY));
        node.dataset.manualSize = "true";
        node.style.width = `${width}px`;
        if (!node.classList.contains("node-image") && !node.classList.contains("node-model")) {
          node.style.minHeight = `${height}px`;
        }
        if (fromLeft) node.style.left = `${original.x + originalSize.width - width}px`;
        if (fromTop) node.style.top = `${original.y + originalSize.height - height}px`;
        if (isEditingImageNode(node) && isImageEditPopoverOpen()) positionImageEditPopover();
        if (isTextEditingImageNode(node) && isImageTextPanelOpen()) positionImageTextPanel();
        return;
      }

      if (!dragging) return;
      const deltaX = (event.clientX - start.x) / getSafeZoom();
      const deltaY = (event.clientY - start.y) / getSafeZoom();
      groupOriginals.forEach((item) => {
        item.node.style.left = `${item.x + deltaX}px`;
        item.node.style.top = `${item.y + deltaY}px`;
        if (!item.node.classList.contains("node-director")) positionDirectorCard(item.node);
        if (item.node.classList.contains("node-image")) positionCanvasSuggestionBubble(item.node);
        if (window.currentAICoreBubble?.classList.contains("agent-suggestion")) positionAgentBubble();
      });
      if (node.classList.contains("node-director")) {
        const productNode = findCanvasNodeById(node.dataset.productNodeId);
        if (productNode) {
          const productBounds = getNodeBounds(productNode);
          node.dataset.offsetX = parseFloat(node.style.left || "0") - productBounds.x - productBounds.width;
          node.dataset.offsetY = parseFloat(node.style.top || "0") - productBounds.y;
        }
      }
      setActiveStackTarget(findStackTarget(node));
      if (node.classList.contains("node-image") || node.classList.contains("node-model")) {
        updateAICoreDragState(event.clientX, event.clientY);
      }
      if (isEditingImageNode(node) && isImageEditPopoverOpen()) positionImageEditPopover();
      if (isTextEditingImageNode(node) && isImageTextPanelOpen()) positionImageTextPanel();
    });

    node.addEventListener("pointerup", () => {
      if (dragging) {
        recordStyleUndo("move-nodes", dragSnapshots);
      }
      if (resizing) {
        recordStyleUndo("resize-node", resizeSnapshot ? [resizeSnapshot] : []);
      }
      setActiveStackTarget(null);
      setAICoreAwakeClass(false);
      setAICoreState("idle");
      const shouldRestoreShapeToolbar = dragging || resizing;
      const shouldRestoreTextToolbar = dragging || resizing;
      dragging = false;
      resizing = false;
      const selectedAfterDrag = getSelectedNode() || (node.classList.contains("selected") ? node : null);
      if (shouldRestoreShapeToolbar && selectedAfterDrag?.classList.contains("canvas-shape")) {
        positionShapeFormatToolbar();
      }
      if (shouldRestoreTextToolbar && getSelectedNode()?.classList.contains("canvas-text")) {
        positionTextFormatToolbar();
      }
      dragSnapshots = [];
      resizeSnapshot = null;
    });

    node.addEventListener("dblclick", (event) => {
      if (!node.classList.contains("canvas-text")) return;
      if (event.button !== 0 || event.target.closest(".resize-handle")) return;
      event.preventDefault();
      event.stopPropagation();
      hideAddNodeMenu();
      selectNode(node);
      setTextNodeEditing(node, true);
    });
  }

  function snapshotNodeStyle(node) {
    return {
      node,
      style: node?.getAttribute("style") || ""
    };
  }

  function expandDragNodesWithGroups(selectedNodes, activeNode) {
    const dragNodes = new Set(selectedNodes || []);
    if (activeNode) dragNodes.add(activeNode);
    Array.from(dragNodes).forEach((item) => {
      const groupId = item?.dataset?.groupId || "";
      if (!groupId) return;
      const root = item.ownerDocument || document;
      root.querySelectorAll(`.node-card[data-group-id="${escapeCssValue(groupId)}"]`).forEach((groupItem) => {
        dragNodes.add(groupItem);
      });
    });
    return dragNodes;
  }

  function getCurrentDragSelection(activeNode = null) {
    const dragSelection = new Set(getSelectedNodes() || []);
    const root = activeNode?.ownerDocument || document;
    root.querySelectorAll?.(".node-card.selected").forEach((item) => {
      dragSelection.add(item);
    });
    if (activeNode) dragSelection.add(activeNode);
    return dragSelection;
  }

  function escapeCssValue(value = "") {
    if (globalThis.CSS?.escape) return CSS.escape(String(value));
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function restoreNodeStyles(snapshots = []) {
    snapshots.forEach(({ node, style }) => {
      if (!node?.isConnected) return;
      node.setAttribute("style", style);
      if (!node.classList.contains("node-director")) positionDirectorCard(node);
      if (node.classList.contains("node-image")) positionCanvasSuggestionBubble(node);
    });
    const selectedNode = getSelectedNode();
    if (selectedNode?.classList.contains("canvas-shape")) positionShapeFormatToolbar();
    if (selectedNode?.classList.contains("canvas-text")) positionTextFormatToolbar();
    if (window.currentAICoreBubble?.classList.contains("agent-suggestion")) positionAgentBubble();
  }

  function recordStyleUndo(type, beforeSnapshots = []) {
    const changed = beforeSnapshots.filter(({ node, style }) => node?.isConnected && node.getAttribute("style") !== style);
    if (!changed.length) return;
    recordUndoAction({
      type,
      undo: () => restoreNodeStyles(changed)
    });
  }

  return {
    makeDraggable,
    renderStackTray,
    stackNode
  };
}
