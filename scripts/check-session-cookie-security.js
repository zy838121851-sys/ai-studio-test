import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SESSION_COOKIE_NAME = "ai_studio_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

if (process.env.AI_STUDIO_COOKIE_CHECK_CHILD === "production") {
  await checkCookieFlags({ label: "production", nodeEnv: "production", expectSecure: true });
} else {
  await checkCookieFlags({ label: "test", nodeEnv: "test", expectSecure: false });
  checkProductionCookieFlags();
  console.log("Session cookie security checks passed.");
}

async function checkCookieFlags({ label, nodeEnv, expectSecure }) {
  const tempRoot = mkdtempSync(join(tmpdir(), `ai-studio-session-cookie-${label}-`));
  const originalEnv = snapshotEnv([
    "NODE_ENV",
    "PORT",
    "DB_PATH",
    "UPLOAD_DIR",
    "APP_BASE_URL",
    "APIMART_MOCK",
    "AUTH_CODE_PROVIDER",
    "ALIYUN_ACCESS_KEY_ID",
    "ALIYUN_ACCESS_KEY_SECRET",
    "ALIYUN_SMS_SIGN_NAME",
    "ALIYUN_SMS_TEMPLATE_CODE",
    "ALIYUN_DM_ACCOUNT_NAME"
  ]);
  let server = null;
  let closeDatabaseRef = null;

  try {
    configureEnv({ tempRoot, nodeEnv });
    const { createServer } = await import("../src/server/index.js");
    const { closeDatabase } = await import("../src/server/db/sqlite.js");
    closeDatabaseRef = closeDatabase;

    const app = createServer();
    server = await listen(app);
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const email = `cookie-${label}-${Date.now()}@example.test`;
    const password = "CookieCheckPass123!";

    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: `Cookie ${label}` })
    });
    const registerBody = await readJson(registerResponse);
    assert(registerResponse.status === 201, `${label} register should return 201, got ${registerResponse.status}: ${JSON.stringify(registerBody)}`);

    const sessionCookie = findCookie(registerResponse, SESSION_COOKIE_NAME);
    assertSessionCookie(sessionCookie, { expectSecure, label, clearCookie: false });

    const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookiePair(sessionCookie) }
    });
    assert(logoutResponse.status === 200, `${label} logout should return 200, got ${logoutResponse.status}`);
    const clearCookie = findCookie(logoutResponse, SESSION_COOKIE_NAME);
    assertSessionCookie(clearCookie, { expectSecure, label, clearCookie: true });
  } finally {
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
    restoreEnv(originalEnv);
    rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

function checkProductionCookieFlags() {
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AI_STUDIO_COOKIE_CHECK_CHILD: "production"
    },
    encoding: "utf8"
  });
  if (child.stdout) process.stdout.write(child.stdout);
  if (child.stderr) process.stderr.write(child.stderr);
  assert(child.status === 0, `production session cookie check failed with exit code ${child.status}`);
}

function configureEnv({ tempRoot, nodeEnv }) {
  process.env.NODE_ENV = nodeEnv;
  process.env.PORT = nodeEnv === "production" ? "3000" : "0";
  process.env.DB_PATH = join(tempRoot, "ai-studio.sqlite");
  process.env.UPLOAD_DIR = join(tempRoot, "uploads");
  process.env.APP_BASE_URL = nodeEnv === "production" ? "https://ai-studio.example.test" : "http://localhost:0";
  process.env.APIMART_MOCK = "false";
  process.env.AUTH_CODE_PROVIDER = nodeEnv === "production" ? "aliyun" : "mock";
  process.env.ALIYUN_ACCESS_KEY_ID = process.env.ALIYUN_ACCESS_KEY_ID || "cookie-check-key-id";
  process.env.ALIYUN_ACCESS_KEY_SECRET = process.env.ALIYUN_ACCESS_KEY_SECRET || "cookie-check-key-secret";
  process.env.ALIYUN_SMS_SIGN_NAME = process.env.ALIYUN_SMS_SIGN_NAME || "AI Studio";
  process.env.ALIYUN_SMS_TEMPLATE_CODE = process.env.ALIYUN_SMS_TEMPLATE_CODE || "SMS_COOKIE_CHECK";
  process.env.ALIYUN_DM_ACCOUNT_NAME = process.env.ALIYUN_DM_ACCOUNT_NAME || "noreply@example.test";
}

function listen(app) {
  return new Promise((resolve, reject) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
    started.on("error", reject);
  });
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function findCookie(response, name) {
  const cookies = getSetCookieValues(response);
  const cookie = cookies.find((value) => value.startsWith(`${name}=`));
  assert(cookie, `${name} Set-Cookie header should be present`);
  return cookie;
}

function getSetCookieValues(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get("set-cookie");
  return raw ? [raw] : [];
}

function assertSessionCookie(cookie, { expectSecure, label, clearCookie }) {
  const lower = cookie.toLowerCase();
  assert(lower.includes("httponly"), `${label} session cookie should be HttpOnly`);
  assert(lower.includes("samesite=lax"), `${label} session cookie should use SameSite=Lax`);
  assert(lower.includes("path=/"), `${label} session cookie should use Path=/`);
  if (expectSecure) {
    assert(hasCookieAttribute(cookie, "Secure"), `${label} session cookie should be Secure`);
  } else {
    assert(!hasCookieAttribute(cookie, "Secure"), `${label} session cookie should not be Secure`);
  }
  if (clearCookie) {
    assert(lower.includes(`${SESSION_COOKIE_NAME}=`), `${label} clear cookie should target the session cookie`);
    assert(lower.includes("expires=") || lower.includes("max-age=0"), `${label} clear cookie should expire the session cookie`);
    return;
  }
  assert(lower.includes(`max-age=${SESSION_MAX_AGE_SECONDS}`), `${label} session cookie should use a seven day Max-Age`);
}

function hasCookieAttribute(cookie, attribute) {
  return cookie
    .split(";")
    .map((part) => part.trim().toLowerCase())
    .includes(attribute.toLowerCase());
}

function cookiePair(cookie) {
  return cookie.split(";")[0];
}

function snapshotEnv(names) {
  return Object.fromEntries(names.map((name) => [name, process.env[name]]));
}

function restoreEnv(snapshot) {
  for (const [name, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}
