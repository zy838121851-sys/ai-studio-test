import { setActiveProjectId } from "./store.js";

export function createProjectWorkflowState({
  state = {},
  elements = {},
  remoteProjectsEnabled = false
} = {}) {
  return {
    get projects() { return state.getProjects?.() || []; },
    set projects(value) { state.setProjects?.(value); },
    get activeProjectId() { return state.getActiveProjectId?.() || ""; },
    set activeProjectId(value) {
      state.setActiveProjectIdInMemory?.(value);
      if (!remoteProjectsEnabled) setActiveProjectId(value);
    },
    get libraryTransitionDirection() { return state.getLibraryTransitionDirection?.() || 0; },
    set libraryTransitionDirection(value) { state.setLibraryTransitionDirection?.(value); },
    get libraryViewMode() { return state.getLibraryViewMode?.() || ""; },
    get selectedNodes() { return state.getSelectedNodes?.() || new Set(); },
    get selectedNode() { return state.getSelectedNode?.() || null; },
    set selectedNode(value) { state.setSelectedNode?.(value); },
    get body() { return elements.body || document.body; }
  };
}
