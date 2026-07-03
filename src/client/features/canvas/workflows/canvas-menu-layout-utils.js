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
