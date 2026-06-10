export function normalizeUploadMetadata(file = {}) {
  return {
    name: file.name || "",
    type: file.type || "",
    size: Number(file.size || 0)
  };
}
