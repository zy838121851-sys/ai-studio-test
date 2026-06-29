export async function postJson(path, payload = {}) {
  const result = await requestJson(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (path === "/api/analyze-image") {
    window.dispatchEvent(new CustomEvent("ai-studio-credits-refresh"));
  }
  return result;
}

export async function patchJson(path, payload = {}) {
  return requestJson(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function deleteJson(path) {
  return requestJson(path, { method: "DELETE" });
}

export async function getJson(path) {
  return requestJson(path);
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Request failed: ${response.status}`);
    error.status = response.status;
    error.errorCode = data.errorCode || data.failureCode || "";
    error.errorMessage = data.errorMessage || data.failureMessage || data.message || "";
    error.failureCode = data.failureCode || data.errorCode || "";
    error.failureMessage = data.failureMessage || data.errorMessage || data.message || "";
    error.stage = data.stage || "";
    throw error;
  }
  return data;
}
