export function normalizePaginationLimit(value, {
  fallback = 50,
  min = 1,
  max = 100
} = {}) {
  const limit = Math.ceil(Number(value || fallback));
  if (!Number.isFinite(limit)) return fallback;
  return Math.min(max, Math.max(min, limit));
}

export function normalizePaginationOffset(value, {
  fallback = 0
} = {}) {
  const offset = Math.ceil(Number(value || fallback));
  if (!Number.isFinite(offset)) return fallback;
  return Math.max(0, offset);
}
