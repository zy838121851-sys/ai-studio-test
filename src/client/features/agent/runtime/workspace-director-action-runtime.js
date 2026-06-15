import { createDirectorActionRuntime } from "./director-action-runtime.js";

export function createWorkspaceDirectorActionRuntime({
  elements = {},
  services = {}
} = {}) {
  return createDirectorActionRuntime({
    state: {
      getChatModel: () => elements.chatModelSelect?.value
    },
    services
  });
}
