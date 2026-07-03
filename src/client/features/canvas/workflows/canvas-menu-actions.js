import { openImageCompareFromSelection } from "../image-compare.js";

import {
  areLayoutSnapshotsEqual,
  getLayoutUnionBounds,
  getNodeSortIndex,
  getRectUnionBounds,
  getViewportUnionRect,
  parseAspectRatio
} from "./canvas-menu-layout-utils.js";
import {
  pasteNodeFromClipboard,
  snapshotNodeForClipboard
} from "./canvas-menu-clipboard-utils.js";
import {
  getNodeKind,
  isNodeLocked
} from "./canvas-menu-node-utils.js";
import {
  cleanFileName,
  cleanText,
  escapeAttributeValue,
  escapeHtml,
  stripImageExtension
} from "./canvas-menu-text-utils.js";

const NODE_PRESETS = {
  text: { kind: "2d", title: "Text node", desc: "Script, copy, notes" },
  "image-generator": { kind: "image-generator", title: "图像生成器", desc: "Text-to-image and image-to-image generator" },
  audio: { kind: "video", title: "Audio node", desc: "Audio, rhythm and visual references" },
  playlist: { kind: "video", title: "Playlist", desc: "Organize shots, images or clips" }
};

let nodeClipboard = null;

const SAFE_EXPORT_STYLE_PROPERTIES = [
  "align-items",
  "aspect-ratio",
  "background-color",
  "border",
  "border-bottom",
  "border-color",
  "border-left",
  "border-radius",
  "border-right",
  "border-style",
  "border-top",
  "border-width",
  "box-shadow",
  "box-sizing",
  "color",
  "display",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "font",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "gap",
  "grid-template-columns",
  "height",
  "justify-content",
  "letter-spacing",
  "line-height",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "object-fit",
  "object-position",
  "opacity",
  "overflow",
  "overflow-wrap",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "position",
  "text-align",
  "text-decoration",
  "text-overflow",
  "text-transform",
  "vertical-align",
  "white-space",
  "width",
  "word-break"
];

const GROUP_COLOR_SWATCHES = [
  { label: "玻璃白", color: "rgba(255,255,255,0.52)", swatch: "rgba(255,255,255,0.72)" },
  { label: "浅蓝", color: "rgba(219,234,254,0.56)", swatch: "#bfdbfe" },
  { label: "浅绿", color: "rgba(220,252,231,0.56)", swatch: "#bbf7d0" },
  { label: "暖黄", color: "rgba(254,243,199,0.58)", swatch: "#fde68a" },
  { label: "浅粉", color: "rgba(252,231,243,0.58)", swatch: "#fbcfe8" },
  { label: "浅灰", color: "rgba(229,231,235,0.62)", swatch: "#d1d5db" }
];

const CANVAS_NODE_SELECTOR = ".node-card, .canvas-object";

export function bindCanvasMenuActions({
  elements = {},
  state = {},
  actions = {}
} = {}) {
  const {
    imageEditPopover,
    addNodeMenu,
    canvasContextMenu,
    canvasViewport,
    assetUploadInput,
    promptInput
  } = elements;

  const {
    getAddMenuPoint = () => null,
    setAddMenuPoint = () => {},
    getContextMenuPoint = () => null,
    getContextMenuTargetNode = () => null,
    setPendingUploadPoint = () => {}
  } = state;

  const {
    viewportPointToWorld = () => ({ x: 0, y: 0 }),
    hideAddNodeMenu = () => {},
    hideCanvasContextMenu = () => {},
    showAddNodeMenu = () => {},
    addNode = () => {},
    addChat = () => {},
    selectNode = () => {},
    deleteSelectedNode = () => {},
    saveCurrentProject = null,
    recordCanvasEvent = () => {},
    openAssetLibrary = () => {},
    recordUndoAction = null
  } = actions;

  imageEditPopover?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  imageEditPopover?.addEventListener("dblclick", (event) => {
    event.stopPropagation();
  });
  imageEditPopover?.addEventListener("wheel", (event) => {
    event.stopPropagation();
  }, { passive: true });

  addNodeMenu?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  addNodeMenu?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-node]");
    if (!button) return;

    const point = getAddMenuPoint() || getViewportCenterWorldPoint(canvasViewport, viewportPointToWorld);
    const type = button.dataset.addNode;
    hideAddNodeMenu();

    if (type === "upload" || type === "image" || type === "video" || type === "model") {
      setPendingUploadPoint(point);
      if (assetUploadInput?.dataset) assetUploadInput.dataset.uploadIntent = "canvas";
      assetUploadInput?.click();
      return;
    }

    addNode({ ...(NODE_PRESETS[type] || NODE_PRESETS.text), x: point.x, y: point.y });
  });

  createSelectionActionBar({
    addNode,
    selectNode,
    addChat,
    recordUndoAction
  });

  canvasContextMenu?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  canvasContextMenu?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-context-action]");
    if (!button) return;

    const action = button.dataset.contextAction;

    const point = getContextMenuPoint() || getViewportCenterWorldPoint(canvasViewport, viewportPointToWorld);
    const targetNode = getContextTargetNode(canvasContextMenu, getContextMenuTargetNode);
    hideCanvasContextMenu();

    if (action === "copy") {
      if (targetNode) nodeClipboard = snapshotNodeForClipboard(targetNode, { getNodeKind });
      return;
    }

    if (action === "canvas-command" || action === "image-command") {
      runCanvasObjectMenuCommand(button.dataset.canvasCommand || button.dataset.imageCommand, {
        targetNode,
        selectNode,
        addChat,
        recordUndoAction
      });
      return;
    }

    if (action === "upload" || action === "asset") {
      setPendingUploadPoint(point);
      if (action === "asset") {
        openAssetLibrary(point);
      } else {
        if (assetUploadInput?.dataset) assetUploadInput.dataset.uploadIntent = "canvas";
        assetUploadInput?.click();
      }
      return;
    }

    if (action === "node") {
      const rect = canvasViewport.getBoundingClientRect();
      showAddNodeMenu(rect.left + rect.width / 2, rect.top + rect.height / 2);
      setAddMenuPoint(point);
      return;
    }

    if (action === "tool") {
      addNode({
        kind: "2d",
        title: "Helper tool",
        desc: "Use this node for organizing assets, scripts, playlists or workflows.",
        x: point.x,
        y: point.y
      });
      return;
    }

    if (action === "paste") {
      if (nodeClipboard) {
        const pasted = pasteNodeFromClipboard({
          snapshot: nodeClipboard,
          point,
          addNode,
          selectNode
        });
        if (!pasted) addChat("assistant", "The copied module could not be pasted.");
        return;
      }
      try {
        const text = await navigator.clipboard.readText();
        if (text && promptInput) promptInput.value = `${promptInput.value}${promptInput.value ? "\n" : ""}${text}`;
        promptInput?.focus();
      } catch {
        addChat("assistant", "Clipboard read access was not granted. Use Ctrl+V in the input box instead.");
      }
      return;
    }

    if (action === "delete") {
      if (targetNode && !targetNode.classList.contains("selected")) selectNode(targetNode);
      deleteSelectedNode();
      return;
    }

    if (action === "lock") {
      if (targetNode) toggleNodeLock(targetNode);
      return;
    }

    if (action === "group") {
      groupSelectedNodes({ targetNode, addNode, selectNode, addChat });
      return;
    }

    if (action === "ungroup") {
      ungroupNodes({ targetNode, selectNode, addChat });
      return;
    }

    if (action === "group-color") {
      updateGroupBackgroundColor({
        targetNode,
        color: button.dataset.groupColor || "",
        addChat
      });
      return;
    }

    if (action === "unlock-all") {
      unlockAllNodes();
      return;
    }

    if (action === "save") {
      if (typeof saveCurrentProject === "function") {
        await saveCurrentProject();
      } else {
        document.querySelector("[data-save-project]")?.click();
      }
      return;
    }

    if (action === "export") {
      try {
        await exportNodesByScope({
          scope: button.dataset.exportScope || "selected",
          targetNode,
          addChat
        });
      } catch (error) {
        console.error("Failed to export canvas node", error);
        addChat("assistant", "Export failed. Check whether the image source is still accessible and try again.");
      }
      return;
    }

    if (action === "undo" || action === "redo") {
      recordCanvasEvent(action, { source: "context-menu" });
    }
    addChat("assistant", `${action === "undo" ? "Undo" : "Redo"} is reserved for the history stack.`);
  });
}

