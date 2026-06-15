export function createWorkspaceRuntimeWorkflows(workflows = {}) {
  const {
    getSelectionDragFromWorkflow,
    setSelectionDragFromWorkflow,
    getCanvasDrawingFromWorkflow,
    getEraserDrag,
    homeWorkflow
  } = workflows;

  return {
    getSelectionDragFromWorkflow,
    setSelectionDragFromWorkflow,
    getCanvasDrawingFromWorkflow,
    getEraserDrag,
    homeWorkflow
  };
}

export function createWorkspaceRuntimeBindings(bindings = {}) {
  const {
    bindTaskBarInteractions,
    bindHomeLibraryInteractions,
    bindCanvasMenuActions,
    bindFooterEvents,
    bindCanvasRuntimeInfrastructure,
    bindPromptSubmit,
    bindPromptShortcuts
  } = bindings;

  return {
    bindTaskBarInteractions,
    bindHomeLibraryInteractions,
    bindCanvasMenuActions,
    bindFooterEvents,
    bindCanvasRuntimeInfrastructure,
    bindPromptSubmit,
    bindPromptShortcuts
  };
}
