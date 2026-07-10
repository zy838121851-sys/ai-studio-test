import { mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const smokeRoot = resolve(ROOT, "data", "csp-production-policy");

process.env.NODE_ENV = "production";
process.env.PORT = "3000";
process.env.APP_BASE_URL = "https://ai-studio-csp.example.test";
process.env.APIMART_MOCK = "false";
process.env.AUTH_CODE_PROVIDER = "aliyun";
process.env.APIMART_API_KEY = "csp-production-policy-apimart-key";
process.env.DB_PATH = join(smokeRoot, "ai-studio-csp.sqlite");
process.env.UPLOAD_DIR = join(smokeRoot, "uploads");

const { createServer } = await import("../src/server/index.js");
const { closeDatabase } = await import("../src/server/db/sqlite.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function listen(app) {
  return new Promise((resolveListen, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolveListen(server));
    server.on("error", reject);
  });
}

mkdirSync(smokeRoot, { recursive: true });

const app = createServer();
const server = await listen(app);
const browser = await chromium.launch();

try {
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const pageErrors = [];
  const consoleErrors = [];
  const page = await browser.newPage();

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const healthResponse = await fetch(`${baseUrl}/health`);
  assert(healthResponse.status === 200, `production health should return 200, got ${healthResponse.status}`);
  assertProductionCsp(healthResponse.headers.get("content-security-policy") || "");

  const response = await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  assert(response?.status() === 200, `production app should return 200, got ${response?.status() || "no response"}`);
  assertProductionCsp(response.headers()["content-security-policy"] || "");

  await page.waitForFunction(() => document.body.classList.contains("app-ready"), null, { timeout: 6000 });
  await page.waitForTimeout(250);

  const bootState = await page.evaluate(() => ({
    ready: document.body.classList.contains("app-ready"),
    failed: document.body.classList.contains("app-boot-failed"),
    initialized: Boolean(window.AIStudio?.state?.getState?.()?.app?.initialized),
    hasCanvasController: Boolean(window.AIStudio?.canvasController),
    hasWorkspaceRuntime: Boolean(window.AIStudio?.workspaceRuntime)
  }));

  assert(bootState.ready, "production CSP startup did not reach app-ready state");
  assert(!bootState.failed, "production CSP startup entered app-boot-failed state");
  assert(bootState.initialized, "production CSP startup did not initialize window.AIStudio state");
  assert(bootState.hasCanvasController, "production CSP startup missing canvasController");
  assert(bootState.hasWorkspaceRuntime, "production CSP startup missing workspaceRuntime");

  const apiState = await page.evaluate(async () => {
    const health = await fetch("/api/health", { credentials: "include" });
    const providers = await fetch("/api/auth/providers", { credentials: "include" });
    return {
      healthStatus: health.status,
      providersStatus: providers.status
    };
  });
  assert(apiState.healthStatus === 200, `same-origin /api/health should return 200, got ${apiState.healthStatus}`);
  assert(apiState.providersStatus === 200, `same-origin /api/auth/providers should return 200, got ${apiState.providersStatus}`);
  assert(pageErrors.length === 0, `production CSP page errors: ${pageErrors.join(" | ")}`);

  const blockingConsoleErrors = consoleErrors.filter((message) =>
    /content security policy|unsafe-eval|refused to evaluate|app-boot-failed|uncaught|syntaxerror|referenceerror/i.test(message)
  );
  assert(
    blockingConsoleErrors.length === 0,
    `production CSP console errors: ${blockingConsoleErrors.join(" | ")}`
  );

  console.log("Production CSP policy checks passed.");
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
  closeDatabase();
  rmSync(smokeRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

function assertProductionCsp(csp) {
  assert(csp, "Content-Security-Policy header should be present in production");
  assert(csp.includes("script-src"), "production CSP should include script-src");
  assert(csp.includes("connect-src"), "production CSP should include connect-src");
  assert(!csp.includes("'unsafe-eval'"), "production CSP must not include unsafe-eval");
  assert(!getCspDirectiveValues(csp, "connect-src").includes("http:"), "production CSP connect-src must not include http:");
  assert(!getCspDirectiveValues(csp, "img-src").includes("http:"), "production CSP img-src must not include http:");
  assert(!getCspDirectiveValues(csp, "media-src").includes("http:"), "production CSP media-src must not include http:");
  assert(!getCspDirectiveValues(csp, "script-src").includes("'unsafe-inline'"), "production CSP script-src must not include unsafe-inline");
  assert(getCspDirectiveValues(csp, "style-src").includes("'unsafe-inline'"), "production CSP style-src should keep unsafe-inline until style work is complete");
}

function getCspDirectiveValues(csp, directive) {
  const entry = String(csp || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${directive} `));
  if (!entry) return [];
  return entry.split(/\s+/).slice(1);
}
