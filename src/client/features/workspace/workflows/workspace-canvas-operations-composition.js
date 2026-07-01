import { createWorkspaceCanvasOperationsAppRuntime } from "../runtime/canvas-operations-runtime.js";

export function createWorkspaceCanvasOperationsCompositionRuntime({
  elements,
  state,
  services
}) {
  let canvasOperationsRuntime;
  canvasOperationsRuntime = createWorkspaceCanvasOperationsAppRuntime({
    elements,
    state,
    services: {
      ensureCanvasNodeId: services.ensureCanvasNodeId,
      makeDraggable: (...args) => services.makeDraggable(...args),
      selectNode: (...args) => services.selectNode(...args),
      resetCanvasTool: (...args) => canvasOperationsRuntime.resetCanvasTool(...args),
      setTextNodeEditing: (...args) => services.setTextNodeEditing(...args),
      positionShapeFormatToolbar: services.positionShapeFormatToolbar,
      isFixedStrokeToolName: services.isFixedStrokeToolName,
      isLinearDrawToolName: services.isLinearDrawToolName,
      getNextCanvasNodeId: (...args) => services.getNextCanvasNodeId(...args),
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
      recordCanvasEvent: services.recordCanvasEvent,
      recordUndoAction: services.recordUndoAction
    }
  });
  return canvasOperationsRuntime;
}
