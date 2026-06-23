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
    if (isPanelOpen(panel)) closePanel();
    else openPanel();
  };

  const render = (payload = getAssets(), providedList = getAssetList()) => {
    const assetList = providedList || getAssetList();
    const nextAssets = Array.isArray(payload) ? payload : (Array.isArray(payload?.assets) ? payload.assets : getAssets());
    const collections = Array.isArray(payload?.collections) ? payload.collections : [];
    const activeCollectionId = payload?.activeCollectionId || "";
    const assetPageMode = payload?.assetPageMode || "boards";
    const activeProjectId = payload?.activeProjectId || "";
    if (!assetList) return;
    renderAssetLibrary({
      assetList,
      assets: nextAssets,
      collections,
      activeCollectionId,
      assetPageMode,
      activeProjectId,
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
    const renderedList = render(payload, list);
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
      while (subscriptions.length) subscriptions.pop()?.();
    },
    get renderedAssets() {
      return rendered.slice();
    }
  };
}

export function renderAssetLibrary({
  assetList = document.querySelector("#assetList"),
  assets = [],
  collections = [],
  activeCollectionId = "",
  assetPageMode = "boards",
  activeProjectId = "",
  escapeHtml = (value) => String(value ?? "")
} = {}) {
  if (!assetList) return;
  if (assetList.classList.contains("assets-page-list")) {
    renderPinterestAssetLibrary({ assetList, assets, collections, activeCollectionId, assetPageMode, activeProjectId, escapeHtml });
    return;
  }

  const safeAssets = Array.isArray(assets) ? assets : [];
  const safeCollections = Array.isArray(collections) ? collections : [];
  const totalCount = safeCollections.reduce((total, collection) => total + Number(collection.assetCount || 0), 0);
  const collectionNav = renderCollectionNav({
    collections: safeCollections,
    activeCollectionId,
    totalCount: totalCount || safeAssets.length,
    escapeHtml
  });

  if (!safeAssets.length) {
    assetList.innerHTML = `
      ${collectionNav}
      <article class="asset-item asset-empty">
        <div class="asset-thumb">+</div>
        <div>
          <strong>素材库为空</strong>
          <span>上传或收藏图片后会显示在这里</span>
        </div>
      </article>
    `;
    return;
  }

  assetList.innerHTML = `
    ${collectionNav}
    ${safeAssets.map((asset) => renderCompactAssetCard({ asset, escapeHtml })).join("")}
  `;
}

