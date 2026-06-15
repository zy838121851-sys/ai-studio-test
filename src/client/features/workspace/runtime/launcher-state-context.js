export function createWorkspaceLauncherStateContext({
  state = {},
  stateSetters = {},
  constants = {},
  workflows = {},
  safeBindings = {}
} = {}) {
  const {
    safeGetHomeImageFiles,
    safeGetProjects,
    safeGetChatImageFiles
  } = safeBindings;

  return {
    pan: state.getPan?.(),
    zoom: state.getZoom?.(),
    panStart: state.getPanStart?.(),
    isPanning: state.getIsPanning?.(),
    homeImageFiles: safeGetHomeImageFiles(),
    libraryTransitionDirection: state.getLibraryTransitionDirection?.(),
    libraryViewMode: state.getLibraryViewMode?.(),
    activeProjectId: state.getActiveProjectId?.(),
    projects: safeGetProjects(),
    chatImageFiles: safeGetChatImageFiles(),
    uploadDragDepth: state.getUploadDragDepth?.(),
    chatDragDepth: state.getChatDragDepth?.(),
    pendingUploadPoint: state.getPendingUploadPoint?.(),
    libraryWheelLock: state.getLibraryWheelLock?.(),
    DEFAULT_CANVAS_PAN: constants.DEFAULT_CANVAS_PAN,
    getPan: () => state.getPan?.(),
    getZoom: () => state.getZoom?.(),
    getPanStart: () => state.getPanStart?.(),
    getIsPanning: () => state.getIsPanning?.(),
    getSelectionDrag: workflows.getSelectionDragFromWorkflow,
    getSelectionDragFromWorkflow: workflows.getSelectionDragFromWorkflow,
    setSelectionDrag: workflows.setSelectionDragFromWorkflow,
    setSelectionDragFromWorkflow: workflows.setSelectionDragFromWorkflow,
    getCanvasDrawing: workflows.getCanvasDrawingFromWorkflow,
    getCanvasDrawingFromWorkflow: workflows.getCanvasDrawingFromWorkflow,
    getEraserDrag: workflows.getEraserDrag,
    getHomeImageFiles: safeGetHomeImageFiles,
    getLibraryTransitionDirection: state.getLibraryTransitionDirection,
    getLibraryViewMode: state.getLibraryViewMode,
    getActiveProjectId: state.getActiveProjectId,
    getProjects: safeGetProjects,
    getChatImageFiles: safeGetChatImageFiles,
    getUploadDragDepth: state.getUploadDragDepth,
    getChatDragDepth: state.getChatDragDepth,
    setPendingUploadPoint: stateSetters.setPendingUploadPoint,
    getPendingUploadPoint: state.getPendingUploadPoint,
    getLibraryWheelLock: state.getLibraryWheelLock,
    getActiveCanvasTool: state.getActiveCanvasTool,
    getLibraryAssets: state.getLibraryAssets,
    aiCoreDrag: state.getAiCoreDragState?.(),
    aiCoreSuppressClick: state.getAiCoreSuppressClick?.(),
    aiCoreAgentEnabled: state.getAiCoreAgentEnabled?.()
  };
}
