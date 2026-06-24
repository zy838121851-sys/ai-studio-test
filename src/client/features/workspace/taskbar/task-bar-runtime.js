import { initTaskBar } from "./task-bar.js";

export function createTaskBarRuntimePayload(runtime = {}) {
  const setChatCollapsed = runtime.setChatCollapsed;

  return {
    root: runtime.documentRoot,
    handlers: {
      applyTransform: runtime.applyTransform,
      returnViewToContent: runtime.returnViewToContent,
      setChatCollapsed,
      newBlankProject: runtime.newBlankProject,
      saveCurrentProject: runtime.saveCurrentProject,
      showView: runtime.showView,
      commitProjectTitleEdit: runtime.commitProjectTitleEdit,
      setActiveRailPanelButton: runtime.setActiveRailPanelButton,
      jumpToCenter: () => {
        runtime.setZoom(1);
        runtime.setPan({ ...runtime.defaultPan });
        runtime.applyTransform();
      },
      fitView: () => {
        const nodes = runtime.getVisibleCanvasNodes(runtime.canvasWorld);
        const nextView = runtime.fitWorldBoundsInViewport(
          nodes.map(runtime.getNodeBounds),
          runtime.canvasViewport.getBoundingClientRect(),
          { padding: 180 }
        );
        runtime.setPan(nextView.pan);
        runtime.setZoom(nextView.zoom);
        runtime.applyTransform();
      },
      zoomByStep: (value, absolute = false) => {
        runtime.setZoom(runtime.clampCanvasZoom(absolute ? Number(value) : runtime.getZoom() + Number(value)));
        runtime.applyTransform();
      },
      undoLastCanvasAction: runtime.undoLastCanvasAction,
      redoLastCanvasAction: runtime.redoLastCanvasAction,
      positionFloatingMenu: runtime.positionFloatingMenu
    },
    elements: {
      chatFloat: runtime.chatFloat,
      collapseChat: runtime.collapseChat,
      brandMenu: runtime.brandMenu,
      projectMenu: runtime.projectMenu,
      projectTitle: runtime.projectTitle,
      jumpToCenterButton: runtime.jumpToCenterButton,
      fitViewButton: runtime.fitViewButton,
      zoomRange: runtime.zoomRange,
      zoomOutButton: runtime.zoomOutButton,
      zoomInButton: runtime.zoomInButton,
      returnToContentButton: runtime.returnToContentButton,
      undoButton: runtime.undoButton,
      redoButton: runtime.redoButton,
      promptInput: runtime.promptInput,
      promptForm: runtime.promptForm,
      chatModelSelect: runtime.chatModelSelect,
      floatingLibrary: runtime.floatingLibrary,
      closeLibraryButton: runtime.closeLibraryButton
    },
    state: {
      bindPromptSubmit: false,
      bindPromptPresets: false
    }
  };
}

export function bindTaskBarRuntime(runtime = {}) {
  const bindingPayload = createTaskBarRuntimePayload(runtime);

  if (typeof runtime.bindTaskBarInteractions === "function") {
    runtime.bindTaskBarInteractions(bindingPayload);
    return;
  }

  initTaskBar(bindingPayload);
}
