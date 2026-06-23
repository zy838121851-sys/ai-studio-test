import { createWorkspaceCanvasGenerationAppRuntime } from "../runtime/workspace-canvas-runtime.js";

export function createWorkspaceCanvasGenerationCompositionRuntime({
  elements,
  state,
  services,
  defaults
}) {
  return createWorkspaceCanvasGenerationAppRuntime({
    elements,
    state,
    services: {
      createGenerationPreviewNode: services.createGenerationPreviewNode,
      addNode: services.addNode,
      replacePreviewNodeWithImage: services.replacePreviewNodeWithImage,
      markGeneratedNodeContext: services.markGeneratedNodeContext,
      recordCanvasEvent: services.recordCanvasEvent,
      addSourceBadgeElement: services.addSourceBadgeElement,
      selectNode: services.selectNode,
      initModelViewerPreview: services.initModelViewerPreview,
      hideAddNodeMenu: services.hideAddNodeMenu,
      getNodeBounds: services.getNodeBounds,
      inferDirectorProductProfile: services.inferDirectorProductProfile,
      escapeHtml: services.escapeHtml,
      addChat: (...args) => services.addChat(...args),
      buildPromptGenerationNodeConfig: services.buildPromptGenerationNodeConfig,
      detectGenerationKind: services.detectGenerationKind,
      resolveUploadKind: services.resolveUploadKind,
      viewportPointToWorld: services.viewportPointToWorld,
      scheduleAICoreAgent: (...args) => {
        globalThis.scheduleAICoreAgent?.(...args);
      },
      getImageFilesFromList: services.getImageFilesFromList,
      runDirectorAction: services.runDirectorAction,
      setUploadChoiceHover: services.setUploadChoiceHover,
      syncCanvasTransform: services.syncCanvasTransform,
      registerUploadedAsset: services.registerUploadedAsset,
      registerGeneratedAsset: services.registerGeneratedAsset
    },
    defaults
  });
}
