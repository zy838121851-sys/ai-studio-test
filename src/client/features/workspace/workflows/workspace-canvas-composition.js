import { createWorkspaceCanvasOperationsCompositionRuntime } from "./workspace-canvas-operations-composition.js";
import { createWorkspaceCanvasGenerationAppRuntime } from "../runtime/canvas-generation-runtime.js";
import { createWorkspaceCanvasInteractionAppRuntime } from "../runtime/canvas-interaction-runtime.js";
import { createWorkspaceCanvasNodeDragAppRuntime } from "../runtime/canvas-node-drag-runtime.js";
import { createWorkspaceCanvasSelectionAppRuntime } from "../runtime/canvas-selection-runtime.js";
import { createWorkspaceCanvasSurfaceAppRuntime } from "../runtime/canvas-surface-runtime.js";
import { createCanvasGenerationRuntimeInputs } from "./workspace-canvas-generation-inputs.js";
import { createCanvasInteractionRuntimeInputs } from "./workspace-canvas-interaction-inputs.js";
import { createCanvasNodeDragRuntimeInputs } from "./workspace-canvas-node-drag-inputs.js";
import { createCanvasOperationsRuntimeInputs } from "./workspace-canvas-operations-inputs.js";
import { createCanvasSelectionRuntimeInputs } from "./workspace-canvas-selection-inputs.js";
import { createCanvasSurfaceRuntimeInputs } from "./workspace-canvas-surface-inputs.js";

function createWorkspaceCanvasGenerationCompositionRuntime({
  elements,
  state,
  services,
  defaults
}) {
  return createWorkspaceCanvasGenerationAppRuntime({
    elements,
    state,
    services: {
      createGenerationPreviewNode: services.createGenerationPreviewNode,
      addNode: services.addNode,
      replacePreviewNodeWithImage: services.replacePreviewNodeWithImage,
      replacePreviewNodeWithModel: services.replacePreviewNodeWithModel,
      replacePreviewNodeWithVideo: services.replacePreviewNodeWithVideo,
      markGeneratedNodeContext: services.markGeneratedNodeContext,
      recordCanvasEvent: services.recordCanvasEvent,
      addSourceBadgeElement: services.addSourceBadgeElement,
      selectNode: services.selectNode,
      initModelViewerPreview: services.initModelViewerPreview,
      hideAddNodeMenu: services.hideAddNodeMenu,
      getNodeBounds: services.getNodeBounds,
      inferDirectorProductProfile: services.inferDirectorProductProfile,
      escapeHtml: services.escapeHtml,
      addChat: (...args) => services.addChat(...args),
      buildPromptGenerationNodeConfig: services.buildPromptGenerationNodeConfig,
      detectGenerationKind: services.detectGenerationKind,
      resolveUploadKind: services.resolveUploadKind,
      viewportPointToWorld: services.viewportPointToWorld,
      scheduleAICoreAgent: (...args) => {
        globalThis.scheduleAICoreAgent?.(...args);
      },
      getImageFilesFromList: services.getImageFilesFromList,
      runDirectorAction: services.runDirectorAction,
      setUploadChoiceHover: services.setUploadChoiceHover,
      syncCanvasTransform: services.syncCanvasTransform,
      registerUploadedAsset: services.registerUploadedAsset,
      registerGeneratedAsset: services.registerGeneratedAsset,
      postJsonRequest: services.postJsonRequest,
      buildChatImagePayload: services.buildChatImagePayload,
      readFileAsDataUrl: services.readFileAsDataUrl,
      readImageSourceAsDataUrl: services.readImageSourceAsDataUrl,
      saveCurrentProject: services.saveCurrentProject,
      saveCurrentProjectAfterGeneration: services.saveCurrentProjectAfterGeneration
    },
    defaults
  });
}

