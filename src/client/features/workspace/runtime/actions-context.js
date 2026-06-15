import { createRuntimeChatContext } from "../chat/runtime/chat-context.js";

export function createRuntimeActionsContext(deps = {}) {
  const { chatContext, ...rest } = deps;

  return { ...createRuntimeChatContext(chatContext), ...rest };
}
