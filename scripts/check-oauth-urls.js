import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-oauth-"));
process.env.NODE_ENV = "test";
process.env.SQLITE_DB_PATH = join(tempRoot, "oauth.sqlite");
process.env.UPLOAD_DIR = join(tempRoot, "uploads");
process.env.PORT = "0";
process.env.APP_BASE_URL = "https://beta.example.test";
process.env.WECHAT_OAUTH_CLIENT_ID = "wechat-appid";
process.env.WECHAT_OAUTH_CLIENT_SECRET = "wechat-secret";
process.env.QQ_OAUTH_CLIENT_ID = "qq-appid";
process.env.QQ_OAUTH_CLIENT_SECRET = "qq-secret";

const { createServer } = await import("../src/server/index.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function start(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => resolve(server));
    server.on("error", reject);
  });
}

async function request(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    text: await response.text()
  };
}

let server;
try {
  server = await start(createServer());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const wechatStart = await request(baseUrl, "/api/auth/oauth/wechat/start?format=json");
  assert(wechatStart.status === 200, `wechat start expected 200, got ${wechatStart.status}`);
  const wechatPayload = JSON.parse(wechatStart.text);
  const wechatUrl = new URL(wechatPayload.authorizationUrl);
  assert(wechatUrl.hostname === "open.weixin.qq.com", "wechat auth host is wrong");
  assert(wechatUrl.searchParams.get("appid") === "wechat-appid", "wechat auth URL must use appid");
  assert(!wechatUrl.searchParams.has("client_id"), "wechat auth URL should not use client_id");
  assert(wechatUrl.hash === "#wechat_redirect", "wechat auth URL must include #wechat_redirect");

  const qqStart = await request(baseUrl, "/api/auth/oauth/qq/start?format=json");
  assert(qqStart.status === 200, `qq start expected 200, got ${qqStart.status}`);
  const qqPayload = JSON.parse(qqStart.text);
  const qqUrl = new URL(qqPayload.authorizationUrl);
  assert(qqUrl.hostname === "graph.qq.com", "qq auth host is wrong");
  assert(qqUrl.searchParams.get("client_id") === "qq-appid", "qq auth URL must use client_id");

  const wechatQr = await request(baseUrl, "/api/auth/oauth/wechat/qr.svg");
  assert(wechatQr.status === 200, `wechat QR expected 200, got ${wechatQr.status}`);
  assert(wechatQr.contentType.includes("image/svg+xml"), "wechat QR should return SVG");
  assert(wechatQr.text.includes("<svg"), "wechat QR response should contain svg markup");

  console.log("OAuth URL check passed.");
} finally {
  await new Promise((resolve) => server?.close(resolve) || resolve());
  rmSync(tempRoot, { recursive: true, force: true });
}
