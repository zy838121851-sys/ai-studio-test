export function formatConversationTime(value) {
  const timestamp = Number(value || 0);
  if (!timestamp) return "";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getConversationRestoreImageAttachments(attachments = []) {
  return (Array.isArray(attachments) ? attachments : [])
    .filter((item) => item?.type === "image" && item.url)
    .map((item) => ({
      url: item.url,
      caption: item.caption || "生成图片"
    }));
}

export function getConversationHistoryDisplay(conversation = {}) {
  return {
    title: conversation?.title || "Project chat",
    time: formatConversationTime(conversation?.updatedAt),
    summary: conversation?.summary || (conversation?.archived ? "历史会话" : "当前会话")
  };
}

export function renderConversationHistoryItemHtml(conversation = {}, currentId = "") {
  const display = getConversationHistoryDisplay(conversation);
  return `
      <button class="conversation-history-item${conversation.id === currentId ? " active" : ""}" type="button" data-conversation-id="${escapeHtml(conversation.id)}">
        <span><b>${escapeHtml(display.title)}</b><i>${display.time}</i></span>
        <small>${escapeHtml(display.summary)}</small>
      </button>
    `;
}
