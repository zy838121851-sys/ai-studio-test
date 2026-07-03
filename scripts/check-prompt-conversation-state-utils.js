import {
  forgetConversationId,
  getCachedConversationId,
  hasRestoredConversation,
  markConversationNeedsRestore,
  markConversationRestored,
  rememberConversationId
} from "../src/client/features/workspace/chat/workflows/prompt-conversation-state-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const conversationIdsByProject = new Map();
assert(getCachedConversationId(conversationIdsByProject, "project-1") === "", "Conversation cache should return empty missing ids");
assert(rememberConversationId(conversationIdsByProject, "project-1", "conversation-1"), "Conversation cache should store ids");
assert(
  getCachedConversationId(conversationIdsByProject, "project-1") === "conversation-1",
  "Conversation cache should return stored ids"
);
assert(!rememberConversationId(conversationIdsByProject, "", "conversation-2"), "Conversation cache should reject empty project ids");
assert(!rememberConversationId(conversationIdsByProject, "project-2", ""), "Conversation cache should reject empty conversation ids");
assert(forgetConversationId(conversationIdsByProject, "project-1"), "Conversation cache should delete existing ids");
assert(getCachedConversationId(conversationIdsByProject, "project-1") === "", "Conversation cache should clear deleted ids");
assert(!forgetConversationId(conversationIdsByProject, ""), "Conversation cache should reject empty delete keys");

const restoredConversationProjects = new Set();
assert(!hasRestoredConversation(restoredConversationProjects, "project-1"), "Restore state should default to false");
assert(markConversationRestored(restoredConversationProjects, "project-1"), "Restore state should mark projects restored");
assert(hasRestoredConversation(restoredConversationProjects, "project-1"), "Restore state should report restored projects");
assert(markConversationNeedsRestore(restoredConversationProjects, "project-1"), "Restore state should delete restored projects");
assert(!hasRestoredConversation(restoredConversationProjects, "project-1"), "Restore state should clear restored projects");
assert(!markConversationRestored(restoredConversationProjects, ""), "Restore state should reject empty restored keys");
assert(!markConversationNeedsRestore(restoredConversationProjects, ""), "Restore state should reject empty reset keys");

assert(getCachedConversationId(null, "project") === "", "Conversation cache helpers should tolerate missing maps");
assert(!rememberConversationId(null, "project", "conversation"), "Conversation cache writes should tolerate missing maps");
assert(!forgetConversationId(null, "project"), "Conversation cache deletes should tolerate missing maps");
assert(!hasRestoredConversation(null, "project"), "Restore state reads should tolerate missing sets");
assert(!markConversationRestored(null, "project"), "Restore state writes should tolerate missing sets");
assert(!markConversationNeedsRestore(null, "project"), "Restore state resets should tolerate missing sets");

console.log("Prompt conversation state utility checks passed.");
