import { postJson } from "./api-client.js";

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
  const width = node.offsetWidth || readCssNumber(node.style.width, 0);
  const height = node.offsetHeight || readCssNumber(node.style.height, 0) || (getNodeAspectRatio(node) ? width / getNodeAspectRatio(node) : 0);
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

export function getImageEditSourceMeta(sourceNode, img, fallbackTitle = "图片") {
  const sourceFrame = sourceNode?.querySelector(".image-frame");
  const sourceX = Number.parseFloat(sourceNode?.style.left || "0");
  const sourceY = Number.parseFloat(sourceNode?.style.top || "0");
  const sourceWidth = sourceNode?.offsetWidth || 360;
  const sourceAspect = sourceFrame?.style.aspectRatio || `${img?.naturalWidth || 1} / ${img?.naturalHeight || 1}`;
  const sourceRatio = readAspectRatio(sourceAspect);
  const sourceHeight = sourceNode?.offsetHeight || sourceFrame?.offsetHeight || (sourceRatio ? sourceWidth / sourceRatio : 240);
  const fileName = sourceNode?.querySelector(".image-file-name")?.textContent.trim() || fallbackTitle;
  return { fileName, sourceX, sourceY, sourceWidth, sourceHeight, sourceAspect };
}

export function positionImageEditPopover({
  node,
  popover,
  zoom,
  minWidth = 540,
  maxWidth = 660,
  minHeight = 220,
  maxHeight = 330,
  gap = 22
}) {
  if (!node || !popover) return null;
  const nodeX = Number.parseFloat(node.style.left || "0");
  const nodeY = Number.parseFloat(node.style.top || "0");
  const nodeWidth = node.offsetWidth;
  const nodeHeight = node.offsetHeight;
  const safeZoom = Math.max(0.35, Math.min(3, zoom || 1));
  const inverseZoom = 1 / safeZoom;
  const zoomFactor = Math.max(0.82, Math.min(1.28, inverseZoom));
  const baseWidth = Math.max(minWidth, Math.min(maxWidth, nodeWidth * 1.42 + 72));
  const popoverWidth = Math.round(Math.min(maxWidth, Math.max(minWidth, baseWidth * zoomFactor)));
  const popoverHeight = Math.round(Math.min(maxHeight, Math.max(minHeight, popoverWidth * 0.46)));
  const editScale = Math.max(0.88, Math.min(1.12, popoverWidth / 600));

  popover.style.width = `${popoverWidth}px`;
  popover.style.height = `${popoverHeight}px`;
  popover.style.minHeight = `${popoverHeight}px`;
  popover.style.setProperty("--edit-scale", editScale.toFixed(3));
  popover.style.left = `${nodeX + nodeWidth / 2 - popoverWidth / 2}px`;
  popover.style.top = `${nodeY + nodeHeight + gap}px`;
  return { popoverWidth, popoverHeight, editScale };
}

export async function executeImageEditAction({
  sourceNode,
  prompt,
  label = "图片编辑",
  model,
  readImageSourceAsDataUrl,
  getOutputSize,
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
  const outputPosition = getNextImageEditOutputPosition(sourceNode, {
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight
  });
  const previewNode = createPreview({
    title: `${label}.png`,
    desc: "正在根据当前图片生成结果",
    x: outputPosition.x,
    y: outputPosition.y,
    width: sourceWidth,
    aspectRatio: sourceAspect
  });

  addChat?.("user", `${label} ${fileName}`);
  const thinking = addThinking?.(label, [
    "读取原图",
    "整理编辑指令",
    "调用图片编辑模型",
    "写入画布"
  ]);
  const progress = addChat?.("assistant", `正在执行${label}...`);
  progress?.classList.add("loading");
  sourceNode.dataset.editPrompt = prompt;
  sourceNode.dataset.editModel = model || "";

  try {
    updateThinking?.(thinking, 1);
    const image = await readImageSourceAsDataUrl(img.src);
    updateThinking?.(thinking, 2);
    const result = await postJson("/api/image-edit", {
      prompt,
      model,
      image,
      size: getOutputSize(img)
    });
    const outputUrl = result.imageUrl || (result.imageBase64 ? `data:image/png;base64,${result.imageBase64}` : "");
    updateThinking?.(thinking, 3);
    if (outputUrl) {
      const imageNode = replacePreview(previewNode, {
        title: `${label}结果.png`,
        desc: "由图片编辑模型生成",
        url: outputUrl,
        width: sourceWidth,
        aspectRatio: sourceAspect,
        prompt,
        sourceNode,
        actionType: "image_edit",
        model
      });
      addSourceBadge?.(imageNode, sourceNode);
      addChatImage?.("assistant", outputUrl, `${label}已完成，并放在原图右侧`);
    }
    updateThinking?.(thinking, 4, true);
    updateChat?.(progress, result.message || `${label}已完成。`);
    return result;
  } catch (error) {
    previewNode?.classList.add("generation-failed");
    const frameText = previewNode?.querySelector(".generation-frame span");
    if (frameText) frameText.textContent = "生成失败，请查看错误信息";
    updateThinking?.(thinking, 0, true);
    updateChat?.(progress, `${label}失败：${error.message}`);
    return { error };
  }
}
