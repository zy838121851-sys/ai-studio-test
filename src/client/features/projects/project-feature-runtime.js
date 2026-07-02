import {
  applyProjectLibraryClasses,
  renderHomeHistoryContent,
  renderProjectLibraryContent,
  showProjectSaveStatus
} from "./components/project-library.js?v=20260627-library-bulk-select-1";
import { createProjectRuntime } from "./runtime.js";
import { createProjectRuntimeBootstrap } from "./runtime-bootstrap.js";
import { createProjectWorkflowRuntime } from "./project-workflow-bootstrap.js?v=20260627-library-bulk-select-1";
import {
  createProjectWorkflowServices,
  isRemoteProjectPersistenceEnabled
} from "./project-workflow-services.js";
import {
  clearProjectsStorage,
  getActiveProjectId,
  loadProjectsFromStorage,
  setActiveProjectId
} from "./store.js";

export function createProjectFeatureRuntime({
  elements = {},
  state = {},
  ui = {},
  chat = {},
  services = {}
} = {}) {
  const remoteProjectsEnabled = isRemoteProjectPersistenceEnabled();
  if (remoteProjectsEnabled) clearProjectsStorage();

  const runtimeBootstrap = createProjectRuntimeBootstrap({
    loadProjectsFromStorage,
    getActiveProjectId,
    setActiveProjectId,
    createProjectRuntime,
    useStorage: !remoteProjectsEnabled,
    persistLocal: !remoteProjectsEnabled,
    onChange({ projects: nextProjects, activeProjectId: nextActiveProjectId, activeProject }) {
      state.setProjects?.(nextProjects);
      state.setActiveProjectIdInMemory?.(nextActiveProjectId);
      ui.updateProjectTitle?.(activeProject);
      ui.renderProjectLibrary?.();
      ui.renderHomeHistory?.();
    }
  });

  state.setProjects?.(runtimeBootstrap.projects);
  state.setActiveProjectIdInMemory?.(runtimeBootstrap.activeProjectId);

  const workflowRuntime = createProjectWorkflowRuntime({
    state: {
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
    },
    services: createProjectWorkflowServices({ remoteProjectsEnabled, services }),
    projectRuntime: runtimeBootstrap.projectRuntime,
    elements,
    ui: {
      applyProjectLibraryClasses,
      renderProjectLibraryContent,
      renderHomeHistoryContent,
      showProjectSaveStatus,
      applyViewState: ui.applyViewState,
      addNode: ui.addNode,
      markGeneratedNodeContext: ui.markGeneratedNodeContext,
      removeNodeDeep: ui.removeNodeDeep,
      applyTransform: ui.applyTransform,
      setChatCollapsed: ui.setChatCollapsed,
      updateProjectTitleView: ui.updateProjectTitleView
    },
    chat
  });

  const ready = Promise.resolve(workflowRuntime.syncRemoteProjects?.()).catch((error) => {
    console.warn("Initial project sync failed", error);
    return false;
  });
  window.addEventListener("ai-studio-auth-changed", (event) => {
    if (event.detail?.user) {
      workflowRuntime.syncRemoteProjects?.();
      return;
    }
    runtimeBootstrap.projectRuntime?.replace?.([]);
    state.setProjects?.([]);
    state.setActiveProjectIdInMemory?.("");
    workflowRuntime.renderProjectLibrary?.();
    workflowRuntime.renderHomeHistory?.();
    workflowRuntime.updateProjectTitle?.(null);
  });

  return {
    runtimeBootstrap,
    projectRuntime: runtimeBootstrap.projectRuntime,
    ready,
    ...workflowRuntime
  };
}