function createSelectionActionBar({
  addNode = () => null,
  selectNode = null,
  addChat = () => {},
  recordUndoAction = null
} = {}) {
  if (document.querySelector(".selection-action-bar")) return;
  const bar = document.createElement("div");
  bar.className = "selection-action-bar";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Selection actions");
  bar.innerHTML = `
    <button class="selection-action-button selection-group-toggle" type="button" data-selection-action="group-toggle" title="&#25171;&#32452;" aria-label="&#25171;&#32452;">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="7" width="7" height="7" rx="1.5" /><rect x="13" y="10" width="7" height="7" rx="1.5" /><path d="M8 4h8" /><path d="M8 20h8" /></svg>
      <span data-group-toggle-label>&#25171;&#32452;</span>
    </button>
    <button class="selection-action-button selection-compare-button" type="button" data-selection-action="compare" title="&#23545;&#27604;&#22270;&#29255;" aria-label="&#23545;&#27604;&#22270;&#29255;">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h5v14H6z" /><path d="M13 5h5v14h-5z" /></svg>
      <span>&#23545;&#27604;&#22270;&#29255;</span>
    </button>
    <div class="selection-color-group" aria-label="&#32972;&#26223;&#33394;">
      <span>&#32972;&#26223;&#33394;</span>
      ${GROUP_COLOR_SWATCHES.map((item) => `
        <button class="selection-color-swatch" type="button" data-selection-action="group-color" data-group-color="${item.color}" title="${item.label}" aria-label="${item.label}" style="--swatch: ${item.swatch}"></button>
      `).join("")}
    </div>
  `;
  document.body.appendChild(bar);

  let scheduled = false;
  let toolbarDrag = null;
  const scheduleUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      updateSelectionActionBar(bar);
    });
  };

  bar.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    if (event.button !== 0 || event.target.closest("[data-selection-action]")) return;
    const nodes = getSelectionMoveNodes();
    if (!nodes.length) return;
    event.preventDefault();
    toolbarDrag = {
      startX: event.clientX,
      startY: event.clientY,
      zoom: getCanvasZoomFromDom(),
      nodes: nodes.map((node) => ({
        node,
        x: parseFloat(node.style.left || "0") || 0,
        y: parseFloat(node.style.top || "0") || 0
      }))
    };
    try {
      bar.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture can fail for synthetic events.
    }
  });
  bar.addEventListener("pointermove", (event) => {
    if (!toolbarDrag) return;
    event.preventDefault();
    const deltaX = (event.clientX - toolbarDrag.startX) / toolbarDrag.zoom;
    const deltaY = (event.clientY - toolbarDrag.startY) / toolbarDrag.zoom;
    toolbarDrag.nodes.forEach(({ node, x, y }) => {
      if (!node.isConnected) return;
      node.style.left = `${x + deltaX}px`;
      node.style.top = `${y + deltaY}px`;
    });
    scheduleUpdate();
  });
  bar.addEventListener("pointerup", () => {
    toolbarDrag = null;
    scheduleUpdate();
  });
  bar.addEventListener("pointercancel", () => {
    toolbarDrag = null;
    scheduleUpdate();
  });
  bar.addEventListener("click", (event) => {
    event.stopPropagation();
    const button = event.target.closest("[data-selection-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.selectionAction;
    const targetNode = getSelectionToolbarTargetNode();
    if (action === "group-toggle") {
      const selection = getSelectionToolbarState();
      if (selection.mode === "ungroup") {
        ungroupNodes({ targetNode, selectNode, addChat });
      } else {
        groupSelectedNodes({ targetNode, addNode, selectNode, addChat });
      }
    } else if (action === "compare") {
      openImageCompareFromSelection({
        selectedNodes: new Set(getMenuCanvasNodes().filter((node) => node.classList.contains("selected"))),
        getNodeTitle: getToolbarNodeTitle,
        notify: (message) => addChat("assistant", message),
        root: document
      });
    } else if (action === "group-color") {
      updateGroupBackgroundColor({
        targetNode,
        color: button.dataset.groupColor || "",
        addChat
      });
    }
    scheduleUpdate();
  });

  const observer = new MutationObserver((mutations) => {
    if (mutations.every((mutation) => bar.contains(mutation.target))) return;
    scheduleUpdate();
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "style", "data-group-id"]
  });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  window.addEventListener("scroll", scheduleUpdate, { passive: true, capture: true });
  document.addEventListener("pointerup", scheduleUpdate, true);
  document.addEventListener("keyup", scheduleUpdate, true);
  scheduleUpdate();
}

function updateSelectionActionBar(bar) {
  const selection = getSelectionToolbarState();
  if (!selection.shouldShow || !selection.bounds) {
    bar.classList.remove("open");
    return;
  }
  const left = Math.max(16, Math.min(
    window.innerWidth - bar.offsetWidth - 16,
    selection.bounds.left + selection.bounds.width / 2 - bar.offsetWidth / 2
  ));
  const top = Math.max(16, selection.bounds.top - bar.offsetHeight - 14);
  bar.style.left = `${Math.round(left)}px`;
  bar.style.top = `${Math.round(top)}px`;
  bar.classList.add("open");
  const groupToggle = bar.querySelector('[data-selection-action="group-toggle"]');
  const groupToggleLabel = bar.querySelector("[data-group-toggle-label]");
  if (groupToggle) {
    groupToggle.disabled = !selection.canGroup && !selection.canUngroup;
    groupToggle.dataset.mode = selection.mode;
    const label = selection.mode === "ungroup" ? "解组" : "打组";
    groupToggle.title = label;
    groupToggle.setAttribute("aria-label", label);
    if (groupToggleLabel) groupToggleLabel.textContent = label;
  }
  bar.querySelector('[data-selection-action="compare"]').disabled = !selection.canCompare;
  bar.querySelectorAll('[data-selection-action="group-color"]').forEach((button) => {
    button.disabled = !selection.canStyleGroup;
  });
}

