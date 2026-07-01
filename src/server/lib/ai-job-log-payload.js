export function buildGenerationRequestLog({
  route = "/api/ai/generate",
  requestId = "",
  modelConfig = {},
  type = "image",
  task = "",
  prompt = "",
  images = [],
  size = "",
  videoOptions = {},
  inputAssetIds = [],
  quote = {},
  reservation = {}
} = {}) {
  return {
    route,
    requestId,
    provider: modelConfig.providerId || "",
    vendor: modelConfig.vendor || "",
    modelId: modelConfig.id || "",
    providerModel: modelConfig.providerModel || modelConfig.id || "",
    type,
    task,
    prompt,
    requestedSize: size || "",
    videoOptions: type === "video" ? videoOptions : undefined,
    imageCount: Array.isArray(images) ? images.length : 0,
    images: summarizeReferenceImages(images),
    inputAssetIds: Array.isArray(inputAssetIds) ? inputAssetIds.filter(Boolean) : [],
    quote: {
      totalCredits: quote.totalCredits || 0,
      unitCredits: quote.unitCredits || quote.fixedCredits || undefined
    },
    billing: {
      creditsReserved: reservation.amountCredits || 0,
      status: "reserved"
    },
    createdAt: Date.now()
  };
}

export function buildTripo3DRequestLog({
  route = "",
  requestId = "",
  modelConfig = {},
  mode = "text",
  prompt = "",
  imageUrl = "",
  imageDataUrl = "",
  imageName = "",
  imageMimeType = "",
  texture = true,
  task = "",
  quote = {},
  reservation = {}
} = {}) {
  return {
    route,
    requestId,
    provider: "tripo",
    vendor: "tripo",
    modelId: modelConfig.id || "",
    apiModel: modelConfig.apiModel || modelConfig.providerModel || "",
    type: "model3d",
    modality: "3d",
    mode,
    task,
    prompt,
    imageUrl: /^https?:\/\//i.test(String(imageUrl || "")) ? summarizePublicUrl(imageUrl) : "",
    imageInput: summarizeTripoImageInput({ imageUrl, imageDataUrl, imageName, imageMimeType }),
    texture: Boolean(texture),
    defaultParams: modelConfig.defaultParams || undefined,
    quote: {
      totalCredits: quote.totalCredits || 0,
      unitCredits: quote.unitCredits || undefined
    },
    billing: {
      creditsReserved: reservation.amountCredits || 0,
      status: "reserved"
    },
    createdAt: Date.now()
  };
}

export function buildGenerationResponseLog(result = {}, {
  modelConfig = {},
  type = "image",
  immediateOutputUrl = ""
} = {}) {
  const outputs = [
    ...(Array.isArray(result.outputs) ? result.outputs : []),
    ...(result.imageUrl ? [{ type: "image", url: result.imageUrl }] : []),
    ...(result.videoUrl ? [{ type: "video", url: result.videoUrl }] : [])
  ];
  return {
    provider: result.provider || modelConfig.providerId || "",
    model: result.model || "",
    requestedModel: result.requestedModel || modelConfig.id || "",
    resolvedModel: result.resolvedModel || "",
    providerModel: result.providerModel || result.resolvedModel || result.model || modelConfig.providerModel || "",
    remoteTaskId: result.remoteTaskId || result.taskId || "",
    status: result.status || (immediateOutputUrl ? "succeeded" : "queued"),
    type,
    referenceCount: result.referenceCount ?? undefined,
    referenceImageNormalization: result.referenceImageNormalization || undefined,
    sizeNormalization: toClientSizeNormalization(result.sizeNormalization),
    providerCalls: result.providerCalls || [],
    outputCount: outputs.length || (immediateOutputUrl ? 1 : 0),
    imageUrl: Boolean(result.imageUrl),
    videoUrl: Boolean(result.videoUrl),
    outputs: outputs.map((output) => ({
      type: output.type || type,
      mimeType: output.mimeType || "",
      url: output.url || ""
    })),
    receivedAt: Date.now()
  };
}

export function buildTripo3DResponseLog(result = {}, {
  modelConfig = {},
  mode = "text",
  chargedCredits = 0,
  status = "",
  inputType = ""
} = {}) {
  return {
    provider: "tripo",
    modelId: modelConfig.id || "",
    apiModel: modelConfig.apiModel || modelConfig.providerModel || "",
    mode,
    inputType: inputType || result.inputType || "",
    inputSummary: result.inputSummary || undefined,
    status: status || result.status || "",
    remoteTaskId: result.taskId || "",
    progress: result.progress ?? undefined,
    modelUrl: Boolean(result.modelUrl),
    localModelUrl: Boolean(result.localModelUrl),
    renderedImageUrl: Boolean(result.renderedImageUrl),
    errorCode: result.errorCode || "",
    errorMessage: result.errorMessage || "",
    raw: result.raw || undefined,
    billing: {
      creditsCharged: chargedCredits,
      status: chargedCredits > 0 ? "charged" : ""
    },
    receivedAt: Date.now()
  };
}

export function buildGenerationFailureLog(error = {}, failure = {}) {
  return {
    status: "failed",
    stage: failure.stage || "",
    failureCode: failure.failureCode || error.code || "",
    failureMessage: failure.failureMessage || error.message || "AI request failed",
    providerStatus: error.status || 500,
    providerCode: error.code || "",
    providerMessage: error.message || String(error),
    failedAt: Date.now()
  };
}

export function toClientSizeNormalization(value = null) {
  if (!value || typeof value !== "object") return undefined;
  return {
    requestedSize: value.requestedSize || "",
    normalizedSize: value.normalizedSize || "",
    providerSize: value.providerSize || "",
    providerResolution: value.providerResolution || "",
    changed: Boolean(value.changed),
    reason: value.reason || ""
  };
}

function summarizeTripoImageInput({
  imageUrl = "",
  imageDataUrl = "",
  imageName = "",
  imageMimeType = ""
} = {}) {
  const cleanUrl = String(imageUrl || "").trim();
  if (/^https?:\/\//i.test(cleanUrl)) {
    return { source: "url", value: summarizePublicUrl(cleanUrl) };
  }
  if (/^(file_token:)?[A-Za-z0-9_-]{10,}$/i.test(cleanUrl)) {
    return { source: "file_token", value: "[file_token]" };
  }
  const match = String(imageDataUrl || "").match(/^data:([^;,]+);base64,(.*)$/s);
  if (match) {
    return {
      source: "data-url",
      name: String(imageName || "").slice(0, 120),
      mimeType: imageMimeType || match[1],
      byteLength: Math.ceil((match[2]?.length || 0) * 0.75)
    };
  }
  return { source: imageUrl || imageDataUrl ? "unknown" : "" };
}

function summarizePublicUrl(url = "") {
  const text = String(url || "");
  return text.length > 180 ? `${text.slice(0, 120)}...` : text;
}

function summarizeReferenceImages(images = []) {
  return (Array.isArray(images) ? images : []).map((value, index) => {
    const text = String(value || "");
    const dataUrlMatch = text.match(/^data:([^;,]+);base64,(.*)$/s);
    if (dataUrlMatch) {
      return {
        index,
        source: "data-url",
        mimeType: dataUrlMatch[1],
        byteLength: Math.ceil((dataUrlMatch[2]?.length || 0) * 0.75)
      };
    }
    return {
      index,
      source: /^https?:\/\//i.test(text) ? "url" : "unknown",
      value: /^https?:\/\//i.test(text) ? text : Boolean(text)
    };
  });
}
