import { createWorkspaceProjectRuntime } from "../../projects/workspace-project-runtime.js";
import { createWorkspaceHomeRuntime } from "../home/runtime/home-app-runtime.js";

export function createWorkspaceProjectHomeRuntime({
  document,
  elements = {},
  state = {},
  ui = {},
  chat = {},
  services = {},
  actions = {}
} = {}) {
  let projectRuntime;
  projectRuntime = createWorkspaceProjectRuntime({
    state: {
      getProjects: state.getProjects,
      setProjects: state.setProjects,
      getActiveProjectId: state.getActiveProjectId,
      setActiveProjectIdInMemory: state.setActiveProjectIdInMemory,
      getLibraryTransitionDirection: state.getLibraryTransitionDirection,
      setLibraryTransitionDirection: state.setLibraryTransitionDirection,
      getLibraryViewMode: state.getLibraryViewMode,
      getSelectedNodes: state.getSelectedNodes,
      getSelectedNode: state.getSelectedNode,
      setSelectedNode: state.setSelectedNode,
      getAssets: state.getAssets
    },
    elements: {
      body: document?.body,
      projectGrid: elements.projectGrid,
      homeHistory: elements.homeHistory,
      projectTitle: elements.projectTitle,
      projectSaveStatus: elements.projectSaveStatus,
      canvasWorld: elements.canvasWorld,
      emptyState: elements.emptyState,
      appRoot: elements.appRoot,
      homeView: elements.homeView,
      projectLibraryView: elements.projectLibraryView,
      profileView: elements.profileView,
      assetsPageView: elements.assetsPageView,
      promptInput: elements.promptInput,
      promptForm: elements.promptForm,
      chatModelSelect: elements.chatModelSelect,
      homePromptInput: elements.homePromptInput,
      homePromptForm: elements.homePromptForm,
      projectMenu: elements.projectMenu,
      brandMenu: elements.brandMenu
    },
    ui: {
      applyViewState: ui.applyViewState,
      addNode: ui.addNode,
      markGeneratedNodeContext: ui.markGeneratedNodeContext,
      removeNodeDeep: ui.removeNodeDeep,
      applyTransform: ui.applyTransform,
      setChatCollapsed: ui.setChatCollapsed,
      updateProjectTitleView: () => projectRuntime?.updateProjectTitle?.()
    },
    chat: {
      setChatImageFiles: chat.setChatImageFiles,
      getChatImageFiles: chat.getChatImageFiles,
      renderChatImagePreview: chat.renderChatImagePreview,
      waitFor: services.waitFor
    },
    services: {
      escapeHtml: services.escapeHtml,
      resolveAssetUrl: services.resolveAssetUrl,
      ensureAssetsReady: services.ensureAssetsReady
    }
  });

  projectRuntime.ensureDemoProjects?.();

  const homeRuntime = createWorkspaceHomeRuntime({
    elements: {
      homePromptForm: elements.homePromptForm,
      homePromptInput: elements.homePromptInput,
      homeUploadButton: elements.homeUploadButton,
      homeFileInput: elements.homeFileInput,
      homeFilePreview: elements.homeFilePreview,
      homeModelPicker: elements.homeModelPicker,
      homeModelButton: elements.homeModelButton,
      homeModelSelect: elements.homeModelSelect,
      homeModelMenu: elements.homeModelMenu
    },
    state: {
      getHomeImageFiles: state.getHomeImageFiles,
      setHomeImageFiles: state.setHomeImageFiles,
      escapeHtmlText: services.escapeHtml
    },
    actions: {
      recordCanvasEvent: actions.recordCanvasEvent,
      generateHomeProject: (prompt, model, files) => projectRuntime.generateHomeProject(prompt, model, files)
    }
  });

  return {
    ...projectRuntime,
    ...homeRuntime
  };
}