function getSelectionToolbarState() {
  const selected = getMenuCanvasNodes().filter((node) => node.classList.contains("selected"));
  const selectedImages = selected.filter(isCanvasImageNode);
  const selectedGroups = selected.filter((node) => node.classList.contains("node-group"));
  const selectedGroupMembers = selected.filter((node) => !node.classList.contains("node-group") && node.dataset.groupId);
  const groupableImages = selectedImages.filter((node) => !node.dataset.groupId);
  const canUngroup = selectedGroups.length > 0 || selectedGroupMembers.length > 0;
  const canGroup = !canUngroup && groupableImages.length >= 2;
  const shouldShow = selectedImages.length >= 2 || selectedGroups.length > 0 || selectedGroupMembers.length > 0;
  const bounds = shouldShow ? getViewportUnionRect(selected.length ? selected : selectedImages) : null;
  return {
    shouldShow,
    bounds,
    mode: canUngroup ? "ungroup" : "group",
    canGroup,
    canUngroup,
    canCompare: selectedImages.length === 2,
    canStyleGroup: canUngroup
  };
}

function getSelectionToolbarTargetNode() {
  return document.querySelector(".node-group.selected[data-active-selection='true']")
    || document.querySelector(".node-card.selected[data-active-selection='true'][data-group-id]")
    || document.querySelector(".node-group.selected")
    || document.querySelector(".node-card.selected[data-group-id]")
    || document.querySelector(".node-card.selected");
}

function getSelectionMoveNodes() {
  const nodes = new Set(getMenuCanvasNodes().filter((node) => node.classList.contains("selected")));
  Array.from(nodes).forEach((node) => {
    const groupId = node.dataset.groupId || "";
    if (!groupId) return;
    document.querySelectorAll(`.node-card[data-group-id="${escapeAttributeValue(groupId)}"]`).forEach((groupNode) => {
      nodes.add(groupNode);
    });
  });
  return Array.from(nodes).filter((node) => node?.isConnected && !isNodeLocked(node));
}

