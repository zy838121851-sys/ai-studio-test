const OUTPUT_SIZE = "1024*1024";
const GENERATOR_FIXED_SIZES = {
  "1:1": { width: 1024, height: 1024 },
  "4:3": { width: 1024, height: 768 },
  "3:4": { width: 768, height: 1024 },
  "16:9": { width: 1344, height: 768 },
  "9:16": { width: 768, height: 1344 }
};

export function getGeneratorOutputDimensions(node, ratio = "1:1") {
  if (ratio === "original" || ratio === "auto") {
    return GENERATOR_FIXED_SIZES["1:1"] || parseImageSize(OUTPUT_SIZE);
  }
  if (GENERATOR_FIXED_SIZES[ratio]) return GENERATOR_FIXED_SIZES[ratio];
  const width = Number(node?.dataset?.outputWidth || 0);
  const height = Number(node?.dataset?.outputHeight || 0);
  if (width > 0 && height > 0) return { width, height };
  return parseImageSize(OUTPUT_SIZE);
}

export function resolveGeneratorOutputSize(node, references = [], {
  documentRef = globalThis.document,
  popoverSelector = "#imageGeneratorPopover",
  defaultRatio = "1:1"
} = {}) {
  const dimensions = getGeneratorOutputDimensions(
    node,
    node?.dataset?.generatorRatio
      || documentRef?.querySelector?.(`${popoverSelector} [data-generator-ratio]`)?.value
      || defaultRatio,
    references
  );
  return `${dimensions.width}*${dimensions.height}`;
}

export function syncGeneratorFrameToRatio(node, ratio = "1:1", {
  defaultRatio = "1:1",
  onSync = null
} = {}) {
  if (!node) return null;
  const dimensions = getGeneratorOutputDimensions(node, ratio);
  const stage = node.querySelector?.(".image-generator-stage");
  const frame = node.querySelector?.(".image-generator-frame");
  const aspectRatio = `${dimensions.width} / ${dimensions.height}`;
  if (stage) stage.style.aspectRatio = aspectRatio;
  if (frame) frame.style.aspectRatio = aspectRatio;
  node.dataset.generatorRatio = ratio || defaultRatio;
  node.dataset.outputWidth = String(dimensions.width);
  node.dataset.outputHeight = String(dimensions.height);
  updateGeneratorSizeLabel(node, dimensions);
  onSync?.(dimensions);
  return dimensions;
}

export function parseImageSize(value = OUTPUT_SIZE) {
  const [width, height] = String(value || OUTPUT_SIZE)
    .split("*")
    .map((part) => Number.parseInt(part, 10));
  return {
    width: Number.isFinite(width) && width > 0 ? width : 1024,
    height: Number.isFinite(height) && height > 0 ? height : 1024
  };
}

function updateGeneratorSizeLabel(node, { width, height } = {}) {
  const label = node?.querySelector?.(".image-generator-size")
    || node?.querySelector?.(".image-generator-head > span:last-child");
  if (!label) return;
  label.textContent = `${Math.round(width || 1024)} × ${Math.round(height || 1024)}`;
}
