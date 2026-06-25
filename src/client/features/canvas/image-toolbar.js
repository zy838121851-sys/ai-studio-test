export function createImageToolbar(onAction) {
  const toolbar = document.createElement("div");
  toolbar.className = "image-node-toolbar";
  toolbar.innerHTML = `
    <div class="image-toolbar-main">
      <button type="button" title="&#35009;&#21098;&#22270;&#29255;" aria-label="&#35009;&#21098;&#22270;&#29255;" data-toolbar-action="crop">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v12a3 3 0 0 0 3 3h12" /><path d="M3 6h12a3 3 0 0 1 3 3v12" /><path d="M9 3v3" /><path d="M3 9h3" /></svg>
        <span class="image-toolbar-label">&#35009;&#21098;</span>
      </button>
      <button type="button" title="&#25552;&#21319;&#28165;&#26224;&#24230;" aria-label="&#25552;&#21319;&#28165;&#26224;&#24230;" data-toolbar-action="upscale-menu">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.5l-1.7-4.5L6 9.3l4.3-1.7L12 3z" /><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" /><path d="M5 17h6" /><path d="M5 21h10" /></svg>
        <span class="image-toolbar-label">&#39640;&#28165;</span>
      </button>
      <button type="button" title="&#21435;&#38500;&#32972;&#26223;" aria-label="&#21435;&#38500;&#32972;&#26223;" data-toolbar-action="remove-bg">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="3" /><path d="M8 9h8" /><path d="M8 15h8" /><path d="M5 20L20 5" /></svg>
        <span class="image-toolbar-label">&#25248;&#22270;</span>
      </button>
      <button type="button" title="&#25193;&#23637;&#30011;&#38754;" aria-label="&#25193;&#23637;&#30011;&#38754;" data-toolbar-action="expand-image">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M4 9V4h5" /><path d="M15 4h5v5" /><path d="M20 15v5h-5" /><path d="M9 20H4v-5" /></svg>
        <span class="image-toolbar-label">&#25193;&#22270;</span>
      </button>
      <button type="button" title="&#32534;&#36753;&#25991;&#23383;" aria-label="&#32534;&#36753;&#25991;&#23383;" data-toolbar-action="edit-text">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14" /><path d="M12 5v14" /><path d="M8 19h8" /><path d="M4 9V5h16v4" /></svg>
        <span class="image-toolbar-label">&#25913;&#23383;</span>
      </button>
      <button class="image-toolbar-compare" type="button" title="&#23545;&#27604;&#20004;&#24352;&#22270;&#29255;" aria-label="&#23545;&#27604;&#20004;&#24352;&#22270;&#29255;" data-toolbar-action="compare-images">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="7" height="14" rx="2" /><rect x="13" y="5" width="7" height="14" rx="2" /><path d="M12 4v16" /></svg>
        <span class="image-toolbar-label">&#23545;&#27604;&#22270;&#29255;</span>
      </button>
    </div>
    <div class="image-toolbar-upscale-controls" role="group" aria-label="&#39640;&#28165;&#23610;&#23544;">
      <button class="image-toolbar-size-option selected" type="button" data-toolbar-action="upscale-size" data-upscale-size="2k" aria-pressed="true">2K</button>
      <button class="image-toolbar-size-option" type="button" data-toolbar-action="upscale-size" data-upscale-size="4k" aria-pressed="false">4K</button>
      <button class="image-toolbar-generate" type="button" data-toolbar-action="upscale-generate">&#29983;&#25104;</button>
    </div>
  `;
  toolbar.addEventListener("pointerdown", (event) => event.stopPropagation());
  toolbar.addEventListener("dblclick", (event) => event.stopPropagation());
  toolbar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-toolbar-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    onAction?.(button.dataset.toolbarAction, toolbar, button);
  });
  return toolbar;
}

export function closeOpenImageToolbarMenus(root = document) {
  root.querySelectorAll(".image-node-toolbar.menu-open, .image-node-toolbar.mode-upscale")
    .forEach((toolbar) => toolbar.classList.remove("menu-open", "mode-upscale"));
}
