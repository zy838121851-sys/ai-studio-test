import { createDirectorActionRuntime } from "./director-action-runtime.js";

export function createWorkspaceDirectorActionRuntime({
  elements = {},
  services = {}
} = {}) {
  return createDirectorActionRuntime({
    state: {
      getChatModel: () => elements.chatModelSelect?.dataset?.selectedModelId
        || elements.chatModelSelect?.value
    },
    services
  });
}
