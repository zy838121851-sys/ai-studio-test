import { mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const smokeRoot = resolve(ROOT, "data", "production-media-restore");
const appBaseUrl = "https://ai-studio-media.example.test";

process.env.NODE_ENV = "production";
process.env.PORT = "3000";
process.env.APP_BASE_URL = appBaseUrl;
process.env.APIMART_MOCK = "false";
process.env.AUTH_CODE_PROVIDER = "aliyun";
process.env.APIMART_API_KEY = "production-media-restore-apimart-key";
process.env.DB_PATH = join(smokeRoot, "ai-studio-media.sqlite");
process.env.UPLOAD_DIR = join(smokeRoot, "uploads");

const { createServer } = await import("../src/server/index.js");
const { closeDatabase } = await import("../src/server/db/sqlite.js");
const { createGeneratedAssetFromBuffer } = await import("../src/server/services/asset.service.js");

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
  const registered = await requestJson(baseUrl, "/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `media-restore-${Date.now()}@example.test`,
      password: "MediaRestorePass123!",
      name: "Media Restore"
    })
  });
  assert(registered.status === 201, `register should return 201, got ${registered.status}`);
  const cookie = getCookiePair(registered.response);
  const userId = registered.body?.user?.id;
  assert(userId, "registered user id should be present");

  const imageAsset = createGeneratedAssetFromBuffer(userId, {
    buffer: onePixelPng(),
    mimeType: "image/png",
    title: "Media restore image",
    type: "image",
    libraryVisible: true
  });
  const posterAsset = createGeneratedAssetFromBuffer(userId, {
    buffer: onePixelPng(),
    mimeType: "image/png",
    title: "Media restore poster",
    type: "image",
    libraryVisible: true
  });

  const legacyImageUrl = `${appBaseUrl.replace("https://", "http://")}${imageAsset.url}`;
  const legacyPosterUrl = `${appBaseUrl.replace("https://", "http://")}${posterAsset.url}`;
  const snapshotJson = JSON.stringify({
    version: 1,
    savedAt: Date.now(),
    nodes: [
      {
        kind: "image",
        className: "node-card node-image",
        html: `<figure><img src="${legacyImageUrl}" /></figure>`,
        dataset: { objectUrl: legacyImageUrl },
        media: { url: legacyImageUrl, name: "Media restore image", type: "image/png" }
      },
      {
        kind: "video",
        className: "node-card node-video",
        html: `<video src="${legacyImageUrl}" poster="${legacyPosterUrl}"></video>`,
        dataset: { objectUrl: legacyImageUrl, posterUrl: legacyPosterUrl },
        media: { url: legacyImageUrl, name: "Media restore video", type: "video/mp4" }
      }
    ]
  });

  const created = await requestJson(baseUrl, "/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      title: "Production Media Restore",
      thumbnail: legacyImageUrl,
      itemCount: 2,
      canvasSnapshotJson: snapshotJson
    })
  });
  assert(created.status === 201, `project create should return 201, got ${created.status}`);
  const project = created.body?.project;
  assert(project?.thumbnail === imageAsset.url, "project thumbnail should be normalized to a relative upload URL");

  const opened = await requestJson(baseUrl, `/api/projects/${encodeURIComponent(project.id)}`, {
    headers: { Cookie: cookie }
  });
  assert(opened.status === 200, `project open should return 200, got ${opened.status}`);
  const openedProject = opened.body?.project;
  const openedSnapshot = JSON.parse(openedProject.canvasSnapshotJson);
  const snapshotText = JSON.stringify(openedSnapshot);
  assert(!snapshotText.includes("http://"), "persisted project snapshot should not contain same-host HTTP media URLs");
  assert(snapshotText.includes(imageAsset.url), "persisted project snapshot should contain relative image URL");
  assert(snapshotText.includes(posterAsset.url), "persisted project snapshot should contain relative poster URL");

  const imageResponse = await fetch(`${baseUrl}${imageAsset.url}`, { headers: { Cookie: cookie } });
  assert(imageResponse.status === 200, `protected image should return 200, got ${imageResponse.status}`);
  assert(/^image\/png\b/i.test(imageResponse.headers.get("content-type") || ""), "protected image should return image/png");

  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ Cookie: cookie });
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.classList.contains("app-ready"), null, { timeout: 6000 });
  const mediaState = await page.evaluate(async ({ imageUrl, posterUrl }) => {
    function loadImage(src) {
      return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve({ ok: true, width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => resolve({ ok: false, width: 0, height: 0 });
        image.src = src;
      });
    }
    const image = await loadImage(imageUrl);
    const poster = await loadImage(posterUrl);
    return { image, poster };
  }, {
    imageUrl: imageAsset.url,
    posterUrl: posterAsset.url
  });
  assert(mediaState.image.ok, "browser should load relative protected image URL under production CSP");
  assert(mediaState.poster.ok, "browser should load relative protected video poster URL under production CSP");

  console.log("Production media restore checks passed.");
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
  closeDatabase();
  rmSync(smokeRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, status: response.status, body };
}

function getCookiePair(response) {
  const cookie = response.headers.getSetCookie?.()[0] || response.headers.get("set-cookie") || "";
  assert(cookie, "session cookie should be present");
  return cookie.split(";")[0];
}

function onePixelPng() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64"
  );
}
