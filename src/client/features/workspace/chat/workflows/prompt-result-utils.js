export function getResultImageUrls(result = {}) {
  const urls = [];
  if (Array.isArray(result?.imageUrls)) urls.push(...result.imageUrls);
  if (Array.isArray(result?.outputs)) {
    result.outputs.forEach((output) => {
      if (output?.type === "image" && output.url) urls.push(output.url);
    });
  }
  if (result?.imageUrl) urls.unshift(result.imageUrl);
  return Array.from(new Set(urls.filter(Boolean)));
}

export function getResultVideoUrls(result = {}) {
  const urls = [];
  if (Array.isArray(result?.videoUrls)) urls.push(...result.videoUrls);
  if (Array.isArray(result?.outputs)) {
    result.outputs.forEach((output) => {
      const type = String(output?.type || "").toLowerCase();
      const mimeType = String(output?.mimeType || output?.mime_type || "").toLowerCase();
      if (output?.url && (type === "video" || mimeType.startsWith("video/"))) {
        urls.push(output.url);
      }
    });
  }
  if (result?.videoUrl) urls.unshift(result.videoUrl);
  return Array.from(new Set(urls.filter(Boolean)));
}

export function getResultUrls(result = {}) {
  return Array.from(new Set([
    ...getResultImageUrls(result),
    ...getResultVideoUrls(result)
  ]));
}

export function isMidjourneyModel(model = "") {
  return String(model || "").trim().toLowerCase() === "midjourney";
}

export function resolvePromptPreviewCount({ model = "", videoModel = false, midjourneyCount = 4 } = {}) {
  return videoModel ? 1 : (isMidjourneyModel(model) ? midjourneyCount : 1);
}

export function buildGeneratedProjectPatch({
  project = null,
  prompt = "",
  generationPrompt = "",
  thumbnail = "",
  itemCountIncrement = 1,
  makeProjectTitle = null
} = {}) {
  const titlePrompt = prompt || generationPrompt;
  return {
    title: project?.title || (typeof makeProjectTitle === "function" ? makeProjectTitle(titlePrompt) : titlePrompt),
    prompt: generationPrompt,
    thumbnail,
    itemCount: (project?.itemCount || 0) + itemCountIncrement
  };
}

export function buildGeneratedMediaProjectPatch({
  project = null,
  prompt = "",
  generationPrompt = "",
  urls = [],
  makeProjectTitle = null
} = {}) {
  const resultUrls = Array.isArray(urls) ? urls : [];
  return buildGeneratedProjectPatch({
    project,
    prompt,
    generationPrompt,
    thumbnail: resultUrls[0],
    itemCountIncrement: resultUrls.length,
    makeProjectTitle
  });
}

export function buildGeneratedModelProjectPatch({
  project = null,
  titlePrompt = "",
  storedPrompt = "",
  thumbnail = "",
  itemCountIncrement = 1,
  makeProjectTitle = null,
  fallbackTitle = ""
} = {}) {
  const title = project?.title
    || (typeof makeProjectTitle === "function" ? makeProjectTitle(titlePrompt) : titlePrompt)
    || fallbackTitle;
  return {
    title,
    prompt: storedPrompt,
    thumbnail,
    itemCount: (project?.itemCount || 0) + itemCountIncrement
  };
}

export function buildGeneratedModelNodeOptions({
  url = "",
  previewWidth = 0,
  generationPrompt = "",
  sourceNode = null,
  actionType = "text_to_3d",
  model = "",
  desc = "Generated 3D model from your prompt."
} = {}) {
  return {
    title: "Tripo 3D Model",
    desc,
    url,
    width: previewWidth || 360,
    aspectRatio: "1 / 1",
    prompt: generationPrompt,
    sourceNode,
    actionType,
    model
  };
}

export function buildGeneratedVideoNodeOptions({
  url = "",
  previewWidth = 0,
  generationMetrics = {},
  generationPrompt = "",
  model = ""
} = {}) {
  return {
    title: "Generated Video.mp4",
    desc: "Generated video from your prompt.",
    url,
    width: previewWidth || generationMetrics.width,
    aspectRatio: generationMetrics.aspectRatio || "",
    prompt: generationPrompt,
    actionType: "video_generation",
    model
  };
}

export function createPromptGeneratedVideoNode({
  replacePreviewWithVideo = null,
  previewNode = null,
  url = "",
  generationMetrics = {},
  generationPrompt = "",
  model = ""
} = {}) {
  if (typeof replacePreviewWithVideo !== "function") {
    throw new Error("Video preview workflow is unavailable.");
  }
  return replacePreviewWithVideo(previewNode, buildGeneratedVideoNodeOptions({
    url,
    previewWidth: previewNode?.offsetWidth,
    generationMetrics,
    generationPrompt,
    model
  }));
}

export function buildGeneratedImageNodeOptions({
  url = "",
  index = 0,
  total = 1,
  previewWidth = 0,
  generationMetrics = {},
  generationPrompt = "",
  actionType = "",
  model = ""
} = {}) {
  return {
    title: total > 1 ? `Generated Image ${index + 1}.png` : "Generated Image.png",
    desc: "Generated image from your prompt.",
    url,
    width: previewWidth || generationMetrics.width,
    aspectRatio: generationMetrics.aspectRatio || "",
    prompt: generationPrompt,
    actionType,
    model
  };
}

export function createPromptGeneratedImageNodes({
  replacePreviewWithImage = null,
  previewNodes = [],
  imageUrls = [],
  generationMetrics = {},
  generationPrompt = "",
  detectGenerationKind = () => "",
  model = ""
} = {}) {
  return imageUrls
    .map((imageUrl, index) => {
      const previewNode = previewNodes[index] || previewNodes[0];
      return replacePreviewWithImage(previewNode, buildGeneratedImageNodeOptions({
        url: imageUrl,
        index,
        total: imageUrls.length,
        previewWidth: previewNode?.offsetWidth,
        generationMetrics,
        generationPrompt,
        actionType: detectGenerationKind(generationPrompt),
        model
      }));
    })
    .filter(Boolean);
}
