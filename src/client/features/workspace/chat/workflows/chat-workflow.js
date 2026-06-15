export function createChatWorkflow({
  elements = {},
  services = {}
} = {}) {
  const {
    chatPanel = null,
    chatLog = null
  } = elements;

  const {
    appendChatMessage = () => null,
    appendThinkingMessage = () => null,
    updateChatMessage = () => {},
    updateThinkingMessage = () => {},
    appendChatImage = () => null,
    escapeHtml = (value = "") => String(value)
  } = services;

  function addChat(role, text) {
    return appendChatMessage({ chatPanel, chatLog, role, text });
  }

  function updateChat(message, text) {
    updateChatMessage({ chatLog, message, text });
  }

  function addThinking(title, steps = []) {
    return appendThinkingMessage({ chatPanel, chatLog, title, steps, escapeHtml });
  }

  function updateThinking(message, activeIndex, done = false) {
    updateThinkingMessage(message, activeIndex, done);
  }

  function addChatImage(role, imageUrl, caption) {
    return appendChatImage({ chatLog, role, imageUrl, caption, escapeHtml });
  }

  return {
    addChat,
    updateChat,
    addThinking,
    updateThinking,
    addChatImage
  };
}
