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

export function logout() {
  return requestJson("/api/auth/logout", { method: "POST" });
}
