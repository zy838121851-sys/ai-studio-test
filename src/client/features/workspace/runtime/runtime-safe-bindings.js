export function createRuntimeSafeBindings({
  getHomeImageFiles = () => [],
  getProjects = () => [],
  getChatImageFiles = () => [],
  setHomeFiles,
  uploadAsReference,
  renderProjectLibrary,
  selectLibraryProject,
  stepLibraryProject,
  openProject,
  deleteProject,
  newBlankProject,
  saveCurrentProject,
  generateHomeProject
} = {}) {
  return {
    safeGetHomeImageFiles: () => {
      const files = getHomeImageFiles();
      return Array.isArray(files) ? files.slice() : [];
    },
    safeGetProjects: () => {
      const projects = getProjects();
      return Array.isArray(projects) ? projects.slice() : [];
    },
    safeGetChatImageFiles: () => {
      const files = getChatImageFiles();
      return Array.isArray(files) ? files.slice() : [];
    },
    safeSetHomeFiles: (files) => setHomeFiles?.(files),
    safeUploadAsReference: (...args) => uploadAsReference?.(...args),
    safeRenderProjectLibrary: (...args) => {
      if (typeof renderProjectLibrary === "function") {
        return renderProjectLibrary(...args);
      }
      return "";
    },
    safeSelectLibraryProject: (...args) => selectLibraryProject?.(...args),
    safeStepLibraryProject: (...args) => stepLibraryProject?.(...args),
    safeOpenProject: (...args) => openProject?.(...args),
    safeDeleteProject: (...args) => deleteProject?.(...args),
    safeNewBlankProject: (...args) => newBlankProject?.(...args),
    safeSaveCurrentProject: (...args) => saveCurrentProject?.(...args),
    safeGenerateHomeProject: (...args) => generateHomeProject?.(...args)
  };
}
