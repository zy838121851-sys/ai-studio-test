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
