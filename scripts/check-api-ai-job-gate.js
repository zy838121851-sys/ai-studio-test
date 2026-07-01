import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-api-ai-job-gate-"));
process.env.DB_PATH = join(tempRoot, "api-ai-job-gate.sqlite");
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
  const {
    completeAIJob,
    createAIJob,
    failAIJob,
    getAIJobDetails
  } = await import("../src/server/services/ai-job.service.js");
  const { createGeneratedAsset } = await import("../src/server/services/asset.service.js");

  closeDatabaseRef = closeDatabase;

  const app = createServer();
  server = await listen(app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  await assertProtected(baseUrl, "/api/ai/jobs");

  const userA = await register(baseUrl, "api-ai-job-a@example.com", "API AI Job A");
  const userB = await register(baseUrl, "api-ai-job-b@example.com", "API AI Job B");

  const inputAssetA = createGeneratedAsset(userA.user.id, {
    url: "/uploads/api-ai-job-input-a.png",
    title: "API AI job input A",
    type: "image",
    mimeType: "image/png",
    sizeBytes: 1,
    libraryVisible: true
  });
  const inputAssetB = createGeneratedAsset(userB.user.id, {
    url: "/uploads/api-ai-job-input-b.png",
    title: "API AI job input B",
    type: "image",
    mimeType: "image/png",
    sizeBytes: 1,
    libraryVisible: true
  });

  const successJob = createAIJob({
    id: "api-ai-job-gate-success",
    userId: userA.user.id,
    provider: "test",
    vendor: "test",
    modelId: "mock-image",
    providerModel: "mock-image",
    remoteTaskId: "api-ai-job-gate-remote-success",
    type: "image",
    status: "running",
    progress: 40,
    prompt: "job gate prompt",
    inputAssetIds: [inputAssetA.id],
    requestData: {
      route: "api-ai-job-gate",
      apiKey: "super-hidden-api-key",
      imageDataUrl: "data:image/png;base64,AAAA"
    }
  });
  assert(successJob.inputAssetIds.includes(inputAssetA.id), "AI job should link owner input assets");

  const completedJob = await completeAIJob(userA.user.id, successJob.id, {
    outputs: [{ url: "mock://job-output.png", mimeType: "image/png" }],
    responseData: { providerToken: "super-hidden-provider-token", status: "succeeded" },
    durationMs: 123
  });
  assert(completedJob?.status === "succeeded", "AI job completion should mark the job succeeded");
  assert(completedJob.outputAssetIds.length === 1, "AI job completion should link one output asset");
  assert(completedJob.outputCount === 1, "AI job completion should expose output count");
  assert(completedJob.progress === 100, "AI job completion should set progress to 100");

  const ownerDetail = await request(baseUrl, `/api/ai/jobs/${successJob.id}`, { cookie: userA.cookie });
  assert(ownerDetail.status === 200, "Owner should be able to read own AI job");
  assert(ownerDetail.body.jobId === successJob.id, "AI job detail should return the requested job id");
  assert(ownerDetail.body.status === "succeeded", "AI job detail should expose succeeded status");
  assert(ownerDetail.body.outputCount === 1, "AI job detail should expose output count");
  assert(ownerDetail.body.imageUrls.length === 1, "AI job detail should expose output image URLs");
  assert(ownerDetail.body.imageUrls[0].startsWith("/uploads/"), "AI job output should be persisted through uploads");
  assert(ownerDetail.body.failureCode === "", "Succeeded AI job should expose an empty failureCode");
  assert(ownerDetail.body.failureMessage === "", "Succeeded AI job should expose an empty failureMessage");
  assert(ownerDetail.body.billing.status === "charged", "Succeeded AI job detail should expose charged billing status");

  const requestLog = JSON.stringify(ownerDetail.body.requestData);
  const responseLog = JSON.stringify(ownerDetail.body.responseData);
  assert(!requestLog.includes("super-hidden-api-key"), "AI job request log should redact API keys");
  assert(!requestLog.includes("base64,AAAA"), "AI job request log should redact data URLs");
  assert(!responseLog.includes("super-hidden-provider-token"), "AI job response log should redact provider tokens");

  const otherDetail = await request(baseUrl, `/api/ai/jobs/${successJob.id}`, { cookie: userB.cookie });
  assert(otherDetail.status === 404, "Other users should not read owner AI jobs");

  const otherList = await request(baseUrl, "/api/ai/jobs?limit=50", { cookie: userB.cookie });
  assert(otherList.status === 200, "Other user AI job list should succeed");
  assert(Array.isArray(otherList.body.jobs), "AI job list should return jobs");
  assert(otherList.body.jobs.every((job) => job.id !== successJob.id), "Other user AI job list should not include owner jobs");

  const otherRemoteTask = await request(baseUrl, `/api/ai/3d/tasks/${successJob.remoteTaskId}`, { cookie: userB.cookie });
  assert(otherRemoteTask.status === 404, "Other users should not read owner AI jobs by remote task id");

  const failedJob = createAIJob({
    id: "api-ai-job-gate-failed",
    userId: userA.user.id,
    provider: "test",
    vendor: "test",
    modelId: "mock-image",
    providerModel: "mock-image",
    type: "image",
    status: "running",
    progress: 20,
    prompt: "failure job"
  });
  failAIJob(userA.user.id, failedJob.id, {
    status: "failed",
    errorCode: "PROVIDER_FAILED",
    errorMessage: "provider exploded",
    responseData: { status: "failed" },
    durationMs: 456
  });

  const failedDetail = await request(baseUrl, `/api/ai/jobs/${failedJob.id}`, { cookie: userA.cookie });
  assert(failedDetail.status === 200, "Owner should be able to read failed AI job");
  assert(failedDetail.body.status === "failed", "Failed AI job detail should expose failed status");
  assert(failedDetail.body.failureCode === "PROVIDER_FAILED", "Failed AI job detail should expose failureCode");
  assert(failedDetail.body.failureMessage === "provider exploded", "Failed AI job detail should expose failureMessage");
  assert(failedDetail.body.billing.status === "failed", "Failed AI job detail should expose failed billing status");

  const crossInputJob = createAIJob({
    id: "api-ai-job-gate-cross-input",
    userId: userA.user.id,
    provider: "test",
    vendor: "test",
    modelId: "mock-image",
    providerModel: "mock-image",
    type: "image",
    status: "queued",
    prompt: "cross input job",
    inputAssetIds: [inputAssetB.id]
  });
  const crossInputDetail = getAIJobDetails(userA.user.id, crossInputJob.id);
  assert(
    !crossInputDetail.inputAssetIds.includes(inputAssetB.id),
    "AI jobs should not link input assets owned by another user"
  );

  console.log("API AI job gate checks passed.");
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
