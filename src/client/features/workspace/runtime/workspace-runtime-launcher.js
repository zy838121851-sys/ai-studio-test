import { launchAppRuntimeFromState } from "./app-runtime-bootstrap.js?v=20260628-boot-inline-1";
import { createWorkspaceLauncherContext } from "./launcher-context.js";
import { createRuntimeSafeBindings } from "./runtime-safe-bindings.js?v=20260627-library-bulk-select-1";

export function launchWorkspaceRuntimeFromCompatibilityLayer({
  state = {},
  stateSetters = {},
  constants = {},
  elements = {},
  actions = {},
  workflows = {},
  bindings = {}
} = {}) {
  const safeBindings = createWorkspaceLauncherSafeBindings({ state, actions });

  return launchAppRuntimeFromState({
    stateSetters,
    context: createWorkspaceLauncherContext({
      state,
      stateSetters,
      constants,
      elements,
      actions,
      workflows,
      bindings,
      safeBindings
    })
  });
}

function createWorkspaceLauncherSafeBindings({ state = {}, actions = {} } = {}) {
  return createRuntimeSafeBindings({
    getHomeImageFiles: state.getHomeImageFiles,
    getProjects: state.getProjects,
    getChatImageFiles: state.getChatImageFiles,
    setHomeFiles: actions.setHomeFiles,
    uploadAsReference: actions.uploadAsReference,
    renderProjectLibrary: actions.renderProjectLibrary,
    selectLibraryProject: actions.selectLibraryProject,
    stepLibraryProject: actions.stepLibraryProject,
    setProjectSelectionMode: actions.setProjectSelectionMode,
    toggleProjectSelection: actions.toggleProjectSelection,
    toggleAllProjectSelection: actions.toggleAllProjectSelection,
    deleteSelectedProjects: actions.deleteSelectedProjects,
    openProject: actions.openProject,
    deleteProject: actions.deleteProject,
    newBlankProject: actions.newBlankProject,
    saveCurrentProject: actions.saveCurrentProject,
    generateHomeProject: actions.generateHomeProject
  });
}
