export function getAssetPreviewSource(asset = {}) {
  return asset?.url || asset?.thumbnailUrl || asset?.thumbnail || "";
}

export function getAssetPreviewTitle(asset = {}) {
  return asset?.title || asset?.name || "";
}

export function ensureAssetPreviewOverlay({
  documentRef = globalThis.document,
  createOverlay,
  closePreview
} = {}) {
  let overlay = documentRef?.querySelector?.(".asset-preview-overlay");
  if (overlay || typeof createOverlay !== "function") return overlay || null;

  overlay = createOverlay();
  overlay.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-asset-preview]")) closePreview?.();
  });
  documentRef.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePreview?.();
  });
  documentRef.body.appendChild(overlay);
  return overlay;
}

export function showAssetPreviewOverlay({
  asset,
  documentRef = globalThis.document,
  createOverlay,
  closePreview
} = {}) {
  const src = getAssetPreviewSource(asset);
  if (!src) return null;
  const overlay = ensureAssetPreviewOverlay({ documentRef, createOverlay, closePreview });
  if (!overlay) return null;

  const titleText = getAssetPreviewTitle(asset);
  const image = overlay.querySelector("img");
  const title = overlay.querySelector(".asset-preview-title");
  if (image) {
    image.src = src;
    image.alt = titleText || "素材预览";
  }
  if (title) title.textContent = titleText;
  overlay.classList.add("open");
  return asset;
}

export function closeAssetPreviewOverlay(documentRef = globalThis.document) {
  documentRef?.querySelector?.(".asset-preview-overlay")?.classList.remove("open");
}
