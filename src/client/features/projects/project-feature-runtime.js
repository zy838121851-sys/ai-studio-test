import {
  buildDemoProjects,
  makeDemoProjectThumb as makeDemoThumb
} from "./demo-projects.js";
import {
  getLibraryTransitionDirection,
  getProjectDisplayPrompt,
  getProjectDisplayTitle,
  getProjectPreview,
  wrapProjectIndex
} from "./library-state.js";
import {
  applyProjectLibraryClasses,
  renderHomeHistoryContent,
  renderProjectLibraryContent,
  showProjectSaveStatus
} from "./components/project-library.js";
import { createProjectRuntime } from "./runtime.js";
import { createProjectRuntimeBootstrap } from "./runtime-bootstrap.js";
import { createProjectSavePatch } from "./snapshot.js";
import { createProjectWorkflowRuntime } from "./project-workflow-bootstrap.js";
import {
  formatProjectDate,
  getActiveProjectId,
  hasDemoProjectsSeeded,
  loadProjectsFromStorage,
  makeProjectTitle,
  markDemoProjectsSeeded,
  saveProjectsToStorage,
  setActiveProjectId
} from "./store.js";

export function createProjectFeatureRuntime({
  elements = {},
  state = {},
  ui = {},
  chat = {},
  services = {}
} = {}) {
  const runtimeBootstrap = createProjectRuntimeBootstrap({
    loadProjectsFromStorage,
    getActiveProjectId,
    setActiveProjectId,
    createProjectRuntime,
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
        setActiveProjectId(value);
      },
      get libraryTransitionDirection() { return state.getLibraryTransitionDirection?.() || 0; },
      set libraryTransitionDirection(value) { state.setLibraryTransitionDirection?.(value); },
      get libraryViewMode() { return state.getLibraryViewMode?.() || ""; },
      get selectedNodes() { return state.getSelectedNodes?.() || new Set(); },
      get selectedNode() { return state.getSelectedNode?.() || null; },
      set selectedNode(value) { state.setSelectedNode?.(value); },
      get body() { return elements.body || document.body; }
    },
    services: {
      buildDemoProjects,
      hasDemoProjectsSeeded,
      markDemoProjectsSeeded,
      saveProjectsToStorage,
      makeProjectTitleFromPrompt: makeProjectTitle,
      createProjectSavePatch,
      getProjectDisplayPrompt,
      getProjectDisplayTitle,
      getProjectPreview,
      getLibraryTransitionDirection,
      makeDemoThumb,
      wrapProjectIndex,
      formatProjectDate,
      escapeHtml: services.escapeHtml
    },
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

  return {
    runtimeBootstrap,
    projectRuntime: runtimeBootstrap.projectRuntime,
    ...workflowRuntime
  };
}
