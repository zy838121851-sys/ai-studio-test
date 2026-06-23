import { bindCanvasMenuActions } from "../workflows/canvas-menu-actions.js";

export function createCanvasMenuRuntimePayload(runtime = {}) {
  return {
    elements: {
      imageEditPopover: runtime.imageEditPopover,
      addNodeMenu: runtime.addNodeMenu,
      canvasContextMenu: runtime.canvasContextMenu,
      canvasViewport: runtime.canvasViewport,
      assetUploadInput: runtime.assetUploadInput,
      promptInput: runtime.promptInput
    },
    state: {
      getAddMenuPoint: () => runtime.getAddMenuPoint(),
      setAddMenuPoint: (point) => runtime.setAddMenuPoint(point),
      getContextMenuPoint: () => runtime.getContextMenuPoint(),
      getContextMenuTargetNode: () => runtime.getContextMenuTargetNode?.() || null,
      setPendingUploadPoint: (point) => runtime.setPendingUploadPoint(point)
    },
    actions: {
      viewportPointToWorld: runtime.viewportPointToWorld,
      hideAddNodeMenu: runtime.hideAddNodeMenu,
      hideCanvasContextMenu: runtime.hideCanvasContextMenu,
      showAddNodeMenu: runtime.showAddNodeMenu,
      addNode: runtime.addNode,
      addChat: runtime.addChat,
      selectNode: runtime.selectNode,
      deleteSelectedNode: runtime.deleteSelectedNode,
      saveCurrentProject: runtime.saveCurrentProject,
      recordCanvasEvent: runtime.recordCanvasEvent,
      openAssetLibrary: runtime.openAssetPickerPanel || runtime.openAssetLibrary
    }
  };
}

export function bindCanvasMenuRuntime(runtime = {}) {
  const bindingPayload = createCanvasMenuRuntimePayload(runtime);

  if (typeof runtime.bindCanvasMenuActions === "function") {
    runtime.bindCanvasMenuActions(bindingPayload);
    return;
  }

  bindCanvasMenuActions(bindingPayload);
}
