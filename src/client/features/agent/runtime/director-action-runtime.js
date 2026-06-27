import { createDirectorActionWorkflow } from "../workflows/director-action-workflow.js";

export function createDirectorActionRuntime({
  state = {},
  services = {}
} = {}) {
  return createDirectorActionWorkflow({
    services: {
      findCanvasNodeById: services.findCanvasNodeById,
      getNodeTitle: services.getNodeTitle,
      addNode: services.addNode,
      renderStackTray: services.renderStackTray,
      stackNode: services.stackNode,
      getNodeBounds: services.getNodeBounds,
      setChatCollapsed: services.setChatCollapsed,
      addGenerationPreview: services.addGenerationPreview,
      updateChat: services.updateChat,
      addChat: services.addChat,
      addChatImage: services.addChatImage,
      postJsonRequest: services.postJsonRequest,
      readImageSourceAsDataUrl: services.readImageSourceAsDataUrl,
      buildChatImagePayload: services.buildChatImagePayload,
      getChatModel: state.getChatModel,
      addSourceBadge: services.addSourceBadge,
      replacePreviewWithImage: services.replacePreviewWithImage,
      saveCurrentProjectAfterGeneration: services.saveCurrentProjectAfterGeneration,
      escapeHtml: services.escapeHtml
    }
  });
}