function renderCompactAssetCard({ asset, escapeHtml }) {
  const thumb = asset.thumbnailUrl || asset.thumbnail || asset.url || "";
  const title = asset.title || asset.name || "Untitled asset";
  const desc = asset.collectionName || asset.collection || asset.prompt || asset.desc || asset.source || asset.type || "";
  return `
    <article class="asset-item" draggable="true" data-id="${escapeHtml(asset.id)}" data-type="${escapeHtml(asset.type)}">
      <button class="asset-thumb" type="button" data-insert-asset="${escapeHtml(asset.id)}" title="添加到画布">
        ${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(title)}" draggable="false" />` : escapeHtml(String(asset.type || "").toUpperCase())}
      </button>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(desc)}</span>
      </div>
      <button class="asset-delete" type="button" data-delete-asset="${escapeHtml(asset.id)}" aria-label="删除素材">×</button>
    </article>
  `;
}

function renderCollectionNav({
  collections = [],
  activeCollectionId = "",
  totalCount = 0,
  escapeHtml
}) {
  return `
    <div class="asset-board-bar">
      <button class="asset-board-chip ${activeCollectionId ? "" : "active"}" type="button" data-select-asset-collection="">
        全部 <span>${Number(totalCount || 0)}</span>
      </button>
      <button class="asset-board-create" type="button" data-create-asset-collection>+ 图板</button>
    </div>
    ${collections.length ? `
      <div class="asset-board-list">
        ${collections.map((collection) => renderCompactBoardCard({ collection, activeCollectionId, escapeHtml })).join("")}
      </div>
    ` : ""}
  `;
}

function renderCompactBoardCard({ collection, activeCollectionId, escapeHtml }) {
  const cover = collection.coverUrl || "";
  return `
    <article class="asset-board-card ${collection.id === activeCollectionId ? "active" : ""}">
      <button class="asset-board-cover" type="button" data-select-asset-collection="${escapeHtml(collection.id)}">
        ${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(collection.name)}" draggable="false" />` : `<span>${escapeHtml(String(collection.name || "?").slice(0, 1).toUpperCase())}</span>`}
      </button>
      <button class="asset-board-main" type="button" data-select-asset-collection="${escapeHtml(collection.id)}">
        <strong>${escapeHtml(collection.name)}</strong>
        <span>${Number(collection.assetCount || 0)} 个素材</span>
      </button>
      <button class="asset-board-action" type="button" title="重命名" data-rename-asset-collection="${escapeHtml(collection.id)}">...</button>
      <button class="asset-board-action" type="button" title="删除" data-delete-asset-collection="${escapeHtml(collection.id)}">×</button>
    </article>
  `;
}

function renderPinterestAssetLibraryPrevious({
  assetList,
  assets = [],
  collections = [],
  activeCollectionId = "",
  assetPageMode = "boards",
  escapeHtml
}) {
  const safeAssets = Array.isArray(assets) ? assets : [];
  const safeCollections = Array.isArray(collections) ? collections : [];
  const activeCollection = safeCollections.find((collection) => collection.id === activeCollectionId) || null;
  const totalCount = safeCollections.reduce((total, collection) => total + Number(collection.assetCount || 0), 0) || safeAssets.length;
  const normalizedMode = assetPageMode === "all" ? "all" : "boards";
  const isBoardHome = normalizedMode !== "all" && !activeCollectionId;

  assetList.innerHTML = `
    <div class="asset-pinterest-shell">
      <header class="asset-pinterest-profile">
        <h1>素材库</h1>
        ${renderAssetPageTabs({ activeTab: normalizedMode === "all" ? "all" : "boards" })}
      </header>

      ${isBoardHome
        ? renderPinterestBoardHome({ collections: safeCollections, totalCount, escapeHtml })
        : renderPinterestAssetGrid({ assets: safeAssets, activeCollection, totalCount, showBack: normalizedMode !== "all", escapeHtml })}
    </div>
  `;
}

function renderAssetPageTabs({ activeTab = "boards" } = {}) {
  return `
    <nav class="asset-pinterest-tabs" aria-label="素材库视图">
      <button class="${activeTab === "all" ? "active" : ""}" type="button" data-asset-page-mode="all">全部</button>
      <button class="${activeTab === "all" ? "" : "active"}" type="button" data-asset-page-mode="boards">图板</button>
    </nav>
  `;
}

function renderPinterestBoardHome({
  collections = [],
  totalCount = 0,
  escapeHtml
}) {
  return `
    <section class="asset-pinterest-boards-view" aria-label="素材图板">
      <div class="asset-pinterest-section-title">
        <strong>图板</strong>
        <span>${Number(collections.length || 0)} 个图板 · ${Number(totalCount || 0)} 个素材</span>
      </div>
      <div class="asset-pinterest-board-grid">
        ${collections.map((collection) => renderPinterestBoardTile({ collection, escapeHtml })).join("")}
        ${renderPinterestCreateBoardTile()}
      </div>
    </section>
  `;
}

function renderPinterestBoardTile({ collection, escapeHtml }) {
  const cover = collection.coverUrl || "";
  const count = Number(collection.assetCount || 0);
  return `
    <article class="asset-pinterest-board-tile">
      <button class="asset-pinterest-board-cover-large" type="button" data-select-asset-collection="${escapeHtml(collection.id)}" aria-label="打开图板">
        ${cover ? `
          <img src="${escapeHtml(cover)}" alt="${escapeHtml(collection.name)}" draggable="false" />
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        ` : `
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        `}
      </button>
      <button class="asset-pinterest-board-title" type="button" data-select-asset-collection="${escapeHtml(collection.id)}">
        <strong>${escapeHtml(collection.name)}</strong>
        <span>${count} 张图片</span>
      </button>
      <button class="asset-pinterest-board-delete" type="button" data-delete-asset-collection="${escapeHtml(collection.id)}" aria-label="删除图板">×</button>
    </article>
  `;
}

function renderPinterestCreateBoardTile() {
  return `
    <article class="asset-pinterest-board-tile asset-pinterest-board-create-tile">
      <button class="asset-pinterest-board-cover-large" type="button" data-create-asset-collection>
        <span>创建</span>
      </button>
      <button class="asset-pinterest-board-title" type="button" data-create-asset-collection>
        <strong>创建图板</strong>
        <span>整理你的素材</span>
      </button>
    </article>
  `;
}

function renderPinterestAssetGrid({
  assets = [],
  activeCollection,
  totalCount = 0,
  showBack = true,
  escapeHtml
}) {
  return `
    <section class="asset-pinterest-assets" aria-label="素材">
      <div class="asset-pinterest-section-title">
        ${showBack ? `<button class="asset-pinterest-back" type="button" data-asset-page-mode="boards">所有图板</button>` : ""}
        <strong>${escapeHtml(activeCollection?.name || "全部素材")}</strong>
        <span>${Number(activeCollection?.assetCount || totalCount || assets.length)} 个素材</span>
      </div>
      ${assets.length ? `
        <div class="asset-pinterest-masonry">
          ${assets.map((asset, index) => renderPinterestAssetCard({ asset, index, escapeHtml })).join("")}
        </div>
      ` : `
        <div class="asset-pinterest-empty">
          <strong>还没有素材</strong>
          <span>上传素材，或在画布中点击收藏按钮保存图片。</span>
        </div>
      `}
    </section>
  `;
}

function renderPinterestAssetCard({ asset, index, escapeHtml }) {
  const thumb = asset.thumbnailUrl || asset.thumbnail || asset.url || "";
  const title = asset.title || asset.name || "Untitled asset";
  const spanClass = index % 5 === 0 ? "tall" : (index % 4 === 0 ? "wide" : "");
  return `
    <article class="asset-pinterest-pin asset-item ${spanClass}" draggable="true" data-id="${escapeHtml(asset.id)}" data-type="${escapeHtml(asset.type)}">
      <button type="button" class="asset-pinterest-pin-thumb" data-preview-asset="${escapeHtml(asset.id)}" title="预览素材">
        ${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(title)}" draggable="false" />` : `<span>${escapeHtml(String(asset.type || "asset").toUpperCase())}</span>`}
      </button>
      <div class="asset-pinterest-pin-meta">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(asset.collectionName || asset.source || asset.type || "")}</span>
      </div>
      <button class="asset-pinterest-pin-delete" type="button" data-delete-asset="${escapeHtml(asset.id)}" aria-label="删除素材">×</button>
    </article>
  `;
}

function renderPinterestAssetLibrary({
  assetList,
  assets = [],
  collections = [],
  activeCollectionId = "",
  assetPageMode = "boards",
  activeProjectId = "",
  escapeHtml
}) {
  const safeAssets = Array.isArray(assets) ? assets : [];
  const safeCollections = Array.isArray(collections) ? collections : [];
  const activeCollection = safeCollections.find((collection) => collection.id === activeCollectionId) || null;
  const totalCount = safeCollections.reduce((total, collection) => total + Number(collection.assetCount || 0), 0) || safeAssets.length;
  const normalizedMode = normalizeAssetPageModeV2(assetPageMode);
  const recentAssets = filterRecentAssetsV2(safeAssets);
  const visibleAssets = activeCollectionId
    ? safeAssets
    : normalizedMode === "recent"
      ? recentAssets
      : safeAssets;
  const isBoardHome = normalizedMode === "boards" && !activeCollectionId;
  const assetTitle = activeCollection?.name
    || (normalizedMode === "recent" ? "最近收藏" : "全部素材");

  assetList.innerHTML = `
    <div class="asset-pinterest-shell">
      <header class="asset-pinterest-profile">
        <div class="asset-pinterest-heading">
          <h1>素材库</h1>
          <p>保存灵感、生成图、参考图和项目素材</p>
        </div>
        <button class="asset-pinterest-upload" type="button" data-upload-asset>上传素材</button>
      </header>

      ${renderAssetStatsV2({
        totalAssets: totalCount || safeAssets.length,
        boardCount: safeCollections.length,
        recentCount: recentAssets.length,
        escapeHtml
      })}

      ${renderAssetPageTabsV2({ activeTab: normalizedMode })}

      ${isBoardHome
        ? renderPinterestBoardHomeV2({ collections: safeCollections, assets: safeAssets, totalCount, escapeHtml })
        : renderPinterestAssetGridV2({
            assets: visibleAssets,
            activeCollection,
            title: assetTitle,
            totalCount: activeCollection ? activeCollection.assetCount : visibleAssets.length,
            showBack: Boolean(activeCollectionId),
            emptyContext: normalizedMode,
            escapeHtml
          })}
      ${renderAssetCardContextMenuV2({ collections: safeCollections, escapeHtml })}
    </div>
  `;
}

function normalizeAssetPageModeV2(mode = "boards") {
  return ["boards", "all", "recent"].includes(mode) ? mode : "boards";
}

function renderAssetStatsV2({
  totalAssets = 0,
  boardCount = 0,
  recentCount = 0,
  escapeHtml
}) {
  const stats = [
    { label: "全部素材", value: totalAssets, accent: "violet", delta: "+28 本周" },
    { label: "图板", value: boardCount, accent: "green", delta: "+3 本周" },
    { label: "最近收藏", value: recentCount, accent: "rose", delta: "+12 本周" }
  ];

  return `
    <section class="asset-pinterest-stats" aria-label="素材库概览">
      ${stats.map((stat) => `
        <article class="asset-stat-card asset-stat-${escapeHtml(stat.accent)}">
          <span class="asset-stat-icon" aria-hidden="true"></span>
          <div>
            <span>${escapeHtml(stat.label)}</span>
            <strong>${Number(stat.value || 0).toLocaleString()}</strong>
            <em>${escapeHtml(stat.delta)}</em>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}

function renderAssetPageTabsV2({ activeTab = "boards" } = {}) {
  const tabs = [
    ["boards", "图板"],
    ["all", "全部素材"],
    ["recent", "最近收藏"]
  ];

  return `
    <nav class="asset-pinterest-tabs" aria-label="素材库视图">
      ${tabs.map(([mode, label]) => `
        <button class="${activeTab === mode ? "active" : ""}" type="button" data-asset-page-mode="${mode}">${label}</button>
      `).join("")}
    </nav>
  `;
}

function renderPinterestBoardHomeV2({
  collections = [],
  assets = [],
  totalCount = 0,
  escapeHtml
}) {
  return `
    <section class="asset-pinterest-boards-view" aria-label="素材图板">
      <div class="asset-pinterest-section-title">
        <strong>图板</strong>
        <span>${Number(collections.length || 0)} 个图板 · ${Number(totalCount || 0)} 个素材</span>
      </div>
      <div class="asset-pinterest-board-grid">
        ${collections.map((collection) => renderPinterestBoardTileV2({
          collection,
          assets: assets.filter((asset) => String(asset.collectionId || asset.collection_id || "") === String(collection.id)),
          escapeHtml
        })).join("")}
        ${renderPinterestCreateBoardTileV2()}
      </div>
    </section>
  `;
}

function renderPinterestBoardTileV2({ collection, assets = [], escapeHtml }) {
  const count = Number(collection.assetCount || assets.length || 0);
  const covers = assets
    .map((asset) => asset.thumbnailUrl || asset.thumbnail || asset.url || "")
    .filter(Boolean)
    .slice(0, 3);
  if (!covers.length && collection.coverUrl) covers.push(collection.coverUrl);
  const coverCount = Math.min(covers.length, 3);
  const updatedText = formatRelativeTimeV2(collection.updatedAt || collection.updated_at);

  return `
    <article class="asset-pinterest-board-tile">
      <button class="asset-pinterest-board-cover-large ${coverCount ? `has-cover-count-${coverCount}` : "is-empty"}" type="button" data-select-asset-collection="${escapeHtml(collection.id)}" aria-label="打开图板">
        ${coverCount ? renderBoardCoverCellsV2({ covers: covers.slice(0, coverCount), name: collection.name, escapeHtml }) : renderEmptyBoardCoverV2()}
      </button>
      <button class="asset-pinterest-board-title" type="button" data-select-asset-collection="${escapeHtml(collection.id)}">
        <strong>${escapeHtml(collection.name)}</strong>
        <span>${count} 张图片 · ${escapeHtml(updatedText)}</span>
      </button>
      <button class="asset-pinterest-board-delete" type="button" data-delete-asset-collection="${escapeHtml(collection.id)}" aria-label="删除图板">×</button>
    </article>
  `;
}

function renderBoardCoverCellsV2({ covers, name, escapeHtml }) {
  return covers.map((cover, index) =>
    `<img class="asset-board-cover-cell asset-board-cover-cell-${index}" src="${escapeHtml(cover)}" alt="${escapeHtml(name || "图板封面")}" draggable="false" />`
  ).join("");
}

function renderEmptyBoardCoverV2() {
  return "";
}

function renderPinterestCreateBoardTileV2() {
  return `
    <article class="asset-pinterest-board-tile asset-pinterest-board-create-tile">
      <button class="asset-pinterest-board-create-card" type="button" data-create-asset-collection>
        <span aria-hidden="true">+</span>
        <strong>新建图板</strong>
        <em>整理你的灵感、参考图和生成结果</em>
      </button>
    </article>
  `;
}

function renderPinterestAssetGridV2({
  assets = [],
  activeCollection,
  title = "全部素材",
  totalCount = 0,
  showBack = true,
  emptyContext = "all",
  escapeHtml
}) {
  const emptyActions = `
    <div class="asset-pinterest-empty-actions">
      <button type="button" data-upload-asset>上传素材</button>
      <button type="button" data-create-asset-collection>新建图板</button>
    </div>
  `;

  return `
    <section class="asset-pinterest-assets" aria-label="素材">
      <div class="asset-pinterest-section-title">
        ${showBack ? `<button class="asset-pinterest-back" type="button" data-asset-page-mode="boards">所有图板</button>` : ""}
        <strong>${escapeHtml(title)}</strong>
        <span>${Number(totalCount || assets.length || 0)} 个素材</span>
      </div>
      ${assets.length ? `
        <div class="asset-pinterest-masonry">
          ${assets.map((asset, index) => renderPinterestAssetCardV2({ asset, index, escapeHtml })).join("")}
        </div>
      ` : `
        <div class="asset-pinterest-empty" data-empty-context="${escapeHtml(emptyContext)}">
          <span class="asset-empty-mark" aria-hidden="true"></span>
          <strong>还没有素材</strong>
          <span>上传图片，或把画布中的灵感收藏到这里</span>
          ${emptyActions}
        </div>
      `}
    </section>
  `;
}

function renderPinterestAssetCardV2({ asset, index, escapeHtml }) {
  const thumb = asset.thumbnailUrl || asset.thumbnail || asset.url || "";
  const title = asset.title || asset.name || "Untitled asset";
  const spanClass = index % 5 === 0 ? "tall" : (index % 4 === 0 ? "wide" : "");
  const placeholder = `<span class="asset-image-placeholder">${escapeHtml(String(asset.type || "asset").toUpperCase())}</span>`;
  return `
    <article class="asset-pinterest-pin asset-item ${spanClass}" draggable="true" data-id="${escapeHtml(asset.id)}" data-type="${escapeHtml(asset.type)}">
      <button type="button" class="asset-pinterest-pin-thumb" data-preview-asset="${escapeHtml(asset.id)}" title="预览素材">
        ${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(title)}" draggable="false" onerror="this.closest('.asset-pinterest-pin-thumb')?.classList.add('is-broken'); this.remove();" />${placeholder}` : placeholder}
      </button>
      <div class="asset-pinterest-pin-meta">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(asset.collectionName || asset.source || asset.type || "")}</span>
      </div>
      <button class="asset-pinterest-pin-delete" type="button" data-delete-asset="${escapeHtml(asset.id)}" aria-label="移除出素材库">×</button>
    </article>
  `;
}

function renderAssetCardContextMenuV2({ collections = [], escapeHtml }) {
  const safeCollections = Array.isArray(collections) ? collections : [];
  const moveItems = safeCollections.length
    ? safeCollections.map((collection) => `
        <button type="button" data-asset-menu-action="move" data-collection-id="${escapeHtml(collection.id)}">
          ${escapeHtml(collection.name || "未命名图板")}
        </button>
      `).join("")
    : `<span class="asset-card-context-empty">暂无图板</span>`;

  return `
    <div class="asset-card-context-menu" data-asset-context-menu hidden>
      <button class="asset-card-context-item" type="button" data-asset-menu-action="insert">
        <span class="asset-card-context-icon" aria-hidden="true">+</span>
        <strong>&#25554;&#20837;&#30011;&#24067;</strong>
      </button>
      <div class="asset-card-context-submenu">
        <button class="asset-card-context-item" type="button" data-asset-menu-action="move-open">
          <span class="asset-card-context-icon" aria-hidden="true">↗</span>
          <strong>&#31227;&#21160;&#21040;&#22270;&#26495;</strong>
          <span class="asset-card-context-arrow" aria-hidden="true">›</span>
        </button>
        <div class="asset-card-context-submenu-panel">
          <button type="button" data-asset-menu-action="move" data-collection-id="">未分组</button>
          ${moveItems}
        </div>
      </div>
      <button class="asset-card-context-item danger" type="button" data-asset-menu-action="delete">
        <span class="asset-card-context-icon" aria-hidden="true">×</span>
        <strong>&#31227;&#38500;&#20986;&#32032;&#26448;&#24211;</strong>
      </button>
    </div>
  `;
}

function filterRecentAssetsV2(assets = []) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return assets.filter((asset) => {
    const timestamp = readTimestampV2(asset.createdAt || asset.created_at || asset.updatedAt || asset.updated_at);
    return timestamp ? timestamp >= weekAgo : false;
  });
}

function readTimestampV2(value) {
  if (!value) return 0;
  if (typeof value === "number") return value > 100000000000 ? value : value * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatRelativeTimeV2(value) {
  const timestamp = readTimestampV2(value);
  if (!timestamp) return "最近更新";
  const diff = Math.max(0, Date.now() - timestamp);
  const day = 24 * 60 * 60 * 1000;
  if (diff < 60 * 60 * 1000) return "刚刚更新";
  if (diff < day) return `${Math.max(1, Math.round(diff / (60 * 60 * 1000)))} 小时前`;
  if (diff < day * 30) return `${Math.max(1, Math.round(diff / day))} 天前`;
  if (diff < day * 365) return `${Math.max(1, Math.round(diff / (day * 30)))} 个月前`;
  return `${Math.max(1, Math.round(diff / (day * 365)))} 年前`;
}
