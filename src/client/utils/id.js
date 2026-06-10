let seed = 0;

export function createId(prefix = "id") {
  seed += 1;
  return `${prefix}-${Date.now().toString(36)}-${seed.toString(36)}`;
}
