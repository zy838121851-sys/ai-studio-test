export function getInitialAIJobStatus(result = {}) {
  if (result.imageUrl || result.videoUrl) return "running";
  const status = String(result.status || "").trim().toLowerCase();
  if (status === "succeeded") return "running";
  return status || "queued";
}

export function assertResolvedProviderMatchesModel({ modelConfig, result } = {}) {
  if (modelConfig?.providerId !== "volcengine") return;
  const provider = String(result?.provider || "").trim();
  const providerModel = String(result?.providerModel || result?.resolvedModel || result?.model || "").trim();
  const calls = Array.isArray(result?.providerCalls) ? result.providerCalls : [];
  const hasOnlyVolcengineCalls = calls.length > 0 && calls.every((call) => call?.provider === "volcengine");
  if (provider === "volcengine" && hasOnlyVolcengineCalls && !/^qwen-/i.test(providerModel)) return;
  const callSummary = calls
    .map((call) => `${call?.provider || "(none)"}/${call?.model || "(none)"}`)
    .join(", ") || "(no provider calls)";
  const error = new Error(`Doubao model ${modelConfig.id} resolved to an unexpected provider/model: ${provider || "(none)"} / ${providerModel || "(none)"}; calls: ${callSummary}`);
  error.status = 500;
  throw error;
}

export function hasRemoteFallbackModelOutput(assets = []) {
  return Array.from(assets || []).some((asset) => (
    asset?.type === "model3d"
    && !asset.filePath
    && /^https?:\/\//i.test(String(asset.url || ""))
  ));
}

export function isFixedQwenImageEditAction(actionType = "") {
  return new Set(["remove_background", "text_edit"]).has(String(actionType || "").trim());
}

export function getModelModality(modelConfig = {}) {
  return String(modelConfig.modality || modelConfig.type || "image").trim().toLowerCase();
}

export function assertTripo3DModelConfig({ modelId = "", modelConfig = {}, mode = "text" } = {}) {
  if (!modelConfig || getModelModality(modelConfig) !== "3d" || modelConfig.providerId !== "tripo") {
    const error = new Error(`Unsupported 3D model: ${modelId}`);
    error.status = 400;
    error.code = "UNSUPPORTED_3D_MODEL";
    throw error;
  }
  const capabilities = modelConfig.capabilities || {};
  if (mode === "text" && capabilities.textTo3D !== true) {
    const error = new Error(`${modelConfig.label || modelConfig.id} does not support text to 3D`);
    error.status = 400;
    error.code = "TEXT_TO_3D_UNSUPPORTED";
    throw error;
  }
  if (mode === "image" && capabilities.imageTo3D !== true) {
    const error = new Error(`${modelConfig.label || modelConfig.id} does not support image to 3D`);
    error.status = 400;
    error.code = "IMAGE_TO_3D_UNSUPPORTED";
    throw error;
  }
}

