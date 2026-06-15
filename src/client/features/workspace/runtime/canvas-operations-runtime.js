import { createWorkspaceCanvasOperationsRuntime } from "../../canvas/runtime/index.js";

export function createWorkspaceCanvasOperationsAppRuntime({
  elements = {},
  state = {},
  services = {}
} = {}) {
  return createWorkspaceCanvasOperationsRuntime({
    elements: {
      canvasViewport: elements.canvasViewport,
      canvasWorld: elements.canvasWorld,
      emptyState: elements.emptyState,
      assetUploadInput: elements.assetUploadInput
    },
    state: {
      getCanvasDrawing: state.getCanvasDrawing,
      setCanvasDrawing: state.setCanvasDrawing,
      isDrawingToolShapeTextTools: state.isDrawingToolShapeTextTools,
      viewportCenterPoint: state.viewportCenterPoint,
      getSelectionDrag: state.getSelectionDrag,
      setSelectionDrag: state.setSelectionDrag,
      getActiveCanvasTool: state.getActiveCanvasTool,
      setActiveCanvasTool: state.setActiveCanvasTool,
      setPendingUploadPoint: state.setPendingUploadPoint,
      setActiveRailButton: state.setActiveRailButton
    },
    services: {
      ensureCanvasNodeId: services.ensureCanvasNodeId,
      makeDraggable: services.makeDraggable,
      selectNode: services.selectNode,
      resetCanvasTool: services.resetCanvasTool,
      setTextNodeEditing: services.setTextNodeEditing,
      positionShapeFormatToolbar: services.positionShapeFormatToolbar,
      isFixedStrokeToolName: services.isFixedStrokeToolName,
      isLinearDrawToolName: services.isLinearDrawToolName,
      getNextCanvasNodeId: services.getNextCanvasNodeId,
      viewportPointToWorld: services.viewportPointToWorld,
      syncCanvasTransform: services.syncCanvasTransform,
      createSelectionBoxElement: services.createSelectionBoxElement,
      getSelectionBoxRect: services.getSelectionBoxRect,
      getVisibleCanvasNodes: services.getVisibleCanvasNodes,
      getNodeBounds: services.getNodeBounds,
      getWorldSelectionArea: services.getWorldSelectionArea,
      selectNodes: services.selectNodes,
      buildPointsPath: services.buildPointsPath,
      getCanvasNodeScreenRect: services.getCanvasNodeScreenRect,
      clearSelection: services.clearSelection,
      removeNode: services.removeNode,
      recordCanvasEvent: services.recordCanvasEvent
    }
  });
}
