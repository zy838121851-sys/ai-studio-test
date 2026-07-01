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
