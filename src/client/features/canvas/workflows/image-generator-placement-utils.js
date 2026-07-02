import {
  getElementOffsetWithinNode
} from "./image-generator-popover-position-utils.js";

export function getGeneratorReplacementPlacement(node) {
  const frame = node?.querySelector?.(".image-generator-frame");
  return {
    x: Number.parseFloat(node?.style?.left || "0"),
    y: Number.parseFloat(node?.style?.top || "0"),
    width: Math.max(160, frame?.offsetWidth || node?.offsetWidth || 560)
  };
}

export function getGeneratedImagePlacement(node, index = 0) {
  const frame = node?.querySelector?.(".image-generator-frame") || node?.querySelector?.(".image-frame");
  const nodeX = Number.parseFloat(node?.style?.left || "0");
  const nodeY = Number.parseFloat(node?.style?.top || "0");
  const frameOffset = getElementOffsetWithinNode(frame, node);
  const frameWidth = Math.max(160, frame?.offsetWidth || node?.offsetWidth || 560);
  const gap = 28;
  return {
    x: nodeX + frameOffset.left + frameWidth + gap + index * (frameWidth + gap),
    y: nodeY + frameOffset.top,
    width: frameWidth
  };
}
