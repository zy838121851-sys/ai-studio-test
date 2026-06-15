import { createWorkspaceProjectHomeRuntime } from "../runtime/workspace-project-home-runtime.js";

export function createWorkspaceProjectHomeCompositionRuntime({
  document,
  elements,
  state,
  ui,
  chat,
  services,
  actions
}) {
  let projectHomeRuntime;
  projectHomeRuntime = createWorkspaceProjectHomeRuntime({
    document,
    state,
    elements,
    ui: {
      ...ui,
      updateProjectTitleView: () => projectHomeRuntime.updateProjectTitle?.()
    },
    chat,
    services,
    actions
  });
  return projectHomeRuntime;
}

export function createWorkspaceProjectHomeCompositionBundle({
  document,
  elements,
  state,
  canvas,
  services,
  actions
}) {
  return createWorkspaceProjectHomeCompositionRuntime({
    document,
    state: {
      getProjects: state.getProjects,
      setProjects: state.setProjects,
      getActiveProjectId: state.getActiveProjectId,
      setActiveProjectIdInMemory: state.setActiveProjectId,
      getLibraryTransitionDirection: state.getLibraryTransitionDirection,
      setLibraryTransitionDirection: state.setLibraryTransitionDirection,
      getLibraryViewMode: state.getLibraryViewMode,
      getSelectedNodes: state.getSelectedNodes,
      getSelectedNode: state.getSelectedNode,
      setSelectedNode: state.setSelectedNode,
      getHomeImageFiles: state.getHomeImageFiles,
      setHomeImageFiles: state.setHomeImageFiles
    },
    elements,
    ui: {
      applyViewState: services.applyViewState,
      addNode: (...args) => canvas.addNode(...args),
      markGeneratedNodeContext: services.markGeneratedNodeContext,
      removeNodeDeep: (...args) => canvas.canvasSelectionRuntime.removeNodeDeep(...args),
      applyTransform: (...args) => canvas.canvasSurfaceRuntime.syncCanvasTransform(...args),
      setChatCollapsed: actions.setChatCollapsed
    },
    chat: {
      setChatImageFiles: state.setChatImageFiles,
      getChatImageFiles: state.getChatImageFiles,
      renderChatImagePreview: (...args) => canvas.canvasGenerationRuntime.renderChatImagePreview(...args)
    },
    services: {
      escapeHtml: services.escapeHtml,
      waitFor: services.waitFor
    },
    actions: {
      recordCanvasEvent: actions.recordCanvasEvent
    }
  });
}
