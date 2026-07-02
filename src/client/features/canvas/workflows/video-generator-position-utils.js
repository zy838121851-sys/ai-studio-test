import {
  clamp
} from "./video-generator-option-utils.js";

export function getVideoPopoverPositionStyle(rect, viewportWidth = 1280) {
  const width = Math.max(430, Math.min(820, rect.width + 180));
  const left = clamp(rect.left + rect.width / 2 - width / 2, 16, Math.max(16, viewportWidth - width - 16));
  return {
    position: "fixed",
    zIndex: "12080",
    width: `${Math.round(width)}px`,
    left: `${Math.round(left)}px`,
    top: `${Math.round(rect.bottom + 18)}px`
  };
}

export function applyVideoPopoverPosition(popover, style = {}) {
  if (!popover) return;
  popover.style.position = style.position || "";
  popover.style.zIndex = style.zIndex || "";
  popover.style.width = style.width || "";
  popover.style.left = style.left || "";
  popover.style.top = style.top || "";
}
