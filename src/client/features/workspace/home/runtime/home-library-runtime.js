import { bindHomeLibraryInteractions } from "../home-library-interactions.js?v=20260627-library-bulk-select-1";

export function createHomeLibraryRuntimePayload(runtime = {}) {
  if (!runtime.homeBindings || !runtime.libraryBindings) return null;

  const { syncHomeModelPicker, setHomeFiles } = runtime.homeBindings;
  const {
    getHomeImageFiles,
    getLibraryViewMode,
    setLibraryViewModeInMemory,
    renderProjectLibrary,
    newBlankProject,
    saveCurrentProject,
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
    setLibraryViewModeStorage
  } = runtime.libraryBindings;

  return {
    documentRoot: runtime.documentRoot,
    elements: {
      homeUploadButton: runtime.homeUploadButton,
      homeFileInput: runtime.homeFileInput,
      homePromptForm: runtime.homePromptForm,
      homePromptInput: runtime.homePromptInput,
      homeModelButton: runtime.homeModelButton,
      homeModelSelect: runtime.homeModelSelect,
      homeModelMenu: runtime.homeModelMenu,
      homeModelPicker: runtime.homeModelPicker,
      projectGrid: runtime.projectGrid,
      homeHistory: runtime.homeHistory,
      homeView: runtime.homeView,
      homeBackTop: runtime.homeBackTop,
      uploadAsset: runtime.uploadAsset,
      assetUploadInput: runtime.assetUploadInput,
      chatUploadImage: runtime.chatUploadImage,
      chatImageInput: runtime.chatImageInput,
      promptForm: runtime.promptForm
    },
    actions: {
      setHomeFiles,
      syncHomeModelPicker,
      getHomeImageFiles,
      getLibraryViewMode,
      setLibraryViewModeInMemory: (mode) => setLibraryViewModeInMemory(mode),
      renderProjectLibrary,
      newBlankProject,
      saveCurrentProject,
      selectLibraryProject,
      stepLibraryProject,
      setProjectSelectionMode,
      toggleProjectSelection,
      toggleAllProjectSelection,
      deleteSelectedProjects,
      openProject,
      deleteProject,
      setLibraryWheelLock: (value) => setLibraryWheelLock(value),
      getLibraryWheelLock: () => getLibraryWheelLock(),
      showView: runtime.showView,
      uploadAsReference: runtime.uploadAsReference,
      addChatImageFiles: runtime.addChatImageFiles,
      generateHomeProject: runtime.generateHomeProject,
      recordCanvasEvent: runtime.recordCanvasEvent,
      renderHomeHistory: runtime.renderHomeHistory,
      getChatDragDepth: () => runtime.getChatDragDepth(),
      setChatDragDepth: (value) => runtime.setChatDragDepth(value),
      setLibraryViewModeStorage,
      getPendingUploadPoint: () => runtime.getPendingUploadPoint(),
      setPendingUploadPoint: (point) => runtime.setPendingUploadPoint(point)
    }
  };
}

export function bindHomeLibraryRuntime(runtime = {}) {
  const payload = createHomeLibraryRuntimePayload(runtime);
  if (!payload) return;

  if (typeof runtime.bindHomeLibraryInteractions === "function") {
    runtime.bindHomeLibraryInteractions(payload);
    return;
  }

  bindHomeLibraryInteractions(payload);
}
