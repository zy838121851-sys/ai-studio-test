export function createPromptPreviewBatch({
  addGenerationPreview,
  placement,
  generationMetrics,
  files = [],
  count = 1,
  outputType = "image"
} = {}) {
  const safeCount = Math.max(1, Math.ceil(Number(count || 1)));
  const gap = 28;
  return Array.from({ length: safeCount }, (_, index) => {
    const desc = safeCount > 1
      ? `Waiting for result ${index + 1}/${safeCount}...`
      : (outputType === "3d"
        ? "Waiting for 3D model result..."
        : outputType === "video"
        ? "Waiting for video result..."
        : generationMetrics.sourceNode
        ? "Generating from the selected image"
        : (files.length ? "Generating from reference images" : "Generating from prompt"));
    return addGenerationPreview({
      title: outputType === "3d"
        ? "Tripo 3D Model"
        : outputType === "video"
        ? "Generated Video.mp4"
        : (safeCount > 1 ? `Generated Image ${index + 1}.png` : "Generated Image.png"),
      desc,
      x: placement.x + index * ((generationMetrics.width || 320) + gap),
      y: placement.y,
      width: generationMetrics.width,
      aspectRatio: generationMetrics.aspectRatio
    });
  }).filter(Boolean);
}

export function updatePromptPreviewStatus(previewNode, text = "") {
  const statusText = previewNode?.querySelector?.(".generation-frame span");
  if (statusText && text) statusText.textContent = text;
}

export function markPromptPreviewsFailed(previewNodes = [], text = "Generation failed, please try again.") {
  const nodes = Array.isArray(previewNodes) ? previewNodes : [previewNodes];
  let updatedCount = 0;
  nodes.forEach((node) => {
    if (!node) return;
    node?.classList?.add("generation-failed");
    updatePromptPreviewStatus(node, text);
    updatedCount += 1;
  });
  return updatedCount;
}
