import {
  getGeneratorResultTitle,
  getMissingGeneratorResultMessage
} from "./image-generator-result-utils.js";
import {
  getGeneratorPreviewNodeWidth,
  getRecoveredGeneratorPreviewReplacementMeta
} from "./image-generator-preview-job-utils.js";

export function replaceGeneratorImagePreviewNode(previewNode, {
  replacePreviewWithImage,
  getPreviewNodeWidth,
  title = "Image Generator Result.png",
  desc = "Image generator result",
  url = "",
  aspectRatio = "",
  prompt = "",
  actionType = "",
  model = ""
} = {}) {
  return replacePreviewWithImage(previewNode, {
    title,
    desc,
    url,
    width: getPreviewNodeWidth(previewNode),
    aspectRatio,
    prompt,
    sourceNode: null,
    actionType,
    model
  });
}

export function buildGeneratorImagePreviewReplacementOptions({
  replacePreviewWithImage,
  getPreviewNodeWidth,
  title = "Image Generator Result.png",
  desc = "Image generator result",
  url = "",
  aspectRatio = "",
  prompt = "",
  actionType = "",
  model = ""
} = {}) {
  return {
    replacePreviewWithImage,
    getPreviewNodeWidth,
    title,
    desc,
    url,
    aspectRatio,
    prompt,
    actionType,
    model
  };
}

export function buildGeneratorVideoPreviewReplacementOptions(previewNode, {
  getPreviewNodeWidth,
  title = "Generated Video.mp4",
  desc = "Image generator video result",
  url = "",
  aspectRatio = "",
  prompt = "",
  actionType = "video_generation",
  model = ""
} = {}) {
  return {
    title,
    desc,
    url,
    width: getPreviewNodeWidth(previewNode),
    aspectRatio,
    prompt,
    sourceNode: null,
    actionType,
    model
  };
}

export function ensureGeneratorPreviewReplacement(createdNode) {
  if (!createdNode) throw new Error("Unable to replace generation preview");
  return createdNode;
}

export function replaceRecoveredGeneratorPreview(previewNode, {
  jobId = "",
  result = {},
  url = "",
  index = 0,
  count = 1,
  replacePreviewWithImage = null
} = {}) {
  if (!previewNode?.isConnected) return null;
  if (!url) throw new Error(getMissingGeneratorResultMessage(result));
  const meta = getRecoveredGeneratorPreviewReplacementMeta(previewNode, { result, index });
  const createdNode = ensureGeneratorPreviewReplacement(replaceGeneratorImagePreviewNode(previewNode, buildGeneratorImagePreviewReplacementOptions({
    replacePreviewWithImage,
    getPreviewNodeWidth: getGeneratorPreviewNodeWidth,
    title: getGeneratorResultTitle(meta.batchIndex, count),
    desc: meta.desc,
    url,
    aspectRatio: meta.aspectRatio,
    prompt: meta.prompt,
    actionType: meta.actionType,
    model: meta.model
  })));
  createdNode.dataset.generatorJobId = jobId;
  return createdNode;
}
