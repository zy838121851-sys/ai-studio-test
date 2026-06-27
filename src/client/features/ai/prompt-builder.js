import { DEFAULT_IMAGE_MODEL } from "./model-catalog.js?v=20260627-library-bulk-select-1";

export function buildImagePrompt({ userPrompt = "", references = [], intent = "" } = {}) {
  return {
    prompt: [intent, userPrompt].filter(Boolean).join("\n"),
    references
  };
}

export function buildSuggestionPrompt(context) {
  return {
    role: "hidden_canvas_agent",
    context
  };
}

export function detectGenerationKind(prompt) {
  if (/3d|model|renderer|render|3D|mesh|stl|chair|object/i.test(prompt || "")) return "3d";
  if (/video|motion|animation|gif|shortvideo/i.test(prompt || "")) return "video";
  return "2d";
}

export function getDefaultReferencePrompt(imageCount = 0) {
  return imageCount > 0
    ? "基于已有素材的整体方向，生成与之风格一致的版本。"
    : "";
}

export function buildChatImagePayload({ model, prompt, images = [], size } = {}) {
  const payload = {
    model: String(model || "").trim() || DEFAULT_IMAGE_MODEL,
    prompt,
    images
  };
  if (size) payload.size = size;
  return payload;
}
