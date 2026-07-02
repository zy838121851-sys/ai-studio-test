export function getGeneratorReplacementPlacement(node) {
  const frame = node?.querySelector?.(".image-generator-frame");
  return {
    x: Number.parseFloat(node?.style?.left || "0"),
    y: Number.parseFloat(node?.style?.top || "0"),
    width: Math.max(160, frame?.offsetWidth || node?.offsetWidth || 560)
  };
}
