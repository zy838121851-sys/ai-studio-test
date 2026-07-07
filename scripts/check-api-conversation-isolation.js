import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-api-conversation-isolation-"));
process.env.DB_PATH = join(tempRoot, "api-conversation-isolation.sqlite");
process.env.UPLOAD_DIR = join(tempRoot, "uploads");
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.AUTH_CODE_PROVIDER = "mock";
process.env.APIMART_MOCK = "true";

let server = null;
let closeDatabaseRef = null;
const restoreConsole = suppressRuntimeLogs();

try {
  const { createServer } = await import("../src/server/index.js");
  const { closeDatabase } = await import("../src/server/db/sqlite.js");
  const {
    appendConversationMessage,
    listConversationMessages,
    listProjectConversations,
    listRecentConversationMessages
  } = await import("../src/server/services/conversation.service.js");
  closeDatabaseRef = closeDatabase;

  const app = createServer();
  server = await listen(app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  await assertProtected(baseUrl, "/api/conversations?projectId=missing-project");

  const userA = await register(baseUrl, "api-conversation-a@example.com", "API Conversation A");
  const userB = await register(baseUrl, "api-conversation-b@example.com", "API Conversation B");
  const projectA = await createProject(baseUrl, userA.cookie, "Conversation project A");
  const projectB = await createProject(baseUrl, userB.cookie, "Conversation project B");

  const missingListProjectId = await request(baseUrl, "/api/conversations", { cookie: userA.cookie });
  assertErrorContract(missingListProjectId, {
    label: "conversation list without projectId",
    status: 400,
    message: "Missing projectId"
  });

  const missingCreateProjectId = await request(baseUrl, "/api/conversations", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      title: "missing project"
    }
  });
  assertErrorContract(missingCreateProjectId, {
    label: "conversation create without projectId",
    status: 400,
    message: "Missing projectId"
  });

  const missingProject = await request(baseUrl, "/api/conversations?projectId=missing-project", { cookie: userA.cookie });
  assertErrorContract(missingProject, {
    label: "conversation list for missing project",
    status: 404,
    message: "Project not found"
  });

  const crossProjectCreate = await request(baseUrl, "/api/conversations", {
    method: "POST",
    cookie: userB.cookie,
    body: {
      projectId: projectA.id,
      title: "cross-user create"
    }
  });
  assertErrorContract(crossProjectCreate, {
    label: "cross-user conversation create",
    status: 404,
    message: "Project not found"
  });

  const created = await request(baseUrl, "/api/conversations", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      projectId: projectA.id,
      title: "API conversation owner"
    }
  });
  assert(created.status === 200, "Owner should be able to create a project conversation");
  assert(created.body.conversation?.id, "Conversation create should return an id");
  assert(created.body.conversation.projectId === projectA.id, "Conversation should stay scoped to the requested project");
  assert(created.body.conversation.userId === userA.user.id, "Conversation should stay scoped to the authenticated user");
  assert(created.body.conversation.archived === false, "New conversation should be active");
  const conversationId = created.body.conversation.id;

  const reused = await request(baseUrl, "/api/conversations", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      projectId: projectA.id,
      title: "API conversation owner"
    }
  });
  assert(reused.status === 200, "Owner should be able to get the active project conversation");
  assert(reused.body.conversation.id === conversationId, "Conversation create should reuse the active project conversation");

  appendConversationMessage({
    conversationId,
    userId: userA.user.id,
    projectId: projectA.id,
    role: "user",
    content: { text: "hello from owner" },
    attachments: [{ type: "image", assetId: "asset-a" }],
    toolCalls: [{ name: "noop" }]
  });
  appendConversationMessage({
    conversationId,
    userId: userA.user.id,
    projectId: projectA.id,
    role: "assistant",
    content: { text: "hello from assistant" }
  });

  const defaultLimitedConversations = listProjectConversations(userA.user.id, projectA.id, { limit: "bad" });
  assert(defaultLimitedConversations.length === 1, "Conversation list should tolerate invalid limit values");
  const clampedConversations = listProjectConversations(userA.user.id, projectA.id, { limit: "500" });
  assert(clampedConversations.length === 1, "Conversation list should tolerate large limit values");

  const invalidLimitMessages = listConversationMessages(userA.user.id, conversationId, { limit: "bad" });
  assert(invalidLimitMessages.length === 2, "Conversation messages should tolerate invalid limit values");
  const clampedMessages = listConversationMessages(userA.user.id, conversationId, { limit: "500" });
  assert(clampedMessages.length === 2, "Conversation messages should tolerate large limit values");
  const recentMessages = listRecentConversationMessages(userA.user.id, conversationId, { limit: "bad" });
  assert(recentMessages.length === 2, "Recent conversation messages should tolerate invalid limit values");

  const ownerMessages = await request(baseUrl, `/api/conversations/${conversationId}/messages`, { cookie: userA.cookie });
  assert(ownerMessages.status === 200, "Owner should be able to read own conversation messages");
  assert(Array.isArray(ownerMessages.body.messages), "Conversation messages should return an array");
  assert(ownerMessages.body.messages.length === 2, "Owner messages should include the appended messages");
  assert(ownerMessages.body.messages[0].content.text === "hello from owner", "Message content should round trip through the API");
  assert(ownerMessages.body.messages[0].conversationId === conversationId, "Message should stay scoped to the conversation");

  const otherMessages = await request(baseUrl, `/api/conversations/${conversationId}/messages`, { cookie: userB.cookie });
  assertErrorContract(otherMessages, {
    label: "cross-user message read",
    status: 404,
    message: "Conversation not found"
  });

  const otherRestore = await request(baseUrl, `/api/conversations/${conversationId}/restore`, {
    method: "POST",
    cookie: userB.cookie
  });
  assertErrorContract(otherRestore, {
    label: "cross-user conversation restore",
    status: 404,
    message: "Conversation not found"
  });

  const otherRun = await request(baseUrl, `/api/conversations/${conversationId}/runs`, {
    method: "POST",
    cookie: userB.cookie,
    body: {
      text: "cross-user run"
    }
  });
  assertErrorContract(otherRun, {
    label: "cross-user conversation run",
    status: 404,
    message: "Conversation not found"
  });

  const ownerRun = await requestStream(baseUrl, `/api/conversations/${conversationId}/runs`, {
    method: "POST",
    cookie: userA.cookie,
    body: {
      text: "keep this prompt unchanged",
      model: "gpt-image-2",
      attachments: [{
        type: "image",
        name: "reference.png",
        source: "upload",
        dataUrl: "data:image/png;base64,cmVm"
      }]
    }
  });
  assert(ownerRun.status === 200, "Owner should be able to run own conversation");
  assert(ownerRun.events.some((event) => event.type === "message.done"), "Conversation run should emit message.done");
  assert(
    !ownerRun.events.some((event) => event.type === "image.analysis.start"),
    "Conversation generation should skip image analysis while temporarily disabled"
  );
  assert(
    !ownerRun.events.some((event) => event.type === "prompt.optimizer.start"),
    "Conversation generation should skip prompt optimization while temporarily disabled"
  );
  const doneEvent = ownerRun.events.find((event) => event.type === "message.done");
  assert(doneEvent.optimizedPrompt === "keep this prompt unchanged", "Disabled optimizer should preserve the original prompt");
  assert(doneEvent.qwenVlMode === "disabled_for_generation", "Conversation run should report disabled image analysis mode");
  assert(doneEvent.promptOptimizerMode === "disabled_for_generation", "Conversation run should report disabled optimizer mode");
  assert(doneEvent.skippedOptimizer === true, "Conversation run should mark optimizer as skipped");
  assert(doneEvent.imageAnalysis === null, "Conversation run should not produce image analysis while disabled");

  const otherList = await request(baseUrl, `/api/conversations?projectId=${projectA.id}`, { cookie: userB.cookie });
  assertErrorContract(otherList, {
    label: "cross-user conversation list",
    status: 404,
    message: "Project not found"
  });

  const reset = await request(baseUrl, "/api/conversations", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      projectId: projectA.id,
      reset: true,
      title: "API conversation reset"
    }
  });
  assert(reset.status === 200, "Owner should be able to reset a project conversation");
  assert(reset.body.conversation?.id, "Conversation reset should return a conversation");
  assert(reset.body.conversation.id !== conversationId, "Conversation reset should archive the active conversation and create a new one");
  assert(reset.body.conversation.archived === false, "Conversation reset should return an active conversation");

  const ownerList = await request(baseUrl, `/api/conversations?projectId=${projectA.id}`, { cookie: userA.cookie });
  assert(ownerList.status === 200, "Owner should be able to list project conversations");
  assert(Array.isArray(ownerList.body.conversations), "Conversation list should return an array");
  assert(ownerList.body.conversations.length === 2, "Conversation list should include active and archived history");
  assert(
    ownerList.body.conversations.some((conversation) => conversation.id === conversationId && conversation.archived === true),
    "Conversation list should mark the previous conversation archived after reset"
  );
  assert(
    ownerList.body.conversations.some((conversation) => conversation.id === reset.body.conversation.id && conversation.archived === false),
    "Conversation list should include the new active conversation after reset"
  );

  const ownerRestore = await request(baseUrl, `/api/conversations/${conversationId}/restore`, {
    method: "POST",
    cookie: userA.cookie
  });
  assert(ownerRestore.status === 200, "Owner should be able to restore an archived conversation");
  assert(ownerRestore.body.conversation.id === conversationId, "Restore should return the selected conversation");
  assert(ownerRestore.body.conversation.archived === false, "Restore should reactivate the selected conversation");

  const afterRestore = await request(baseUrl, `/api/conversations?projectId=${projectA.id}`, { cookie: userA.cookie });
  assert(afterRestore.status === 200, "Owner should be able to list conversations after restore");
  assert(
    afterRestore.body.conversations.filter((conversation) => !conversation.archived).length === 1,
    "Restore should leave exactly one active conversation for the project"
  );

  const projectBCreate = await request(baseUrl, "/api/conversations", {
    method: "POST",
    cookie: userB.cookie,
    body: {
      projectId: projectB.id,
      title: "API conversation B"
    }
  });
  assert(projectBCreate.status === 200, "Other user should still be able to create own conversations");
  assert(projectBCreate.body.conversation.userId === userB.user.id, "Other user's conversation should stay scoped to that user");

  console.log("API conversation isolation checks passed.");
} finally {
  restoreConsole();
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  try {
    closeDatabaseRef?.();
  } catch {
    // Ignore cleanup errors.
  }
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

function suppressRuntimeLogs() {
  const originalDebug = console.debug;
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.debug = (...args) => {
    if (String(args[0] || "").startsWith("[conversation-stream]")) return;
    if (String(args[0] || "").startsWith("[message.done]")) return;
    originalDebug(...args);
  };
  console.log = (...args) => {
    if (String(args[0] || "").startsWith("[info] audit:")) return;
    originalLog(...args);
  };
  console.warn = (...args) => {
    if (String(args[0] || "").startsWith("[warn] audit:")) return;
    originalWarn(...args);
  };
  return () => {
    console.debug = originalDebug;
    console.log = originalLog;
    console.warn = originalWarn;
  };
}

function listen(app) {
  return new Promise((resolve, reject) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
    started.on("error", reject);
  });
}