function getCanvasZoomFromDom() {
  const world = document.querySelector("#canvasWorld");
  const transform = world ? window.getComputedStyle(world).transform : "";
  if (!transform || transform === "none") return 1;
  const match = transform.match(/^matrix\(([^,]+)/);
  const zoom = match ? Number(match[1]) : 1;
  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

function isCanvasImageNode(node) {
  return Boolean(node?.classList?.contains("node-image") && node.querySelector?.(".image-frame img"));
}

function getToolbarNodeTitle(node) {
  return cleanText(
    node?.querySelector?.("h3, .node-title, [data-node-title], .image-file-name")?.textContent
      || node?.querySelector?.(".image-frame img")?.alt
      || node?.dataset?.title
      || ""
  );
}

export function runCanvasImageMenuCommand(command, options = {}) {
  return runCanvasObjectMenuCommand(command, options);
}

export function runCanvasObjectMenuCommand(command, {
  targetNode = null,
  selectNode = null,
  addChat = () => {},
  recordUndoAction = null
} = {}) {
  if (!command) return false;
  const allNodes = getMenuCanvasNodes();
  const currentTarget = targetNode?.isConnected ? targetNode : document.querySelector(`${CANVAS_NODE_SELECTOR}.selected`);

  if (command === "select-all") {
    selectCanvasNodes(allNodes, selectNode);
    return true;
  }

  if (command === "select-current") {
    if (currentTarget) selectCanvasNodes([currentTarget], selectNode);
    return true;
  }

  if (command === "relink-image") {
    relinkCanvasImage(currentTarget || getCommandNodes({ targetNode: currentTarget })[0], addChat);
    return true;
  }

  const nodes = command.startsWith("layer-")
    ? getLayerCommandNodes({ targetNode: currentTarget })
    : getCommandNodes({ targetNode: currentTarget });

  if (command === "arrange-best") {
    return arrangeNodes(
      getImageLayoutCommandNodes({ targetNode: currentTarget }),
      { recordUndoAction, mode: "best" }
    );
  }
  if (command === "arrange-name") {
    return arrangeNodes(
      getImageLayoutCommandNodes({ targetNode: currentTarget })
        .sort((a, b) => getNodeSortTitle(a).localeCompare(getNodeSortTitle(b), "zh-Hans-CN")),
      { recordUndoAction, mode: "name" }
    );
  }
  if (command === "arrange-added") {
    return arrangeNodes(
      getImageLayoutCommandNodes({ targetNode: currentTarget })
        .sort((a, b) => getNodeSortIndex(a) - getNodeSortIndex(b)),
      { recordUndoAction, mode: "added" }
    );
  }
  if (command.startsWith("layer-")) {
    if (!nodes.length) return false;
    reorderNodeLayers(nodes, command.replace("layer-", ""), selectNode);
    return true;
  }
  if (command.startsWith("align-")) {
    return alignNodes(
      getImageLayoutCommandNodes({ targetNode: currentTarget }),
      command.replace("align-", ""),
      recordUndoAction
    );
  }
  if (command.startsWith("normalize-")) {
    return normalizeNodes(
      getImageLayoutCommandNodes({ targetNode: currentTarget }),
      command.replace("normalize-", ""),
      recordUndoAction
    );
  }
  if (!nodes.length) return false;
  return false;
}

function getViewportCenterWorldPoint(canvasViewport, viewportPointToWorld) {
  const rect = canvasViewport.getBoundingClientRect();
  return viewportPointToWorld(
    rect.left + canvasViewport.clientWidth / 2,
    rect.top + canvasViewport.clientHeight / 2
  );
}

function getMenuCanvasNodes() {
  return Array.from(document.querySelectorAll(CANVAS_NODE_SELECTOR))
    .filter((node, index, nodes) => nodes.indexOf(node) === index)
    .filter((node) => node.isConnected
      && !node.classList.contains("hidden")
      && !node.classList.contains("stack-member-hidden"));
}

function getCommandNodes({ targetNode = null } = {}) {
  const selected = getMenuCanvasNodes().filter((node) => node.classList.contains("selected"));
  const nodes = selected.length ? selected : (targetNode ? [targetNode] : []);
  return nodes.filter((node) => node?.isConnected && !isNodeLocked(node));
}

function getImageLayoutCommandNodes({ targetNode = null } = {}) {
  const selected = getMenuCanvasNodes().filter((node) => node.classList.contains("selected"));
  const nodes = selected.length ? selected : (targetNode ? [targetNode] : []);
  return nodes.filter((node) => node?.isConnected && isCanvasImageNode(node) && !isNodeLocked(node));
}

function getLayerCommandNodes({ targetNode = null } = {}) {
  const activeSelected = getMenuCanvasNodes().filter((node) => node.classList.contains("selected"));
  const targetIsSelected = targetNode?.isConnected && targetNode.classList.contains("selected");
  const nodes = targetIsSelected && activeSelected.length
    ? activeSelected
    : (targetNode ? [targetNode] : activeSelected);
  return nodes.filter((node) => node?.isConnected && !isNodeLocked(node));
}

function selectCanvasNodes(nodes, selectNode) {
  if (!nodes.length) return;
  if (typeof selectNode === "function") {
    nodes.forEach((node, index) => selectNode(node, index > 0));
    return;
  }
  document.querySelectorAll(`${CANVAS_NODE_SELECTOR}.selected`).forEach((node) => node.classList.remove("selected"));
  nodes.forEach((node) => node.classList.add("selected"));
}

function arrangeNodes(nodes, { recordUndoAction = null, mode = "best" } = {}) {
  if (nodes.length <= 1) return false;
  const ordered = mode === "best" ? sortNodesByCanvasPosition(nodes) : nodes;
  return layoutNodesInCompactGallery(ordered, {
    gap: 8,
    recordUndoAction,
    type: "arrange-images"
  });
}

function layoutNodesInCompactGallery(nodes, {
  gap = 8,
  recordUndoAction = null,
  type = "arrange-images",
  axis = "rows",
  anchorX = "left",
  anchorY = "top"
} = {}) {
  const layoutNodes = nodes.filter((node) => node?.isConnected && !isNodeLocked(node));
  if (layoutNodes.length <= 1) return false;

  const before = snapshotLayoutNodes(layoutNodes);
  const bounds = layoutNodes.map(getNodeLayoutBounds);
  const union = getLayoutUnionBounds(bounds);
  const originalRight = union.x + union.width;
  const originalBottom = union.y + union.height;
  const maxWidth = Math.max(...bounds.map((item) => item.width));
  const maxHeight = Math.max(...bounds.map((item) => item.height));
  const totalArea = bounds.reduce((sum, item) => sum + item.width * item.height, 0);
  const compactWidth = Math.sqrt(totalArea * 3.2);
  const compactHeight = Math.sqrt(totalArea / 3.2);
  const targetWidth = Math.max(
    maxWidth,
    Math.min(Math.max(union.width, maxWidth), compactWidth)
  );
  const targetHeight = Math.max(
    maxHeight,
    Math.min(Math.max(union.height, maxHeight), compactHeight)
  );

  if (axis === "columns") {
    layoutNodesByColumns(layoutNodes, bounds, {
      gap,
      left: union.x,
      top: union.y,
      bottom: originalBottom,
      targetHeight,
      anchorY
    });
    return recordLayoutMutation(layoutNodes, before, type, recordUndoAction);
  }

  layoutNodesByRows(layoutNodes, bounds, {
    gap,
    left: union.x,
    right: originalRight,
    bottom: originalBottom,
    top: union.y,
    targetWidth,
    anchorX,
    anchorY
  });

  return recordLayoutMutation(layoutNodes, before, type, recordUndoAction);
}

function layoutNodesByRows(nodes, bounds, {
  gap,
  left,
  right,
  bottom,
  top,
  targetWidth,
  anchorX,
  anchorY
}) {
  const rows = [];
  let current = [];
  let rowWidth = 0;
  let rowHeight = 0;
  bounds.forEach((size, index) => {
    const nextWidth = current.length ? rowWidth + gap + size.width : size.width;
    if (current.length && nextWidth > targetWidth) {
      rows.push({ items: current, width: rowWidth, height: rowHeight });
      current = [];
      rowWidth = 0;
      rowHeight = 0;
    }
    current.push({ node: nodes[index], size, index });
    rowWidth = current.length === 1 ? size.width : rowWidth + gap + size.width;
    rowHeight = Math.max(rowHeight, size.height);
  });
  if (current.length) rows.push({ items: current, width: rowWidth, height: rowHeight });

  const totalHeight = rows.reduce((sum, row, index) => sum + row.height + (index ? gap : 0), 0);
  let cursorY = anchorY === "bottom" ? bottom - totalHeight : top;
  rows.forEach((row) => {
    let cursorX = anchorX === "right" ? right - row.width : left;
    row.items.forEach(({ node, size, index }) => {
      node.style.left = `${Math.round(cursorX)}px`;
      node.style.top = `${Math.round(cursorY)}px`;
      node.style.zIndex = String(20 + index);
      cursorX += size.width + gap;
    });
    cursorY += row.height + gap;
  });
}

function layoutNodesByColumns(nodes, bounds, {
  gap,
  left,
  top,
  bottom,
  targetHeight,
  anchorY
}) {
  const columns = [];
  let current = [];
  let columnWidth = 0;
  let columnHeight = 0;
  bounds.forEach((size, index) => {
    const nextHeight = current.length ? columnHeight + gap + size.height : size.height;
    if (current.length && nextHeight > targetHeight) {
      columns.push({ items: current, width: columnWidth, height: columnHeight });
      current = [];
      columnWidth = 0;
      columnHeight = 0;
    }
    current.push({ node: nodes[index], size, index });
    columnWidth = Math.max(columnWidth, size.width);
    columnHeight = current.length === 1 ? size.height : columnHeight + gap + size.height;
  });
  if (current.length) columns.push({ items: current, width: columnWidth, height: columnHeight });

  let cursorX = left;
  columns.forEach((column) => {
    let cursorY = anchorY === "bottom" ? bottom - column.height : top;
    column.items.forEach(({ node, size, index }) => {
      node.style.left = `${Math.round(cursorX)}px`;
      node.style.top = `${Math.round(cursorY)}px`;
      node.style.zIndex = String(20 + index);
      cursorY += size.height + gap;
    });
    cursorX += column.width + gap;
  });
}

function sortNodesByCanvasPosition(nodes) {
  return [...nodes].sort((a, b) => {
    const aBounds = getNodeLayoutBounds(a);
    const bBounds = getNodeLayoutBounds(b);
    const sameVisualRow = Math.abs(aBounds.y - bBounds.y) <= 48;
    return (sameVisualRow ? 0 : aBounds.y - bBounds.y)
      || aBounds.x - bBounds.x
      || getNodeSortIndex(a) - getNodeSortIndex(b);
  });
}

function reorderNodeLayers(nodes, mode, selectNode) {
  if (!nodes.length) return;
  const selectedSet = new Set(nodes);
  const ordered = getLayerOrderedNodes();
  const selected = ordered.filter((node) => selectedSet.has(node));
  const unselected = ordered.filter((node) => !selectedSet.has(node));
  if (!selected.length) return;

  let nextOrder = ordered.slice();
  if (mode === "front") {
    nextOrder = [...unselected, ...selected];
  } else if (mode === "back") {
    nextOrder = [...selected, ...unselected];
  } else if (mode === "up") {
    for (let index = nextOrder.length - 2; index >= 0; index -= 1) {
      if (selectedSet.has(nextOrder[index]) && !selectedSet.has(nextOrder[index + 1])) {
        [nextOrder[index], nextOrder[index + 1]] = [nextOrder[index + 1], nextOrder[index]];
      }
    }
  } else if (mode === "down") {
    for (let index = 1; index < nextOrder.length; index += 1) {
      if (selectedSet.has(nextOrder[index]) && !selectedSet.has(nextOrder[index - 1])) {
        [nextOrder[index - 1], nextOrder[index]] = [nextOrder[index], nextOrder[index - 1]];
      }
    }
  }

  if (nextOrder.every((node, index) => node === ordered[index])) return;
  nextOrder.forEach((node, index) => {
    node.style.zIndex = String(10 + index);
  });
  selectCanvasNodes(selected, selectNode);
}

function getLayerOrderedNodes() {
  return getMenuCanvasNodes()
    .map((node, index) => ({
      node,
      index,
      zIndex: normalizeLayerZIndex(node.style.zIndex, index)
    }))
    .sort((a, b) => a.zIndex - b.zIndex || a.index - b.index)
    .map(({ node }) => node);
}

function normalizeLayerZIndex(value, fallbackIndex = 0) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : 10 + fallbackIndex;
}

function alignNodes(nodes, mode, recordUndoAction) {
  if (nodes.length <= 1) return false;
  if (mode === "left" || mode === "right" || mode === "top" || mode === "bottom") {
    return layoutNodesInCompactGallery(sortNodesByCanvasPosition(nodes), {
      gap: 0,
      recordUndoAction,
      type: "align-images",
      anchorX: mode === "right" ? "right" : "left",
      anchorY: mode === "bottom" ? "bottom" : "top"
    });
  }
  const before = snapshotLayoutNodes(nodes);
  const bounds = nodes.map(getNodeLayoutBounds);
  if (mode === "stack") {
    const anchor = bounds[0] || { x: 0, y: 0 };
    nodes.forEach((node, index) => {
      node.style.left = `${anchor.x + index * 18}px`;
      node.style.top = `${anchor.y + index * 18}px`;
      node.style.zIndex = String(20 + index);
    });
    return recordLayoutMutation(nodes, before, "align-images", recordUndoAction);
  }
  return false;
}

function normalizeNodes(nodes, mode, recordUndoAction) {
  if (nodes.length <= 1) return false;
  const before = snapshotLayoutNodes(nodes);
  const bounds = nodes.map(getNodeLayoutBounds);
  const averageWidth = bounds.reduce((sum, item) => sum + item.width, 0) / bounds.length;
  const averageHeight = bounds.reduce((sum, item) => sum + item.height, 0) / bounds.length;
  if (mode === "height") {
    nodes.forEach((node) => setNodeLayoutHeight(node, averageHeight));
    return recordLayoutMutation(nodes, before, "normalize-images", recordUndoAction);
  }
  if (mode === "width") {
    nodes.forEach((node) => setNodeLayoutWidth(node, averageWidth));
    return recordLayoutMutation(nodes, before, "normalize-images", recordUndoAction);
  }
  if (mode === "size") {
    nodes.forEach((node) => {
      setNodeLayoutSize(node, averageWidth, averageHeight);
    });
    return recordLayoutMutation(nodes, before, "normalize-images", recordUndoAction);
  }
  if (mode === "ratio") {
    const averageRatio = bounds.reduce((sum, item) => sum + (item.width / Math.max(1, item.height)), 0) / bounds.length;
    nodes.forEach((node, index) => {
      const area = Math.max(24 * 24, bounds[index].width * bounds[index].height);
      const width = Math.sqrt(area * averageRatio);
      setNodeLayoutFrameSize(node, width, width / averageRatio);
    });
    return recordLayoutMutation(nodes, before, "normalize-images", recordUndoAction);
  }
  return false;
}

function relinkCanvasImage(node, addChat) {
  const imageNode = node?.classList?.contains("node-image")
    ? node
    : document.querySelector(".node-image.selected") || document.querySelector(".node-image");
  if (!imageNode) {
    addChat("assistant", "没有可重新链接的图片模块。");
    return;
  }
  const image = imageNode.querySelector(".image-frame img");
  if (!image) {
    addChat("assistant", "当前模块没有可重新链接的图片。");
    return;
  }
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    image.src = url;
    image.alt = file.name;
    const title = imageNode.querySelector("h3, .node-title, [data-node-title]");
    if (title) title.textContent = file.name;
  }, { once: true });
  input.click();
}

