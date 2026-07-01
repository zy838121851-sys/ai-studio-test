import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-api-error-contract-"));
process.env.DB_PATH = join(tempRoot, "api-error-contract.sqlite");
process.env.UPLOAD_DIR = join(tempRoot, "uploads");
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.AUTH_CODE_PROVIDER = "mock";
process.env.APIMART_MOCK = "true";

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

  const unauthProjectList = await request(baseUrl, "/api/projects");
  assertErrorContract(unauthProjectList, {
    label: "unauthenticated protected route",
    status: 401,
    message: "Authentication required"
  });

  const userA = await register(baseUrl, "api-error-a@example.com", "API Error A");
  const userB = await register(baseUrl, "api-error-b@example.com", "API Error B");

  const duplicateRegister = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      email: "api-error-a@example.com",
      password: "password123",
      name: "Duplicate"
    }
  });
  assertErrorContract(duplicateRegister, {
    label: "duplicate registration",
    status: 409,
    message: "Email already registered"
  });

  const invalidProjectSnapshot = await request(baseUrl, "/api/projects", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      title: "Invalid snapshot",
      canvasSnapshotJson: "{invalid"
    }
  });
  assertErrorContract(invalidProjectSnapshot, {
    label: "invalid project snapshot",
    status: 400,
    message: "Invalid canvas snapshot JSON"
  });

  const project = await request(baseUrl, "/api/projects", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      title: "Owner project",
      canvasSnapshotJson: JSON.stringify({ nodes: [] })
    }
  });
  assert(project.status === 201, "owner project create should succeed");
  assert(project.body?.project?.id, "owner project create should return an id");

  const crossUserProject = await request(baseUrl, `/api/projects/${project.body.project.id}`, {
    cookie: userB.cookie
  });
  assertErrorContract(crossUserProject, {
    label: "cross-user project read",
    status: 404,
    message: "Project not found"
  });

  const missingUploadFile = await request(baseUrl, "/api/assets/upload", {
    method: "POST",
    cookie: userA.cookie,
    body: new FormData()
  });
  assertErrorContract(missingUploadFile, {
    label: "upload without file",
    status: 400,
    message: "File is required"
  });

  const blockedImageProxy = await request(baseUrl, "/api/image-proxy?url=http://localhost/private.png", {
    cookie: userA.cookie
  });
  assertErrorContract(blockedImageProxy, {
    label: "blocked image proxy",
    status: 400
  });

  const missingAiJob = await request(baseUrl, "/api/ai/jobs/missing-job-id", {
    cookie: userA.cookie
  });
  assertErrorContract(missingAiJob, {
    label: "missing AI job",
    status: 404,
    message: "Job not found"
  });

  console.log("API error contract checks passed.");
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertErrorContract(response, { label, status, message } = {}) {
  assert(response.status === status, `${label} expected ${status}, got ${response.status}`);
  assert(
    response.contentType.includes("application/json"),
    `${label} should return application/json, got ${response.contentType || "(missing)"}`
  );
  assert(response.body && typeof response.body === "object" && !Array.isArray(response.body), `${label} should return a JSON object`);
  assert(typeof response.body.message === "string" && response.body.message.trim(), `${label} should return a non-empty message`);
  if (message) {
    assert(response.body.message === message, `${label} expected message "${message}", got "${response.body.message}"`);
  }
  assert(!("stack" in response.body), `${label} should not expose stack`);
  assert(!("trace" in response.body), `${label} should not expose trace`);
}

function listen(app) {
  return new Promise((resolve, reject) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
    started.on("error", reject);
  });
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

async function request(baseUrl, path, {
  method = "GET",
  cookie = "",
  body
} = {}) {
  const headers = {};
  let requestBody = undefined;

  if (cookie) headers.cookie = cookie;
  if (body instanceof FormData) {
    requestBody = body;
  } else if (body !== undefined) {
    headers["content-type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: requestBody
  });
  const text = await response.text();
  const setCookies = response.headers.getSetCookie?.() || [];
  const setCookie = setCookies[0] || response.headers.get("set-cookie") || "";
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    cookie: setCookie.split(";")[0],
    body: parsed
  };
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
