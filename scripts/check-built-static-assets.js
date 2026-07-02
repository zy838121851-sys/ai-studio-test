import fs from "node:fs";
import { mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = process.cwd();
const smokeRoot = resolve(ROOT, ".static-smoke");

process.env.NODE_ENV = "production";
process.env.PORT = process.env.PORT || "3000";
process.env.APP_BASE_URL = process.env.APP_BASE_URL || "https://ai-studio-static-smoke.example";
process.env.APIMART_MOCK = "false";
process.env.AUTH_CODE_PROVIDER = process.env.AUTH_CODE_PROVIDER || "aliyun";
process.env.DB_PATH = join(smokeRoot, "ai-studio-static-smoke.sqlite");
process.env.UPLOAD_DIR = join(smokeRoot, "uploads");

const { createServer } = await import("../src/server/index.js");
const { closeDatabase } = await import("../src/server/db/sqlite.js");

const errors = [];

function fail(message) {
  errors.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readText(filePath) {
  return fs.readFileSync(resolve(ROOT, filePath), "utf8");
}

function listen(app) {
  return new Promise((resolveListen, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolveListen(server));
    server.on("error", reject);
  });
}

function getBuiltAssetLinks() {
  const html = readText("dist/index.html");
  const stylesheetMatches = Array.from(html.matchAll(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi));
  const scriptMatches = Array.from(html.matchAll(/<script\s+[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*>/gi));
  return {
    stylesheets: stylesheetMatches.map((match) => match[1]),
    moduleScripts: scriptMatches.map((match) => match[1])
  };
}

async function requestAsset(baseUrl, assetPath) {
  const response = await fetch(`${baseUrl}${assetPath}`, {
    headers: {
      Accept: assetPath.endsWith(".css") ? "text/css,*/*" : "application/javascript,*/*"
    }
  });
  const text = await response.text();
  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    cacheControl: response.headers.get("cache-control") || "",
    text
  };
}

mkdirSync(smokeRoot, { recursive: true });
const app = createServer();
const server = await listen(app);

try {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const { stylesheets, moduleScripts } = getBuiltAssetLinks();

  assert(stylesheets.length === 1, `expected one built stylesheet link, found ${stylesheets.length}`);
  assert(moduleScripts.length === 1, `expected one built module script, found ${moduleScripts.length}`);

  for (const stylesheet of stylesheets) {
    const result = await requestAsset(baseUrl, stylesheet);
    assert(result.status === 200, `${stylesheet} returned ${result.status}`);
    assert(/^text\/css\b/i.test(result.contentType), `${stylesheet} returned content-type ${result.contentType}`);
    assert(!/^\s*<!doctype html/i.test(result.text), `${stylesheet} returned HTML fallback content`);
    assert(/max-age=31536000/.test(result.cacheControl), `${stylesheet} did not use immutable asset cache headers`);
  }

  for (const script of moduleScripts) {
    const result = await requestAsset(baseUrl, script);
    assert(result.status === 200, `${script} returned ${result.status}`);
    assert(/javascript/i.test(result.contentType), `${script} returned content-type ${result.contentType}`);
    assert(!/^\s*<!doctype html/i.test(result.text), `${script} returned HTML fallback content`);
    assert(/max-age=31536000/.test(result.cacheControl), `${script} did not use immutable asset cache headers`);
  }
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
  closeDatabase();
  rmSync(smokeRoot, { recursive: true, force: true });
}

if (errors.length > 0) {
  console.error("Built static asset check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Built static asset checks passed.");
