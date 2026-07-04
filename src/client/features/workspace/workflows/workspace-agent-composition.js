import {
  createWorkspaceDirectorRuntime
} from "../runtime/workspace-agent-runtime.js";

function createWorkspaceDirectorCompositionRuntime({
  elements,
  services
}) {
  return createWorkspaceDirectorRuntime({
    elements,
    services
  });
}

export function createWorkspaceDirectorActionCompositionRuntime({
  elements,
  canvasWorld,
  canvas,
  chatRuntime,
  services
}) {
  return createWorkspaceDirectorCompositionRuntime({
    elements,
    services: {
      findCanvasNodeById: (nodeId) => services.findCanvasNodeById(canvasWorld, nodeId),
      getNodeTitle: services.getNodeTitle,
      addNode: (...args) => canvas.addNode(...args),
      renderStackTray: (...args) => canvas.renderStackTray(...args),
      stackNode: (...args) => canvas.stackNode(...args),
      getNodeBounds: canvas.getNodeBounds,
      setChatCollapsed: (...args) => chatRuntime.setChatCollapsed(...args),
      addGenerationPreview: (...args) => canvas.canvasGenerationRuntime.addGenerationPreview(...args),
      updateChat: (...args) => chatRuntime.updateChat(...args),
      addChat: (...args) => chatRuntime.addChat(...args),
      addChatImage: (...args) => chatRuntime.addChatImage(...args),
      postJsonRequest: services.postJsonRequest,
      readImageSourceAsDataUrl: services.readImageSourceAsDataUrl,
      buildChatImagePayload: services.buildChatImagePayload,
      addSourceBadge: (...args) => canvas.canvasGenerationRuntime.addSourceBadge(...args),
      replacePreviewWithImage: (...args) => canvas.canvasGenerationRuntime.replacePreviewWithImage(...args),
      saveCurrentProjectAfterGeneration: services.saveCurrentProjectAfterGeneration,
      escapeHtml: services.escapeHtml
    }
  });
}
