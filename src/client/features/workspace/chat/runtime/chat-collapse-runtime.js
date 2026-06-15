import { createChatCollapseController } from "../chat-collapse.js";

export function createChatCollapseRuntime({
  elements = {}
} = {}) {
  return createChatCollapseController({
    appRoot: elements.appRoot,
    chatPanel: elements.chatPanel,
    chatFloat: elements.chatFloat
  });
}
