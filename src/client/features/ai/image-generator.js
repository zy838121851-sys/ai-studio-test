import { generateImage } from "./ai-client.js";
import { buildImagePrompt } from "./prompt-builder.js";

export function generateCanvasImage(input) {
  return generateImage(buildImagePrompt(input));
}

export function roundToImageMultiple(value, multiple = 16) {
  return Math.round(value / multiple) * multiple;
}

export function getQwenImageSizeForDimensions(naturalWidth = 1024, naturalHeight = 1024, {
  maxSize = 2048,
  minSize = 512,
  multiple = 16
} = {}) {
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

export function getQwenImageSizeForElement(img, options = {}) {
  return getQwenImageSizeForDimensions(
    img?.naturalWidth || 1024,
    img?.naturalHeight || 1024,
    options
  );
}

export function buildPromptGenerationNodeConfig({
  prompt = "",
  count = 1,
  point,
  detectKind
} = {}) {
  const kind = detectKind(prompt);
  const titles = {
    "2d": "AI 2D 素材",
    "3d": "AI 3D 渲染",
    video: "AI 视频素材"
  };
  const target = point || {
    x: -260 + (count % 3) * 310,
    y: 40 + Math.floor(count / 3) * 220
  };
  return {
    kind,
    title: `${titles[kind] || titles["2d"]} ${count}`,
    desc: prompt.length > 72 ? `${prompt.slice(0, 72)}...` : prompt,
    x: target.x,
    y: target.y,
    label: titles[kind] || titles["2d"]
  };
}
