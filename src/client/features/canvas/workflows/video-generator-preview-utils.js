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

export function updatePreviewStatus(previewNode, text = "") {
  const statusText = previewNode?.querySelector?.(".generation-frame span");
  if (statusText && text) statusText.textContent = text;
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
