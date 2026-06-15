export function createRuntimeStateAccessors({
  getHomeImageFiles,
  getLibraryTransitionDirection,
  getLibraryViewMode,
  getActiveProjectId,
  getProjects,
  getChatImageFiles,
  setChatImageFiles,
  getChatDragDepth,
  setChatDragDepth
}) {
  return {
    getChatImageFiles: () => getChatImageFiles(),
    setChatImageFiles,
    getBridgeState: () => ({
      homeImageFiles: getHomeImageFiles(),
      libraryViewMode: getLibraryViewMode(),
      activeProjectId: getActiveProjectId(),
      projects: getProjects(),
      libraryTransitionDirection: getLibraryTransitionDirection()
    }),
    getHomeImageFiles: () => getHomeImageFiles(),
    getChatDragDepth: () => getChatDragDepth(),
    setChatDragDepth,
    chatImageFilesRef: () => getChatImageFiles()
  };
}
