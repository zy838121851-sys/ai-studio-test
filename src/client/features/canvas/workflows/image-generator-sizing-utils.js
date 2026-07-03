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

export function parseImageSize(value = OUTPUT_SIZE) {
  const [width, height] = String(value || OUTPUT_SIZE)
    .split("*")
    .map((part) => Number.parseInt(part, 10));
  return {
    width: Number.isFinite(width) && width > 0 ? width : 1024,
    height: Number.isFinite(height) && height > 0 ? height : 1024
  };
}
