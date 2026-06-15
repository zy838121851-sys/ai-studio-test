import { createWorkspaceAssetRuntime, createWorkspaceChatAppRuntime } from "../runtime/workspace-chat-assets-runtime.js";

export function createWorkspaceChatAssetsCompositionRuntime({
  eventBus,
  elements,
  state,
  services
}) {
  const assetRuntime = createWorkspaceAssetRuntime({
    eventBus,
    elements,
    state,
    services
  });

  const chatRuntime = createWorkspaceChatAppRuntime({
    elements,
    services
  });

  return {
    assetRuntime,
    chatRuntime
  };
}
