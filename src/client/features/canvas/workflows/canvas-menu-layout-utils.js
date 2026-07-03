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

export function getNodeSortIndex(node) {
  const idNumber = Number(String(node.dataset.nodeId || "").replace(/\D+/g, ""));
  if (Number.isFinite(idNumber)) return idNumber;
  return Array.from(node.parentElement?.children || []).indexOf(node);
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
