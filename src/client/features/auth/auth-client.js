async function requestJson(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error("无法连接认证服务，请确认 npm run dev 正在运行");
  }

  const text = await response.text();
  const payload = parseJson(text);
  if (!response.ok) {
    const fallback = response.status === 404
      ? "认证接口不可用，请重启开发服务"
      : "请求失败";
    const error = new Error(payload.message || fallback);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function parseJson(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function getCurrentUser() {
  return requestJson("/api/auth/me");
}

export function getAuthProviders() {
  return requestJson("/api/auth/providers");
}

export function login({ email, password }) {
  return requestJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function register({ email, password, name }) {
  return requestJson("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name })
  });
}

export function sendAuthCode({ channel, target, purpose = "login" }) {
  return requestJson("/api/auth/code/send", {
    method: "POST",
    body: JSON.stringify({ channel, target, purpose })
  });
}

export function verifyAuthCode({ channel, target, code, name, purpose = "login" }) {
  return requestJson("/api/auth/code/verify", {
    method: "POST",
    body: JSON.stringify({ channel, target, code, name, purpose })
  });
}

export function createOAuthQr(provider) {
  return requestJson(`/api/auth/oauth/${provider}/qr`);
}

export function getOAuthStatus(provider, state) {
  return requestJson(`/api/auth/oauth/${provider}/status/${encodeURIComponent(state)}`);
}

export function getCreditBalance() {
  return requestJson("/api/credits/balance");
}

export function getCreditTransactions({ limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });
  return requestJson(`/api/credits/transactions?${params.toString()}`);
}

export function startOAuth(provider) {
  window.location.href = `/api/auth/oauth/${provider}/start`;
}

export function logout() {
  return requestJson("/api/auth/logout", { method: "POST" });
}
