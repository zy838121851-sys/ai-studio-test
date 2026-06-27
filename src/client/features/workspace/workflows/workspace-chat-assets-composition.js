import { createWorkspaceAssetRuntime, createWorkspaceChatAppRuntime } from "../runtime/workspace-chat-assets-runtime.js?v=20260627-library-bulk-select-1";

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
