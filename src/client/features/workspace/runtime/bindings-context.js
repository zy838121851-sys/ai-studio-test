import {
  createHomeRuntimeBindings,
  createLibraryRuntimeBindings
} from "./binding-factories.js";

export function createRuntimeBindingsContext(deps = {}) {
  const {
    syncHomeModelPicker,
    renderHomeFilePreview,
    setHomeFiles,
    openHomeFilePicker,
    getHomeImageFiles,
    getLibraryViewMode,
    setLibraryViewModeInMemory,
    renderProjectLibrary,
    selectLibraryProject,
    stepLibraryProject,
    openProject,
    deleteProject,
    setLibraryWheelLock,
    getLibraryWheelLock,
    setLibraryViewModeStorage,
    setPendingUploadPoint,
    getPendingUploadPoint,
    newBlankProject,
    saveCurrentProject,
    generateHomeProject,
    uploadAsReference,
    addChatImageFiles,
    recordCanvasEvent
  } = deps;

  const libraryActions = {
    openProject,
    deleteProject,
    newBlankProject,
    saveCurrentProject,
    generateHomeProject,
    uploadAsReference,
    addChatImageFiles,
    recordCanvasEvent,
    renderProjectLibrary,
    selectLibraryProject,
    stepLibraryProject,
    setLibraryWheelLock,
    getLibraryWheelLock,
    setLibraryViewModeStorage,
    setPendingUploadPoint,
    getPendingUploadPoint
  };

  return {
    homeBindings: createHomeRuntimeBindings({
      syncHomeModelPicker,
      renderHomeFilePreview,
      setHomeFiles,
      openHomeFilePicker
    }),
    libraryBindings: createLibraryRuntimeBindings({
      getHomeImageFiles,
      getLibraryViewMode,
      setLibraryViewModeInMemory,
      renderProjectLibrary,
      selectLibraryProject,
      stepLibraryProject,
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
    }),
    ...libraryActions
  };
}
