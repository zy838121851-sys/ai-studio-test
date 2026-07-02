export function getVideoPreviewPlacement(node) {
  const x = Number.parseFloat(node?.style?.left || "0") || 0;
  const y = Number.parseFloat(node?.style?.top || "0") || 0;
  const width = Math.max(260, Math.min(640, node?.offsetWidth || 420));
  return {
    x: x + Math.max(36, Math.min(96, width * 0.18)),
    y: y + Math.max(36, Math.min(96, (node?.offsetHeight || width * 0.56) * 0.18)),
    width
  };
}

export function getPreviewNodeWidth(previewNode) {
  const frame = previewNode?.querySelector?.(".image-frame");
  return Math.max(160, frame?.offsetWidth || previewNode?.offsetWidth || 560);
}

export function createVideoPreviewNode(addGenerationPreview, node, { prompt = "", aspectRatio = "16 / 9" } = {}) {
  if (typeof addGenerationPreview !== "function") return null;
  const placement = getVideoPreviewPlacement(node);
  const previewNode = addGenerationPreview({
    title: "Generated Video.mp4",
    desc: prompt || "Generating video",
    x: placement.x,
    y: placement.y,
    width: placement.width,
    aspectRatio
  });
  if (previewNode) {
    previewNode.dataset.videoGeneratorPreview = "true";
    updatePreviewStatus(previewNode, "Waiting for video...");
  }
  return previewNode;
}

export function buildGeneratedVideoNodeOptions({
  previewNode = null,
  prompt = "",
  videoUrl = "",
  aspectRatio = "",
  sourceNode = null,
  result = {},
  model = ""
} = {}) {
  return {
    title: "Generated Video.mp4",
    desc: prompt || "Generated video",
    url: videoUrl,
    width: getPreviewNodeWidth(previewNode),
    aspectRatio,
    prompt,
    sourceNode,
    actionType: "video_generation",
    model: result.requestedModel || result.model || model
  };
}

export function replaceVideoPreviewWithResult({
  replacePreviewWithVideo = null,
  selectNode = null,
  previewNode = null,
  prompt = "",
  videoUrl = "",
  aspectRatio = "",
  sourceNode = null,
  result = {},
  model = ""
} = {}) {
  if (typeof replacePreviewWithVideo !== "function") return null;
  const createdNode = replacePreviewWithVideo(previewNode, buildGeneratedVideoNodeOptions({
    previewNode,
    prompt,
    videoUrl,
    aspectRatio,
    sourceNode,
    result,
    model
  }));
  if (!createdNode) return null;
  createdNode.dataset.videoGeneratorSourceNodeId = sourceNode?.dataset?.nodeId || "";
  selectNode?.(createdNode);
  return createdNode;
}

export function updatePreviewStatus(previewNode, text = "") {
  const statusText = previewNode?.querySelector?.(".generation-frame span");
  if (statusText && text) statusText.textContent = text;
}

export function getVideoProgressStatusText(progressValue = 0) {
  const progress = Number(progressValue || 0);
  return progress > 0
    ? `Waiting for video (${Math.min(99, progress)}%)`
    : "Waiting for video...";
}

export function markVideoPreviewFailed(previewNode, error) {
  if (!previewNode) return;
  previewNode.dataset.videoGeneratorFailed = "true";
  previewNode.classList.add("generation-failed");
  const title = previewNode.querySelector(".generation-frame strong");
  const statusText = previewNode.querySelector(".generation-frame span");
  if (title) title.textContent = "Video failed";
  if (statusText) statusText.textContent = error?.message || "Video generation failed.";
}
