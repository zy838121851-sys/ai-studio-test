import {
  forgetConversationId,
  getCachedConversationId,
  hasRestoredConversation,
  markConversationNeedsRestore,
  markConversationRestored,
  rememberConversationId
} from "../src/client/features/workspace/chat/workflows/prompt-conversation-state-utils.js";
import {
  bindConversationControls,
  restoreProjectConversation
} from "../src/client/features/workspace/chat/workflows/prompt-conversation-history-workflow.js";

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

const originalFetch = globalThis.fetch;

try {
  const controlConversationIds = new Map();
  const controlRestoredProjects = new Set(["project-2"]);
  const controlCalls = [];
  const buttonListeners = new Map();
  const chatLog = { innerHTML: "<p>existing</p>" };
  const root = {
    querySelector(selector) {
      if (selector === "#newConversation") {
        return {
          addEventListener(type, listener) {
            buttonListeners.set(`new:${type}`, listener);
          }
        };
      }
      if (selector === "#conversationHistory") {
        return {
          addEventListener(type, listener) {
            buttonListeners.set(`history:${type}`, listener);
          }
        };
      }
      if (selector === "#chatLog") return chatLog;
      return null;
    }
  };
  bindConversationControls({
    root,
    getProjectId: () => "project-2",
    addChat() {},
    addChatImage() {},
    conversationIdsByProject: controlConversationIds,
    restoredConversationProjects: controlRestoredProjects,
    abortCurrentConversation() {
      controlCalls.push("abort");
    },
    ensureConversation(projectId, options = {}) {
      controlCalls.push(["ensure", projectId, options.reset]);
      return Promise.resolve({ id: "conversation-2", projectId });
    }
  });
  assert(buttonListeners.has("new:click"), "Conversation controls should bind the new conversation button");
  assert(buttonListeners.has("history:click"), "Conversation controls should bind the history button");
  await buttonListeners.get("new:click")();
  assert(
    JSON.stringify(controlCalls) === JSON.stringify(["abort", ["ensure", "project-2", true]]),
    "Conversation controls should preserve new-conversation reset order"
  );
  assert(
    controlConversationIds.get("project-2") === "conversation-2",
    "Conversation controls should remember reset conversation ids"
  );
  assert(
    !controlRestoredProjects.has("project-2"),
    "Conversation controls should mark reset conversations for restore"
  );
  assert(chatLog.innerHTML === "", "Conversation controls should clear the chat log after reset");

  const restoreCalls = [];
  const fetchCalls = mockFetchSequence([
    makeJsonResponse(200, {
      messages: [
        {
          role: "assistant",
          content: { text: "Image ready" },
          attachments: [{ type: "image", url: "/uploads/a.png", caption: "Preview" }]
        },
        {
          role: "user",
          content: { text: "Thanks" }
        }
      ]
    })
  ]);
  const restoredSet = new Set();
  await restoreProjectConversation({
    projectId: " project-3 ",
    addChat(role, text) {
      restoreCalls.push(["chat", role, text]);
    },
    addChatImage(role, url, caption) {
      restoreCalls.push(["image", role, url, caption]);
    },
    restoredConversationProjects: restoredSet,
    ensureConversation(projectId) {
      restoreCalls.push(["ensure", projectId]);
      return Promise.resolve({ id: "conversation-3", projectId });
    }
  });
  assert(fetchCalls[0].url === "/api/conversations/conversation-3/messages", "Conversation restore should fetch cached messages");
  assert(restoredSet.has("project-3"), "Conversation restore should mark projects restored");
  assert(
    JSON.stringify(restoreCalls) === JSON.stringify([
      ["ensure", "project-3"],
      ["image", "assistant", "/uploads/a.png", "Preview"],
      ["chat", "assistant", "Image ready"],
      ["chat", "user", "Thanks"]
    ]),
    "Conversation restore should preserve restored image and text order"
  );
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Prompt conversation state utility checks passed.");

function mockFetchSequence(responses = []) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (!responses.length) throw new Error(`Unexpected fetch: ${url}`);
    return responses.shift();
  };
  return calls;
}

function makeJsonResponse(status, payload = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    }
  };
}
