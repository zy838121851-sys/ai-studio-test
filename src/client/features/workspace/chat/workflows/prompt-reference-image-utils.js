export async function imageSourceToDataUrl(source = "", {
  fetchImpl = globalThis.fetch,
  blobToDataUrlImpl = blobToDataUrl
} = {}) {
  const src = String(source || "");
  if (!src) return "";
  if (src.startsWith("data:")) return src;
  const response = await fetchImpl(src);
  if (!response.ok) throw new Error(`preview fetch failed: ${response.status}`);
  const blob = await response.blob();
  return blobToDataUrlImpl(blob);
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("blob read failed"));
    reader.readAsDataURL(blob);
  });
}

export function inferMimeTypeFromDataUrl(dataUrl = "") {
  const match = String(dataUrl || "").match(/^data:([^;,]+)/);
  return match?.[1] || "";
}
