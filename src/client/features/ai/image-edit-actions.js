import { postJson } from "./api-client.js";
import { getInverseCanvasUiScale } from "../canvas/canvas-viewport.js";

const IMAGE_EDIT_OUTPUT_GAP = 28;

function readCssNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(value || "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readAspectRatio(value) {
  if (!value) return 0;
  const slashParts = String(value).split("/").map((part) => Number.parseFloat(part.trim()));
  if (slashParts.length === 2 && slashParts[0] > 0 && slashParts[1] > 0) {
    return slashParts[0] / slashParts[1];
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getNodeAspectRatio(node) {
  const frame = node?.querySelector?.(".image-frame");
  return readAspectRatio(frame?.style?.aspectRatio || node?.style?.aspectRatio);
}

function getNodeWorldRect(node) {
  if (!node) return null;
  const left = readCssNumber(node.style.left, 0);
  const top = readCssNumber(node.style.top, 0);
  const frame = node.querySelector?.(".image-frame");
  const width = frame?.offsetWidth || node.offsetWidth || readCssNumber(node.style.width, 0);
  const height = frame?.offsetHeight || node.offsetHeight || readCssNumber(node.style.height, 0) || (getNodeAspectRatio(node) ? width / getNodeAspectRatio(node) : 0);
  if (!width || !height) return null;
  return {
    node,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height
  };
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

export function getNextImageEditOutputPosition(sourceNode, {
  sourceX = 0,
  sourceY = 0,
  sourceWidth = 360,
  sourceHeight = 240,
  gap = IMAGE_EDIT_OUTPUT_GAP
} = {}) {
  const sourceRight = sourceX + sourceWidth;
  const parent = sourceNode?.parentElement;
  let nextX = sourceRight + gap;

  if (!parent) return { x: nextX, y: sourceY };

  const bandTop = sourceY;
  const bandBottom = sourceY + sourceHeight;
  const occupiedRects = Array.from(parent.querySelectorAll(".node-card"))
    .filter((node) => node !== sourceNode)
    .map(getNodeWorldRect)
    .filter(Boolean)
    .filter((rect) => rect.right >= sourceRight - 1)
    .filter((rect) => rangesOverlap(bandTop, bandBottom, rect.top, rect.bottom))
    .sort((a, b) => a.left - b.left);

  for (const rect of occupiedRects) {
    const candidateRight = nextX + sourceWidth;
    const collides = rangesOverlap(nextX - gap, candidateRight + gap, rect.left, rect.right);
    if (collides) nextX = rect.right + gap;
  }

  return { x: nextX, y: sourceY };
}

export function getImageEditSourceMeta(sourceNode, img, fallbackTitle = "\u56fe\u7247") {
  const sourceFrame = sourceNode?.querySelector(".image-frame");
  const sourceX = Number.parseFloat(sourceNode?.style.left || "0");
  const sourceY = Number.parseFloat(sourceNode?.style.top || "0");
  const sourceWidth = sourceFrame?.offsetWidth || sourceNode?.offsetWidth || 360;
  const sourceAspect = sourceFrame?.style.aspectRatio || `${img?.naturalWidth || 1} / ${img?.naturalHeight || 1}`;
  const sourceRatio = readAspectRatio(sourceAspect);
  const sourceHeight = sourceFrame?.offsetHeight || sourceNode?.offsetHeight || (sourceRatio ? sourceWidth / sourceRatio : 240);
  const fileName = sourceNode?.querySelector(".image-file-name")?.textContent.trim() || fallbackTitle;
  return { fileName, sourceX, sourceY, sourceWidth, sourceHeight, sourceAspect };
}

export function positionImageEditPopover({
  node,
  popover,
  zoom,
  minWidth = 430,
  maxWidth = 600,
  minHeight = 168,
  maxHeight = 248,
  gap = 22
}) {
  if (!node || !popover) return null;
  const nodeX = Number.parseFloat(node.style.left || "0");
  const nodeY = Number.parseFloat(node.style.top || "0");
  const frame = node.querySelector?.(".image-frame");
  const nodeWidth = frame?.offsetWidth || node.offsetWidth;
  const nodeHeight = frame?.offsetHeight || node.offsetHeight;
  const safeZoom = Math.max(0.2, Math.min(2.5, zoom || 1));
  const editScreenScale = Math.max(0.76, Math.min(1.22, 1 / safeZoom));
  const screenNodeWidth = nodeWidth * safeZoom;
  const minScreenWidth = Math.max(330, minWidth * editScreenScale);
  const maxScreenWidth = Math.min(680, maxWidth * editScreenScale);
  const preferredScreenWidth = screenNodeWidth + 132 * editScreenScale;
  const targetScreenWidth = Math.max(minScreenWidth, Math.min(maxScreenWidth, preferredScreenWidth));
  const minScreenHeight = Math.max(150, minHeight * editScreenScale);
  const maxScreenHeight = Math.min(292, maxHeight * editScreenScale);
  const targetScreenHeight = Math.max(minScreenHeight, Math.min(maxScreenHeight, targetScreenWidth * 0.42));
  const popoverWidth = Math.round(targetScreenWidth / safeZoom);
  const popoverHeight = Math.round(targetScreenHeight / safeZoom);
  const editScale = getInverseCanvasUiScale(safeZoom);
  const scaledGap = (gap * editScreenScale) / safeZoom;

  popover.style.width = `${popoverWidth}px`;
  popover.style.height = `${popoverHeight}px`;
  popover.style.minHeight = `${popoverHeight}px`;
  popover.style.setProperty("--edit-scale", editScale.toFixed(3));
  popover.style.left = `${nodeX + nodeWidth / 2 - popoverWidth / 2}px`;
  popover.style.top = `${nodeY + nodeHeight + scaledGap}px`;
  return { popoverWidth, popoverHeight, editScale };
}

export async function executeImageEditAction({
  sourceNode,
  referenceNodes = [],
  prompt,
  label = "\u56fe\u7247\u7f16\u8f91",
  model,
  readImageSourceAsDataUrl,
  getOutputSize,
  outputSize,
  previewWidth,
  previewAspectRatio,
  outputX,
  outputY,
  actionType = "image_edit",
  targetLongEdge,
  expand,
  referenceImages = [],
  createPreview,
  replacePreview,
  addSourceBadge,
  addChat,
  addThinking,
  updateThinking,
  updateChat,
  addChatImage
}) {
  if (!sourceNode || !prompt) return null;
  const img = sourceNode.querySelector(".image-frame img");
  if (!img?.src) return null;

  const { fileName, sourceX, sourceY, sourceWidth, sourceHeight, sourceAspect } = getImageEditSourceMeta(sourceNode, img);
  const nextPreviewWidth = Math.max(120, Math.round(Number(previewWidth) || sourceWidth));
  const nextPreviewAspect = previewAspectRatio || sourceAspect;
  const nextPreviewHeight = getPreviewHeightForAspect(nextPreviewWidth, nextPreviewAspect, sourceHeight);
  const hasExplicitOutputPosition = Number.isFinite(Number(outputX)) && Number.isFinite(Number(outputY));
  const outputPosition = hasExplicitOutputPosition
    ? { x: Number(outputX), y: Number(outputY) }
    : getNextImageEditOutputPosition(sourceNode, {
      sourceX,
      sourceY,
      sourceWidth: nextPreviewWidth,
      sourceHeight: nextPreviewHeight
    });
  const previewNode = createPreview({
    title: `${label}.png`,
    desc: "\u6b63\u5728\u6839\u636e\u5f53\u524d\u56fe\u7247\u751f\u6210\u7ed3\u679c",
    x: outputPosition.x,
    y: outputPosition.y,
    width: nextPreviewWidth,
    aspectRatio: nextPreviewAspect
  });

  addChat?.("user", `${label} ${fileName}`);
  const thinking = addThinking?.(label, [
    "\u8bfb\u53d6\u539f\u56fe",
    "\u6574\u7406\u7f16\u8f91\u6307\u4ee4",
    "\u8c03\u7528\u56fe\u7247\u7f16\u8f91\u6a21\u578b",
    "\u5199\u5165\u753b\u5e03"
  ]);
  const progress = addChat?.("assistant", `\u6b63\u5728\u6267\u884c${label}...`);
  progress?.classList.add("loading");
  sourceNode.dataset.editPrompt = prompt;
  sourceNode.dataset.editModel = model || "";

  try {
    updateThinking?.(thinking, 1);
    const imageSources = normalizeReferenceImageSources(referenceNodes, img.src, referenceImages);
    const images = await Promise.all(imageSources.map((src) => readImageSourceAsDataUrl(src)));
    updateThinking?.(thinking, 2);
    const requestSize = outputSize || getOutputSize?.(img);
    const result = await postJson("/api/image-edit", {
      prompt,
      model,
      image: images[0],
      images,
      size: requestSize,
      actionType,
      expand
    });
    let outputUrl = result.imageUrl || (result.imageBase64 ? `data:image/png;base64,${result.imageBase64}` : "");
    if (outputUrl && actionType === "remove_background") {
      outputUrl = await makeBackgroundTransparent(outputUrl);
    }
    if (outputUrl && targetLongEdge) {
      outputUrl = await upscaleImageSourceToLongEdge(outputUrl, targetLongEdge);
    }
    updateThinking?.(thinking, 3);
    if (outputUrl) {
      const imageNode = replacePreview(previewNode, {
        title: `${label}\u7ed3\u679c.png`,
        desc: "\u7531\u56fe\u7247\u7f16\u8f91\u6a21\u578b\u751f\u6210",
        url: outputUrl,
        width: nextPreviewWidth,
        aspectRatio: nextPreviewAspect,
        prompt,
        sourceNode,
        actionType,
        model
      });
      addSourceBadge?.(imageNode, sourceNode);
      addChatImage?.("assistant", outputUrl, `${label}\u5df2\u5b8c\u6210\uff0c\u5e76\u653e\u5728\u539f\u56fe\u53f3\u4fa7`);
    }
    updateThinking?.(thinking, 4, true);
    updateChat?.(progress, result.message || `${label}\u5df2\u5b8c\u6210\u3002`);
    return { ...result, imageUrl: outputUrl };
  } catch (error) {
    previewNode?.classList.add("generation-failed");
    const frameText = previewNode?.querySelector(".generation-frame span");
    if (frameText) frameText.textContent = "\u751f\u6210\u5931\u8d25\uff0c\u8bf7\u67e5\u770b\u9519\u8bef\u4fe1\u606f";
    updateThinking?.(thinking, 0, true);
    updateChat?.(progress, `${label}\u5931\u8d25\uff1a${error.message}`);
    return { error };
  }
}

function getPreviewHeightForAspect(width, aspectRatio, fallbackHeight = 240) {
  const ratio = readAspectRatio(aspectRatio);
  return ratio ? width / ratio : fallbackHeight;
}

async function upscaleImageSourceToLongEdge(src, targetLongEdge) {
  const target = Math.round(Number(targetLongEdge) || 0);
  if (!target || typeof document === "undefined" || typeof Image === "undefined") return src;
  try {
    const source = await imageSourceToDataUrl(src);
    const image = await loadImageElement(source);
    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    const longEdge = Math.max(naturalWidth, naturalHeight);
    if (!longEdge || longEdge >= target) return src;
    const scale = target / longEdge;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(naturalWidth * scale);
    canvas.height = Math.round(naturalHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) return src;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.warn("[image-edit] Failed to upscale generated output", error);
    return src;
  }
}

async function makeBackgroundTransparent(src) {
  if (typeof document === "undefined" || typeof Image === "undefined") return src;
  try {
    const source = await imageSourceToDataUrl(src);
    const image = await loadImageElement(source);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) return src;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return src;
    context.drawImage(image, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    const transparentMask = floodFillEdgeBackground(data, width, height);
    const transparentCount = applyTransparentMask(data, transparentMask);
    if (!transparentCount) return src;
    context.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.warn("[image-edit] Failed to create transparent background", error);
    return src;
  }
}

function floodFillEdgeBackground(data, width, height) {
  const visited = new Uint8Array(width * height);
  const transparentMask = new Uint8Array(width * height);
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const key = y * width + x;
    if (visited[key]) return;
    visited[key] = 1;
    const offset = key * 4;
    if (!isRemovableBackgroundPixel(data[offset], data[offset + 1], data[offset + 2], data[offset + 3])) return;
    transparentMask[key] = 1;
    queue.push(key);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let index = 0; index < queue.length; index += 1) {
    const key = queue[index];
    const x = key % width;
    const y = Math.floor(key / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  return transparentMask;
}

function isRemovableBackgroundPixel(red, green, blue, alpha) {
  if (alpha <= 12) return true;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const neutralChroma = max - min;
  const brightness = (red + green + blue) / 3;
  return brightness >= 222 && neutralChroma <= 28;
}

function applyTransparentMask(data, transparentMask) {
  let count = 0;
  for (let key = 0; key < transparentMask.length; key += 1) {
    if (!transparentMask[key]) continue;
    const offset = key * 4;
    data[offset + 3] = 0;
    count += 1;
  }
  return count;
}

async function imageSourceToDataUrl(src) {
  if (!src || src.startsWith("data:")) return src;
  const response = await fetchImageSource(src);
  if (!response.ok) throw new Error("Unable to read generated image");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to encode generated image"));
    reader.readAsDataURL(blob);
  });
}

async function fetchImageSource(src) {
  try {
    const direct = await fetch(src, { credentials: "include" });
    if (direct.ok || !/^https?:\/\//i.test(src)) return direct;
  } catch {
    // Fall through to the same-origin proxy for signed image URLs without CORS.
  }
  if (!/^https?:\/\//i.test(src)) throw new Error("Image source cannot be proxied");
  return fetch(`/api/image-proxy?url=${encodeURIComponent(src)}`, { credentials: "include" });
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load generated image"));
    image.src = src;
  });
}

function normalizeReferenceImageSources(referenceNodes = [], fallbackSrc = "", directSources = []) {
  const seen = new Set();
  const sources = [];
  const append = (src) => {
    if (!src || seen.has(src) || sources.length >= 3) return;
    seen.add(src);
    sources.push(src);
  };
  Array.from(referenceNodes || []).forEach((node) => {
    append(node?.querySelector?.(".image-frame img")?.src);
  });
  append(fallbackSrc);
  Array.from(directSources || []).forEach(append);
  return sources;
}
