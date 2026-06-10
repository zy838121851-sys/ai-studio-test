import { generateImage } from "./ai-client.js";
import { buildImagePrompt } from "./prompt-builder.js";

export function generateCanvasImage(input) {
  return generateImage(buildImagePrompt(input));
}

export function roundToImageMultiple(value, multiple = 16) {
  return Math.round(value / multiple) * multiple;
}

export function getQwenImageSizeForElement(img, {
  maxSize = 2048,
  minSize = 512,
  multiple = 16
} = {}) {
  const naturalWidth = img?.naturalWidth || 1024;
  const naturalHeight = img?.naturalHeight || 1024;
  const ratio = naturalWidth / Math.max(1, naturalHeight);
  let width;
  let height;

  if (ratio >= 1) {
    width = maxSize;
    height = width / ratio;
  } else {
    height = maxSize;
    width = height * ratio;
  }

  width = Math.max(minSize, Math.min(maxSize, roundToImageMultiple(width, multiple)));
  height = Math.max(minSize, Math.min(maxSize, roundToImageMultiple(height, multiple)));
  return `${width}*${height}`;
}
