import { bindCanvasViewportEvents } from "../canvas-viewport-events.js";
import { bindCanvasKeyboardShortcuts } from "../keyboard-shortcuts.js";
import { readCanvasViewState, writeCanvasViewState } from "./canvas-view-state.js";

export function createCanvasRuntimeBindingPayload(runtime = {}) {
  return {
    canvasViewport: runtime.canvasViewport,
    appRoot: runtime.appRoot,
    state: {
      getPan: () => readCanvasViewState(runtime).pan,
      getZoom: () => readCanvasViewState(runtime).zoom,
      setZoom: (value) => writeCanvasViewState(runtime, { zoom: value }),
      setPan: (value) => writeCanvasViewState(runtime, { pan: value }),
      getPanStart: () => runtime.getPanStart(),
      setPanStart: (value) => runtime.setPanStart(value),
      getIsPanning: () => runtime.getIsPanning(),
      setIsPanning: (value) => runtime.setIsPanning(value),
      getSelectionDrag: () => runtime.getSelectionDrag(),
      setSelectionDrag: (value) => runtime.setSelectionDrag(value),
      getCanvasDrawing: () => runtime.getCanvasDrawing(),
      getEraserDrag: () => runtime.getEraserDrag(),
      getUploadDragDepth: () => runtime.getUploadDragDepth(),
      setUploadDragDepth: (value) => runtime.setUploadDragDepth(value)
    },
    actions: {
      clampCanvasZoom: runtime.clampCanvasZoom,
      panForZoomAroundWorldPoint: runtime.panForZoomAroundWorldPoint,
      viewportPointToWorld: runtime.viewportPointToWorld,
      applyTransform: () => writeCanvasViewState(runtime),
      showAddNodeMenu: runtime.showAddNodeMenu,
      showCanvasContextMenu: runtime.showCanvasContextMenu,
      isPointInAICore: runtime.isPointInAICore,
      updateAICoreDragState: runtime.updateAICoreDragState,
      uploadIntoAICore: runtime.uploadIntoAICore,
      uploadAsReference: runtime.uploadAsReference,
      hideAddNodeMenu: runtime.hideAddNodeMenu,
      hideCanvasContextMenu: runtime.hideCanvasContextMenu,
      hideImageEditPopover: runtime.hideImageEditPopover,
      selectNode: runtime.selectNode,
      addCanvasToolNode: runtime.addCanvasToolNode,
      createDrawingPreview: runtime.createDrawingPreview,
      updateDrawingPreview: runtime.updateDrawingPreview,
      finishCanvasDrawing: runtime.finishCanvasDrawing,
      startEraserDrag: runtime.startEraserDrag,
      updateEraserDrag: runtime.updateEraserDrag,
      finishEraserDrag: runtime.finishEraserDrag,
      createSelectionBox: runtime.createSelectionBox,
      updateSelectionBox: runtime.updateSelectionBox,
      finishSelectionBox: runtime.finishSelectionBox,
      addNode: runtime.addNode,
      getActiveCanvasTool: () => runtime.getActiveCanvasTool(),
      getLibraryAssets: () => runtime.getLibraryAssets(),
      addChat: runtime.addChat,
      hideImageLightbox: runtime.hideImageLightbox,
      hideImageCropOverlay: runtime.hideImageCropOverlay,
      hideUploadModeBubbles: runtime.hideUploadModeBubbles,
      hideGenerationOverlay: runtime.hideGenerationOverlay,
      hideAICoreWorkspace: runtime.hideAICoreWorkspace,
      setUploadModeHover: runtime.setUploadModeHover,
      setAICoreState: runtime.setAICoreState,
      clearPendingUploadChoice: () => runtime.setPendingUploadChoice(null),
      deleteSelectedNode: runtime.deleteSelectedNode,
      undoLastCanvasAction: runtime.undoLastCanvasAction
    }
  };
}

export function bindCanvasRuntimeInfrastructure({
  canvasViewport,
  appRoot,
  state = {},
  actions
}) {
  const {
    getPan = () => state.pan,
    getZoom = () => state.zoom,
    getPanStart = () => state.panStart,
    getIsPanning = () => state.isPanning,
    getSelectionDrag = () => state.selectionDrag,
    getCanvasDrawing = () => state.canvasDrawing,
    getEraserDrag = () => state.eraserDrag,
    getUploadDragDepth = () => state.uploadDragDepth,
    setZoom,
    setPan,
    setPanStart,
    setIsPanning,
    setSelectionDrag,
    setUploadDragDepth
  } = state;

  bindCanvasViewportEvents({
    canvasViewport,
    appRoot,
    state: {
      getPan,
      getZoom,
      setZoom,
      setPan,
      getPanStart,
      setPanStart,
      getIsPanning,
      setIsPanning,
      getSelectionDrag,
      setSelectionDrag,
      getCanvasDrawing,
      getEraserDrag,
      getUploadDragDepth,
      setUploadDragDepth
    },
    actions
  });

  bindCanvasKeyboardShortcuts({
    root: document,
    stateHost: appRoot,
    actions
  });
}

export function bindCanvasInfrastructureFromRuntime(runtime) {
  const bindingPayload = createCanvasRuntimeBindingPayload(runtime);

  if (typeof runtime.bindCanvasRuntimeInfrastructure === "function") {
    runtime.bindCanvasRuntimeInfrastructure(bindingPayload);
    return;
  }

  bindCanvasRuntimeInfrastructure(bindingPayload);
}
