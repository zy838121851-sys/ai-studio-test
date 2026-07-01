import { createWorkspaceCanvasGenerationCompositionRuntime } from "./workspace-canvas-generation-composition.js";
import { createWorkspaceCanvasInteractionCompositionRuntime } from "./workspace-canvas-interaction-composition.js";
import { createWorkspaceCanvasNodeDragCompositionRuntime } from "./workspace-canvas-node-drag-composition.js";
import { createWorkspaceCanvasOperationsCompositionRuntime } from "./workspace-canvas-operations-composition.js";
import { createWorkspaceCanvasSelectionCompositionRuntime } from "./workspace-canvas-selection-composition.js";
import { createWorkspaceCanvasSurfaceCompositionRuntime } from "./workspace-canvas-surface-composition.js";
import { createCanvasGenerationRuntimeInputs } from "./workspace-canvas-generation-inputs.js";
import { createCanvasInteractionRuntimeInputs } from "./workspace-canvas-interaction-inputs.js";
import { createCanvasNodeDragRuntimeInputs } from "./workspace-canvas-node-drag-inputs.js";
import { createCanvasOperationsRuntimeInputs } from "./workspace-canvas-operations-inputs.js";
import { createCanvasSelectionRuntimeInputs } from "./workspace-canvas-selection-inputs.js";
import { createCanvasSurfaceRuntimeInputs } from "./workspace-canvas-surface-inputs.js";

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
  const redoStack = [];
  const maxUndoSteps = 10;

  function updateHistoryButtons() {
    if (elements.undoButton) elements.undoButton.disabled = !undoStack.length;
    if (elements.redoButton) elements.redoButton.disabled = !redoStack.length;
  }

  function recordUndoAction(action) {
    if (!action || typeof action.undo !== "function") return;
    undoStack.push(action);
    redoStack.length = 0;
    if (undoStack.length > maxUndoSteps) {
      undoStack.splice(0, undoStack.length - maxUndoSteps);
    }
    updateHistoryButtons();
  }

  function undoLastCanvasAction(meta = {}) {
    const action = undoStack.pop();
    if (!action) {
      updateHistoryButtons();
      return false;
    }
    action.undo();
    if (typeof action.redo === "function") redoStack.push(action);
    actions.recordCanvasEvent?.("undo", {
      ...meta,
      actionType: action.type || "canvas-action"
    });
    updateHistoryButtons();
    return true;
  }

  function redoLastCanvasAction(meta = {}) {
    const action = redoStack.pop();
    if (!action || typeof action.redo !== "function") {
      updateHistoryButtons();
      return false;
    }
    action.redo();
    undoStack.push(action);
    if (undoStack.length > maxUndoSteps) {
      undoStack.splice(0, undoStack.length - maxUndoSteps);
    }
    actions.recordCanvasEvent?.("redo", {
      ...meta,
      actionType: action.type || "canvas-action"
    });
    updateHistoryButtons();
    return true;
  }

  function restoreHistoryNodes(entries = []) {
    const restoredNodes = [];
    entries.forEach(({ node, parent, nextSibling }) => {
      if (!parent || node.isConnected) return;
      parent.insertBefore(node, nextSibling?.isConnected ? nextSibling : null);
      node.classList.remove("eraser-marked");
      restoredNodes.push(node);
    });
    if (restoredNodes.length) canvasSelectionRuntime.selectNodes(restoredNodes);
    dispatchImageGeneratorSelected(restoredNodes);
    return restoredNodes;
  }

  function detachHistoryNodes(entries = []) {
    canvasSelectionRuntime.clearSelection();
    dispatchImageGeneratorDeleted(entries.map(({ node }) => node));
    entries.forEach(({ node }) => {
      if (node?.isConnected) node.remove();
    });
  }

  function recordCreateNodeUndo(node) {
    if (!node) return;
    const entry = {
      node,
      parent: node.parentNode,
      nextSibling: node.nextSibling
    };
    recordUndoAction({
      type: "create-node",
      undo: () => {
        if (!node.isConnected) return;
        canvasSelectionRuntime.selectNode(null);
        dispatchImageGeneratorDeleted([node]);
        node.remove();
      },
      redo: () => {
        restoreHistoryNodes([entry]);
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
    dispatchImageGeneratorDeleted(nodes);
    dispatchVideoGeneratorDeleted(nodes);
    recordUndoAction({
      type: "delete-nodes",
      undo: () => {
        restoreHistoryNodes(undoEntries);
      },
      redo: () => {
        detachHistoryNodes(undoEntries);
      }
    });
  };

  updateHistoryButtons();

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
    recordUndoAction,
    undoLastCanvasAction,
    redoLastCanvasAction
  };

  function dispatchImageGeneratorDeleted(nodes = []) {
    const generatorNodes = getImageGeneratorNodes(nodes);
    if (!generatorNodes.length) return;
    document.dispatchEvent(new CustomEvent("canvas:image-generator-deleted", {
      detail: { nodes: generatorNodes }
    }));
  }

  function dispatchVideoGeneratorDeleted(nodes = []) {
    const videoNodes = Array.from(nodes || []).filter((node) => node?.matches?.(".node-video"));
    if (!videoNodes.length) return;
    document.dispatchEvent(new CustomEvent("canvas:video-generator-deleted", {
      detail: { nodes: videoNodes }
    }));
  }

  function dispatchImageGeneratorSelected(nodes = []) {
    const generatorNode = getImageGeneratorNodes(nodes).find((node) => node.isConnected);
    if (!generatorNode) return;
    document.dispatchEvent(new CustomEvent("canvas:image-generator-selected", {
      detail: { node: generatorNode }
    }));
  }

  function getImageGeneratorNodes(nodes = []) {
    return Array.from(nodes || []).filter((node) => node?.matches?.(".node-image-generator"));
  }
}
