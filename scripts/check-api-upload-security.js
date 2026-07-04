import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertDeepEqual(actual, expected, message) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-api-upload-security-"));
process.env.DB_PATH = join(tempRoot, "api-upload-security.sqlite");
process.env.UPLOAD_DIR = join(tempRoot, "uploads");
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.AUTH_CODE_PROVIDER = "mock";
process.env.MAX_UPLOAD_BYTES = "1024";
process.env.MAX_MODEL_UPLOAD_BYTES = "4096";

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

  await assertProtectedUploadRoutes(baseUrl);

  const owner = await register(baseUrl, "api-upload-security-owner@example.com", "API Upload Security Owner");
  const other = await register(baseUrl, "api-upload-security-other@example.com", "API Upload Security Other");
  const { cookie } = owner;

  const metadata = await request(baseUrl, "/api/upload/metadata", {
    method: "POST",
    cookie,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ file: { name: "pixel.png", type: "image/png", size: "12" } })
  });
  assert(metadata.status === 200, "Upload metadata should succeed for authenticated users");
  assert(metadata.body.message === "Upload metadata normalized", "Upload metadata should keep the success message contract");
  assertDeepEqual(
    metadata.body.file,
    { name: "pixel.png", type: "image/png", size: 12 },
    "Upload metadata should normalize file metadata"
  );

  const emptyMetadata = await request(baseUrl, "/api/upload/metadata", {
    method: "POST",
    cookie,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  });
  assert(emptyMetadata.status === 200, "Empty upload metadata should keep the current tolerant contract");
  assertDeepEqual(
    emptyMetadata.body.file,
    { name: "", type: "", size: 0 },
    "Empty upload metadata should return default file metadata"
  );

  const missingMultipart = await request(baseUrl, "/api/assets/upload", {
    method: "POST",
    cookie,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ file: "not multipart" })
  });
  assert(missingMultipart.status === 400, "Upload should require multipart/form-data");
  assert(missingMultipart.body.message === "multipart/form-data is required", "Missing multipart should keep the error contract");

  const unsupported = await uploadMultipart(baseUrl, cookie, {
    filename: "note.txt",
    mimeType: "text/plain",
    bytes: Buffer.from("text")
  });
  assert(unsupported.status === 415, "Unsupported upload MIME type should return 415");
  assert(unsupported.body.message === "Unsupported upload type", "Unsupported MIME should keep the error contract");

  const tooLarge = await uploadMultipart(baseUrl, cookie, {
    filename: "large.png",
    mimeType: "image/png",
    bytes: Buffer.alloc(1200, 1)
  }, { allowSocketClose: true });
  assert(
    tooLarge.status === 413 || tooLarge.errorCode === "UND_ERR_SOCKET",
    "Uploads over MAX_UPLOAD_BYTES should be rejected or have the socket closed"
  );
  if (tooLarge.status === 413) {
    assert(tooLarge.body.message === "Upload is too large", "Oversized upload should keep the error contract when a response is sent");
  }

  const oversizeList = await request(baseUrl, "/api/assets", { cookie });
  assert(oversizeList.status === 200, "Server should remain healthy after an oversized upload");
  assert(Array.isArray(oversizeList.body.assets), "Asset list should remain readable after an oversized upload");

  const beforeSuccessfulUploads = oversizeList.body.assets.length;

  const imageUpload = await uploadMultipart(baseUrl, cookie, {
    filename: "pixel.png",
    mimeType: "image/png",
    bytes: createPngBuffer(),
    fields: {
      title: "Upload security image",
      type: "image"
    }
  });
  assert(imageUpload.status === 201, "Allowed image upload should succeed");
  assert(imageUpload.body.asset?.id, "Allowed image upload should return an asset id");
  assert(imageUpload.body.asset.mimeType === "image/png", "Allowed image upload should keep MIME type");
  assert(imageUpload.body.asset.sizeBytes === createPngBuffer().length, "Allowed image upload should keep file size");
  assert(imageUpload.body.asset.url.startsWith("/uploads/"), "Allowed image upload should return an upload URL");

  const unauthProtectedUpload = await rawRequest(baseUrl, imageUpload.body.asset.url);
  assert(unauthProtectedUpload.status === 401, "Protected upload URLs should require authentication");
  assert(unauthProtectedUpload.body.message === "Authentication required", "Unauthenticated protected upload should keep the auth error contract");

  const ownerProtectedUpload = await rawRequest(baseUrl, imageUpload.body.asset.url, { cookie });
  assert(ownerProtectedUpload.status === 200, "Owners should be able to read their protected upload");
  assert(ownerProtectedUpload.contentType.includes("image/png"), "Protected upload should preserve MIME type");
  assert(
    ownerProtectedUpload.cacheControl.includes("private"),
    "Protected upload should use private cache control"
  );

  const otherProtectedUpload = await rawRequest(baseUrl, imageUpload.body.asset.url, { cookie: other.cookie });
  assert(otherProtectedUpload.status === 404, "Other users should not read owner protected uploads");
  assert(otherProtectedUpload.body.message === "Upload not found", "Cross-user protected upload should keep the not-found contract");

  const modelUpload = await uploadMultipart(baseUrl, cookie, {
    filename: "scene.glb",
    mimeType: "model/gltf-binary",
    bytes: Buffer.alloc(1500, 2),
    fields: {
      title: "Upload security model",
      type: "model3d"
    }
  });
  assert(modelUpload.status === 201, "Model upload should use MAX_MODEL_UPLOAD_BYTES when detected");
  assert(modelUpload.body.asset?.type === "model3d", "Model upload should keep model3d type");
  assert(modelUpload.body.asset.sizeBytes === 1500, "Model upload should keep model file size");

  const afterSuccessfulUploads = await request(baseUrl, "/api/assets", { cookie });
  assert(afterSuccessfulUploads.status === 200, "Asset list should succeed after valid uploads");
  assert(
    afterSuccessfulUploads.body.assets.length === beforeSuccessfulUploads + 2,
    "Only the valid image and model uploads should create assets"
  );

  console.log("API upload security checks passed.");
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