export function isValidTripoImageInput(imageUrl = "", imageDataUrl = "") {
  const cleanUrl = String(imageUrl || "").trim();
  if (/^https?:\/\//i.test(cleanUrl)) return true;
  if (/^(file_token:)?[A-Za-z0-9_-]{10,}$/i.test(cleanUrl)) return true;
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(String(imageDataUrl || "").trim());
}

export function assertTripo3DRequiredInput({
  mode = "text",
  prompt = "",
  imageUrl = "",
  imageDataUrl = ""
} = {}) {
  if (mode === "text" && !String(prompt || "").trim()) {
    const error = new Error("Missing prompt");
    error.status = 400;
    error.code = "PROMPT_REQUIRED";
    throw error;
  }
  if (mode === "image" && !isValidTripoImageInput(imageUrl, imageDataUrl)) {
    const error = new Error("Image-to-3D requires an http/https URL, Tripo file token, or uploaded image data.");
    error.status = 400;
    error.code = "TRIPO_IMAGE_INPUT_REQUIRED";
    throw error;
  }
}

export function getTripo3DJobMetadata(mode = "text") {
  const isImageMode = mode === "image";
  return {
    task: isImageMode ? "tripo_image_to_3d_standard" : "tripo_text_to_3d_standard",
    route: `/api/ai/3d/${isImageMode ? "image-to-model" : "text-to-model"}`
  };
}

export function getTripo3DProviderModel(modelConfig = {}, { fallbackToId = true } = {}) {
  return modelConfig.apiModel || modelConfig.providerModel || (fallbackToId ? modelConfig.id : undefined);
}

export function buildTripo3DDispatchParams({
  mode = "text",
  prompt = "",
  imageUrl = "",
  imageDataUrl = "",
  imageName = "",
  imageMimeType = "",
  apiModel,
  texture = true,
  defaultParams = {},
  requestId = ""
} = {}) {
  if (mode === "image") {
    return {
      imageUrl,
      imageDataUrl,
      imageName,
      imageMimeType,
      apiModel,
      texture,
      defaultParams,
      requestId
    };
  }
  return {
    prompt,
    apiModel,
    texture,
    defaultParams,
    requestId
  };
}

export function buildTripo3DJobRecordParams({
  requestId = "",
  userId = "",
  modelConfig = {},
  providerModel = "",
  prompt = "",
  creditsReserved = 0,
  requestData = {}
} = {}) {
  return {
    id: requestId,
    userId,
    provider: "tripo",
    vendor: "tripo",
    modelId: modelConfig.id,
    providerModel,
    remoteTaskId: "",
    type: "model3d",
    status: "queued",
    progress: 0,
    prompt: prompt || "Image to 3D",
    creditsReserved,
    requestData
  };
}

export function buildTripo3DDispatchResultParams({
  taskCreated = {},
  providerModel = "",
  responseData = {}
} = {}) {
  return {
    remoteTaskId: taskCreated.taskId,
    providerModel: taskCreated.providerModel || providerModel,
    status: taskCreated.status === "running" ? "running" : "queued",
    progress: taskCreated.status === "running" ? 10 : 0,
    responseData
  };
}

export function buildTripo3DSuccessResponse({
  taskCreated = {},
  job = {},
  creditsReserved = 0,
  creditsCharged = 0
} = {}) {
  return {
    ok: true,
    provider: "tripo",
    taskId: taskCreated.taskId,
    jobId: job.id,
    status: "queued",
    billing: {
      creditsReserved,
      creditsCharged,
      status: "charged"
    }
  };
}

export function buildTripo3DReleaseReservationParams({
  userId = "",
  reservation = {},
  modelConfig = {},
  task = "",
  error = {},
  requestId = "",
  job = {}
} = {}) {
  return {
    userId,
    amount: reservation.amountCredits,
    provider: "tripo",
    model: modelConfig.id,
    task,
    billingType: "fixed",
    reason: error?.message || "tripo_task_create_failed",
    requestId,
    aiJobId: job?.id || "",
    status: "failed"
  };
}

export function buildTripo3DFailJobParams({
  error = {},
  taskCreated = null,
  startedAt = 0,
  chargedCredits = 0,
  now = Date.now()
} = {}) {
  return {
    status: "failed",
    errorCode: error?.code || "TRIPO_TASK_CREATE_FAILED",
    errorMessage: error?.message || "Tripo task creation failed",
    responseData: {
      status: "failed",
      stage: taskCreated ? "charge" : "task_create",
      provider: "tripo",
      providerPayload: error?.providerPayload || undefined
    },
    durationMs: now - startedAt,
    refundTodo: Boolean(chargedCredits)
  };
}

export function normalizeTripo3DJobInput(body = {}, { mode = "text" } = {}) {
  const isImageMode = mode === "image";
  const imageUrl = isImageMode
    ? body?.imageUrl || body?.image_url || body?.url || body?.input
    : "";
  return {
    mode,
    prompt: String(body?.prompt || "").trim(),
    imageUrl: String(imageUrl || "").trim(),
    imageDataUrl: String(isImageMode ? body?.imageDataUrl || body?.dataUrl || body?.image || "" : "").trim(),
    imageName: String(isImageMode ? body?.imageName || body?.filename || "" : "").trim(),
    imageMimeType: String(isImageMode ? body?.imageMimeType || body?.mimeType || "" : "").trim(),
    texture: body?.texture !== false
  };
}

export function jobStatusForError(error = {}) {
  const message = String(error?.message || "");
  if (/timeout|timed out/i.test(message)) return "timeout";
  if (/save|output/i.test(message)) return "save_failed";
  return "failed";
}

export function normalizeImages(images) {
  return Array.isArray(images) ? images.filter(Boolean) : [];
}

export function validateVideoOptions(modelConfig = {}, input = {}) {
  const allowed = modelConfig.allowedOptions || {};
  const output = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (!(key in allowed)) {
      const error = new Error(`Unsupported video option: ${key}`);
      error.status = 400;
      throw error;
    }
    const allowedValues = allowed[key] || [];
    if (allowedValues.length && !allowedValues.includes(value)) {
      const error = new Error(`Unsupported ${key} for ${modelConfig.label || modelConfig.id}`);
      error.status = 400;
      throw error;
    }
    output[key] = value;
  }
  return output;
}