function createWorkspaceCanvasNodeDragCompositionRuntime({
  elements,
  state,
  services
}) {
  return createWorkspaceCanvasNodeDragAppRuntime({
    elements,
    state,
    services: {
      stopNativeDrag: services.stopNativeDrag,
      ensureResizeHandles: services.ensureResizeHandles,
      ensureNodeControls: services.ensureNodeControls,
      selectNode: services.selectNode,
      hideAddNodeMenu: services.hideAddNodeMenu,
      hideShapeToolbar: services.hideShapeToolbar,
      hideTextToolbar: services.hideTextToolbar,
      hasShapeNodeInSet: services.hasShapeNodeInSet,
      hasTextNodeInSet: services.hasTextNodeInSet,
      getNodeBounds: services.getNodeBounds,
      getVisibleCanvasNodes: services.getVisibleCanvasNodes,
      positionTextFormatToolbar: services.positionTextFormatToolbar,
      positionShapeFormatToolbar: services.positionShapeFormatToolbar,
      positionDirectorCard: services.positionDirectorCard,
      positionCanvasSuggestionBubble: services.positionCanvasSuggestionBubble,
      positionAgentBubble: services.positionAgentBubble,
      isEditingImageNode: services.isEditingImageNode,
      isTextEditingImageNode: services.isTextEditingImageNode,
      isImageEditPopoverOpen: services.isImageEditPopoverOpen,
      isImageTextPanelOpen: services.isImageTextPanelOpen,
      positionImageEditPopover: services.positionImageEditPopover,
      positionImageTextPanel: services.positionImageTextPanel,
      setAICoreState: services.setAICoreState,
      updateAICoreDragState: services.updateAICoreDragState,
      setAICoreAwakeClass: services.setAICoreAwakeClass,
      getNextCanvasNodeId: services.getNextCanvasNodeId,
      ensureCanvasNodeId: services.ensureCanvasNodeId,
      getNodeThumbnail: services.getNodeThumbnail,
      getNodeTitle: services.getNodeTitle,
      escapeHtmlText: services.escapeHtmlText,
      setTextNodeEditing: services.setTextNodeEditing,
      findCanvasNodeById: services.findCanvasNodeById,
      recordUndoAction: services.recordUndoAction
    }
  });
}

function createWorkspaceCanvasInteractionCompositionRuntime({
  elements,
  state,
  services,
  defaults
}) {
  return createWorkspaceCanvasInteractionAppRuntime({
    elements,
    state,
    services: {
      createImageTextPanel: services.createImageTextPanel,
      getImageTextEdits: services.getImageTextEdits,
      renderImageTextInputs: services.renderImageTextInputs,
      positionImageTextPanelElement: services.positionImageTextPanelElement,
      readImageSourceAsDataUrl: services.readImageSourceAsDataUrl,
      postJsonRequest: services.postJsonRequest,
      runImageEditCommand: services.runImageEditCommand,
      getImageEditModel: services.getImageEditModel,
      buildImageTextEditPrompt: services.buildImageTextEditPrompt,
      hideCanvasContextMenu: (...args) => services.hideCanvasContextMenu(...args),
      hideAddNodeMenu: (...args) => services.hideAddNodeMenu(...args),
      selectNode: (...args) => services.selectNode(...args),
      positionImageEditPopoverElement: services.positionImageEditPopoverElement,
      showViewportMenu: (...args) => services.showViewportMenu(...args),
      isFixedStrokeToolName: services.isFixedStrokeToolName,
      isLinearDrawToolName: services.isLinearDrawToolName,
      getTextEditorFromNode: services.getTextEditorFromNode,
      setTextNodeEditingState: services.setTextNodeEditingState,
      focusTextEditorAtEnd: services.focusTextEditorAtEnd,
      hideTextToolbar: services.hideTextToolbar,
      positionTextToolbar: services.positionTextToolbar,
      applyTextEditorStyle: services.applyTextEditorStyle,
      recordUndoAction: services.recordUndoAction
    },
    defaults
  });
}