async function assertProtectedUploadRoutes(baseUrl) {
  const upload = await uploadMultipart(baseUrl, "", {
    filename: "pixel.png",
    mimeType: "image/png",
    bytes: createPngBuffer()
  });
  assert(upload.status === 401, "Asset upload should require authentication");
  assert(upload.body.message === "Authentication required", "Unauthenticated asset upload should keep the auth error contract");

  const metadata = await request(baseUrl, "/api/upload/metadata", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ file: { name: "pixel.png", type: "image/png", size: 1 } })
  });
  assert(metadata.status === 401, "Upload metadata should require authentication");
  assert(metadata.body.message === "Authentication required", "Unauthenticated upload metadata should keep the auth error contract");
}

async function register(baseUrl, email = "api-upload-security@example.com", name = "API Upload Security") {
  const response = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password: "password123",
      name
    })
  });
  assert(response.status === 201, "Registration should succeed for upload security checks");
  assert(response.cookie, "Registration should set a session cookie");
  return {
    user: response.body.user,
    cookie: response.cookie
  };
}

async function uploadMultipart(baseUrl, cookie, {
  filename,
  mimeType,
  bytes,
  fields = {}
}, options = {}) {
  const boundary = `----ai-studio-upload-${Math.random().toString(16).slice(2)}`;
  const body = createMultipartBody(boundary, { filename, mimeType, bytes, fields });
  return request(baseUrl, "/api/assets/upload", {
    method: "POST",
    cookie,
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    body,
    ...options
  });
}

function createMultipartBody(boundary, {
  filename,
  mimeType,
  bytes,
  fields
}) {
  const chunks = [];
  for (const [name, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="${name}"\r\n\r\n`));
    chunks.push(Buffer.from(`${value}\r\n`));
  }
  chunks.push(Buffer.from(`--${boundary}\r\n`));
  chunks.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`));
  chunks.push(Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`));
  chunks.push(Buffer.from(bytes));
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  return Buffer.concat(chunks);
}

function createPngBuffer() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x01
  ]);
}

async function request(baseUrl, path, {
  method = "GET",
  cookie = "",
  headers = {},
  body,
  allowSocketClose = false
} = {}) {
  const requestHeaders = { ...headers };
  if (cookie) requestHeaders.cookie = cookie;

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body
    });
  } catch (error) {
    if (allowSocketClose && error.cause?.code === "UND_ERR_SOCKET") {
      return {
        status: 0,
        cookie: "",
        body: null,
        errorCode: error.cause.code
      };
    }
    throw error;
  }
  const text = await response.text();
  const setCookies = response.headers.getSetCookie?.() || [];
  const setCookie = setCookies[0] || response.headers.get("set-cookie") || "";
  return {
    status: response.status,
    cookie: setCookie.split(";")[0],
    body: text ? JSON.parse(text) : null
  };
}

async function rawRequest(baseUrl, path, {
  method = "GET",
  cookie = "",
  headers = {},
  body
} = {}) {
  const requestHeaders = { ...headers };
  if (cookie) requestHeaders.cookie = cookie;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body
  });
  const contentType = response.headers.get("content-type") || "";
  const cacheControl = response.headers.get("cache-control") || "";
  const buffer = Buffer.from(await response.arrayBuffer());
  let parsed = null;
  if (contentType.includes("application/json")) {
    parsed = JSON.parse(buffer.toString("utf8"));
  }
  return {
    status: response.status,
    contentType,
    cacheControl,
    body: parsed,
    buffer
  };
}
