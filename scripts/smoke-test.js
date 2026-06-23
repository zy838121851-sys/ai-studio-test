import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-smoke-"));
process.env.NODE_ENV = "test";
process.env.DASHSCOPE_API_KEY = "";
process.env.DB_PATH = join(tempRoot, "smoke.sqlite");
process.env.UPLOAD_DIR = join(tempRoot, "uploads");
process.env.PORT = "0";

const { createServer } = await import("../src/server/index.js");
const { closeDatabase } = await import("../src/server/db/sqlite.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function start(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => resolve(server));
    server.on("error", reject);
  });
}

async function request(baseUrl, path, { method = "GET", body, cookie, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return {
    status: response.status,
    headers: response.headers,
    data
  };
}

let server;
try {
  const app = createServer();
  server = await start(app);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const health = await request(baseUrl, "/api/health");
  assert(health.status === 200, `health expected 200, got ${health.status}`);

  const authProviders = await request(baseUrl, "/api/auth/providers");
  assert(authProviders.status === 200, `auth providers expected 200, got ${authProviders.status}`);
  assert(authProviders.data.emailCode?.configured === true, "email code provider should be configured in test mode");
  assert(authProviders.data.smsCode?.configured === true, "sms code provider should be configured in test mode");
  assert(authProviders.data.oauth?.wechat?.configured === false, "wechat OAuth should be unconfigured in smoke test");
  assert(authProviders.data.oauth?.qq?.configured === false, "qq OAuth should be unconfigured in smoke test");

  const unauthProjects = await request(baseUrl, "/api/projects");
  assert(unauthProjects.status === 401, `unauth projects expected 401, got ${unauthProjects.status}`);

  const register = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      email: `smoke-${Date.now()}@example.test`,
      password: "correct-horse-battery",
      name: "Smoke Test"
    }
  });
  assert(register.status === 201, `register expected 201, got ${register.status}`);
  const cookie = register.headers.get("set-cookie")?.split(";")[0] || "";
  assert(cookie.includes("ai_studio_session="), "register did not set session cookie");

  const duplicate = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      email: register.data.user.email,
      password: "correct-horse-battery",
      name: "Smoke Test"
    }
  });
  assert(duplicate.status === 409, `duplicate register expected 409, got ${duplicate.status}`);

  const emailCode = await request(baseUrl, "/api/auth/code/send", {
    method: "POST",
    body: {
      channel: "email",
      target: `code-${Date.now()}@example.test`,
      purpose: "login"
    }
  });
  assert(emailCode.status === 200, `send email code expected 200, got ${emailCode.status}`);
  assert(emailCode.data.code, "mock email code was not returned in test mode");

  const emailCodeLogin = await request(baseUrl, "/api/auth/code/verify", {
    method: "POST",
    body: {
      channel: "email",
      target: emailCode.data.target,
      code: emailCode.data.code,
      purpose: "login",
      name: "Email Code Smoke"
    }
  });
  assert(emailCodeLogin.status === 200, `email code verify expected 200, got ${emailCodeLogin.status}`);
  assert(emailCodeLogin.headers.get("set-cookie")?.includes("ai_studio_session="), "email code verify did not set cookie");

  const phoneCode = await request(baseUrl, "/api/auth/code/send", {
    method: "POST",
    body: {
      channel: "sms",
      target: "+8613800000000",
      purpose: "login"
    }
  });
  assert(phoneCode.status === 200, `send phone code expected 200, got ${phoneCode.status}`);
  assert(phoneCode.data.code, "mock phone code was not returned in test mode");

  const phoneCodeLogin = await request(baseUrl, "/api/auth/code/verify", {
    method: "POST",
    body: {
      channel: "sms",
      target: phoneCode.data.target,
      code: phoneCode.data.code,
      purpose: "login",
      name: "Phone Code Smoke"
    }
  });
  assert(phoneCodeLogin.status === 200, `phone code verify expected 200, got ${phoneCodeLogin.status}`);

  const wechatStart = await request(baseUrl, "/api/auth/oauth/wechat/start?format=json");
  assert(wechatStart.status === 503, `unconfigured wechat start expected 503, got ${wechatStart.status}`);

  const project = await request(baseUrl, "/api/projects", {
    method: "POST",
    cookie,
    body: { title: "Smoke Project", prompt: "smoke" }
  });
  assert(project.status === 201, `create project expected 201, got ${project.status}`);

  const form = new FormData();
  const png = new Blob([
    Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de", "hex")
  ], { type: "image/png" });
  form.append("file", png, "smoke.png");
  form.append("projectId", project.data.project.id);
  const upload = await request(baseUrl, "/api/assets/upload", {
    method: "POST",
    cookie,
    body: form
  });
  assert(upload.status === 201, `upload expected 201, got ${upload.status}`);
  assert(upload.data.asset?.url, "upload did not return an asset URL");

  const uploadedFile = await request(baseUrl, upload.data.asset.url, { cookie });
  assert(uploadedFile.status === 200, `protected upload expected 200, got ${uploadedFile.status}`);

  const blockedProxy = await request(baseUrl, "/api/image-proxy?url=http://localhost/private.png", { cookie });
  assert(blockedProxy.status === 400, `localhost image proxy expected 400, got ${blockedProxy.status}`);

  const missingKey = await request(baseUrl, "/api/chat", {
    method: "POST",
    cookie,
    body: { prompt: "smoke" }
  });
  assert(missingKey.status === 500, `missing-key AI path expected 500, got ${missingKey.status}`);
  assert(/DASHSCOPE_API_KEY/i.test(missingKey.data?.message || ""), "missing-key AI path did not report provider key");

  console.log("Smoke test passed.");
} finally {
  await new Promise((resolve) => server?.close(resolve) || resolve());
  closeDatabase();
  rmSync(tempRoot, { recursive: true, force: true });
}
