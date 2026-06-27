import { createRuntimeSafeBindings } from "./runtime-safe-bindings.js?v=20260627-library-bulk-select-1";

export function createWorkspaceLauncherSafeBindings({ state = {}, actions = {} } = {}) {
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
