export function createCompatibilityBridge(runtime, options = {}) {
  const {
    homeBindings,
    libraryBindings,
    commitProjectTitleEdit
  } = options;

  const bridge = {
    runCanvasTool: runtime.runCanvasTool,
    setShapeTool: runtime.setShapeTool,
    applyTextStyle: runtime.applyTextStyle,
    toggleToolRailCollapsed: runtime.toggleToolRailCollapsed,
    setActiveRailPanelButton: runtime.setActiveRailPanelButton,
    state: runtime.getBridgeState,
    getHomeImageFiles: () => runtime.getHomeImageFiles(),
    setHomeFiles: (files) => homeBindings.setHomeFiles(files),
    syncHomeModelPicker: runtime.syncHomeModelPicker,
    renderProjectLibrary: libraryBindings.renderProjectLibrary,
    renderHomeHistory: runtime.renderHomeHistory,
    selectLibraryProject: libraryBindings.selectLibraryProject,
    stepLibraryProject: libraryBindings.stepLibraryProject,
    openProject: libraryBindings.openProject,
    deleteProject: runtime.deleteProject,
    newBlankProject: libraryBindings.newBlankProject,
    saveCurrentProject: libraryBindings.saveCurrentProject,
    showView: runtime.showView,
    setLibraryViewModeInMemory: (mode) => libraryBindings.setLibraryViewModeInMemory(mode),
    setLibraryWheelLock: (value) => libraryBindings.setLibraryWheelLock(value),
    getLibraryWheelLock: () => libraryBindings.getLibraryWheelLock(),
    uploadAsReference: runtime.uploadAsReference,
    addChatImageFiles: runtime.addChatImageFiles,
    generateHomeProject: runtime.generateHomeProject,
    recordCanvasEvent: runtime.recordCanvasEvent,
    commitProjectTitleEdit,
    homePromptForm: runtime.homePromptForm,
    homePromptInput: runtime.homePromptInput,
    homeFileInput: runtime.homeFileInput,
    homeUploadButton: runtime.homeUploadButton,
    homeFilePreview: runtime.homeFilePreview,
    homeModelSelect: runtime.homeModelSelect,
    homeModelButton: runtime.homeModelButton,
    homeModelMenu: runtime.homeModelMenu,
    homeModelPicker: runtime.homeModelPicker,
    projectGrid: runtime.projectGrid,
    homeHistory: runtime.homeHistory,
    projectTitle: runtime.projectTitle,
    projectSaveStatus: runtime.projectSaveStatus,
    getChatDragDepth: () => runtime.getChatDragDepth(),
    setChatDragDepth: (value) => runtime.setChatDragDepth(value),
    uploadAsset: runtime.uploadAsset,
    assetUploadInput: runtime.assetUploadInput,
    chatUploadImage: runtime.chatUploadImage,
    chatImageInput: runtime.chatImageInput,
    promptForm: runtime.promptForm,
    promptInput: runtime.promptInput,
    chatModelSelect: runtime.chatModelSelect
  };

  window.AIStudioCompatibilityBridge = bridge;
  window.AIStudioLegacyBridge = bridge;

  return bridge;
}

export function bindCompatibilityBridge(runtime = {}) {
  createCompatibilityBridge(runtime, {
    homeBindings: runtime.homeBindings,
    libraryBindings: runtime.libraryBindings,
    commitProjectTitleEdit: runtime.commitProjectTitleEdit
  });
}
