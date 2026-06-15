import {
  createWorkspaceAICoreControllerRuntime,
  createWorkspaceAICoreWorkspaceAppRuntime,
  createWorkspaceDirectorRuntime
} from "../runtime/workspace-agent-runtime.js";

export function createWorkspaceAICoreControllerCompositionRuntime({
  elements,
  timers,
  setEnabledState
}) {
  return createWorkspaceAICoreControllerRuntime({
    elements,
    uiState: {
      getAgentTimer: timers.getAgentTimer,
      getSuggestionTimer: timers.getSuggestionTimer,
      setEnabledState
    },
  });
}

export function createWorkspaceDirectorCompositionRuntime({
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
      escapeHtml: services.escapeHtml
    }
  });
}

export function createWorkspaceAICoreWorkspaceCompositionRuntime({
  elements,
  defaults,
  services
}) {
  return createWorkspaceAICoreWorkspaceAppRuntime({
    elements,
    defaults,
    services
  });
}

export function createWorkspaceAICoreWorkspaceBundle({
  elements,
  defaults,
  canvasWorld,
  canvas,
  chatRuntime,
  actions,
  services
}) {
  return createWorkspaceAICoreWorkspaceCompositionRuntime({
    elements,
    defaults,
    services: {
      setAICoreState: actions.setAICoreState,
      addChat: chatRuntime.addChat,
      inferDirectorProductProfile: services.inferDirectorProductProfile,
      getNodeTitle: services.getNodeTitle,
      addUploadedFiles: canvas.canvasGenerationRuntime.addUploadedFiles,
      readImageSourceAsDataUrl: services.readImageSourceAsDataUrl,
      readFileAsDataUrl: services.readFileAsDataUrl,
      runDirectorAction: actions.runDirectorAction,
      normalizeAnalysis: services.normalizeAnalysis,
      postJsonRequest: services.postJsonRequest,
      getNodeBounds: canvas.getNodeBounds,
      findCanvasNodeById: (nodeId) => services.findCanvasNodeById(canvasWorld, nodeId),
      renderStackTray: canvas.renderStackTray,
      escapeHtml: services.escapeHtml,
      ensureCanvasNodeId: services.ensureCanvasNodeId,
      nextCanvasNodeId: canvas.canvasInteractionRuntime.nextCanvasNodeId,
      positionBubbleAtAgent: services.positionBubbleAtAgent
    }
  });
}
