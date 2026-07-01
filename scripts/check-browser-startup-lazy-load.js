import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-browser-startup-"));

process.env.NODE_ENV = "test";
process.env.DASHSCOPE_API_KEY = "";
process.env.APIMART_MOCK = "true";
process.env.DB_PATH = join(tempRoot, "browser-startup.sqlite");
process.env.UPLOAD_DIR = join(tempRoot, "uploads");
process.env.PORT = "0";

const LAZY_RUNTIME_MARKERS = [
  "/src/client/features/canvas/model-viewer.js",
  "/src/client/features/canvas/workflows/image-edit-workflow.js",
  "/src/client/features/canvas/workflows/image-generator-workflow.js",
  "/src/client/features/canvas/workflows/video-generator-workflow.js",
  "/vendor/three/"
];

const { createServer } = await import("../src/server/index.js");
const { closeDatabase } = await import("../src/server/db/sqlite.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

const app = createServer();
const server = await listen(app);
const browser = await chromium.launch();

try {
  const port = server.address().port;
  const requestedUrls = [];
  const pageErrors = [];
  const consoleErrors = [];
  const page = await browser.newPage();

  page.on("request", (request) => {
    requestedUrls.push(request.url());
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.classList.contains("app-ready"), null, { timeout: 6000 });
  await page.waitForTimeout(250);

  const bootState = await page.evaluate(() => ({
    ready: document.body.classList.contains("app-ready"),
    failed: document.body.classList.contains("app-boot-failed"),
    initialized: Boolean(window.AIStudio?.state?.getState?.()?.app?.initialized),
    hasCanvasController: Boolean(window.AIStudio?.canvasController),
    hasWorkspaceRuntime: Boolean(window.AIStudio?.workspaceRuntime)
  }));

  assert(bootState.ready, "browser startup did not reach app-ready state");
  assert(!bootState.failed, "browser startup entered app-boot-failed state");
  assert(bootState.initialized, "window.AIStudio state was not initialized");
  assert(bootState.hasCanvasController, "window.AIStudio canvasController missing");
  assert(bootState.hasWorkspaceRuntime, "window.AIStudio workspaceRuntime missing");
  assert(pageErrors.length === 0, `browser startup page errors: ${pageErrors.join(" | ")}`);

  const unexpectedLazyRequests = requestedUrls.filter((url) =>
    LAZY_RUNTIME_MARKERS.some((marker) => url.includes(marker))
  );
  assert(
    unexpectedLazyRequests.length === 0,
    `startup loaded lazy runtime modules too early: ${unexpectedLazyRequests.join(", ")}`
  );

  const failedConsoleErrors = consoleErrors.filter((message) =>
    /failed to initialize|app-boot-failed|uncaught|syntaxerror|typeerror|referenceerror/i.test(message)
  );
  assert(
    failedConsoleErrors.length === 0,
    `browser startup console errors: ${failedConsoleErrors.join(" | ")}`
  );

  console.log("Browser startup lazy-load checks passed.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  closeDatabase();
  rmSync(tempRoot, { recursive: true, force: true });
}
