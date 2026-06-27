import { createWorkspaceCanvasGenerationRuntime } from "../../canvas/runtime/index.js";

export function createWorkspaceCanvasGenerationAppRuntime({
  elements = {},
  state = {},
  services = {},
  defaults = {}
} = {}) {
  return createWorkspaceCanvasGenerationRuntime({
    elements: {
      appRoot: elements.appRoot,
      canvasWorld: elements.canvasWorld,
      chatImagePreview: elements.chatImagePreview,
      promptForm: elements.promptForm,
      promptInput: elements.promptInput,
      canvasViewport: elements.canvasViewport
    },
    state: {
      getNextGeneratedCount: state.getNextGeneratedCount,
      getChatImageFiles: state.getChatImageFiles,
      setChatImageFiles: state.setChatImageFiles,
      setUploadDragDepth: state.setUploadDragDepth,
      setChatDragDepth: state.setChatDragDepth,
      getZoom: state.getZoom
    },
    services: {
      createGenerationPreviewNode: services.createGenerationPreviewNode,
      addNode: services.addNode,
      replacePreviewNodeWithImage: services.replacePreviewNodeWithImage,
      replacePreviewNodeWithVideo: services.replacePreviewNodeWithVideo,
      markGeneratedNodeContext: services.markGeneratedNodeContext,
      recordCanvasEvent: services.recordCanvasEvent,
      addSourceBadgeElement: services.addSourceBadgeElement,
      selectNode: services.selectNode,
      initModelViewerPreview: services.initModelViewerPreview,
      hideAddNodeMenu: services.hideAddNodeMenu,
      getNodeBounds: services.getNodeBounds,
      inferDirectorProductProfile: services.inferDirectorProductProfile,
      escapeHtml: services.escapeHtml,
      addChat: services.addChat,
      buildPromptGenerationNodeConfig: services.buildPromptGenerationNodeConfig,
      detectGenerationKind: services.detectGenerationKind,
      resolveUploadKind: services.resolveUploadKind,
      viewportPointToWorld: services.viewportPointToWorld,
      scheduleAICoreAgent: services.scheduleAICoreAgent,
      getImageFilesFromList: services.getImageFilesFromList,
      runDirectorAction: services.runDirectorAction,
      setUploadChoiceHover: services.setUploadChoiceHover,
      syncCanvasTransform: services.syncCanvasTransform,
      registerUploadedAsset: services.registerUploadedAsset,
      registerGeneratedAsset: services.registerGeneratedAsset,
      postJsonRequest: services.postJsonRequest,
      buildChatImagePayload: services.buildChatImagePayload,
      readFileAsDataUrl: services.readFileAsDataUrl,
      readImageSourceAsDataUrl: services.readImageSourceAsDataUrl,
      saveCurrentProject: services.saveCurrentProject,
      saveCurrentProjectAfterGeneration: services.saveCurrentProjectAfterGeneration
    },
    defaults: {
      directorActions: defaults.directorActions,
      directorViewCount: defaults.directorViewCount
    }
  });
}
