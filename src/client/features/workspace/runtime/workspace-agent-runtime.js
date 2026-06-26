import {
  createWorkspaceAICoreControllers,
  createWorkspaceAICoreWorkspaceRuntime,
  createWorkspaceDirectorActionRuntime
} from "../../agent/runtime/index.js";

export function createWorkspaceAICoreControllerRuntime({
  elements = {},
  state = {}
} = {}) {
  return createWorkspaceAICoreControllers({
    elements: {
      aiCore: elements.aiCore,
      aiCoreHint: elements.aiCoreHint
    },
    uiState: {
      getAgentTimer: state.getAgentTimer,
      getSuggestionTimer: state.getSuggestionTimer,
      setEnabledState: state.setEnabledState
    }
  });
}

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

export function createWorkspaceAICoreWorkspaceAppRuntime({
  elements = {},
  defaults = {},
  services = {}
} = {}) {
  return createWorkspaceAICoreWorkspaceRuntime({
    elements: {
      appRoot: elements.appRoot,
      aiCore: elements.aiCore
    },
    defaults: {
      directorActions: defaults.directorActions
    },
    services: {
      setAICoreState: services.setAICoreState,
      addChat: services.addChat,
      inferDirectorProductProfile: services.inferDirectorProductProfile,
      getNodeTitle: services.getNodeTitle,
      addUploadedFiles: services.addUploadedFiles,
      readImageSourceAsDataUrl: services.readImageSourceAsDataUrl,
      readFileAsDataUrl: services.readFileAsDataUrl,
      runDirectorAction: services.runDirectorAction,
      normalizeAnalysis: services.normalizeAnalysis,
      postJsonRequest: services.postJsonRequest,
      getChatModel: services.getChatModel,
      getNodeBounds: services.getNodeBounds,
      findCanvasNodeById: services.findCanvasNodeById,
      renderStackTray: services.renderStackTray,
      escapeHtml: services.escapeHtml,
      ensureCanvasNodeId: services.ensureCanvasNodeId,
      nextCanvasNodeId: services.nextCanvasNodeId,
      positionBubbleAtAgent: services.positionBubbleAtAgent
    }
  });
}
