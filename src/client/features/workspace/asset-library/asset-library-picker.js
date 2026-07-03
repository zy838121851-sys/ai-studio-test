export function getAvailableAssetPickerItems(items = []) {
  return Array.isArray(items) ? items.filter((asset) => asset?.id) : [];
}

export function getAssetPickerDisplay(asset = {}) {
  return {
    thumb: asset.thumbnailUrl || asset.thumbnail || asset.url || "",
    title: asset.title || asset.name || "Untitled asset",
    desc: asset.collectionName || asset.collection || asset.prompt || asset.desc || asset.source || asset.type || "",
    fallbackType: String(asset.type || "ASSET").slice(0, 5).toUpperCase()
  };
}

export function mountAssetPickerOverlay({
  documentRef = globalThis.document,
  picker,
  point = null,
  closePicker,
  insertAsset
} = {}) {
  if (!picker || !documentRef?.body) return null;
  const onKeyDown = (event) => {
    if (event.key === "Escape") closePicker?.();
  };
  picker.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-asset-picker]")) {
      closePicker?.();
      return;
    }
    const button = event.target.closest("[data-pick-asset]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    insertAsset?.(button.dataset.pickAsset, point);
    closePicker?.();
  });
  picker._assetPickerKeydown = onKeyDown;
  documentRef.addEventListener("keydown", onKeyDown, true);
  documentRef.body.appendChild(picker);
  return picker;
}

export function closeAssetPickerOverlay(documentRef = globalThis.document) {
  const picker = documentRef?.querySelector?.(".asset-picker-popover");
  if (!picker) return false;
  if (picker._assetPickerKeydown) {
    documentRef.removeEventListener("keydown", picker._assetPickerKeydown, true);
  }
  picker.remove();
  return true;
}
