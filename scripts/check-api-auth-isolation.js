import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-api-auth-isolation-"));
process.env.DB_PATH = join(tempRoot, "api-auth-isolation.sqlite");
process.env.UPLOAD_DIR = join(tempRoot, "uploads");
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.AUTH_CODE_PROVIDER = "mock";

let server = null;
let closeDatabaseRef = null;
const restoreConsole = suppressAuditLogs();

try {
  const { createServer } = await import("../src/server/index.js");
  const { closeDatabase } = await import("../src/server/db/sqlite.js");
  closeDatabaseRef = closeDatabase;

  const app = createServer();
  server = await listen(app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const anonymousMe = await request(baseUrl, "/api/auth/me");
  assert(anonymousMe.status === 200, "Anonymous /auth/me should keep the public session contract");
  assert(anonymousMe.body.user === null, "Anonymous /auth/me should return a null user");

  const invalidRegisterEmail = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      email: "not-an-email",
      password: "password123",
      name: "Invalid Email"
    }
  });
  assertErrorContract(invalidRegisterEmail, {
    label: "invalid registration email",
    status: 400,
    message: "Valid email is required"
  });

  const weakRegisterPassword = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      email: "weak-password@example.com",
      password: "short",
      name: "Weak Password"
    }
  });
  assertErrorContract(weakRegisterPassword, {
    label: "weak registration password",
    status: 400,
    message: "Password must be at least 8 characters"
  });

  const invalidLogin = await request(baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: "missing-user@example.com",
      password: "password123"
    }
  });
  assertErrorContract(invalidLogin, {
    label: "invalid login",
    status: 401,
    message: "Invalid email or password"
  });

  await assertProtected(baseUrl, "/api/projects");
  await assertProtected(baseUrl, "/api/assets");
  await assertProtected(baseUrl, "/api/asset-collections");
  await assertProtected(baseUrl, "/api/credits/balance");

  const userA = await register(baseUrl, "api-user-a@example.com", "API User A");
  const userB = await register(baseUrl, "api-user-b@example.com", "API User B");

  assert(userA.user.id, "User A registration should return a user id");
  assert(userB.user.id, "User B registration should return a user id");
  assert(userA.cookie, "User A registration should set a session cookie");
  assert(userB.cookie, "User B registration should set a session cookie");

  const meA = await request(baseUrl, "/api/auth/me", { cookie: userA.cookie });
  assert(meA.status === 200, "Authenticated /auth/me should succeed");
  assert(meA.body.user?.id === userA.user.id, "/auth/me should return the cookie owner");

  const duplicate = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      email: "api-user-a@example.com",
      password: "password123",
      name: "Duplicate User"
    }
  });
  assertErrorContract(duplicate, {
    label: "duplicate registration",
    status: 409,
    message: "Email already registered"
  });

  const project = await createProject(baseUrl, userA.cookie);
  await assertProjectIsolation(baseUrl, project.id, userA.cookie, userB.cookie);

  const asset = await createGeneratedAsset(baseUrl, userA.cookie);
  await assertAssetIsolation(baseUrl, asset.id, userA.cookie, userB.cookie);

  console.log("API auth isolation checks passed.");
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

function suppressAuditLogs() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args) => {
    if (String(args[0] || "").startsWith("[info] audit:")) return;
    originalLog(...args);
  };
  console.warn = (...args) => {
    if (String(args[0] || "").startsWith("[warn] audit:")) return;
    originalWarn(...args);
  };
  return () => {
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
  return {
    user: response.body.user,
    cookie: response.cookie
  };
}

async function createProject(baseUrl, cookie) {
  const response = await request(baseUrl, "/api/projects", {
    method: "POST",
    cookie,
    body: {
      title: "API isolation project",
      prompt: "isolation check",
      itemCount: 1,
      canvasSnapshotJson: JSON.stringify({ nodes: [] })
    }
  });
  assert(response.status === 201, "Owner should be able to create a project");
  assert(response.body.project?.id, "Created project should return an id");
  return response.body.project;
}

async function assertProjectIsolation(baseUrl, projectId, ownerCookie, otherCookie) {
  const ownerGet = await request(baseUrl, `/api/projects/${projectId}`, { cookie: ownerCookie });
  assert(ownerGet.status === 200, "Owner should be able to read own project");
  assert(ownerGet.body.project.id === projectId, "Owner project read should return the requested project");

  const otherGet = await request(baseUrl, `/api/projects/${projectId}`, { cookie: otherCookie });
  assert(otherGet.status === 404, "Other users should not read owner projects");

  const otherPatch = await request(baseUrl, `/api/projects/${projectId}`, {
    method: "PATCH",
    cookie: otherCookie,
    body: { title: "cross-user patch" }
  });
  assert(otherPatch.status === 404, "Other users should not update owner projects");

  const otherDelete = await request(baseUrl, `/api/projects/${projectId}`, {
    method: "DELETE",
    cookie: otherCookie
  });
  assert(otherDelete.status === 404, "Other users should not delete owner projects");

  const otherList = await request(baseUrl, "/api/projects", { cookie: otherCookie });
  assert(otherList.status === 200, "Other user project list should succeed");
  assert(Array.isArray(otherList.body.projects), "Other user project list should return an array");
  assert(otherList.body.projects.every((project) => project.id !== projectId), "Other user project list should not include owner project");

  const ownerDelete = await request(baseUrl, `/api/projects/${projectId}`, {
    method: "DELETE",
    cookie: ownerCookie
  });
  assert(ownerDelete.status === 200, "Owner should be able to delete own project");
}

async function createGeneratedAsset(baseUrl, cookie) {
  const response = await request(baseUrl, "/api/assets/generated", {
    method: "POST",
    cookie,
    body: {
      url: "/uploads/api-isolation.png",
      title: "API isolation asset",
      type: "image",
      mimeType: "image/png",
      sizeBytes: 1,
      libraryVisible: true
    }
  });
  assert(response.status === 201, "Owner should be able to create a generated asset");
  assert(response.body.asset?.id, "Created asset should return an id");
  return response.body.asset;
}

async function assertAssetIsolation(baseUrl, assetId, ownerCookie, otherCookie) {
  const ownerGet = await request(baseUrl, `/api/assets/${assetId}`, { cookie: ownerCookie });
  assert(ownerGet.status === 200, "Owner should be able to read own asset");
  assert(ownerGet.body.asset.id === assetId, "Owner asset read should return the requested asset");

  const otherGet = await request(baseUrl, `/api/assets/${assetId}`, { cookie: otherCookie });
  assert(otherGet.status === 404, "Other users should not read owner assets");

  const otherPatch = await request(baseUrl, `/api/assets/${assetId}`, {
    method: "PATCH",
    cookie: otherCookie,
    body: { title: "cross-user asset patch" }
  });
  assert(otherPatch.status === 404, "Other users should not update owner assets");

  const otherDelete = await request(baseUrl, `/api/assets/${assetId}`, {
    method: "DELETE",
    cookie: otherCookie
  });
  assert(otherDelete.status === 404, "Other users should not delete owner assets");

  const otherList = await request(baseUrl, "/api/assets", { cookie: otherCookie });
  assert(otherList.status === 200, "Other user asset list should succeed");
  assert(Array.isArray(otherList.body.assets), "Other user asset list should return an array");
  assert(otherList.body.assets.every((asset) => asset.id !== assetId), "Other user asset list should not include owner asset");

  const ownerDelete = await request(baseUrl, `/api/assets/${assetId}`, {
    method: "DELETE",
    cookie: ownerCookie
  });
  assert(ownerDelete.status === 200, "Owner should be able to delete own asset");
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
