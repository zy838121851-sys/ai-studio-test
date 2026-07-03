export function clearConversationChatLog(root = globalThis.document) {
  const chatLog = root?.querySelector?.("#chatLog");
  if (!chatLog) return false;
  chatLog.innerHTML = "";
  return true;
}

export function ensureConversationHistoryPopover({
  root = globalThis.document,
  viewport = globalThis.window,
  onClose = () => closeConversationHistoryPopover(root)
} = {}) {
  let popover = root?.querySelector?.("#conversationHistoryPopover");
  if (popover) return popover;
  if (!root?.createElement || !root?.body?.append) return null;
  popover = root.createElement("div");
  popover.id = "conversationHistoryPopover";
  popover.className = "conversation-history-popover";
  popover.hidden = true;
  root.body.append(popover);
  root.addEventListener?.("pointerdown", (event) => {
    if (event.target.closest("#conversationHistoryPopover, #conversationHistory")) return;
    onClose();
  });
  viewport?.addEventListener?.("resize", onClose);
  root.addEventListener?.("canvas:view-transformed", onClose);
  return popover;
}

export function closeConversationHistoryPopover(root = globalThis.document) {
  const popover = root?.querySelector?.("#conversationHistoryPopover");
  if (!popover) return false;
  popover.hidden = true;
  return true;
}

export function getConversationHistoryPopoverPosition({
  rect,
  viewportWidth = globalThis.innerWidth || 0,
  viewportHeight = globalThis.innerHeight || 0,
  gutter = 16,
  gap = 10
} = {}) {
  if (!rect) return null;
  const width = Math.min(320, viewportWidth - gutter * 2);
  const left = Math.max(gutter, Math.min(rect.right - width, viewportWidth - gutter - width));
  const top = Math.min(rect.bottom + gap, viewportHeight - gutter - 120);
  return {
    left,
    top: Math.max(gutter, top)
  };
}

export function positionConversationHistoryPopover(button, popover, viewport = globalThis) {
  if (!button || !popover) return false;
  const position = getConversationHistoryPopoverPosition({
    rect: button.getBoundingClientRect(),
    viewportWidth: viewport?.innerWidth || 0,
    viewportHeight: viewport?.innerHeight || 0
  });
  if (!position) return false;
  popover.style.left = `${position.left}px`;
  popover.style.top = `${position.top}px`;
  return true;
}
