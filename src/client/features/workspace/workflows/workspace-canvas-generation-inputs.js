export function createCanvasGenerationRuntimeInputs({
  elements,
  state,
  services,
  actions,
  defaults,
  canvasInteractionRuntime,
  canvasSelectionRuntime,
  canvasSurfaceRuntime
}) {
  return {
    elements,
    state: {
      getNextGeneratedCount: state.getNextGeneratedCount,
      getChatImageFiles: state.getChatImageFiles,
      setChatImageFiles: state.setChatImageFiles,
      setUploadDragDepth: state.setUploadDragDepth,
      setChatDragDepth: state.setChatDragDepth
    },
    services: {
      createGenerationPreviewNode: services.createGenerationPreviewNode,
      addNode: (...args) => canvasSurfaceRuntime.addNode(...args),
      replacePreviewNodeWithImage: services.replacePreviewNodeWithImage,
      markGeneratedNodeContext: services.markGeneratedNodeContext,
      recordCanvasEvent: actions.recordCanvasEvent,
      addSourceBadgeElement: services.addSourceBadgeElement,
      selectNode: canvasSelectionRuntime.selectNode,
      initModelViewerPreview: services.initModelViewerPreview,
      hideAddNodeMenu: canvasSurfaceRuntime.hideAddNodeMenu,
      getNodeBounds: canvasSurfaceRuntime.getNodeBounds,
      inferDirectorProductProfile: services.inferDirectorProductProfile,
      escapeHtml: services.escapeHtml,
      addChat: (...args) => services.addChat(...args),
      buildPromptGenerationNodeConfig: services.buildPromptGenerationNodeConfig,
      detectGenerationKind: services.detectGenerationKind,
      resolveUploadKind: services.resolveUploadKind,
      viewportPointToWorld: canvasInteractionRuntime.viewportPointToWorld,
      getImageFilesFromList: services.getImageFilesFromList,
      runDirectorAction: (...args) => actions.runDirectorAction(...args),
      setUploadChoiceHover: services.setUploadChoiceHover,
      syncCanvasTransform: canvasSurfaceRuntime.syncCanvasTransform
    },
    defaults: {
      directorActions: defaults.directorActions,
      directorViewCount: defaults.directorViewCount
    }
  };
}
