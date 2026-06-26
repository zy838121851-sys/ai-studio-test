import { postJson } from "./api-client.js";
import {
  formatModelUsage
} from "./model-catalog.js?v=20260626-midjourney-4up-1";

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
  canvasViewport,
  canvasWorld,
  minWidth = 430,
  maxWidth = 600,
  minHeight = 168,
  maxHeight = 248,
  gap = 22
}) {
  if (!node || !popover) return null;
  const frame = node.querySelector?.(".image-frame");
  const nodeWidth = frame?.offsetWidth || node.offsetWidth;
  const nodeHeight = frame?.offsetHeight || node.offsetHeight;
  const safeZoom = Math.max(0.2, Math.min(2.5, zoom || 1));
  const resolvedWorld = canvasWorld || node.closest?.(".canvas-world") || node.parentElement;
  const resolvedViewport = canvasViewport
    || resolvedWorld?.closest?.(".canvas-viewport")
    || globalThis.document?.querySelector?.("#canvasViewport");
  const nodeRect = node.getBoundingClientRect?.();
  const frameRect = frame?.getBoundingClientRect?.();
  const anchorRect = frameRect || nodeRect;
  const screenNodeWidth = anchorRect?.width || nodeWidth * safeZoom;
  const minScreenWidth = minWidth;
  const maxScreenWidth = Math.min(680, maxWidth);
  const preferredScreenWidth = screenNodeWidth + 132;
  const targetScreenWidth = Math.max(minScreenWidth, Math.min(maxScreenWidth, preferredScreenWidth));
  const minScreenHeight = minHeight;
  const maxScreenHeight = Math.min(292, maxHeight);
  const targetScreenHeight = Math.max(minScreenHeight, Math.min(maxScreenHeight, targetScreenWidth * 0.42));
  const popoverWidth = Math.round(targetScreenWidth);
  const popoverHeight = Math.round(targetScreenHeight);
  const scaledGap = gap;
  const viewportRect = resolvedViewport?.getBoundingClientRect?.();

  popover.style.width = `${popoverWidth}px`;
  popover.style.height = `${popoverHeight}px`;
  popover.style.minHeight = `${popoverHeight}px`;
  popover.style.setProperty("--edit-scale", "1");
  popover.style.position = "fixed";
  popover.style.zIndex = "12080";

  if (!viewportRect || !anchorRect) {
    const fallbackX = Number.parseFloat(node.style.left || "0");
    const fallbackY = Number.parseFloat(node.style.top || "0");
    popover.style.left = `${fallbackX + nodeWidth / 2 - popoverWidth / 2}px`;
    popover.style.top = `${fallbackY + nodeHeight + scaledGap}px`;
    return { popoverWidth, popoverHeight, editScale: 1 };
  }

  const margin = 16;
  const nodeScreenLeft = anchorRect.left;
  const nodeScreenTop = anchorRect.top;
  const nodeScreenWidth = anchorRect.width;
  const nodeScreenHeight = anchorRect.height;
  const screenLeft = nodeScreenLeft + nodeScreenWidth / 2 - popoverWidth / 2;
  const belowTop = nodeScreenTop + nodeScreenHeight + scaledGap;
  const maxLeft = viewportRect.right - popoverWidth - margin;
  const clampedLeft = Math.min(Math.max(screenLeft, viewportRect.left + margin), Math.max(viewportRect.left + margin, maxLeft));

  popover.style.left = `${clampedLeft}px`;
  popover.style.top = `${belowTop}px`;
  return { popoverWidth, popoverHeight, editScale: 1 };
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
  upscaleFactor,
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
  const thinkingSteps = actionType === "expand_image"
    ? [
      "\u8bfb\u53d6\u539f\u56fe",
      "\u5206\u6790\u539f\u56fe\u5e76\u89c4\u5212\u6269\u56fe",
      "\u8c03\u7528\u6269\u56fe\u6a21\u578b",
      "\u5199\u5165\u753b\u5e03"
    ]
    : actionType === "upscale"
      ? [
        "\u8bfb\u53d6\u539f\u56fe",
        "\u8ba1\u7b97\u8d85\u5206\u500d\u7387",
        "\u8c03\u7528\u4fdd\u771f\u8d85\u5206\u6a21\u578b",
        "\u5199\u5165\u753b\u5e03"
      ]
    : [
      "\u8bfb\u53d6\u539f\u56fe",
      "\u6574\u7406\u7f16\u8f91\u6307\u4ee4",
      "\u8c03\u7528\u56fe\u7247\u7f16\u8f91\u6a21\u578b",
      "\u5199\u5165\u753b\u5e03"
    ];
  const thinking = addThinking?.(label, thinkingSteps);
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
    let result = await postJson("/api/image-edit", {
      prompt,
      model,
      image: images[0],
      images,
      size: requestSize,
      actionType,
      upscaleFactor,
      expand
    });
    if (!result?.imageUrl && result?.jobId) {
      updateChat?.(progress, `${label}仍在生成，正在等待结果...`);
      result = await waitForImageEditJob(result.jobId, {
        fallback: result,
        onProgress: (payload) => {
          const percent = Number(payload?.progress || 0);
          updateChat?.(progress, percent > 0
            ? `${label}仍在生成（${percent}%）...`
            : `${label}仍在生成，正在等待结果...`);
        }
      });
    }
    let outputUrl = result.imageUrl || (result.imageBase64 ? `data:image/png;base64,${result.imageBase64}` : "");
    if (outputUrl && actionType === "remove_background") {
      outputUrl = await makeBackgroundTransparent(outputUrl);
    }
    updateThinking?.(thinking, 3);
    const resultModel = result.requestedModel || result.model || model || "";
    const modelUsage = formatModelUsage(result, resultModel);
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
        model: resultModel
      });
      addSourceBadge?.(imageNode, sourceNode);
      addChatImage?.("assistant", outputUrl, `${label}\u5df2\u5b8c\u6210\uff0c\u5e76\u653e\u5728\u539f\u56fe\u53f3\u4fa7\n${modelUsage}`);
      window.dispatchEvent(new CustomEvent("ai-studio-credits-refresh"));
    }
    updateThinking?.(thinking, 4, true);
    updateChat?.(progress, `${result.message || `${label}\u5df2\u5b8c\u6210\u3002`}\n${modelUsage}`);
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