function snapshotLayoutNodes(nodes) {
  return nodes.map((node) => {
    const frame = node.querySelector(".image-frame, .model-frame");
    return {
      node,
      left: node.style.left || "",
      top: node.style.top || "",
      width: node.style.width || "",
      height: node.style.height || "",
      minHeight: node.style.minHeight || "",
      zIndex: node.style.zIndex || "",
      manualSize: node.dataset.manualSize,
      frameAspectRatio: frame?.style?.aspectRatio || ""
    };
  });
}

function restoreLayoutNodes(entries = []) {
  entries.forEach((entry) => {
    if (!entry?.node?.isConnected) return;
    const { node } = entry;
    node.style.left = entry.left;
    node.style.top = entry.top;
    node.style.width = entry.width;
    node.style.height = entry.height;
    node.style.minHeight = entry.minHeight;
    node.style.zIndex = entry.zIndex;
    if (entry.manualSize === undefined) {
      delete node.dataset.manualSize;
    } else {
      node.dataset.manualSize = entry.manualSize;
    }
    const frame = node.querySelector(".image-frame, .model-frame");
    if (frame) frame.style.aspectRatio = entry.frameAspectRatio;
  });
}

function recordLayoutMutation(nodes, before, type, recordUndoAction) {
  const after = snapshotLayoutNodes(nodes);
  const changed = after.some((entry, index) => !areLayoutSnapshotsEqual(entry, before[index]));
  if (!changed) return false;
  if (typeof recordUndoAction === "function") {
    recordUndoAction({
      type,
      undo: () => restoreLayoutNodes(before),
      redo: () => restoreLayoutNodes(after)
    });
  }
  return true;
}

function getNodeLayoutBounds(node) {
  if (node?.classList?.contains("node-image")) {
    const frame = node.querySelector(".image-frame");
    const width = Math.max(1, frame?.offsetWidth || node.offsetWidth || parseFloat(node.style.width || "0") || 1);
    const height = Math.max(
      1,
      frame?.offsetHeight || getImageFrameHeightFromAspect(node, width) || parseFloat(node.style.minHeight || "0") || 1
    );
    return {
      x: parseFloat(node.style.left || "0") || 0,
      y: parseFloat(node.style.top || "0") || 0,
      width,
      height
    };
  }
  return {
    x: parseFloat(node.style.left || "0") || 0,
    y: parseFloat(node.style.top || "0") || 0,
    width: Math.max(1, node.offsetWidth || parseFloat(node.style.width || "0") || 1),
    height: Math.max(1, node.offsetHeight || parseFloat(node.style.minHeight || "0") || 1)
  };
}

