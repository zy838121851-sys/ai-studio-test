export function createChatCollapseController(deps) {
  const { appRoot, chatPanel, chatFloat } = deps;

  function setChatCollapsed(collapsed) {
    appRoot.classList.toggle("chat-collapsed", collapsed);
    chatPanel.classList.toggle("collapsed", collapsed);
    chatFloat.classList.toggle("collapsed", collapsed);
  }

  return {
    setChatCollapsed
  };
}
