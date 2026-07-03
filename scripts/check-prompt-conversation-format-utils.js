import {
  escapeHtml,
  formatConversationTime,
  getConversationHistoryDisplay,
  getConversationRestoreImageAttachments,
  renderConversationHistoryItemHtml,
  renderConversationHistoryListHtml,
  renderConversationHistoryMessageHtml
} from "../src/client/features/workspace/chat/workflows/prompt-conversation-format-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(formatConversationTime(0) === "", "Conversation time should ignore zero timestamps");
assert(formatConversationTime("") === "", "Conversation time should ignore empty timestamps");
assert(formatConversationTime("not-a-date") === "", "Conversation time should ignore invalid timestamps");

const formatted = formatConversationTime(Date.UTC(2026, 6, 2, 5, 6));
assert(/\d{2}\/\d{2}.*\d{2}:\d{2}/.test(formatted), "Conversation time should use month/day hour/minute format");

assert(
  escapeHtml("&<>\"'") === "&amp;&lt;&gt;&quot;&#039;",
  "HTML escaping should preserve the existing entity mapping"
);
assert(
  escapeHtml("<button data-id=\"1\">Tom & Jerry's</button>") === "&lt;button data-id=&quot;1&quot;&gt;Tom &amp; Jerry&#039;s&lt;/button&gt;",
  "HTML escaping should escape tags, attributes, ampersands, and apostrophes"
);
assert(escapeHtml(123) === "123", "HTML escaping should stringify non-string values");
assert(escapeHtml(null) === "null", "HTML escaping should preserve String conversion semantics");

const restoredImages = getConversationRestoreImageAttachments([
  { type: "image", url: "/uploads/a.png", caption: "Custom caption" },
  { type: "image", url: "/uploads/b.png" },
  { type: "video", url: "/uploads/c.mp4", caption: "Video" },
  { type: "image", url: "", caption: "Missing URL" },
  null
]);
assert(restoredImages.length === 2, "Conversation restore should keep only image attachments with URLs");
assert(restoredImages[0].url === "/uploads/a.png", "Conversation restore should preserve image URLs");
assert(restoredImages[0].caption === "Custom caption", "Conversation restore should preserve image captions");
assert(restoredImages[1].caption === "生成图片", "Conversation restore should use the generated-image fallback caption");
assert(
  getConversationRestoreImageAttachments({ type: "image", url: "/uploads/a.png" }).length === 0,
  "Conversation restore should ignore non-array attachment payloads"
);

const activeHistoryDisplay = getConversationHistoryDisplay({
  title: "Launch chat",
  summary: "Summary text",
  updatedAt: Date.UTC(2026, 6, 2, 5, 6),
  archived: false
});
assert(activeHistoryDisplay.title === "Launch chat", "Conversation history display should preserve titles");
assert(activeHistoryDisplay.summary === "Summary text", "Conversation history display should preserve summaries");
assert(/\d{2}\/\d{2}.*\d{2}:\d{2}/.test(activeHistoryDisplay.time), "Conversation history display should format update times");

const currentHistoryDisplay = getConversationHistoryDisplay({ archived: false });
assert(currentHistoryDisplay.title === "Project chat", "Conversation history display should preserve default titles");
assert(currentHistoryDisplay.summary === "当前会话", "Conversation history display should preserve current-chat fallback summaries");

const archivedHistoryDisplay = getConversationHistoryDisplay({ archived: true });
assert(archivedHistoryDisplay.summary === "历史会话", "Conversation history display should preserve archived fallback summaries");

const activeHistoryItemHtml = renderConversationHistoryItemHtml({
  id: "conversation-1",
  title: "<Launch>",
  summary: "Summary & details",
  updatedAt: Date.UTC(2026, 6, 2, 5, 6)
}, "conversation-1");
assert(
  activeHistoryItemHtml.includes("conversation-history-item active"),
  "Conversation history item HTML should preserve the active class"
);
assert(
  activeHistoryItemHtml.includes('data-conversation-id="conversation-1"'),
  "Conversation history item HTML should preserve conversation ids"
);
assert(
  activeHistoryItemHtml.includes("&lt;Launch&gt;") && activeHistoryItemHtml.includes("Summary &amp; details"),
  "Conversation history item HTML should escape display text"
);

const archivedHistoryItemHtml = renderConversationHistoryItemHtml({ id: "conversation-2", archived: true }, "");
assert(
  archivedHistoryItemHtml.includes("Project chat") && archivedHistoryItemHtml.includes("历史会话"),
  "Conversation history item HTML should preserve fallback display text"
);

const historyMessageHtml = renderConversationHistoryMessageHtml("<加载失败>");
assert(
  historyMessageHtml === '<strong>历史对话</strong><div class="conversation-history-empty">&lt;加载失败&gt;</div>',
  "Conversation history message HTML should preserve shell markup and escape messages"
);

const historyListHtml = renderConversationHistoryListHtml([
  { id: "conversation-1", title: "Active", summary: "Now" },
  { id: "conversation-2", archived: true }
], "conversation-1");
assert(
  historyListHtml.startsWith('<strong>历史对话</strong><div class="conversation-history-list">'),
  "Conversation history list HTML should preserve shell markup"
);
assert(
  historyListHtml.includes("conversation-history-item active")
    && historyListHtml.includes('data-conversation-id="conversation-2"'),
  "Conversation history list HTML should render history items through the shared item renderer"
);

console.log("Prompt conversation format utility checks passed.");