function setNodeLayoutWidth(node, width) {
  node.dataset.manualSize = "true";
  const nextWidth = Math.max(24, Math.round(width));
  if (node.classList.contains("node-image")) {
    const ratio = getImageDisplayAspectRatio(node);
    const frame = node.querySelector(".image-frame");
    if (frame) frame.style.aspectRatio = `${nextWidth} / ${Math.max(24, Math.round(nextWidth / ratio))}`;
    node.style.minHeight = "";
    node.style.height = "";
  }
  node.style.width = `${nextWidth}px`;
}

function setNodeLayoutHeight(node, height) {
  node.dataset.manualSize = "true";
  const nextHeight = Math.max(24, Math.round(height));
  if (node.classList.contains("node-image")) {
    const ratio = getImageDisplayAspectRatio(node);
    const nextWidth = Math.max(24, Math.round(nextHeight * ratio));
    const frame = node.querySelector(".image-frame");
    if (frame) frame.style.aspectRatio = `${nextWidth} / ${nextHeight}`;
    node.style.width = `${nextWidth}px`;
    node.style.minHeight = "";
    node.style.height = "";
    return;
  }
  if (node.classList.contains("node-model")) {
    const frame = node.querySelector(".model-frame");
    if (frame) frame.style.aspectRatio = "auto";
  }
  node.style.minHeight = `${nextHeight}px`;
}

function setNodeLayoutSize(node, width, height) {
  node.dataset.manualSize = "true";
  if (node.classList.contains("node-image")) {
    const ratio = getImageDisplayAspectRatio(node);
    const targetArea = Math.max(24 * 24, Math.max(24, width) * Math.max(24, height));
    const nextWidth = Math.max(24, Math.round(Math.sqrt(targetArea * ratio)));
    const nextHeight = Math.max(24, Math.round(nextWidth / ratio));
    const frame = node.querySelector(".image-frame");
    if (frame) frame.style.aspectRatio = `${nextWidth} / ${nextHeight}`;
    node.style.width = `${nextWidth}px`;
    node.style.minHeight = "";
    node.style.height = "";
    return;
  }
  const nextWidth = Math.max(24, Math.round(width));
  const nextHeight = Math.max(24, Math.round(height));
  node.style.width = `${nextWidth}px`;
  setNodeLayoutHeight(node, nextHeight);
}

function setNodeLayoutFrameSize(node, width, height) {
  node.dataset.manualSize = "true";
  const nextWidth = Math.max(24, Math.round(width));
  const nextHeight = Math.max(24, Math.round(height));
  node.style.width = `${nextWidth}px`;
  if (node.classList.contains("node-image")) {
    const frame = node.querySelector(".image-frame");
    if (frame) frame.style.aspectRatio = `${nextWidth} / ${nextHeight}`;
    node.style.minHeight = "";
    node.style.height = "";
    return;
  }
  setNodeLayoutHeight(node, nextHeight);
}

function getImageDisplayAspectRatio(node) {
  const image = node?.querySelector?.(".image-frame img");
  const naturalWidth = Number.parseFloat(node?.dataset?.imageNaturalWidth || "") || image?.naturalWidth || 0;
  const naturalHeight = Number.parseFloat(node?.dataset?.imageNaturalHeight || "") || image?.naturalHeight || 0;
  if (naturalWidth > 0 && naturalHeight > 0) return naturalWidth / naturalHeight;
  const frame = node?.querySelector?.(".image-frame");
  return parseAspectRatio(frame?.style?.aspectRatio || window.getComputedStyle(frame || node).aspectRatio || "") || 1;
}

function getImageFrameHeightFromAspect(node, width) {
  const frame = node?.querySelector?.(".image-frame");
  const ratio = parseAspectRatio(frame?.style?.aspectRatio || window.getComputedStyle(frame || node).aspectRatio || "");
  return ratio ? width / ratio : 0;
}

function getNodeSortTitle(node) {
  return cleanText(
    node.querySelector("h3, .node-title, [data-node-title]")?.textContent
      || node.querySelector(".image-frame img")?.alt
      || node.dataset.title
      || ""
  );
}

function getContextTargetNode(canvasContextMenu, getContextMenuTargetNode) {
  const direct = getContextMenuTargetNode();
  if (direct?.isConnected) return direct;
  const id = canvasContextMenu?.dataset?.contextNodeId;
  if (!id) return document.querySelector(".node-card.selected");
  return document.querySelector(`.node-card[data-node-id="${escapeAttributeValue(id)}"]`);
}

function toggleNodeLock(node) {
  const nextLocked = node.dataset.locked !== "true";
  node.dataset.locked = nextLocked ? "true" : "false";
  node.classList.toggle("node-locked", nextLocked);
}

function unlockAllNodes() {
  getMenuCanvasNodes().forEach((node) => {
    node.dataset.locked = "false";
    node.classList.remove("node-locked");
  });
}

