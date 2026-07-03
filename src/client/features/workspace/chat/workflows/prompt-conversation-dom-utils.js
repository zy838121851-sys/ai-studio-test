export function clearConversationChatLog(root = globalThis.document) {
  const chatLog = root?.querySelector?.("#chatLog");
  if (!chatLog) return false;
  chatLog.innerHTML = "";
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
