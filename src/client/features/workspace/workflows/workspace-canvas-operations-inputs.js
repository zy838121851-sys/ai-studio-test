export function createCanvasOperationsRuntimeInputs({
  elements,
  canvasWorld,
  state,
  services,
  actions,
  getMakeDraggable,
  canvasInteractionRuntime,
  canvasSelectionRuntime,
  canvasSurfaceRuntime
}) {
  return {
    elements,
    state: {
      getCanvasDrawing: state.getCanvasDrawing,
      setCanvasDrawing: state.setCanvasDrawing,
      isDrawingToolShapeTextTools: services.getShapeTextTools,
      viewportCenterPoint: canvasInteractionRuntime.viewportCenterPoint,
      getSelectionDrag: state.getSelectionDrag,
      setSelectionDrag: state.setSelectionDrag,
      getActiveCanvasTool: state.getActiveCanvasTool,
      setActiveCanvasTool: state.setActiveCanvasTool,
      setPendingUploadPoint: state.setPendingUploadPoint,
      setActiveRailButton: services.setActiveRailButton
    },
    services: {
      ensureCanvasNodeId: services.ensureCanvasNodeId,
      makeDraggable: (...args) => getMakeDraggable()(...args),
      selectNode: (...args) => canvasSelectionRuntime.selectNode(...args),
      setTextNodeEditing: (...args) => canvasInteractionRuntime.setTextNodeEditing(...args),
      positionShapeFormatToolbar: canvasInteractionRuntime.positionShapeFormatToolbar,
      isFixedStrokeToolName: services.isFixedStrokeToolName,
      isLinearDrawToolName: services.isLinearDrawToolName,
      getNextCanvasNodeId: (...args) => canvasInteractionRuntime.nextCanvasNodeId(...args),
      viewportPointToWorld: canvasInteractionRuntime.viewportPointToWorld,
      syncCanvasTransform: canvasSurfaceRuntime.syncCanvasTransform,
      createSelectionBoxElement: services.createSelectionBoxElement,
      getSelectionBoxRect: services.getSelectionBoxRect,
      getVisibleCanvasNodes: () => services.getVisibleCanvasNodes(canvasWorld),
      getNodeBounds: canvasSurfaceRuntime.getNodeBounds,
      getWorldSelectionArea: services.getWorldSelectionArea,
      selectNodes: canvasSelectionRuntime.selectNodes,
      buildPointsPath: services.buildPointsPath,
      getCanvasNodeScreenRect: canvasInteractionRuntime.getCanvasNodeScreenRect,
      clearSelection: canvasSelectionRuntime.clearSelection,
      removeNode: canvasSelectionRuntime.removeNodeDeep,
      recordCanvasEvent: actions.recordCanvasEvent,
      recordUndoAction: actions.recordUndoAction
    }
  };
}
