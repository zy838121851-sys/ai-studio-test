export function normalizeText(value) {
  return String(value || "").trim();
}

export function normalizeBoundedText(value = "", maxLength = 12000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function createHttpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function requireText(value, message) {
  const text = normalizeText(value);
  if (text) return text;
  throw createHttpError(message, 400);
}
