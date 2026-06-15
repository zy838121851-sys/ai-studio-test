import { createWorkspaceImageEditAppRuntime } from "../runtime/workspace-ai-runtime.js";

export function createWorkspaceImageEditCompositionRuntime({
  elements,
  services
}) {
  return createWorkspaceImageEditAppRuntime({
    elements,
    services
  });
}

export function createWorkspaceImageEditCompositionBundle({
  elements,
  canvas,
  chatRuntime,
  services
}) {
  return createWorkspaceImageEditCompositionRuntime({
    elements,
    services: {
      readImageSourceAsDataUrl: services.readImageSourceAsDataUrl,
      addGenerationPreview: canvas.canvasGenerationRuntime.addGenerationPreview,
      replacePreviewWithImage: canvas.canvasGenerationRuntime.replacePreviewWithImage,
      addSourceBadge: canvas.canvasGenerationRuntime.addSourceBadge,
      addChat: chatRuntime.addChat,
      addThinking: chatRuntime.addThinking,
      updateThinking: chatRuntime.updateThinking,
      updateChat: chatRuntime.updateChat,
      addChatImage: chatRuntime.addChatImage
    }
  });
}
