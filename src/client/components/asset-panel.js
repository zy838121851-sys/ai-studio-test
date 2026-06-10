export function initAssetPanel() {
  // TODO: migrate floating asset library behavior from legacy-app.js.
  return {};
}

export function renderAssetLibrary({
  assetList,
  assets = [],
  escapeHtml = (value) => String(value ?? "")
} = {}) {
  if (!assetList) return;
  assetList.innerHTML = assets.map((asset) => `
    <article class="asset-item" draggable="true" data-id="${escapeHtml(asset.id)}" data-type="${escapeHtml(asset.type)}">
      <div class="asset-thumb">${escapeHtml(String(asset.type || "").toUpperCase())}</div>
      <div>
        <strong>${escapeHtml(asset.title)}</strong>
        <span>${escapeHtml(asset.desc)}</span>
      </div>
    </article>
  `).join("");

  assetList.querySelectorAll(".asset-item").forEach((item) => {
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", item.dataset.id);
    });
  });
}
