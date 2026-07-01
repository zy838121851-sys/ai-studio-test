export function getInitialAIJobStatus(result = {}) {
  if (result.imageUrl || result.videoUrl) return "running";
  const status = String(result.status || "").trim().toLowerCase();
  if (status === "succeeded") return "running";
  return status || "queued";
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

export function isValidTripoImageInput(imageUrl = "", imageDataUrl = "") {
  const cleanUrl = String(imageUrl || "").trim();
  if (/^https?:\/\//i.test(cleanUrl)) return true;
  if (/^(file_token:)?[A-Za-z0-9_-]{10,}$/i.test(cleanUrl)) return true;
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(String(imageDataUrl || "").trim());
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
