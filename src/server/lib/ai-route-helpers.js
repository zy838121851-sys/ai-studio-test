export function getInitialAIJobStatus(result = {}) {
  if (result.imageUrl || result.videoUrl) return "running";
  const status = String(result.status || "").trim().toLowerCase();
  if (status === "succeeded") return "running";
  return status || "queued";
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
