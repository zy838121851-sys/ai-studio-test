import { createCanvasDrawingWorkflow } from "../workflows/canvas-drawing-workflow.js";
import { createCanvasSelectionWorkflow } from "../workflows/canvas-selection-workflow.js";
import { createCanvasToolWorkflow } from "../workflows/canvas-tool-workflow.js";
import { createEraserWorkflow } from "../workflows/eraser-workflow.js";

export function createCanvasOperationsBootstrap({
  elements = {},
  state = {},
  services = {}
} = {}) {
  let resetCanvasTool = () => {};

  const drawingWorkflow = createCanvasDrawingWorkflow({
    elements: {
      canvasViewport: elements.canvasViewport,
      canvasWorld: elements.canvasWorld,
      emptyState: elements.emptyState
    },
    state: {
      getCanvasDrawing: state.getCanvasDrawing,
      setCanvasDrawing: state.setCanvasDrawing,
      isDrawingToolShapeTextTools: state.isDrawingToolShapeTextTools,
      viewportCenterPoint: state.viewportCenterPoint
    },
    services: {
      ensureCanvasNodeId: services.ensureCanvasNodeId,
      makeDraggable: services.makeDraggable,
      selectNode: services.selectNode,
      resetCanvasTool: (...args) => resetCanvasTool(...args),
      setTextNodeEditing: services.setTextNodeEditing,
      positionShapeFormatToolbar: services.positionShapeFormatToolbar,
      isFixedStrokeToolName: services.isFixedStrokeToolName,
      isLinearDrawToolName: services.isLinearDrawToolName,
      getNextCanvasNodeId: services.getNextCanvasNodeId,
      viewportPointToWorld: services.viewportPointToWorld,
      syncCanvasTransform: services.syncCanvasTransform,
      recordUndoAction: services.recordUndoAction
    }
  });

  const selectionWorkflow = createCanvasSelectionWorkflow({
    elements: {
      canvasViewport: elements.canvasViewport
    },
    state: {
      getSelectionDrag: state.getSelectionDrag,
      setSelectionDrag: state.setSelectionDrag
    },
    services: {
      createSelectionBoxElement: services.createSelectionBoxElement,
      getSelectionBoxRect: services.getSelectionBoxRect,
      getVisibleCanvasNodes: services.getVisibleCanvasNodes,
      getNodeBounds: services.getNodeBounds,
      getWorldSelectionArea: services.getWorldSelectionArea,
      selectNodes: services.selectNodes,
      viewportPointToWorld: services.viewportPointToWorld
    }
  });

  const toolWorkflow = createCanvasToolWorkflow({
    elements: {
      canvasViewport: elements.canvasViewport,
      assetUploadInput: elements.assetUploadInput
    },
    state: {
      getActiveCanvasTool: state.getActiveCanvasTool,
      setActiveCanvasTool: state.setActiveCanvasTool,
      setPendingUploadPoint: state.setPendingUploadPoint,
      setActiveRailButton: state.setActiveRailButton
    },
    services: {
      viewportCenterPoint: state.viewportCenterPoint
    }
  });
  resetCanvasTool = toolWorkflow.resetCanvasTool;

  const eraserWorkflow = createEraserWorkflow({
    elements: {
      canvasViewport: elements.canvasViewport
    },
    services: {
      buildPointsPath: services.buildPointsPath,
      getCanvasNodeScreenRect: services.getCanvasNodeScreenRect,
      clearSelection: services.clearSelection,
      removeNode: services.removeNode,
      recordCanvasEvent: services.recordCanvasEvent,
      recordUndoAction: services.recordUndoAction
    }
  });

  return {
    ...drawingWorkflow,
    ...selectionWorkflow,
    ...toolWorkflow,
    ...eraserWorkflow
  };
}
