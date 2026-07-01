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
  const { appendConversationMessage } = await import("../src/server/services/conversation.service.js");
  closeDatabaseRef = closeDatabase;

  const app = createServer();
  server = await listen(app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  await assertProtected(baseUrl, "/api/conversations?projectId=missing-project");

  const userA = await register(baseUrl, "api-conversation-a@example.com", "API Conversation A");
  const userB = await register(baseUrl, "api-conversation-b@example.com", "API Conversation B");
  const projectA = await createProject(baseUrl, userA.cookie, "Conversation project A");
  const projectB = await createProject(baseUrl, userB.cookie, "Conversation project B");

  const missingProject = await request(baseUrl, "/api/conversations?projectId=missing-project", { cookie: userA.cookie });
  assert(missingProject.status === 404, "Conversation list should reject missing projects");
  assert(missingProject.body.message === "Project not found", "Missing project should keep the error contract");

  const crossProjectCreate = await request(baseUrl, "/api/conversations", {
    method: "POST",
    cookie: userB.cookie,
    body: {
      projectId: projectA.id,
      title: "cross-user create"
    }
  });
  assert(crossProjectCreate.status === 404, "Other users should not create conversations for owner projects");
  assert(crossProjectCreate.body.message === "Project not found", "Cross-user project create should keep the not-found contract");

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

  const ownerMessages = await request(baseUrl, `/api/conversations/${conversationId}/messages`, { cookie: userA.cookie });
  assert(ownerMessages.status === 200, "Owner should be able to read own conversation messages");
  assert(Array.isArray(ownerMessages.body.messages), "Conversation messages should return an array");
  assert(ownerMessages.body.messages.length === 1, "Owner messages should include the appended message");
  assert(ownerMessages.body.messages[0].content.text === "hello from owner", "Message content should round trip through the API");
  assert(ownerMessages.body.messages[0].conversationId === conversationId, "Message should stay scoped to the conversation");

  const otherMessages = await request(baseUrl, `/api/conversations/${conversationId}/messages`, { cookie: userB.cookie });
  assert(otherMessages.status === 404, "Other users should not read owner conversation messages");
  assert(otherMessages.body.message === "Conversation not found", "Cross-user message read should keep the not-found contract");

  const otherRestore = await request(baseUrl, `/api/conversations/${conversationId}/restore`, {
    method: "POST",
    cookie: userB.cookie
  });
  assert(otherRestore.status === 404, "Other users should not restore owner conversations");
  assert(otherRestore.body.message === "Conversation not found", "Cross-user restore should keep the not-found contract");

  const otherRun = await request(baseUrl, `/api/conversations/${conversationId}/runs`, {
    method: "POST",
    cookie: userB.cookie,
    body: {
      text: "cross-user run"
    }
  });
  assert(otherRun.status === 404, "Other users should not start runs for owner conversations");
  assert(otherRun.body.message === "Conversation not found", "Cross-user run should keep the not-found contract");

  const otherList = await request(baseUrl, `/api/conversations?projectId=${projectA.id}`, { cookie: userB.cookie });
  assert(otherList.status === 404, "Other users should not list owner project conversations");
  assert(otherList.body.message === "Project not found", "Cross-user conversation list should keep the not-found contract");

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
  assert(response.status === 401, `${path} should require authentication`);
  assert(response.body.message === "Authentication required", `${path} should return the auth error contract`);
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
    cookie: setCookie.split(";")[0],
    body: text ? JSON.parse(text) : null
  };
}