async function assertProtected(baseUrl, path) {
  const response = await request(baseUrl, path);
  assertErrorContract(response, {
    label: path,
    status: 401,
    message: "Authentication required"
  });
}

function assertErrorContract(response, { label, status, message }) {
  assert(response.status === status, `${label} should return ${status}`);
  assert(response.contentType.includes("application/json"), `${label} should return JSON`);
  assert(response.body.message === message, `${label} should return "${message}"`);
  assert(!("stack" in response.body), `${label} should not expose stack`);
  assert(!("trace" in response.body), `${label} should not expose trace`);
}

async function register(baseUrl, email, name) {
  const response = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      email,
      password: "password123",
      name
    }
  });
  assert(response.status === 201, `${email} registration should succeed`);
  assert(response.cookie, `${email} registration should set a session cookie`);
  return {
    user: response.body.user,
    cookie: response.cookie
  };
}

async function createProject(baseUrl, cookie, title) {
  const response = await request(baseUrl, "/api/projects", {
    method: "POST",
    cookie,
    body: {
      title,
      prompt: "conversation isolation check",
      itemCount: 1,
      canvasSnapshotJson: JSON.stringify({ nodes: [] })
    }
  });
  assert(response.status === 201, "Project creation should succeed");
  assert(response.body.project?.id, "Project creation should return an id");
  return response.body.project;
}

async function request(baseUrl, path, {
  method = "GET",
  cookie = "",
  body
} = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const setCookies = response.headers.getSetCookie?.() || [];
  const setCookie = setCookies[0] || response.headers.get("set-cookie") || "";
  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    cookie: setCookie.split(";")[0],
    body: text ? JSON.parse(text) : null
  };
}

async function requestStream(baseUrl, path, {
  method = "GET",
  cookie = "",
  body
} = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    text,
    events: text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  };
}
