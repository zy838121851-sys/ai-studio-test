function sanitizeDetail(value) {
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !/(key|token|cookie|password|authorization|image|dataurl|body)/i.test(key))
      .map(([key, entry]) => [key, typeof entry === "string" && entry.length > 300 ? `${entry.slice(0, 300)}...` : entry])
  );
}

export function logInfo(message, detail = {}) {
  console.log(`[info] ${message}`, sanitizeDetail(detail));
}

export function logWarn(message, detail = {}) {
  console.warn(`[warn] ${message}`, sanitizeDetail(detail));
}

export function logError(message, error, detail = {}) {
  console.error(`[error] ${message}`, {
    ...sanitizeDetail(detail),
    error: error?.message || String(error || "")
  });
}
