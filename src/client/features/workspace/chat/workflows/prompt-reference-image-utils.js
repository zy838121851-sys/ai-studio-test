import { findActiveImageNode } from "./prompt-generation-metrics-utils.js";

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

export async function readSelectedImageReference(readImageSourceAsDataUrl, {
  root = globalThis.document,
  warn = console.warn
} = {}) {
  if (typeof readImageSourceAsDataUrl !== "function") return null;
  const node = findActiveImageNode(root);
  const image = node?.querySelector?.("img");
  const source = image?.currentSrc || image?.src || node?.dataset?.objectUrl || "";
  if (!source) return null;
  try {
    const dataUrl = await readImageSourceAsDataUrl(source);
    if (!dataUrl) return null;
    return {
      type: "image",
      name: node?.dataset?.title || node?.querySelector?.(".node-title")?.textContent?.trim?.() || "Selected canvas image",
      source: "canvas-selection",
      dataUrl
    };
  } catch (error) {
    warn?.("[conversation] Failed to read selected image reference", error);
    return null;
  }
}
