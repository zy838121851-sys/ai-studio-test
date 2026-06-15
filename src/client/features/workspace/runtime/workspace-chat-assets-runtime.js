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
      floatingLibrary: elements.floatingLibrary
    },
    state: {
      assets: state.assets
    },
    services: {
      escapeHtml: services.escapeHtml
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
