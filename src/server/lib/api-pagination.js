export function normalizePaginationNumber(value, fallback = 0) {
  const number = Math.ceil(Number(value || fallback));
  return Number.isFinite(number) ? number : fallback;
}

export function normalizePaginationLimit(value, {
  fallback = 50,
  min = 1,
  max = 100
} = {}) {
  const limit = normalizePaginationNumber(value, fallback);
  return Math.min(max, Math.max(min, limit));
}

export function normalizePaginationOffset(value, {
  fallback = 0
} = {}) {
  const offset = normalizePaginationNumber(value, fallback);
  return Math.max(0, offset);
}
