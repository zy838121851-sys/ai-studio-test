export function isImageFile(file) {
  const name = String(file?.name || "").toLowerCase();
  return Boolean(
    file?.type?.startsWith("image/") ||
      /\.(?:png|jpe?g|webp|gif|bmp|heic|heif|avif)$/i.test(name)
  );
}

export function isVideoFile(file) {
  return Boolean(file?.type?.startsWith("video/"));
}

export const MODEL_FILE_EXTENSIONS = Object.freeze([".glb", ".gltf", ".obj", ".fbx", ".stl", ".usdz"]);

export function isModelFile(file, extensions = MODEL_FILE_EXTENSIONS) {
  const name = String(file?.name || "").toLowerCase();
  return extensions.some((extension) => name.endsWith(extension));
}

export function getUploadKind(file) {
  if (isImageFile(file)) return "image";
  if (isVideoFile(file)) return "video";
  if (isModelFile(file)) return "model";
  return null;
}

export function getImageFiles(files) {
  return Array.from(files || []).filter(isImageFile);
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function imageSourceToDataUrl(src) {
  if (!src) throw new Error("Missing image source");
  if (src.startsWith("data:")) return src;
  const url = new URL(src, window.location.href);
  const isSameOrigin = url.origin === window.location.origin;
  if (!isSameOrigin && /^https?:$/i.test(url.protocol)) return src;
  const response = await fetch(url.href, { credentials: "include" });
  if (!response.ok) throw new Error("Unable to read image source");
  const blob = await response.blob();
  return fileToDataUrl(blob);
}

export function getFileExtension(fileName = "") {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}
