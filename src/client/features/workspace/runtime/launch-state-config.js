export function createWorkspaceRuntimeStateSetters(stateSetters = {}) {
  const {
    setPan,
    setZoom,
    setPanStart,
    setIsPanning,
    setChatImageFiles,
    setUploadDragDepth,
    setChatDragDepth,
    setPendingUploadPoint,
    setLibraryWheelLock,
    setLibraryViewModeInMemory,
    setAiCoreDragState,
    setAiCoreSuppressClick
  } = stateSetters;

  return {
    setPan,
    setZoom,
    setPanStart,
    setIsPanning,
    setChatImageFiles,
    setUploadDragDepth,
    setChatDragDepth,
    setPendingUploadPoint,
    setLibraryWheelLock,
    setLibraryViewModeInMemory,
    setAiCoreDragState,
    setAiCoreSuppressClick
  };
}

export function createWorkspaceRuntimeStateSettersFromScope(scope = {}) {
  return createWorkspaceRuntimeStateSetters({
    setPan: (value) => {
      scope.pan = value;
    },
    setZoom: (value) => {
      scope.zoom = value;
    },
    setPanStart: (value) => {
      scope.panStart = value;
    },
    setIsPanning: (value) => {
      scope.isPanning = value;
    },
    setChatImageFiles: (files) => {
      scope.chatImageFiles = files;
    },
    setUploadDragDepth: (value) => {
      scope.uploadDragDepth = value;
    },
    setChatDragDepth: (value) => {
      scope.chatDragDepth = value;
    },
    setPendingUploadPoint: (point) => {
      scope.pendingUploadPoint = point;
    },
    setLibraryWheelLock: (value) => {
      scope.libraryWheelLock = value;
    },
    setLibraryViewModeInMemory: (mode) => {
      scope.libraryViewMode = mode;
    },
    setAiCoreDragState: (value) => {
      scope.aiCoreDrag = value;
    },
    setAiCoreSuppressClick: (value) => {
      scope.aiCoreSuppressClick = value;
    }
  });
}

export function createWorkspaceRuntimeState(state = {}) {
  const {
    getPan,
    getZoom,
    getPanStart,
    getIsPanning,
    getHomeImageFiles,
    getLibraryTransitionDirection,
    getLibraryViewMode,
    getActiveProjectId,
    getProjects,
    getChatImageFiles,
    getUploadDragDepth,
    getChatDragDepth,
    getPendingUploadPoint,
    getLibraryWheelLock,
    getActiveCanvasTool,
    getLibraryAssets,
    getAiCoreDragState,
    getAiCoreSuppressClick,
    getAiCoreAgentEnabled
  } = state;

  return {
    getPan,
    getZoom,
    getPanStart,
    getIsPanning,
    getHomeImageFiles,
    getLibraryTransitionDirection,
    getLibraryViewMode,
    getActiveProjectId,
    getProjects,
    getChatImageFiles,
    getUploadDragDepth,
    getChatDragDepth,
    getPendingUploadPoint,
    getLibraryWheelLock,
    getActiveCanvasTool,
    getLibraryAssets,
    getAiCoreDragState,
    getAiCoreSuppressClick,
    getAiCoreAgentEnabled
  };
}

export function createWorkspaceRuntimeStateFromScope(scope = {}) {
  return createWorkspaceRuntimeState({
    getPan: () => ({ x: scope.pan.x, y: scope.pan.y }),
    getZoom: () => scope.zoom,
    getPanStart: () => ({ x: scope.panStart.x, y: scope.panStart.y }),
    getIsPanning: () => scope.isPanning,
    getHomeImageFiles: () => scope.homeImageFiles,
    getLibraryTransitionDirection: () => scope.libraryTransitionDirection,
    getLibraryViewMode: () => scope.libraryViewMode,
    getActiveProjectId: () => scope.activeProjectId,
    getProjects: () => scope.projects,
    getChatImageFiles: () => scope.chatImageFiles,
    getUploadDragDepth: () => scope.uploadDragDepth,
    getChatDragDepth: () => scope.chatDragDepth,
    getPendingUploadPoint: () => scope.pendingUploadPoint,
    getLibraryWheelLock: () => scope.libraryWheelLock,
    getActiveCanvasTool: () => scope.activeCanvasTool,
    getLibraryAssets: () => scope.assets,
    getAiCoreDragState: () => scope.aiCoreDrag,
    getAiCoreSuppressClick: () => scope.aiCoreSuppressClick,
    getAiCoreAgentEnabled: () => scope.aiCoreAgentEnabled
  });
}
