import { isNodeLocked } from "./canvas-menu-node-utils.js";

export function areLayoutSnapshotsEqual(a, b) {
  if (!a || !b) return false;
  return a.left === b.left
    && a.top === b.top
    && a.width === b.width
    && a.height === b.height
    && a.minHeight === b.minHeight
    && a.zIndex === b.zIndex
    && a.manualSize === b.manualSize
    && a.frameAspectRatio === b.frameAspectRatio;
}

export function getLayoutUnionBounds(bounds = []) {
  const left = Math.min(...bounds.map((item) => item.x));
  const top = Math.min(...bounds.map((item) => item.y));
  const right = Math.max(...bounds.map((item) => item.x + item.width));
  const bottom = Math.max(...bounds.map((item) => item.y + item.height));
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}

export function getRectUnionBounds(rects = []) {
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  return {
    x: minX,
    y: minY,
    width: Math.max(1, Math.ceil(maxX - minX)),
    height: Math.max(1, Math.ceil(maxY - minY))
  };
}

export function getNodesUnionBounds(nodes = []) {
  const rects = nodes.map(getNodeLayoutBounds);
  return getRectUnionBounds(rects);
}

export function getNodeSortIndex(node) {
  const idNumber = Number(String(node.dataset.nodeId || "").replace(/\D+/g, ""));
  if (Number.isFinite(idNumber)) return idNumber;
  return Array.from(node.parentElement?.children || []).indexOf(node);
}

export function normalizeLayerZIndex(value, fallbackIndex = 0) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : 10 + fallbackIndex;
}

export function getLayerOrderedNodes(nodes = []) {
  return nodes
    .map((node, index) => ({
      node,
      index,
      zIndex: normalizeLayerZIndex(node.style.zIndex, index)
    }))
    .sort((a, b) => a.zIndex - b.zIndex || a.index - b.index)
    .map(({ node }) => node);
}

export function reorderLayerNodesByMode(orderedNodes = [], selectedNodes = [], mode = "") {
  const selectedSet = new Set(selectedNodes);
  const selected = orderedNodes.filter((node) => selectedSet.has(node));
  const unselected = orderedNodes.filter((node) => !selectedSet.has(node));
  if (!selected.length) return orderedNodes.slice();

  let nextOrder = orderedNodes.slice();
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
  return nextOrder;
}

export function getNodeLayoutBounds(node) {
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

export function sortNodesByCanvasPosition(nodes) {
  return [...nodes].sort((a, b) => {
    const aBounds = getNodeLayoutBounds(a);
    const bBounds = getNodeLayoutBounds(b);
    const sameVisualRow = Math.abs(aBounds.y - bBounds.y) <= 48;
    return (sameVisualRow ? 0 : aBounds.y - bBounds.y)
      || aBounds.x - bBounds.x
      || getNodeSortIndex(a) - getNodeSortIndex(b);
  });
}

export function getImageFrameHeightFromAspect(node, width) {
  const frame = node?.querySelector?.(".image-frame");
  const ratio = parseAspectRatio(frame?.style?.aspectRatio || window.getComputedStyle(frame || node).aspectRatio || "");
  return ratio ? width / ratio : 0;
}

export function getImageDisplayAspectRatio(node) {
  const image = node?.querySelector?.(".image-frame img");
  const naturalWidth = Number.parseFloat(node?.dataset?.imageNaturalWidth || "") || image?.naturalWidth || 0;
  const naturalHeight = Number.parseFloat(node?.dataset?.imageNaturalHeight || "") || image?.naturalHeight || 0;
  if (naturalWidth > 0 && naturalHeight > 0) return naturalWidth / naturalHeight;
  const frame = node?.querySelector?.(".image-frame");
  return parseAspectRatio(frame?.style?.aspectRatio || window.getComputedStyle(frame || node).aspectRatio || "") || 1;
}

export function setNodeLayoutWidth(node, width) {
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

export function setNodeLayoutHeight(node, height) {
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

export function setNodeLayoutSize(node, width, height) {
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

export function setNodeLayoutFrameSize(node, width, height) {
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

export function getViewportUnionRect(nodes = []) {
  const rects = nodes
    .filter((node) => node?.isConnected)
    .map((node) => node.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0);
  if (!rects.length) return null;
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return {
    left,
    top,
    width: right - left,
    height: bottom - top
  };
}

export function getViewportCenterWorldPoint(canvasViewport, viewportPointToWorld) {
  const rect = canvasViewport.getBoundingClientRect();
  return viewportPointToWorld(
    rect.left + canvasViewport.clientWidth / 2,
    rect.top + canvasViewport.clientHeight / 2
  );
}

export function layoutNodesInCompactGallery(nodes, {
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

export function layoutNodesByRows(nodes, bounds, {
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

export function layoutNodesByColumns(nodes, bounds, {
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

export function stackNodesByOffset(nodes, {
  offset = 18,
  recordUndoAction = null,
  type = "align-images"
} = {}) {
  if (nodes.length <= 1) return false;
  const before = snapshotLayoutNodes(nodes);
  const bounds = nodes.map(getNodeLayoutBounds);
  const anchor = bounds[0] || { x: 0, y: 0 };
  nodes.forEach((node, index) => {
    node.style.left = `${anchor.x + index * offset}px`;
    node.style.top = `${anchor.y + index * offset}px`;
    node.style.zIndex = String(20 + index);
  });
  return recordLayoutMutation(nodes, before, type, recordUndoAction);
}

export function normalizeNodesByMode(nodes, mode, recordUndoAction) {
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

export function parseAspectRatio(value = "") {
  const normalized = String(value || "").trim();
  if (!normalized || normalized === "auto") return 0;
  const parts = normalized.split("/").map((part) => Number.parseFloat(part.trim()));
  if (parts.length === 2 && parts.every((part) => Number.isFinite(part) && part > 0)) {
    return parts[0] / parts[1];
  }
  const numeric = Number.parseFloat(normalized);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

export function snapshotLayoutNodes(nodes) {
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

export function restoreLayoutNodes(entries = []) {
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

export function recordLayoutMutation(nodes, before, type, recordUndoAction) {
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
