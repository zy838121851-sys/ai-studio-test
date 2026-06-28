import { createRuntimeChatContext } from "../chat/runtime/chat-context.js?v=20260628-boot-inline-1";

export function createRuntimeActionsContext(deps = {}) {
  const { chatContext, ...rest } = deps;

  return { ...createRuntimeChatContext(chatContext), ...rest };
}
