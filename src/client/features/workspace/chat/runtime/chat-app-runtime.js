import { createChatCollapseRuntime } from "./chat-collapse-runtime.js";
import { createChatWorkflowRuntime } from "./chat-workflow-bootstrap.js?v=20260628-agent-blocks-1";

export function createWorkspaceChatRuntime({
  elements = {},
  services = {}
} = {}) {
  const workflow = createChatWorkflowRuntime({
    elements,
    services
  });
  const collapse = createChatCollapseRuntime({
    elements
  });

  return {
    ...workflow,
    ...collapse
  };
}
