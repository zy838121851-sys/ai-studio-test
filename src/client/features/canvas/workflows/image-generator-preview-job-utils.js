export function tagGeneratorPreviewJobs(previewNodes = [], payload = {}, meta = {}) {
  const jobId = String(payload?.jobId || payload?.job?.id || "").trim();
  if (!jobId) return;
  previewNodes.filter(Boolean).forEach((previewNode) => {
    applyGeneratorPreviewJobMetadata(previewNode, { jobId, payload, meta });
  });
}

export function buildGeneratorPreviewJobMeta({
  prompt = "",
  model = "",
  actionType = "image_generation",
  aspectRatio = "",
  dimensions = {}
} = {}) {
  return {
    prompt,
    model,
    actionType,
    aspectRatio,
    dimensions
  };
}

export function applyGeneratorPreviewBatchMetadata(previewNode, { count = 1, index = 0 } = {}) {
  if (!previewNode) return;
  previewNode.dataset.generatorBatchCount = String(count);
  previewNode.dataset.generatorBatchIndex = String(index + 1);
}

export function applyGeneratorPreviewDimensions(previewNode, dimensions = {}) {
  if (!previewNode) return;
  if (dimensions.width > 0) previewNode.dataset.outputWidth = String(dimensions.width);
  if (dimensions.height > 0) previewNode.dataset.outputHeight = String(dimensions.height);
}

export function updateGeneratorPreviewStatus(previewNode, text = "") {
  const statusText = previewNode?.querySelector?.(".generation-frame span");
  if (statusText && text) statusText.textContent = text;
}

export function markGeneratorPreviewFailed(previewNode, error) {
  if (!previewNode) return;
  previewNode.dataset.generatorFailed = "true";
  previewNode.classList.add("generation-failed");
  const title = previewNode.querySelector(".generation-frame strong");
  const statusText = previewNode.querySelector(".generation-frame span");
  if (title) title.textContent = "生成失败";
  if (statusText) statusText.textContent = error?.message || "生成失败，请重试";
}

export function applyGeneratorPreviewJobMetadata(previewNode, { jobId = "", payload = {}, meta = {} } = {}) {
  if (!previewNode || !jobId) return;
  previewNode.dataset.generatorJobId = jobId;
  previewNode.dataset.generatorJobStatus = payload?.status || payload?.job?.status || "queued";
  previewNode.dataset.generatorPrompt = meta.prompt || "";
  previewNode.dataset.generatorModel = meta.model || payload?.model || payload?.requestedModel || "";
  previewNode.dataset.generatorActionType = meta.actionType || "";
  previewNode.dataset.generatorAspectRatio = meta.aspectRatio || "";
  applyGeneratorPreviewDimensions(previewNode, meta.dimensions);
}

export function getPendingGeneratorPreviewGroups(root = null) {
  const previews = Array.from(root?.querySelectorAll?.(".node-loading-image[data-generator-job-id]") || [])
    .filter(isPendingGeneratorPreviewNode);
  return groupGeneratorPreviewsByJob(previews);
}

export function groupGeneratorPreviewsByJob(previews = []) {
  const groups = new Map();
  previews.forEach((previewNode) => {
    const jobId = previewNode?.dataset?.generatorJobId;
    if (!jobId) return;
    if (!groups.has(jobId)) groups.set(jobId, []);
    groups.get(jobId).push(previewNode);
  });
  return groups;
}

export function getGeneratorPreviewBatchIndex(previewNode, fallbackIndex = 0) {
  return Math.max(0, Number(previewNode?.dataset?.generatorBatchIndex || fallbackIndex + 1) - 1);
}

function isPendingGeneratorPreviewNode(previewNode) {
  return previewNode?.isConnected
    && previewNode.dataset.generatorResuming !== "true"
    && previewNode.dataset.generatorFailed !== "true";
}
