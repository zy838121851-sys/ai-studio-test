export function resolvePromptGenerationType(videoModel = false) {
  return videoModel ? "video" : "image";
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
