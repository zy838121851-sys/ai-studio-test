import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { execute, queryOne, sqlValue } from "../db/sqlite.js";
import { findOrCreateIdentityUser } from "./identity.service.js";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const PROVIDERS = {
  wechat: {
    authUrl: "https://open.weixin.qq.com/connect/qrconnect",
    clientIdParam: "appid",
    authHash: "#wechat_redirect",
    tokenUrl: "https://api.weixin.qq.com/sns/oauth2/access_token",
    userUrl: "https://api.weixin.qq.com/sns/userinfo",
    scope: "snsapi_login",
    clientId: () => env.wechatOAuthClientId,
    clientSecret: () => env.wechatOAuthClientSecret,
    redirectUri: () => env.wechatOAuthRedirectUri || `${env.appBaseUrl}/api/auth/oauth/wechat/callback`
  },
  qq: {
    authUrl: "https://graph.qq.com/oauth2.0/authorize",
    tokenUrl: "https://graph.qq.com/oauth2.0/token",
    openIdUrl: "https://graph.qq.com/oauth2.0/me",
    userUrl: "https://graph.qq.com/user/get_user_info",
    scope: "get_user_info",
    clientId: () => env.qqOAuthClientId,
    clientSecret: () => env.qqOAuthClientSecret,
    redirectUri: () => env.qqOAuthRedirectUri || `${env.appBaseUrl}/api/auth/oauth/qq/callback`
  }
};

function providerConfig(provider) {
  const clean = String(provider || "").trim().toLowerCase();
  const config = PROVIDERS[clean];
  if (!config) {
    const error = new Error("Unsupported OAuth provider");
    error.status = 404;
    throw error;
  }
  if (!config.clientId() || !config.clientSecret()) {
    const error = new Error(`${clean} OAuth is not configured`);
    error.status = 503;
    throw error;
  }
  return { provider: clean, config };
}

export function createOAuthStart(provider, { redirectTo = "/" } = {}) {
  const { provider: cleanProvider, config } = providerConfig(provider);
  const state = randomUUID();
  const now = Date.now();
  execute(`
    INSERT INTO oauth_states (state, provider, redirect_to, expires_at, consumed_at, created_at)
    VALUES (
      ${sqlValue(state)},
      ${sqlValue(cleanProvider)},
      ${sqlValue(String(redirectTo || "/"))},
      ${now + OAUTH_STATE_TTL_MS},
      NULL,
      ${now}
    );
  `);

  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: config.redirectUri(),
    scope: config.scope,
    state
  });
  params.set(config.clientIdParam || "client_id", config.clientId());

  return {
    provider: cleanProvider,
    state,
    authorizationUrl: `${config.authUrl}?${params.toString()}${config.authHash || ""}`
  };
}

function consumeOAuthState(provider, state) {
  const now = Date.now();
  const row = queryOne(`
    SELECT state, redirect_to, expires_at
    FROM oauth_states
    WHERE state = ${sqlValue(state)}
      AND provider = ${sqlValue(provider)}
      AND consumed_at IS NULL
    LIMIT 1;
  `);
  if (!row || Number(row.expires_at || 0) <= now) {
    const error = new Error("OAuth state is invalid or expired");
    error.status = 400;
    throw error;
  }
  execute(`
    UPDATE oauth_states
    SET consumed_at = ${now}
    WHERE state = ${sqlValue(state)};
  `);
  return row.redirect_to || "/";
}

function parseQQCallback(text = "") {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : JSON.parse(text);
}

async function fetchJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) throw new Error(`OAuth upstream failed: ${response.status}`);
  try {
    return JSON.parse(text);
  } catch {
    return parseQQCallback(text);
  }
}

export async function handleOAuthCallback(provider, { code, state } = {}) {
  const { provider: cleanProvider, config } = providerConfig(provider);
  if (!code || !state) {
    const error = new Error("OAuth callback is missing code or state");
    error.status = 400;
    throw error;
  }
  const redirectTo = consumeOAuthState(cleanProvider, state);

  if (cleanProvider === "wechat") {
    const tokenParams = new URLSearchParams({
      appid: config.clientId(),
      secret: config.clientSecret(),
      code,
      grant_type: "authorization_code"
    });
    const token = await fetchJson(`${config.tokenUrl}?${tokenParams.toString()}`);
    if (!token.openid || !token.access_token) throw new Error("WeChat OAuth token response is invalid");
    const userParams = new URLSearchParams({
      access_token: token.access_token,
      openid: token.openid,
      lang: "zh_CN"
    });
    const profile = await fetchJson(`${config.userUrl}?${userParams.toString()}`);
    const identifier = profile.unionid || profile.openid || token.unionid || token.openid;
    const user = findOrCreateIdentityUser({
      provider: "wechat",
      identifier,
      name: profile.nickname || "WeChat user",
      displayName: profile.nickname || "",
      avatarUrl: profile.headimgurl || ""
    });
    return { user, redirectTo };
  }

  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId(),
    client_secret: config.clientSecret(),
    code,
    redirect_uri: config.redirectUri(),
    fmt: "json"
  });
  const token = await fetchJson(`${config.tokenUrl}?${tokenParams.toString()}`);
  if (!token.access_token) throw new Error("QQ OAuth token response is invalid");
  const openIdParams = new URLSearchParams({ access_token: token.access_token, fmt: "json" });
  const openId = await fetchJson(`${config.openIdUrl}?${openIdParams.toString()}`);
  if (!openId.openid) throw new Error("QQ OAuth openid response is invalid");
  const userParams = new URLSearchParams({
    access_token: token.access_token,
    oauth_consumer_key: config.clientId(),
    openid: openId.openid,
    fmt: "json"
  });
  const profile = await fetchJson(`${config.userUrl}?${userParams.toString()}`);
  const user = findOrCreateIdentityUser({
    provider: "qq",
    identifier: openId.openid,
    name: profile.nickname || "QQ user",
    displayName: profile.nickname || "",
    avatarUrl: profile.figureurl_qq_2 || profile.figureurl_qq_1 || ""
  });
  return { user, redirectTo };
}
