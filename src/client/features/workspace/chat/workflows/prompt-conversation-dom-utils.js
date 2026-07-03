export function clearConversationChatLog(root = globalThis.document) {
  const chatLog = root?.querySelector?.("#chatLog");
  if (!chatLog) return false;
  chatLog.innerHTML = "";
  return true;
}
