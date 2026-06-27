import {
  appendChatImage,
  appendChatMessage,
  appendThinkingMessage,
  updateChatMessage,
  updateThinkingMessage,
  updateThinkingSummary
} from "../components/chat-log.js";
import { createChatWorkflow } from "../workflows/chat-workflow.js";

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
      appendChatImage,
      escapeHtml: services.escapeHtml
    }
  });
}
