export function resolvePromptGenerationType(videoModel = false) {
  return videoModel ? "video" : "image";
}

export function resolvePromptAgentGenerationType(modelType = "") {
  if (isPrompt3DGeneration({ modelType })) return "3d";
  if (modelType === "video") return "video";
  return "image";
}

export function resolvePromptModelSelection({
  pendingHomeModel = "",
  selectedModel = "",
  resolveModelId = (value) => value
} = {}) {
  const requestedModel = pendingHomeModel || selectedModel;
  const model = resolveModelId(requestedModel, "chat");
  return {
    requestedModel,
    model,
    normalized: model !== requestedModel
  };
}

export function isPrompt3DGeneration({ modelType = "" } = {}) {
  return modelType === "3d";
}

export function isPromptVideoGeneration({ modelType = "", outputType = "" } = {}) {
  return modelType === "video" || outputType === "video";
}

export function buildPrompt3DGenerationRequest({
  prompt = "",
  model = "",
  reference = null
} = {}) {
  const isImageTo3D = Boolean(reference?.dataUrl);
  return {
    isImageTo3D,
    requiresReference: !isImageTo3D && model === "tripo-p1",
    taskType: isImageTo3D ? "image_to_3d" : "text_to_3d",
    endpoint: isImageTo3D ? "/api/ai/3d/image-to-model" : "/api/ai/3d/text-to-model",
    payload: isImageTo3D
      ? {
        prompt,
        modelId: model,
        imageDataUrl: reference.dataUrl,
        imageName: reference.name || "reference.png",
        imageMimeType: reference.type || "",
        texture: true
      }
      : {
        prompt,
        modelId: model,
        texture: true
      }
  };
}

export function buildPromptGenerationPayload({
  buildChatImagePayload,
  model,
  prompt,
  images,
  size
} = {}) {
  return buildChatImagePayload({
    model,
    prompt,
    images,
    size
  });
}

export function isPromptGenerationPayloadMissing(payload) {
  return !payload?.prompt && !Array.isArray(payload?.images);
}
