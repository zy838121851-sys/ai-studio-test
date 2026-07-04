import {
  ensureProjectConversation,
  fetchConversationMessages,
  listProjectConversations,
  requestConversation,
  requestConversationRestore
} from "../src/client/features/workspace/chat/workflows/prompt-conversation-api-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const originalFetch = globalThis.fetch;

try {
  const createCalls = mockFetchSequence([
    makeJsonResponse(200, {
      conversation: { id: "conv-1", projectId: "project-1" }
    })
  ]);
  const created = await requestConversation(" project-1 ", { reset: true });
  assert(created.id === "conv-1", "Conversation create should return conversation payloads");
  assert(createCalls[0].url === "/api/conversations", "Conversation create should use the conversations endpoint");
  assert(createCalls[0].options.method === "POST", "Conversation create should use POST");
  assert(createCalls[0].options.credentials === "include", "Conversation create should include credentials");
  assert(createCalls[0].options.headers["Content-Type"] === "application/json", "Conversation create should send JSON content type");
  assert(createCalls[0].options.body === JSON.stringify({ projectId: "project-1", reset: true }), "Conversation create should trim project ids and preserve reset");

  let missingProjectError = null;
  try {
    await requestConversation("");
  } catch (error) {
    missingProjectError = error;
  }
  assert(missingProjectError?.message === "Missing active project", "Conversation create should reject missing project ids");

  mockFetchSequence([
    makeJsonResponse(404, { message: "Project not found" })
  ]);
  let createError = null;
  try {
    await requestConversation("missing");
  } catch (error) {
    createError = error;
  }
  assert(createError?.message === "Project not found", "Conversation create should preserve API error messages");
  assert(createError.status === 404, "Conversation create should preserve API status");

  mockFetchSequence([
    makeJsonResponse(200, {})
  ]);
  let missingConversationError = null;
  try {
    await requestConversation("project");
  } catch (error) {
    missingConversationError = error;
  }
  assert(missingConversationError?.message === "Conversation response did not include an id", "Conversation create should require response ids");

  const cachedConversationIds = new Map([["project-1", "cached-conv"]]);
  const cachedConversation = await ensureProjectConversation(" project-1 ", {
    conversationIdsByProject: cachedConversationIds,
    requestConversationFn: async () => {
      throw new Error("cached conversation should not request a new conversation");
    }
  });
  assert(cachedConversation.id === "cached-conv", "Cached conversation helper should reuse cached ids");
  assert(cachedConversation.projectId === "project-1", "Cached conversation helper should trim project ids");

  const resetCalls = [];
  const resetConversation = await ensureProjectConversation("project-1", {
    conversationIdsByProject: cachedConversationIds,
    reset: true,
    requestConversationFn: async (projectId, options) => {
      resetCalls.push({ projectId, options });
      return { id: "reset-conv", projectId };
    }
  });
  assert(resetConversation.id === "reset-conv", "Cached conversation helper should request reset conversations");
  assert(resetCalls[0].projectId === "project-1", "Cached conversation helper should pass clean project ids");
  assert(resetCalls[0].options.reset === true, "Cached conversation helper should pass reset flags");
  assert(cachedConversationIds.get("project-1") === "reset-conv", "Cached conversation helper should remember requested conversations");

  const missingCachedConversationIds = new Map([["missing", "stale-conv"]]);
  let notFoundError = null;
  try {
    await ensureProjectConversation("missing", {
      conversationIdsByProject: missingCachedConversationIds,
      reset: true,
      requestConversationFn: async () => {
        const error = new Error("Project not found");
        error.status = 404;
        throw error;
      }
    });
  } catch (error) {
    notFoundError = error;
  }
  assert(notFoundError?.status === 404, "Cached conversation helper should preserve 404 errors");
  assert(missingCachedConversationIds.has("missing") === false, "Cached conversation helper should forget 404 cached ids");

  let missingCachedProjectError = null;
  try {
    await ensureProjectConversation(" ", { conversationIdsByProject: new Map() });
  } catch (error) {
    missingCachedProjectError = error;
  }
  assert(missingCachedProjectError?.message === "Missing active project", "Cached conversation helper should reject missing project ids");

  const messageCalls = mockFetchSequence([
    makeJsonResponse(200, {
      messages: [{ id: "m1" }]
    })
  ]);
  const messages = await fetchConversationMessages("conv 1");
  assert(messages.length === 1 && messages[0].id === "m1", "Conversation messages should return message arrays");
  assert(messageCalls[0].url === "/api/conversations/conv%201/messages", "Conversation messages should encode conversation ids");
  assert(messageCalls[0].options.credentials === "include", "Conversation messages should include credentials");

  mockFetchSequence([
    makeJsonResponse(200, { messages: "not-array" })
  ]);
  assert((await fetchConversationMessages("empty")).length === 0, "Conversation messages should fall back to empty arrays");

  mockFetchSequence([
    makeJsonResponse(500, { message: "Messages failed" })
  ]);
  let messagesError = null;
  try {
    await fetchConversationMessages("bad");
  } catch (error) {
    messagesError = error;
  }
  assert(messagesError?.message === "Messages failed", "Conversation messages should preserve API errors");

  const listCalls = mockFetchSequence([
    makeJsonResponse(200, {
      conversations: [{ id: "history-1" }]
    })
  ]);
  const conversations = await listProjectConversations("project 1");
  assert(conversations.length === 1 && conversations[0].id === "history-1", "Conversation history should return conversation arrays");
  assert(listCalls[0].url === "/api/conversations?projectId=project%201", "Conversation history should encode project ids");
  assert(listCalls[0].options.credentials === "include", "Conversation history should include credentials");

  mockFetchSequence([
    makeJsonResponse(200, { conversations: null })
  ]);
  assert((await listProjectConversations("empty")).length === 0, "Conversation history should fall back to empty arrays");

  mockFetchSequence([
    makeJsonResponse(403, { message: "History denied" })
  ]);
  let historyError = null;
  try {
    await listProjectConversations("denied");
  } catch (error) {
    historyError = error;
  }
  assert(historyError?.message === "History denied", "Conversation history should preserve API errors");

  const restoreCalls = mockFetchSequence([
    makeJsonResponse(200, {
      conversation: { id: "restored" }
    })
  ]);
  const restored = await requestConversationRestore("conv 2");
  assert(restored.id === "restored", "Conversation restore should return conversation payloads");
  assert(restoreCalls[0].url === "/api/conversations/conv%202/restore", "Conversation restore should encode conversation ids");
  assert(restoreCalls[0].options.method === "POST", "Conversation restore should use POST");
  assert(restoreCalls[0].options.credentials === "include", "Conversation restore should include credentials");

  mockFetchSequence([
    makeJsonResponse(200, {})
  ]);
  let restoreMissingError = null;
  try {
    await requestConversationRestore("bad");
  } catch (error) {
    restoreMissingError = error;
  }
  assert(restoreMissingError?.message === "Conversation restore did not include an id", "Conversation restore should require response ids");

  mockFetchSequence([
    makeJsonResponse(409, { message: "Restore conflict" })
  ]);
  let restoreError = null;
  try {
    await requestConversationRestore("conflict");
  } catch (error) {
    restoreError = error;
  }
  assert(restoreError?.message === "Restore conflict", "Conversation restore should preserve API errors");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Prompt conversation API utility checks passed.");

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
