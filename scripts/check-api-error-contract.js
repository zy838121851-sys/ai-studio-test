import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classifyAIError, toClientFailure } from "../src/server/lib/ai-error-response.js";
import {
  buildGenerationFailureLog,
  buildGenerationRequestLog,
  buildGenerationResponseLog,
  buildTripo3DRequestLog,
  buildTripo3DResponseLog
} from "../src/server/lib/ai-job-log-payload.js";

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
  assertNoInlineMessageErrorResponses();
  assertAIErrorClassification();
  assertAIJobLogPayloads();

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

  const failedGenerate = await request(baseUrl, "/api/ai/generate", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      prompt: "mock-apimart-fail",
      modelId: "gpt-image-2"
    }
  });
  assertRichAIErrorContract(failedGenerate, {
    label: "failed AI generate",
    status: 502,
    failureCode: "MOCK_APIMART_IMAGE_FAILED",
    failureMessage: "Mock APIMart image failure",
    stage: "provider"
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

function assertRichAIErrorContract(response, { label, status, failureCode, failureMessage, stage } = {}) {
  assertErrorContract(response, {
    label,
    status,
    message: failureMessage
  });
  assert(response.body.errorCode === failureCode, `${label} expected errorCode "${failureCode}", got "${response.body.errorCode}"`);
  assert(response.body.failureCode === failureCode, `${label} expected failureCode "${failureCode}", got "${response.body.failureCode}"`);
  assert(response.body.errorMessage === failureMessage, `${label} expected errorMessage "${failureMessage}", got "${response.body.errorMessage}"`);
  assert(response.body.failureMessage === failureMessage, `${label} expected failureMessage "${failureMessage}", got "${response.body.failureMessage}"`);
  assert(response.body.stage === stage, `${label} expected stage "${stage}", got "${response.body.stage}"`);
  assert(response.body.jobId, `${label} should return the failed local job id`);
  assert(response.body.job?.id === response.body.jobId, `${label} should return a job matching jobId`);
}

function assertAIErrorClassification() {
  assertDeepEqual(
    classifyAIError(errorWith({ status: 401, message: "Authentication required" }), { path: "/ai/generate" }),
    { failureCode: "LOGIN_REQUIRED", failureMessage: "Authentication required", stage: "auth" },
    "401 AI errors should classify as auth failures"
  );
  assertDeepEqual(
    classifyAIError(errorWith({ status: 402, message: "Insufficient credits" }), { path: "/ai/generate" }),
    { failureCode: "INSUFFICIENT_CREDITS", failureMessage: "Insufficient credits", stage: "billing" },
    "402 AI errors should classify as billing failures"
  );
  assertDeepEqual(
    classifyAIError(errorWith({ status: 404, message: "Job not found" }), { path: "/ai/jobs/missing" }),
    { failureCode: "JOB_NOT_FOUND", failureMessage: "Job not found", stage: "jobPoll" },
    "AI job 404 errors should classify as job polling failures"
  );
  assertDeepEqual(
    classifyAIError(errorWith({ status: 400, code: "BAD_IMAGE", message: "Bad image" }), { path: "/image-proxy" }),
    { failureCode: "BAD_IMAGE", failureMessage: "Bad image", stage: "request" },
    "400 AI errors should preserve explicit request failure codes"
  );
  assertDeepEqual(
    classifyAIError(errorWith({ message: "Provider timed out" }), { path: "/ai/generate" }),
    { failureCode: "JOB_TIMEOUT", failureMessage: "Provider timed out", stage: "jobPoll" },
    "timeout AI errors should classify as job polling failures"
  );
  assertDeepEqual(
    classifyAIError(errorWith({ message: "Generated output could not be saved locally" }), { path: "/ai/generate" }),
    { failureCode: "OUTPUT_SAVE_FAILED", failureMessage: "Generated output could not be saved locally", stage: "outputPersist" },
    "output persistence errors should classify as output persistence failures"
  );
  assertDeepEqual(
    toClientFailure({ errorCode: "PROVIDER_FAILED", errorMessage: "provider exploded" }, "AI_JOB_FAILED"),
    {
      errorCode: "PROVIDER_FAILED",
      errorMessage: "provider exploded",
      failureCode: "PROVIDER_FAILED",
      failureMessage: "provider exploded"
    },
    "AI job failures should preserve stored error details"
  );
}

function assertAIJobLogPayloads() {
  const imageDataUrl = "data:image/png;base64,QUJDRA==";
  const requestLog = buildGenerationRequestLog({
    route: "/api/ai/generate",
    requestId: "req-1",
    modelConfig: {
      id: "gpt-image-2",
      providerId: "apimart",
      providerModel: "gpt-image-2",
      vendor: "apimart"
    },
    type: "video",
    task: "video_generation",
    prompt: "prompt",
    images: [imageDataUrl, "https://example.test/input.png", ""],
    size: "1024x1024",
    videoOptions: { duration: 5 },
    inputAssetIds: ["asset-a", ""],
    quote: { totalCredits: 8, fixedCredits: 8 },
    reservation: { amountCredits: 8 }
  });
  assert(requestLog.imageCount === 3, "Generation request log should preserve the original image count");
  assert(requestLog.images[0].source === "data-url", "Generation request log should summarize data URLs");
  assert(requestLog.images[0].mimeType === "image/png", "Generation request log should keep data URL MIME type");
  assert(!JSON.stringify(requestLog).includes("QUJDRA=="), "Generation request log should not leak base64 image data");
  assert(requestLog.images[1].value === "https://example.test/input.png", "Generation request log should preserve public image URLs");
  assert(requestLog.inputAssetIds.length === 1 && requestLog.inputAssetIds[0] === "asset-a", "Generation request log should filter empty input asset ids");
  assert(requestLog.videoOptions.duration === 5, "Generation request log should keep video options for video jobs");

  const responseLog = buildGenerationResponseLog({
    provider: "apimart",
    model: "gpt-image-2",
    imageUrl: "/uploads/output.png",
    sizeNormalization: {
      requestedSize: "1024x1024",
      normalizedSize: "1024*1024",
      providerSize: "1024*1024",
      providerResolution: "1k",
      changed: true,
      reason: "provider-format"
    }
  }, {
    modelConfig: { id: "gpt-image-2", providerId: "apimart", providerModel: "gpt-image-2" },
    type: "image",
    immediateOutputUrl: "/uploads/output.png"
  });
  assert(responseLog.status === "succeeded", "Generation response log should mark immediate outputs as succeeded");
  assert(responseLog.outputCount === 1, "Generation response log should count immediate outputs");
  assert(responseLog.sizeNormalization.changed === true, "Generation response log should preserve size normalization");

  const tripoTokenLog = buildTripo3DRequestLog({
    route: "/api/ai/3d/image-to-model",
    requestId: "tripo-1",
    modelConfig: { id: "tripo-model", providerModel: "tripo-api" },
    mode: "image",
    imageUrl: "file_token:abcdefghij",
    quote: { totalCredits: 12, unitCredits: 12 },
    reservation: { amountCredits: 12 }
  });
  assert(tripoTokenLog.imageInput.source === "file_token", "Tripo request log should recognize file tokens");
  assert(tripoTokenLog.imageInput.value === "[file_token]", "Tripo request log should not expose file tokens");

  const tripoDataLog = buildTripo3DRequestLog({
    imageDataUrl,
    imageName: "input.png",
    imageMimeType: "image/png"
  });
  assert(tripoDataLog.imageInput.source === "data-url", "Tripo request log should summarize uploaded data URLs");
  assert(!JSON.stringify(tripoDataLog).includes("QUJDRA=="), "Tripo request log should not leak base64 image data");

  const tripoResponseLog = buildTripo3DResponseLog({
    taskId: "remote-1",
    modelUrl: "https://example.test/model.glb",
    renderedImageUrl: "https://example.test/render.png",
    status: "running"
  }, {
    modelConfig: { id: "tripo-model", providerModel: "tripo-api" },
    chargedCredits: 12
  });
  assert(tripoResponseLog.modelUrl === true, "Tripo response log should store model URL presence as a boolean");
  assert(tripoResponseLog.billing.status === "charged", "Tripo response log should record charged billing status");

  const error = errorWith({ status: 502, code: "PROVIDER_FAILED", message: "Provider exploded" });
  const failureLog = buildGenerationFailureLog(error, {
    stage: "provider",
    failureCode: "PROVIDER_FAILED",
    failureMessage: "Provider exploded"
  });
  assert(failureLog.providerStatus === 502, "Generation failure log should keep provider status");
  assert(failureLog.failureCode === "PROVIDER_FAILED", "Generation failure log should keep failure code");
}

function errorWith({ status, code, message } = {}) {
  const error = new Error(message);
  if (status !== undefined) error.status = status;
  if (code !== undefined) error.code = code;
  return error;
}

function assertDeepEqual(actual, expected, message) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertNoInlineMessageErrorResponses() {
  const routesRoot = join(process.cwd(), "src", "server", "routes");
  const offenders = [];
  for (const filePath of listJavaScriptFiles(routesRoot)) {
    const source = readFileSync(filePath, "utf8");
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/res\.status\([^\n]+\)\.json\(\{\s*message\s*:/.test(line)) {
        offenders.push(`${filePath}:${index + 1}`);
      }
    });
  }

  assert(
    offenders.length === 0,
    [
      "Route error responses should use sendErrorResponse/sendCaughtErrorResponse instead of inline { message } JSON.",
      ...offenders
    ].join("\n")
  );
}

function listJavaScriptFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJavaScriptFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(entryPath);
    }
  }
  return files;
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
