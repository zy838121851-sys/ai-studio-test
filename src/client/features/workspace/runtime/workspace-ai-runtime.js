import { createWorkspaceImageEditRuntime } from "../../ai/runtime/index.js";

export function createWorkspaceImageEditAppRuntime({
  elements = {},
  services = {}
} = {}) {
  return createWorkspaceImageEditRuntime({
    elements: {
      imageEditModel: elements.imageEditModel,
      imageEditSize: elements.imageEditSize,
      imageEditCount: elements.imageEditCount
    },
    services: {
      readImageSourceAsDataUrl: services.readImageSourceAsDataUrl,
      addGenerationPreview: services.addGenerationPreview,
      replacePreviewWithImage: services.replacePreviewWithImage,
      addSourceBadge: services.addSourceBadge,
      addChat: services.addChat,
      addThinking: services.addThinking,
      updateThinking: services.updateThinking,
      updateChat: services.updateChat,
      addChatImage: services.addChatImage
    }
  });
}
