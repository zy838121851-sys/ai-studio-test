export function createHomeRuntimeBindings({
  syncHomeModelPicker,
  renderHomeFilePreview,
  setHomeFiles,
  openHomeFilePicker
}) {
  return {
    syncHomeModelPicker,
    renderHomeFilePreview,
    setHomeFiles,
    openHomeFilePicker
  };
}

export function createLibraryRuntimeBindings({
  getHomeImageFiles,
  getLibraryViewMode,
  setLibraryViewModeInMemory,
  renderProjectLibrary,
  selectLibraryProject,
  stepLibraryProject,
  setProjectSelectionMode,
  toggleProjectSelection,
  toggleAllProjectSelection,
  deleteSelectedProjects,
  openProject,
  deleteProject,
  setLibraryWheelLock,
  getLibraryWheelLock,
  setLibraryViewModeStorage,
  setHomeFiles,
  setPendingUploadPoint,
  getPendingUploadPoint,
  newBlankProject,
  saveCurrentProject,
  generateHomeProject,
  uploadAsReference,
  addChatImageFiles,
  recordCanvasEvent
}) {
  return {
    getHomeImageFiles,
    getLibraryViewMode,
    setLibraryViewModeInMemory,
    renderProjectLibrary,
    selectLibraryProject,
    stepLibraryProject,
    setProjectSelectionMode,
    toggleProjectSelection,
    toggleAllProjectSelection,
    deleteSelectedProjects,
    openProject,
    deleteProject,
    setLibraryWheelLock,
    getLibraryWheelLock,
    setLibraryViewModeStorage,
    setHomeFiles,
    setPendingUploadPoint,
    getPendingUploadPoint,
    newBlankProject,
    saveCurrentProject,
    generateHomeProject,
    uploadAsReference,
    addChatImageFiles,
    recordCanvasEvent
  };
}