function groupSelectedNodes({
  targetNode = null,
  addNode = () => null,
  selectNode = null,
  addChat = () => {}
} = {}) {
  const members = sortNodesByCanvasPosition(getGroupableSelection(targetNode))
    .filter(isCanvasImageNode)
    .filter((node) => !isNodeLocked(node));
  if (members.length < 2) {
    addChat("assistant", "请先选择至少 2 个模块再打组。");
    return null;
  }
  const bounds = getNodesUnionBounds(members);
  const padding = 28;
  const groupId = `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const groupNode = addNode({
    kind: "group",
    title: "Group",
    desc: "",
    x: bounds.x - padding,
    y: bounds.y - padding,
    media: {}
  });
  if (!groupNode) return null;
  configureGroupNode(groupNode, {
    groupId,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2
  });
  const firstDomMember = getEarliestDomNode(members);
  if (firstDomMember?.parentElement && groupNode.parentElement === firstDomMember.parentElement) {
    firstDomMember.parentElement.insertBefore(groupNode, firstDomMember);
  }
  members.forEach((node) => {
    node.dataset.groupId = groupId;
    node.style.zIndex = String(Math.max(2, normalizeLayerZIndex(node.style.zIndex, 2)));
  });
  selectCanvasNodes([groupNode, ...members], selectNode);
  return groupNode;
}

function configureGroupNode(groupNode, {
  groupId,
  width,
  height,
  background = "rgba(255,255,255,0.52)"
} = {}) {
  groupNode.className = "node-card node-group canvas-group";
  groupNode.dataset.kind = "group";
  groupNode.dataset.groupId = groupId || groupNode.dataset.groupId || "";
  groupNode.dataset.groupBackground = background;
  groupNode.style.zIndex = "0";
  groupNode.style.width = `${Math.max(120, Math.round(width || groupNode.offsetWidth || 320))}px`;
  groupNode.style.minHeight = `${Math.max(90, Math.round(height || groupNode.offsetHeight || 220))}px`;
  groupNode.style.background = background;
  groupNode.innerHTML = `
    <div class="canvas-group-label">Group</div>
    <div class="canvas-group-fill" aria-hidden="true"></div>
  `;
}

function getEarliestDomNode(nodes = []) {
  return nodes
    .filter((node) => node?.parentElement)
    .sort((a, b) => {
      if (a === b) return 0;
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1;
    })[0] || null;
}

function getGroupableSelection(targetNode = null) {
  const selected = getMenuCanvasNodes()
    .filter((node) => node.classList.contains("selected"))
    .filter((node) => !node.classList.contains("node-group"))
    .filter((node) => !node.dataset.groupId);
  if (selected.length) return selected;
  return targetNode?.isConnected
    && !targetNode.classList.contains("node-group")
    && !targetNode.dataset.groupId
    ? [targetNode]
    : [];
}

function getGroupMembers(groupId) {
  if (!groupId) return [];
  return getMenuCanvasNodes().filter((node) => node.dataset.groupId === groupId && !node.classList.contains("node-group"));
}

function getGroupNodeForTarget(targetNode = null) {
  if (!targetNode?.isConnected) return null;
  if (targetNode.classList.contains("node-group")) return targetNode;
  const groupId = targetNode.dataset.groupId || "";
  return groupId ? document.querySelector(`.node-group[data-group-id="${escapeAttributeValue(groupId)}"]`) : null;
}

function ungroupNodes({ targetNode = null, selectNode = null, addChat = () => {} } = {}) {
  const groupNode = getGroupNodeForTarget(targetNode) || document.querySelector(".node-group.selected");
  if (!groupNode) {
    addChat("assistant", "请先选择一个组。");
    return;
  }
  const groupId = groupNode.dataset.groupId || "";
  const members = getGroupMembers(groupId);
  members.forEach((node) => {
    delete node.dataset.groupId;
  });
  groupNode.remove();
  selectCanvasNodes(members, selectNode);
}

function updateGroupBackgroundColor({ targetNode = null, color = "", addChat = () => {} } = {}) {
  const groupNode = getGroupNodeForTarget(targetNode) || document.querySelector(".node-group.selected");
  if (!groupNode || !color) {
    addChat("assistant", "请先选择一个组再更换背景色。");
    return;
  }
  groupNode.dataset.groupBackground = color;
  groupNode.style.background = color;
}

async function exportNode(node, format = "png") {
  const normalizedFormat = format === "jpeg" ? "jpg" : format;
  const svgText = await buildNodeSvg(node);
  const title = cleanFileName(
    node.querySelector("h3, .node-title, [data-node-title]")?.textContent
      || node.querySelector(".image-frame img")?.alt
      || "canvas-node"
  );
  if (normalizedFormat === "svg") {
    downloadBlob(new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }), `${title}.svg`);
    return;
  }
  const blob = await rasterizeSvg(svgText, node.offsetWidth, node.offsetHeight, normalizedFormat);
  downloadBlob(blob, `${title}.${normalizedFormat}`);
}

async function exportNodesByScope({ scope = "selected", targetNode = null, addChat = () => {} } = {}) {
  const nodes = getImageNodesForExport(scope, targetNode);
  if (!nodes.length) {
    addChat("assistant", scope === "all" ? "画布上还没有可导出的图片。" : "请先选择要导出的图片。");
    return;
  }

  if (typeof window.showDirectoryPicker === "function") {
    const directoryHandle = await pickExportDirectory();
    if (!directoryHandle) return;
    const files = await renderExportFiles(nodes);
    if (!files.length) {
      addChat("assistant", "没有图片成功渲染，导出已取消。");
      return;
    }
    try {
      await ensureDirectoryWritePermission(directoryHandle);
      await writeExportFilesToDirectory(directoryHandle, files);
      addChat("assistant", `已导出 ${files.length} 张图片。`);
    } catch (error) {
      console.warn("Failed to write files to selected directory", error);
      files.forEach((file, index) => {
        window.setTimeout(() => downloadBlob(file.blob, file.fileName), index * 120);
      });
      addChat("assistant", `文件夹写入失败，已改为浏览器下载 ${files.length} 张图片。`);
    }
    return;
  }

  const files = await renderExportFiles(nodes);
  if (!files.length) {
    addChat("assistant", "没有图片成功渲染，导出已取消。");
    return;
  }
  files.forEach((file, index) => {
    window.setTimeout(() => downloadBlob(file.blob, file.fileName), index * 120);
  });
  addChat("assistant", `浏览器不支持文件夹选择，已开始下载 ${files.length} 张图片。`);
}

async function renderExportFiles(nodes = []) {
  const files = [];
  for (const node of nodes) {
    try {
      files.push({
        fileName: getUniqueExportFileName(files, getImageExportFileName(node)),
        blob: await renderImageNodeToPng(node)
      });
    } catch (error) {
      console.warn("Failed to render image node for export", error);
    }
  }
  return files;
}

async function pickExportDirectory() {
  try {
    return await window.showDirectoryPicker({ mode: "readwrite" });
  } catch (error) {
    if (error?.name !== "AbortError") throw error;
    return null;
  }
}

async function ensureDirectoryWritePermission(directoryHandle) {
  if (!directoryHandle) return;
  const options = { mode: "readwrite" };
  if (typeof directoryHandle.queryPermission === "function") {
    const currentPermission = await directoryHandle.queryPermission(options);
    if (currentPermission === "granted") return;
  }
  if (typeof directoryHandle.requestPermission === "function") {
    const nextPermission = await directoryHandle.requestPermission(options);
    if (nextPermission !== "granted") {
      throw new Error("Directory write permission was not granted");
    }
  }
}

function getImageNodesForExport(scope = "selected", targetNode = null) {
  const imageNodes = getMenuCanvasNodes().filter(isExportableImageNode);
  if (scope === "all") return imageNodes;
  const selectedImages = imageNodes.filter((node) => node.classList.contains("selected"));
  if (selectedImages.length) return selectedImages;
  return isExportableImageNode(targetNode) ? [targetNode] : [];
}

function isExportableImageNode(node) {
  return Boolean(node?.isConnected
    && node.classList?.contains("node-image")
    && node.querySelector?.(".image-frame img"));
}

async function renderImageNodeToPng(node) {
  const rect = getImageExportRect(node);
  if (!rect) throw new Error("No image bounds available for export");
  const scale = Math.max(1, Math.min(3, window.devicePixelRatio || 2));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(rect.width * scale));
  canvas.height = Math.max(1, Math.ceil(rect.height * scale));
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.clearRect(0, 0, rect.width, rect.height);
  const image = await loadCanvasImage(rect.image.currentSrc || rect.image.src);
  drawImageIntoRect({
    context,
    image,
    x: 0,
    y: 0,
    width: rect.width,
    height: rect.height,
    objectFit: window.getComputedStyle(rect.image).objectFit || "cover"
  });
  return canvasToBlob(canvas, "image/png");
}

function getImageExportFileName(node) {
  const title = cleanFileName(stripImageExtension(node.querySelector(".image-file-name, h3, .node-title, [data-node-title]")?.textContent
    || node.querySelector(".image-frame img")?.alt
    || "canvas-image"));
  return `${title}.png`;
}

function getUniqueExportFileName(existingFiles, fileName) {
  const used = new Set(existingFiles.map((file) => file.fileName));
  if (!used.has(fileName)) return fileName;
  const base = stripImageExtension(fileName);
  let index = 2;
  let nextName = `${base}-${index}.png`;
  while (used.has(nextName)) {
    index += 1;
    nextName = `${base}-${index}.png`;
  }
  return nextName;
}

async function writeExportFilesToDirectory(directoryHandle, files) {
  for (const file of files) {
    const fileHandle = await directoryHandle.getFileHandle(file.fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file.blob);
    await writable.close();
  }
}

function getImageExportRect(node) {
  const frame = node?.querySelector?.(".image-frame");
  const image = frame?.querySelector?.("img");
  if (!frame || !image) return null;
  const nodeBounds = getNodeLayoutBounds(node);
  const width = Math.max(1, frame.offsetWidth || node.offsetWidth || nodeBounds.width);
  const height = Math.max(1, frame.offsetHeight || node.offsetHeight || nodeBounds.height);
  return {
    image,
    x: nodeBounds.x + frame.offsetLeft,
    y: nodeBounds.y + frame.offsetTop,
    width,
    height
  };
}

async function loadCanvasImage(src) {
  if (!src) throw new Error("Missing image source");
  const image = new Image();
  image.decoding = "async";
  image.crossOrigin = "anonymous";
  image.src = src.startsWith("data:") ? src : await imageSourceToDataUrl(src);
  if (image.decode) {
    await image.decode();
    return image;
  }
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("Unable to load image for export"));
  });
  return image;
}

async function imageSourceToDataUrl(src) {
  let response;
  try {
    response = await fetch(src, { credentials: "include" });
  } catch (error) {
    response = await fetchProxiedImage(src, error);
  }
  if (!response?.ok && isHttpUrl(src)) {
    response = await fetchProxiedImage(src);
  }
  if (!response.ok) throw new Error("Unable to read image for export");
  return blobToDataUrl(await response.blob());
}

async function fetchProxiedImage(src, cause = null) {
  if (!isHttpUrl(src)) {
    if (cause) throw cause;
    throw new Error("Image source cannot be proxied");
  }
  return fetch(`/api/image-proxy?url=${encodeURIComponent(src)}`, { credentials: "include" });
}

function isHttpUrl(value = "") {
  return /^https?:\/\//i.test(String(value || ""));
}

function drawImageIntoRect({ context, image, x, y, width, height, objectFit = "cover" }) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) return;
  if (objectFit === "contain") {
    const scale = Math.min(width / sourceWidth, height / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
    return;
  }
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  const sourceX = (sourceWidth - cropWidth) / 2;
  const sourceY = (sourceHeight - cropHeight) / 2;
  context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, x, y, width, height);
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas export returned an empty blob"));
      }
    }, type);
  });
}

function getSelectedOrTargetNodes(targetNode = null) {
  const selected = getMenuCanvasNodes().filter((node) => node.classList.contains("selected"));
  if (selected.length) return selected;
  return targetNode?.isConnected ? [targetNode] : [];
}

async function buildNodesSvg(nodes) {
  const bounds = getNodesUnionBounds(nodes);
  const clones = await Promise.all(nodes.map(async (node) => {
    const nodeBounds = getNodeLayoutBounds(node);
    const clone = node.cloneNode(true);
    inlineComputedTree(node, clone);
    prepareExportClone(clone);
    clone.style.position = "absolute";
    clone.style.left = `${nodeBounds.x - bounds.x}px`;
    clone.style.top = `${nodeBounds.y - bounds.y}px`;
    clone.style.margin = "0";
    clone.style.transform = "none";
    clone.style.boxSizing = "border-box";
    await inlineCloneImages(clone);
    return clone.outerHTML;
  }));
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="0 0 ${bounds.width} ${bounds.height}">
  <foreignObject width="100%" height="100%">
    <body xmlns="http://www.w3.org/1999/xhtml" data-view="canvas" data-theme="${escapeHtml(document.body?.dataset?.theme || "light")}" style="margin:0;width:${bounds.width}px;height:${bounds.height}px;overflow:hidden;background:transparent;position:relative;">
      ${clones.join("")}
    </body>
  </foreignObject>
</svg>`.trim();
}

