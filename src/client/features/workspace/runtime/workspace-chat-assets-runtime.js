import { createWorkspaceAssetLibraryRuntime } from "../asset-library/asset-library-app-runtime.js";
import { createWorkspaceChatRuntime } from "../chat/runtime/chat-app-runtime.js";

export function createWorkspaceAssetRuntime({
  eventBus,
  elements = {},
  state = {},
  services = {}
} = {}) {
  return createWorkspaceAssetLibraryRuntime({
    eventBus,
    elements: {
      assetList: elements.assetList,
      pageAssetList: elements.assetsPageAssetList,
      pageUploadButton: elements.assetsPageUploadAsset,
      assetUploadInput: elements.assetUploadInput,
      floatingLibrary: elements.floatingLibrary
    },
    state: {
      assets: state.assets,
      getAssets: state.getAssets,
      setAssets: state.setAssets,
      getActiveProjectId: state.getActiveProjectId,
      getProjects: state.getProjects
    },
    services: {
      escapeHtml: services.escapeHtml,
      insertAssetToCanvas: services.insertAssetToCanvas,
      openProject: services.openProject,
      saveCurrentProject: services.saveCurrentProject
    }
  });
}

export function createWorkspaceChatAppRuntime({
  elements = {},
  services = {}
} = {}) {
  return createWorkspaceChatRuntime({
    elements: {
      appRoot: elements.appRoot,
      chatPanel: elements.chatPanel,
      chatLog: elements.chatLog,
      chatFloat: elements.chatFloat
    },
    services: {
      escapeHtml: services.escapeHtml
    }
  });
}
