import {
  escapeHtml,
  formatConversationTime,
  getConversationRestoreImageAttachments
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

console.log("Prompt conversation format utility checks passed.");
