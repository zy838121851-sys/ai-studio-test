export function createImageToolbar(onAction) {
  const toolbar = document.createElement("div");
  toolbar.className = "image-node-toolbar";
  toolbar.innerHTML = `
    <button type="button" title="裁剪" aria-label="裁剪" data-toolbar-action="crop">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M2 6h14a2 2 0 0 1 2 2v14" /></svg>
    </button>
    <button type="button" title="放大" aria-label="放大" data-toolbar-action="zoom">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /><path d="M10.5 7.5v6" /><path d="M7.5 10.5h6" /></svg>
    </button>
    <button type="button" title="移除背景" aria-label="移除背景" data-toolbar-action="remove-bg">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /><path d="M7 3l14 14" /><path d="M3 7l14 14" /></svg>
    </button>
    <button type="button" title="扩展" aria-label="扩展" data-toolbar-action="expand-image">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5" /><path d="M16 3h5v5" /><path d="M21 16v5h-5" /><path d="M8 21H3v-5" /><path d="M3 3l6 6" /><path d="M21 3l-6 6" /><path d="M21 21l-6-6" /><path d="M3 21l6-6" /></svg>
    </button>
    <button type="button" title="编辑文字" aria-label="编辑文字" data-toolbar-action="edit-text">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14" /><path d="M12 5v14" /><path d="M8 19h8" /><path d="M4 9V5h16v4" /></svg>
    </button>
    <span class="toolbar-separator"></span>
    <button type="button" title="加入资产" aria-label="加入资产">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h6l2 3h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" /><path d="M16 13v5" /><path d="M13.5 15.5h5" /></svg>
    </button>
    <button type="button" class="toolbar-strong" title="下载" aria-label="下载" data-toolbar-action="download">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" /></svg>
    </button>
    <div class="image-toolbar-menu" role="menu">
      <button type="button" data-toolbar-action="expand-image"><span>□</span>扩图</button>
      <button type="button"><span>○</span>擦除</button>
      <button type="button"><span>↗</span>标注</button>
      <button type="button"><span>HD</span>增强</button>
      <button type="button"><span>↔</span>调整像素</button>
      <button type="button"><span>□</span>抠图</button>
      <button type="button"><span>□</span>快速切分<small>2x2 3x3 4x4</small></button>
      <button type="button"><span>◆</span>Seedance 2.0 合规验证</button>
    </div>
  `;
  toolbar.addEventListener("pointerdown", (event) => event.stopPropagation());
  toolbar.addEventListener("dblclick", (event) => event.stopPropagation());
  toolbar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-toolbar-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    onAction?.(button.dataset.toolbarAction, toolbar);
  });
  return toolbar;
}

export function closeOpenImageToolbarMenus(root = document) {
  root.querySelectorAll(".image-node-toolbar.menu-open").forEach((toolbar) => toolbar.classList.remove("menu-open"));
}
