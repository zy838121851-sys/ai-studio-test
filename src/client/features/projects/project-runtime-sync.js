export function createProjectRuntimeBootstrapConfig({
  remoteProjectsEnabled = false,
  state = {},
  ui = {},
  loadProjectsFromStorage,
  getActiveProjectId,
  setActiveProjectId,
  createProjectRuntime
} = {}) {
  return {
    loadProjectsFromStorage,
    getActiveProjectId,
    setActiveProjectId,
    createProjectRuntime,
    useStorage: !remoteProjectsEnabled,
    persistLocal: !remoteProjectsEnabled,
    onChange({ projects: nextProjects, activeProjectId: nextActiveProjectId, activeProject } = {}) {
      syncProjectRuntimeChange({
        state,
        ui,
        projects: nextProjects,
        activeProjectId: nextActiveProjectId,
        activeProject
      });
    }
  };
}

export function hydrateProjectRuntimeState({
  state = {},
  runtimeBootstrap = {}
} = {}) {
  state.setProjects?.(runtimeBootstrap.projects);
  state.setActiveProjectIdInMemory?.(runtimeBootstrap.activeProjectId);
}

export function syncProjectRuntimeChange({
  state = {},
  ui = {},
  projects = [],
  activeProjectId = "",
  activeProject = null
} = {}) {
  state.setProjects?.(projects);
  state.setActiveProjectIdInMemory?.(activeProjectId);
  ui.updateProjectTitle?.(activeProject);
  ui.renderProjectLibrary?.();
  ui.renderHomeHistory?.();
}
