import {
  createWorkspaceDirectorActionRuntime
} from "../../agent/runtime/workspace-director-action-runtime.js";

export function createWorkspaceDirectorRuntime({
  elements = {},
  services = {}
} = {}) {
  return createWorkspaceDirectorActionRuntime({
    elements: {
      chatModelSelect: elements.chatModelSelect
    },
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
      addSourceBadge: services.addSourceBadge,
      replacePreviewWithImage: services.replacePreviewWithImage,
      escapeHtml: services.escapeHtml
    }
  });
}
