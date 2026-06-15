import { createWorkspaceCanvasGenerationCompositionRuntime } from "./workspace-canvas-generation-composition.js";
import { createWorkspaceCanvasInteractionCompositionRuntime } from "./workspace-canvas-interaction-composition.js";
import { createWorkspaceCanvasNodeDragCompositionRuntime } from "./workspace-canvas-node-drag-composition.js";
import { createWorkspaceCanvasOperationsCompositionRuntime } from "./workspace-canvas-operations-composition.js";
import { createWorkspaceCanvasSelectionCompositionRuntime } from "./workspace-canvas-selection-composition.js";
import { createWorkspaceCanvasSurfaceCompositionRuntime } from "./workspace-canvas-surface-composition.js";
import {
  createCanvasGenerationRuntimeInputs,
  createCanvasInteractionRuntimeInputs,
  createCanvasNodeDragRuntimeInputs,
  createCanvasOperationsRuntimeInputs,
  createCanvasSelectionRuntimeInputs,
  createCanvasSurfaceRuntimeInputs
} from "./workspace-canvas-runtime-inputs.js";

export function createWorkspaceCanvasCompositionBundle({
  document,
  elements,
  canvasWorld,
  appRoot,
  textFormatToolbar,
  state,
  defaults,
  services,
  actions
}) {
  let makeDraggable = () => {};
  let renderStackTray = () => {};
  let stackNode = () => false;
  const undoStack = [];
  const maxUndoSteps = 10;

  function recordUndoAction(action) {
    if (!action || typeof action.undo !== "function") return;
    undoStack.push(action);
    if (undoStack.length > maxUndoSteps) {
      undoStack.splice(0, undoStack.length - maxUndoSteps);
    }
  }

  function undoLastCanvasAction() {
    const action = undoStack.pop();
    if (!action) return false;
    action.undo();
    actions.recordCanvasEvent?.("undo", {
      actionType: action.type || "canvas-action"
    });
    return true;
  }

  function recordCreateNodeUndo(node) {
    if (!node) return;
    recordUndoAction({
      type: "create-node",
      undo: () => {
        if (!node.isConnected) return;
        canvasSelectionRuntime.selectNode(null);
        node.remove();
      }
    });
  }

  const canvasInteractionRuntime = createWorkspaceCanvasInteractionCompositionRuntime(createCanvasInteractionRuntimeInputs({
    elements,
    state,
    services,
    defaults,
    actions: {
      ...actions,
      recordUndoAction
    },
    getSurfaceRuntime: () => canvasSurfaceRuntime,
    getSelectionRuntime: () => canvasSelectionRuntime
  }));

  const canvasSelectionRuntime = createWorkspaceCanvasSelectionCompositionRuntime(createCanvasSelectionRuntimeInputs({
    document,
    elements,
    state,
    textFormatToolbar,
    services,
    actions: {
      ...actions,
      recordUndoAction
    },
    canvasInteractionRuntime
  }));

  const canvasSurfaceRuntime = createWorkspaceCanvasSurfaceCompositionRuntime(createCanvasSurfaceRuntimeInputs({
    elements,
    canvasWorld,
    state,
    services,
    actions: {
      ...actions,
      recordUndoAction
    },
    defaults,
    canvasInteractionRuntime,
    canvasSelectionRuntime,
    getMakeDraggable: () => makeDraggable,
    getGenerationRuntime: () => canvasGenerationRuntime
  }));

  const canvasOperationsRuntime = createWorkspaceCanvasOperationsCompositionRuntime(createCanvasOperationsRuntimeInputs({
    elements,
    canvasWorld,
    state,
    services,
    actions: {
      ...actions,
      recordUndoAction
    },
    getMakeDraggable: () => makeDraggable,
    canvasInteractionRuntime,
    canvasSelectionRuntime,
    canvasSurfaceRuntime
  }));

  const canvasGenerationRuntime = createWorkspaceCanvasGenerationCompositionRuntime(createCanvasGenerationRuntimeInputs({
    elements,
    state,
    services,
    actions,
    defaults,
    canvasInteractionRuntime,
    canvasSelectionRuntime,
    canvasSurfaceRuntime
  }));

  const canvasNodeDragRuntime = createWorkspaceCanvasNodeDragCompositionRuntime(createCanvasNodeDragRuntimeInputs({
    elements,
    canvasWorld,
    appRoot,
    state,
    services,
    actions: {
      ...actions,
      recordUndoAction
    },
    canvasInteractionRuntime,
    canvasSelectionRuntime,
    canvasSurfaceRuntime,
    canvasOperationsRuntime,
    canvasGenerationRuntime
  }));

  makeDraggable = canvasNodeDragRuntime.makeDraggable;
  renderStackTray = canvasNodeDragRuntime.renderStackTray;
  stackNode = canvasNodeDragRuntime.stackNode;

  const addCanvasToolNodeBase = canvasOperationsRuntime.addCanvasToolNode;
  canvasOperationsRuntime.addCanvasToolNode = (...args) => {
    const node = addCanvasToolNodeBase(...args);
    recordCreateNodeUndo(node);
    return node;
  };

  const finishCanvasDrawingBase = canvasOperationsRuntime.finishCanvasDrawing;
  canvasOperationsRuntime.finishCanvasDrawing = (...args) => {
    const node = finishCanvasDrawingBase(...args);
    recordCreateNodeUndo(node);
    return node;
  };

  const addNodeBase = canvasSurfaceRuntime.addNode;
  canvasSurfaceRuntime.addNode = (...args) => {
    const node = addNodeBase(...args);
    recordCreateNodeUndo(node);
    return node;
  };

  const deleteSelectedNodeBase = canvasSelectionRuntime.deleteSelectedNode;
  canvasSelectionRuntime.deleteSelectedNode = () => {
    const selectedNodes = state.getSelectedNodes?.() || new Set();
    const nodes = selectedNodes.size
      ? Array.from(selectedNodes)
      : Array.from(document.querySelectorAll(".node-card.selected"));
    if (!nodes.length) return;
    const undoEntries = nodes.map((node) => ({
      node,
      parent: node.parentNode,
      nextSibling: node.nextSibling
    }));
    deleteSelectedNodeBase();
    recordUndoAction({
      type: "delete-nodes",
      undo: () => {
        undoEntries.forEach(({ node, parent, nextSibling }) => {
          if (!parent || node.isConnected) return;
          parent.insertBefore(node, nextSibling?.isConnected ? nextSibling : null);
          node.classList.remove("eraser-marked");
        });
        const restoredNodes = undoEntries
          .map(({ node }) => node)
          .filter((node) => node.isConnected);
        if (restoredNodes.length) canvasSelectionRuntime.selectNodes(restoredNodes);
      }
    });
  };

  return {
    canvasGenerationRuntime,
    canvasInteractionRuntime,
    canvasNodeDragRuntime,
    canvasOperationsRuntime,
    canvasSelectionRuntime,
    canvasSurfaceRuntime,
    makeDraggable,
    renderStackTray,
    stackNode,
    ensureResizeHandles: canvasSurfaceRuntime.ensureResizeHandles,
    ensureNodeControls: canvasSurfaceRuntime.ensureNodeControls,
    getNodeBounds: canvasSurfaceRuntime.getNodeBounds,
    addNode: canvasSurfaceRuntime.addNode,
    applyTransform: canvasSurfaceRuntime.applyTransform,
    centerViewOnNode: canvasSurfaceRuntime.centerViewOnNode,
    returnViewToContent: canvasSurfaceRuntime.returnViewToContent,
    undoLastCanvasAction
  };
}
