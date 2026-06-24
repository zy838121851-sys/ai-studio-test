export function buildRuntimeBootstrapStateBindings({
  getPan,
  pan,
  setPan,
  getZoom,
  zoom,
  setZoom,
  getPanStart,
  panStart,
  setPanStart,
  getIsPanning,
  isPanning,
  setIsPanning,
  homeImageFiles,
  libraryTransitionDirection,
  libraryViewMode,
  activeProjectId,
  projects,
  chatImageFiles,
  setChatImageFiles,
  uploadDragDepth,
  setUploadDragDepth,
  chatDragDepth,
  setChatDragDepth,
  setPendingUploadPoint,
  pendingUploadPoint,
  libraryWheelLock,
  setLibraryWheelLock,
  DEFAULT_CANVAS_PAN,
  setChatCollapsed,
  applyTransform,
  returnViewToContent,
  positionFloatingMenu,
  setActiveRailPanelButton,
  getSelectionDragFromWorkflow,
  setSelectionDragFromWorkflow,
  getCanvasDrawingFromWorkflow,
  getEraserDrag,
  hideImageLightbox,
  hideImageCropOverlay,
  hideUploadModeBubbles,
  hideGenerationOverlay,
  setUploadModeHover,
  setAICoreState,
  deleteSelectedNode,
  recordUndoAction,
  undoLastCanvasAction,
  redoLastCanvasAction,
  showView,
  fitWorldBoundsInViewport,
  clampCanvasZoom,
  getVisibleCanvasNodes,
  getNodeBounds
} = {}) {
  return {
    getPan,
    pan,
    setPan,
    getZoom,
    zoom,
    setZoom,
    getPanStart,
    panStart,
    setPanStart,
    getIsPanning,
    isPanning,
    setIsPanning,
    homeImageFiles,
    libraryTransitionDirection,
    libraryViewMode,
    activeProjectId,
    projects,
    chatImageFiles,
    setChatImageFiles,
    uploadDragDepth,
    setUploadDragDepth,
    chatDragDepth,
    setChatDragDepth,
    setPendingUploadPoint,
    pendingUploadPoint,
    libraryWheelLock,
    setLibraryWheelLock,
    DEFAULT_CANVAS_PAN,
    setChatCollapsed,
    applyTransform,
    returnViewToContent,
    positionFloatingMenu,
    setActiveRailPanelButton,
    getSelectionDragFromWorkflow,
    setSelectionDragFromWorkflow,
    getCanvasDrawingFromWorkflow,
    getEraserDrag,
    hideImageLightbox,
    hideImageCropOverlay,
    hideUploadModeBubbles,
    hideGenerationOverlay,
    setUploadModeHover,
    setAICoreState,
    deleteSelectedNode,
    recordUndoAction,
    undoLastCanvasAction,
    redoLastCanvasAction,
    showView,
    fitWorldBoundsInViewport,
    clampCanvasZoom,
    getVisibleCanvasNodes,
    getNodeBounds
  };
}

export function buildRuntimeBootstrapStateSetters(context = {}) {
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
  } = context;

  return {
    setPan: (value) => {
      if (typeof setPan === "function") setPan(value);
    },
    setZoom: (value) => {
      if (typeof setZoom === "function") setZoom(value);
    },
    setPanStart: (value) => {
      if (typeof setPanStart === "function") setPanStart(value);
    },
    setIsPanning: (value) => {
      if (typeof setIsPanning === "function") setIsPanning(value);
    },
    setChatImageFiles: (files) => {
      if (typeof setChatImageFiles === "function") {
        setChatImageFiles(files);
      }
    },
    setUploadDragDepth: (value) => {
      if (typeof setUploadDragDepth === "function") {
        setUploadDragDepth(value);
      }
    },
    setChatDragDepth: (value) => {
      if (typeof setChatDragDepth === "function") {
        setChatDragDepth(value);
      }
    },
    setPendingUploadPoint: (point) => {
      if (typeof setPendingUploadPoint === "function") {
        setPendingUploadPoint(point);
      }
    },
    setLibraryWheelLock: (value) => {
      if (typeof setLibraryWheelLock === "function") {
        setLibraryWheelLock(value);
      }
    },
    setLibraryViewModeInMemory: (value) => {
      if (typeof setLibraryViewModeInMemory === "function") {
        setLibraryViewModeInMemory(value);
      }
    },
    setAiCoreDragState: (value) => {
      if (typeof setAiCoreDragState === "function") {
        setAiCoreDragState(value);
      }
    },
    setAiCoreSuppressClick: (value) => {
      if (typeof setAiCoreSuppressClick === "function") {
        setAiCoreSuppressClick(value);
      }
    }
  };
}
