const FALLBACK_CLASSNAME = "open";

export function initAssetPanel({
  eventBus = null,
  state = {},
  elements = {}
} = {}) {
  const {
    getAssetList = () => document.querySelector("#assetList"),
    getAssets = () => [],
    escapeHtml = (value) => String(value ?? ""),
    getFloatingLibrary = () => document.querySelector("#floatingLibrary"),
    isPanelOpen = (panel) => Boolean(panel?.classList.contains(FALLBACK_CLASSNAME)),
    setPanelOpen = () => {}
  } = state;

  const {
    floatingLibrary = getFloatingLibrary()
  } = elements;

  const panel = floatingLibrary;
  const rendered = [];
  const subscriptions = [];

  const openPanel = () => {
    if (!panel) return;
    panel.classList.add(FALLBACK_CLASSNAME);
    setPanelOpen(true);
  };

  const closePanel = () => {
    if (!panel) return;
    panel.classList.remove(FALLBACK_CLASSNAME);
    setPanelOpen(false);
  };

  const togglePanel = () => {
    if (isPanelOpen(panel)) {
      closePanel();
    } else {
      openPanel();
    }
  };

  const render = (assets = getAssets(), providedList = getAssetList()) => {
    const assetList = providedList || getAssetList();
    const nextAssets = Array.isArray(assets) ? assets : getAssets();
    if (!assetList) return;
    renderAssetLibrary({
      assetList,
      assets: nextAssets,
      escapeHtml
    });
    rendered.length = 0;
    nextAssets.forEach((asset) => rendered.push(asset));
    return assetList;
  };

  const bindDragHandlers = (assetList = getAssetList()) => {
    if (!assetList) return;
    assetList.querySelectorAll("[data-id]").forEach((item) => item.removeAttribute("draggable"));
    assetList.querySelectorAll(".asset-item").forEach((item) => {
      item.setAttribute("draggable", "true");
      item.addEventListener("dragstart", (event) => {
        const id = item.dataset.id;
        if (!id) return;
        event.dataTransfer?.setData("text/plain", String(id));
      });
    });
  };

  const renderAndBind = (payload = {}) => {
    const list = payload?.assetList ? payload.assetList : getAssetList();
    const assets = payload?.assets;
    const renderedList = render(assets, list);
    bindDragHandlers(renderedList);
    return renderedList;
  };

  if (eventBus?.on) {
    subscriptions.push(
      eventBus.on("assets:render", renderAndBind),
      eventBus.on("assets:open", openPanel),
      eventBus.on("assets:close", closePanel),
      eventBus.on("assets:toggle", togglePanel)
    );
  }

  return {
    render: renderAndBind,
    open: openPanel,
    close: closePanel,
    toggle: togglePanel,
    isOpen: () => isPanelOpen(panel),
    destroy: () => {
      while (subscriptions.length) {
        const unsubscribe = subscriptions.pop();
        unsubscribe?.();
      }
    },
    get renderedAssets() {
      return rendered.slice();
    }
  };
}

export function renderAssetLibrary({
  assetList = document.querySelector("#assetList"),
  assets = [],
  escapeHtml = (value) => String(value ?? "")
} = {}) {
  if (!assetList) return;
  const safeAssets = Array.isArray(assets) ? assets : [];
  assetList.innerHTML = safeAssets.map((asset) => `
    <article class="asset-item" draggable="true" data-id="${escapeHtml(asset.id)}" data-type="${escapeHtml(asset.type)}">
      <div class="asset-thumb">${escapeHtml(String(asset.type || "").toUpperCase())}</div>
      <div>
        <strong>${escapeHtml(asset.title)}</strong>
        <span>${escapeHtml(asset.desc)}</span>
      </div>
    </article>
  `).join("");

}
