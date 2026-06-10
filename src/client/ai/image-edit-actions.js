import { postJson } from "./api-client.js";

export function getImageEditSourceMeta(sourceNode, img, fallbackTitle = "图片") {
  const sourceFrame = sourceNode?.querySelector(".image-frame");
  const sourceX = Number.parseFloat(sourceNode?.style.left || "0");
  const sourceY = Number.parseFloat(sourceNode?.style.top || "0");
  const sourceWidth = sourceNode?.offsetWidth || 360;
  const sourceAspect = sourceFrame?.style.aspectRatio || `${img?.naturalWidth || 1} / ${img?.naturalHeight || 1}`;
  const fileName = sourceNode?.querySelector(".image-file-name")?.textContent.trim() || fallbackTitle;
  return { fileName, sourceX, sourceY, sourceWidth, sourceAspect };
}

export function positionImageEditPopover({
  node,
  popover,
  zoom,
  minWidth = 420,
  maxWidth = 720,
  minHeight = 230,
  maxHeight = 360,
  gap = 22
}) {
  if (!node || !popover) return null;
  const nodeX = Number.parseFloat(node.style.left || "0");
  const nodeY = Number.parseFloat(node.style.top || "0");
  const nodeWidth = node.offsetWidth;
  const nodeHeight = node.offsetHeight;
  const zoomFactor = Math.max(0.7, Math.min(3.6, 1 / zoom));
  const popoverWidth = Math.min(maxWidth, Math.max(minWidth, nodeWidth * 1.45 * zoomFactor));
  const popoverHeight = Math.min(maxHeight, Math.max(minHeight, popoverWidth * 0.42));
  const editScale = Math.max(0.86, Math.min(1.55, popoverWidth / 640));

  popover.style.width = `${popoverWidth}px`;
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

  const { fileName, sourceX, sourceY, sourceWidth, sourceAspect } = getImageEditSourceMeta(sourceNode, img);
  const previewNode = createPreview({
    title: `${label}.png`,
    desc: "正在根据当前图片生成结果",
    x: sourceX + sourceWidth + 28,
    y: sourceY,
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
