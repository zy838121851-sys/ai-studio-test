const STORAGE_PREFIX = "ai-studio";

export function readStorage(key, fallback = null) {
  try {
    const value = localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  localStorage.setItem(`${STORAGE_PREFIX}:${key}`, JSON.stringify(value));
}

export function removeStorage(key) {
  localStorage.removeItem(`${STORAGE_PREFIX}:${key}`);
}
