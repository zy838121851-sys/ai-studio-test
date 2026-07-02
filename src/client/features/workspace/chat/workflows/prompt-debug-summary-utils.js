export function summarizeDataUrl(value = "") {
  const text = String(value || "");
  if (!text.startsWith("data:")) return text;
  const [header = "data:", body = ""] = text.split(",", 2);
  return `${header}, length=${body.length}`;
}

export function summarizePrompt(value = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > 220 ? `${text.slice(0, 220)}...` : text;
}

export function summarizeFiles(files = []) {
  return {
    count: files.length,
    files: files.map((file, index) => ({
      index,
      name: file?.name || "",
      type: file?.type || "",
      size: Number(file?.size || 0)
    }))
  };
}

export function summarizeReferenceImages(attachments = []) {
  return attachments.map((item, index) => ({
    index,
    source: item.source || "",
    name: item.name || "",
    type: item.type || "",
    dataUrl: summarizeDataUrl(item.dataUrl || "")
  }));
}

export function summarizeConversationPayload(payload = {}) {
  return {
    textLength: String(payload.text || "").length,
    model: payload.model || "",
    mode: payload.mode || "",
    attachmentCount: Array.isArray(payload.attachments) ? payload.attachments.length : 0,
    attachments: summarizeReferenceImages(payload.attachments || []),
    canvasSelectedCount: Array.isArray(payload.canvasContext?.selected) ? payload.canvasContext.selected.length : 0,
    canvasNodeCount: Array.isArray(payload.canvasContext?.nodes) ? payload.canvasContext.nodes.length : 0
  };
}

export function summarizeGeneratePayload(payload = {}, generationType = "image") {
  return {
    modelId: payload.model || "",
    generationType,
    prompt: summarizePrompt(payload.prompt || ""),
    imageCount: Array.isArray(payload.images) ? payload.images.length : 0,
    images: (payload.images || []).map((item, index) => ({
      index,
      dataUrl: summarizeDataUrl(item || "")
    })),
    size: payload.size || ""
  };
}

export function summarizeGenerationResult(result = {}) {
  return {
    imageUrl: Boolean(result.imageUrl),
    imageUrls: Array.isArray(result.imageUrls) ? result.imageUrls.length : 0,
    videoUrl: Boolean(result.videoUrl),
    videoUrls: Array.isArray(result.videoUrls) ? result.videoUrls.length : 0,
    outputs: Array.isArray(result.outputs) ? result.outputs.map((item) => ({
      type: item?.type || "",
      mimeType: item?.mimeType || item?.mime_type || "",
      hasUrl: Boolean(item?.url)
    })) : [],
    jobId: result.jobId || result.job?.id || "",
    status: result.status || result.job?.status || "",
    failureCode: result.failureCode || result.errorCode || result.job?.failureCode || result.job?.errorCode || "",
    failureMessage: result.failureMessage || result.errorMessage || result.error || result.job?.failureMessage || result.job?.errorMessage || "",
    sizeNormalization: result.sizeNormalization || null,
    message: result.message || result.error || ""
  };
}