function getNodesUnionBounds(nodes) {
  const rects = nodes.map(getNodeLayoutBounds);
  return getRectUnionBounds(rects);
}

async function buildNodeSvg(node) {
  const width = Math.max(1, Math.ceil(node.offsetWidth || node.getBoundingClientRect().width || 1));
  const height = Math.max(1, Math.ceil(node.offsetHeight || node.getBoundingClientRect().height || 1));
  const clone = node.cloneNode(true);
  inlineComputedTree(node, clone);
  prepareExportClone(clone);
  clone.style.position = "relative";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.margin = "0";
  clone.style.transform = "none";
  clone.style.boxSizing = "border-box";
  await inlineCloneImages(clone);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <foreignObject width="100%" height="100%">
    <body xmlns="http://www.w3.org/1999/xhtml" data-view="canvas" data-theme="${escapeHtml(document.body?.dataset?.theme || "light")}" style="margin:0;width:${width}px;height:${height}px;overflow:hidden;background:transparent;">
      ${clone.outerHTML}
    </body>
  </foreignObject>
</svg>`.trim();
}

function prepareExportClone(clone) {
  clone.classList.remove("selected", "node-locked");
  clone.querySelectorAll(".resize-handle, .image-node-toolbar, .canvas-asset-savebar, .node-download, .node-expand, .stack-toggle, .stack-tray").forEach((item) => item.remove());
}

function inlineComputedTree(sourceNode, cloneNode) {
  const computed = window.getComputedStyle(sourceNode);
  cloneNode.style.cssText = SAFE_EXPORT_STYLE_PROPERTIES
    .map((property) => `${property}:${computed.getPropertyValue(property)};`)
    .join("");
  Array.from(sourceNode.children).forEach((sourceChild, index) => {
    const cloneChild = cloneNode.children[index];
    if (cloneChild) inlineComputedTree(sourceChild, cloneChild);
  });
}

async function inlineCloneImages(root) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(images.map(async (image) => {
    const src = image.currentSrc || image.src;
    if (!src || src.startsWith("data:")) return;
    try {
      const response = await fetch(src, { credentials: "include" });
      if (!response.ok) return;
      const blob = await response.blob();
      image.src = await blobToDataUrl(blob);
      image.removeAttribute("srcset");
      image.removeAttribute("crossorigin");
    } catch {
      // If a remote image blocks reading, keep the original source for SVG export.
    }
  }));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Unable to read image blob"));
    reader.readAsDataURL(blob);
  });
}

function rasterizeSvg(svgText, width, height, format) {
  return new Promise((resolve, reject) => {
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
    const image = new Image();
    image.onload = () => {
      const scale = Math.max(1, Math.min(3, window.devicePixelRatio || 2));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(width * scale));
      canvas.height = Math.max(1, Math.ceil(height * scale));
      const context = canvas.getContext("2d");
      context.scale(scale, scale);
      if (format === "jpg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas export returned an empty blob"));
          return;
        }
        resolve(blob);
      }, format === "jpg" ? "image/jpeg" : "image/png", 0.94);
    };
    image.onerror = () => {
      reject(new Error("Unable to render SVG export"));
    };
    image.src = url;
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

