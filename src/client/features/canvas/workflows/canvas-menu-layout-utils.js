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

export function getNodeSortIndex(node) {
  const idNumber = Number(String(node.dataset.nodeId || "").replace(/\D+/g, ""));
  if (Number.isFinite(idNumber)) return idNumber;
  return Array.from(node.parentElement?.children || []).indexOf(node);
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
