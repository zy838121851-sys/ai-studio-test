export function isImageFile(file) {
  return Boolean(file?.type?.startsWith("image/"));
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
  if (src.startsWith("data:") || /^https?:\/\//i.test(src)) return src;
  const response = await fetch(src);
  const blob = await response.blob();
  return fileToDataUrl(blob);
}

export function getFileExtension(fileName = "") {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}
