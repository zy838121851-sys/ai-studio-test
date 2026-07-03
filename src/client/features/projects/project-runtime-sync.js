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
