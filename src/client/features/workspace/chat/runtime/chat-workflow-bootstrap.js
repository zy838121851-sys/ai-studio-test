import {
  appendChatBlocks,
  appendChatImage,
  appendChatMessage,
  appendThinkingMessage,
  updateChatMessage,
  updateThinkingMessage,
  updateThinkingSummary
} from "../components/chat-log.js?v=20260628-agent-blocks-1";
import { createChatWorkflow } from "../workflows/chat-workflow.js?v=20260628-agent-blocks-1";

export function createChatWorkflowRuntime({
  elements = {},
  services = {}
} = {}) {
  return createChatWorkflow({
    elements: {
      chatPanel: elements.chatPanel,
      chatLog: elements.chatLog
    },
    services: {
      appendChatMessage,
      appendThinkingMessage,
      updateChatMessage,
      updateThinkingMessage,
      updateThinkingSummary,
      appendChatBlocks,
      appendChatImage,
      escapeHtml: services.escapeHtml
    }
  });
}