function createWorkspaceCanvasSelectionCompositionRuntime({
  document,
  elements,
  state,
  toolbars,
  services,
  actions
}) {
  return createWorkspaceCanvasSelectionAppRuntime({
    document,
    elements,
    state,
    services: {
      hideTextToolbar: () => services.hideTextToolbar(toolbars.textFormatToolbar),
      hideShapeToolbar: services.hideShapeToolbar,
      getTextFormatToolbar: () => toolbars.textFormatToolbar,
      positionTextFormatToolbar: services.positionTextFormatToolbar,
      positionShapeFormatToolbar: services.positionShapeFormatToolbar,
      recordCanvasEvent: actions.recordCanvasEvent,
      scheduleAICoreAgent: (...args) => {
        globalThis.scheduleAICoreAgent?.(...args);
      },
      clearSelectedNodeElements: services.clearSelectedNodeElements,
      addSelectedNodeElement: services.addSelectedNodeElement,
      replaceSelectedNodeElements: services.replaceSelectedNodeElements,
      getSelectedNodeDeletePayload: services.getSelectedNodeDeletePayload,
      recordUndoAction: actions.recordUndoAction,
      removeCanvasNodeDeep: services.removeCanvasNodeDeep
    }
  });
}

function createWorkspaceCanvasSurfaceCompositionRuntime({
  elements,
  state,
  services,
  defaults
}) {
  return createWorkspaceCanvasSurfaceAppRuntime({
    elements,
    state,
    services: {
      attachDragBlocker: (node) => {
        if (!node) return;
        node.addEventListener("dragstart", (event) => event.preventDefault());
      },
      centerViewOnNode: (...args) => services.centerViewOnNode(...args),
      hideImageEditPopover: services.hideImageEditPopover,
      selectNode: (...args) => services.selectNode(...args),
      recordUndoAction: services.recordUndoAction,
      ensureImageLightbox: () => services.ensureImageLightbox({
        onClose: services.hideImageLightboxElement,
      }),
      hideImageLightbox: services.hideImageLightboxElement,
      showImageLightboxElement: services.showImageLightboxElement,
      getNodeTitle: services.getNodeTitle,
      positionTextFormatToolbar: (...args) => services.positionTextFormatToolbar(...args),
      runImageEditCommand: (...args) => services.runImageEditCommand(...args),
      registerImageAsset: (...args) => services.registerImageAsset?.(...args),
      removeImageAsset: (...args) => services.removeImageAsset?.(...args),
      getAssetCollections: (...args) => services.getAssetCollections?.(...args),
      createAssetCollection: (...args) => services.createAssetCollection?.(...args),
      showImageTextEditor: (...args) => services.showImageTextEditor(...args),
      isEditingImageNode: (...args) => services.isEditingImageNode(...args),
      isImageEditPopoverOpen: (...args) => services.isImageEditPopoverOpen(...args),
      getRenderNodeTemplate: () => services.renderNodeTemplate,
      createWorkspaceNode: services.createWorkspaceNode,
      getNextCanvasNodeId: () => services.nextCanvasNodeId,
      ensureCanvasNodeId: services.ensureCanvasNodeId,
      getMakeDraggable: () => services.getMakeDraggable(),
      getSelectNode: () => services.selectNode,
      getInitModelViewer: () => services.initModelViewer,
      getIsEditingImageNode: () => services.isEditingImageNode,
      getIsImageEditPopoverOpen: () => services.isImageEditPopoverOpen,
      getPositionImageEditPopover: () => services.positionImageEditPopover,
      getShowImageEditPopover: () => services.showImageEditPopover,
      getElementWorldBounds: services.getElementWorldBounds,
      isImageTextPanelOpen: () => services.isImageTextPanelOpen(),
      positionImageEditPopover: services.positionImageEditPopover,
      positionTextPanel: services.positionImageTextPanel,
      positionShapeFormatToolbar: services.positionShapeFormatToolbar,
      positionAgentBubble: services.positionAgentBubble,
      syncZoomControls: services.syncZoomControls,
      getCanvasTransformStyle: services.getCanvasTransformStyle,
      clampCanvasZoom: services.clampCanvasZoom,
      centerPanOnWorldPoint: services.centerPanOnWorldPoint,
      fitWorldBoundsInViewport: services.fitWorldBoundsInViewport
    },
    defaults
  });
}

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
