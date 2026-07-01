export function normalizeText(value) {
  return String(value || "").trim();
}

export function requireText(value, message) {
  const text = normalizeText(value);
  if (text) return text;
  const error = new Error(message);
  error.status = 400;
  throw error;
}