async function waitForImageEditJob(jobId, { attempts = 180, delayMs = 2000, fallback = {}, onProgress = null } = {}) {
  let lastPayload = { jobId, ...fallback };
  for (let index = 0; index < attempts; index += 1) {
    await delay(delayMs);
    const response = await fetch(`/api/ai/jobs/${encodeURIComponent(jobId)}`, {
      credentials: "include"
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 429) {
      const retryDelay = getRetryAfterDelayMs(response, delayMs * 2);
      onProgress?.({
        ...lastPayload,
        status: "running",
        rateLimited: true,
        message: payload?.message || "Waiting for job status"
      });
      await delay(retryDelay);
      continue;
    }
    if (!response.ok) throw new Error(payload?.message || `Job request failed: ${response.status}`);
    lastPayload = { ...fallback, ...payload };
    if (["succeeded", "failed", "cancelled", "timeout", "save_failed"].includes(payload?.status)) {
      if (payload.status !== "succeeded") throw new Error(payload.error || payload.status);
      return lastPayload;
    }
    onProgress?.(payload);
  }
  throw new Error(`Generation is still running. Job ID: ${lastPayload.jobId || jobId}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterDelayMs(response, fallbackMs = 4000) {
  const value = Number.parseInt(response?.headers?.get?.("Retry-After") || "", 10);
  if (Number.isFinite(value) && value > 0) return value * 1000;
  return fallbackMs;
}

function getPreviewHeightForAspect(width, aspectRatio, fallbackHeight = 240) {
  const ratio = readAspectRatio(aspectRatio);
  return ratio ? width / ratio : fallbackHeight;
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
