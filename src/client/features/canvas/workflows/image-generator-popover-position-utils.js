export function getGeneratorPopoverMetrics({
  frameWidth = 560,
  zoom = 1,
  expanded = false
} = {}) {
  const safeZoom = Math.max(0.2, Math.min(2.5, Number(zoom) || 1));
  const screenNodeWidth = frameWidth * safeZoom;
  const minScreenWidth = 430;
  const maxScreenWidth = 620;
  const preferredScreenWidth = screenNodeWidth + 132;
  const targetScreenWidth = Math.max(minScreenWidth, Math.min(maxScreenWidth, preferredScreenWidth));
  const minScreenHeight = 168;
  const maxScreenHeight = 268;
  const targetScreenHeight = expanded
    ? 292
    : Math.max(minScreenHeight, Math.min(maxScreenHeight, targetScreenWidth * 0.42));
  return {
    safeZoom,
    screenWidth: targetScreenWidth,
    screenHeight: targetScreenHeight,
    popoverWidth: Math.round(targetScreenWidth),
    popoverHeight: Math.round(targetScreenHeight),
    gap: 22
  };
}

export function getVisibleGeneratorPopoverPosition({
  frameLeft,
  frameTop,
  frameWidth,
  frameHeight,
  popoverWidth,
  screenWidth,
  gap,
  zoom,
  viewportRect = null,
  worldRect = null
} = {}) {
  let left = frameLeft + frameWidth / 2 - popoverWidth / 2;
  let top = frameTop + frameHeight + gap;
  if (!viewportRect || !worldRect || !Number.isFinite(zoom) || zoom <= 0) {
    return { left, top };
  }

  const margin = 16;
  const frameScreenLeft = worldRect.left + frameLeft * zoom;
  const frameScreenTop = worldRect.top + frameTop * zoom;
  const frameScreenWidth = frameWidth * zoom;
  const frameScreenHeight = frameHeight * zoom;
  const screenLeft = frameScreenLeft + frameScreenWidth / 2 - popoverWidth / 2;
  const belowScreenTop = frameScreenTop + frameScreenHeight + gap;
  const clampedScreenLeft = clampScreenPosition(
    screenLeft,
    viewportRect.left + margin,
    viewportRect.right - screenWidth - margin
  );

  left = clampedScreenLeft;
  top = belowScreenTop;
  return { left, top };
}

export function clampScreenPosition(value, min, max) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? max : safeMin;
  if (safeMax < safeMin) return safeMin;
  return Math.min(safeMax, Math.max(safeMin, value));
}

export function getElementOffsetWithinNode(element, node) {
  let left = 0;
  let top = 0;
  let current = element;
  while (current && current !== node) {
    left += current.offsetLeft || 0;
    top += current.offsetTop || 0;
    current = current.offsetParent;
  }
  return { left, top };
}
