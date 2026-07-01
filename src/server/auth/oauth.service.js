import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { execute, queryOne, sqlValue } from "../db/sqlite.js";
import { createHttpError } from "../lib/input-validation.js";
import { findOrCreateIdentityUser, publicUser } from "./identity.service.js";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const OAUTH_STATE_RETENTION_MS = 24 * 60 * 60 * 1000;

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
    throw createHttpError("Unsupported OAuth provider", 404);
  }
  if (!config.clientId() || !config.clientSecret()) {
    throw createHttpError(`${clean} OAuth is not configured`, 503);
  }
  return { provider: clean, config };
}

export function createOAuthStart(provider, { redirectTo = "/" } = {}) {
  const { provider: cleanProvider, config } = providerConfig(provider);
  const state = randomUUID();
  const now = Date.now();
  cleanupOAuthStates(now);
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
    expiresInSeconds: Math.floor(OAUTH_STATE_TTL_MS / 1000),
    authorizationUrl: `${config.authUrl}?${params.toString()}${config.authHash || ""}`
  };
}

export function cleanupOAuthStates(now = Date.now()) {
  execute(`
    DELETE FROM oauth_states
    WHERE (
        consumed_at IS NULL
        AND expires_at <= ${now}
      )
      OR (
        consumed_at IS NOT NULL
        AND consumed_at <= ${now - OAUTH_STATE_RETENTION_MS}
      );
  `);
}

function getPendingOAuthState(provider, state) {
  const now = Date.now();
  const row = queryOne(`
    SELECT state, redirect_to, expires_at, user_id
    FROM oauth_states
    WHERE state = ${sqlValue(state)}
      AND provider = ${sqlValue(provider)}
      AND consumed_at IS NULL
    LIMIT 1;
  `);
  if (!row || Number(row.expires_at || 0) <= now) {
    throw createHttpError("OAuth state is invalid or expired", 400);
  }
  return row;
}

function completeOAuthState(provider, state, userId) {
  const now = Date.now();
  execute(`
    UPDATE oauth_states
    SET
      user_id = ${sqlValue(userId)},
      completed_at = ${now},
      consumed_at = ${now}
    WHERE state = ${sqlValue(state)}
      AND provider = ${sqlValue(provider)};
  `);
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
    throw createHttpError("OAuth callback is missing code or state", 400);
  }
  const oauthState = getPendingOAuthState(cleanProvider, state);
  const redirectTo = oauthState.redirect_to || "/";
  let user;

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
    user = findOrCreateIdentityUser({
      provider: "wechat",
      identifier,
      name: profile.nickname || "WeChat user",
      displayName: profile.nickname || "",
      avatarUrl: profile.headimgurl || ""
    });
    completeOAuthState(cleanProvider, state, user.id);
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
  user = findOrCreateIdentityUser({
    provider: "qq",
    identifier: openId.openid,
    name: profile.nickname || "QQ user",
    displayName: profile.nickname || "",
    avatarUrl: profile.figureurl_qq_2 || profile.figureurl_qq_1 || ""
  });
  completeOAuthState(cleanProvider, state, user.id);
  return { user, redirectTo };
}

export function getOAuthStateStatus(provider, state) {
  const cleanProvider = String(provider || "").trim().toLowerCase();
  const cleanState = String(state || "").trim();
  if (!PROVIDERS[cleanProvider] || !cleanState) {
    throw createHttpError("OAuth state is invalid", 400);
  }

  const now = Date.now();
  const row = queryOne(`
    SELECT
      oauth_states.state,
      oauth_states.provider,
      oauth_states.expires_at,
      oauth_states.completed_at,
      oauth_states.session_issued_at,
      oauth_states.consumed_at,
      users.id,
      users.email,
      users.phone,
      users.name,
      users.created_at
    FROM oauth_states
    LEFT JOIN users ON users.id = oauth_states.user_id
    WHERE oauth_states.state = ${sqlValue(cleanState)}
      AND oauth_states.provider = ${sqlValue(cleanProvider)}
    LIMIT 1;
  `);
  if (!row) return { status: "expired" };
  if (Number(row.expires_at || 0) <= now) return { status: "expired" };
  if (row.id) {
    return {
      status: "authenticated",
      user: publicUser(row),
      sessionIssued: Boolean(row.session_issued_at)
    };
  }
  if (row.consumed_at) return { status: "failed" };
  return {
    status: "pending",
    expiresInSeconds: Math.max(0, Math.floor((Number(row.expires_at || 0) - now) / 1000))
  };
}

export function markOAuthStateSessionIssued(provider, state) {
  const cleanProvider = String(provider || "").trim().toLowerCase();
  const cleanState = String(state || "").trim();
  if (!PROVIDERS[cleanProvider] || !cleanState) return;
  execute(`
    UPDATE oauth_states
    SET session_issued_at = ${Date.now()}
    WHERE provider = ${sqlValue(cleanProvider)}
      AND state = ${sqlValue(cleanState)}
      AND session_issued_at IS NULL;
  `);
}
