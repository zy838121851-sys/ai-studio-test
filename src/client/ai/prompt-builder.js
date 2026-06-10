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
  if (/3d|三维|模型|立体|空间|展台/i.test(prompt)) return "3d";
  if (/视频|分镜|镜头|动效|动画|首帧|音频/i.test(prompt)) return "video";
  return "2d";
}

export function getDefaultReferencePrompt(imageCount = 0) {
  return imageCount > 0 ? "参考上传图片生成一张高质量视觉方案" : "";
}

export function buildChatImagePayload({ model, prompt, images = [] } = {}) {
  return {
    model,
    prompt,
    images
  };
}
