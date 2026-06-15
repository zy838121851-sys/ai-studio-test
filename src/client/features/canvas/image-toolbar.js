export function createImageToolbar(onAction) {
  const toolbar = document.createElement("div");
  toolbar.className = "image-node-toolbar";
  toolbar.innerHTML = `
    <button type="button" title="Crop" aria-label="Crop" data-toolbar-action="crop">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M2 6h14a2 2 0 0 1 2 2v14" /></svg>
    </button>
    <button type="button" title="Upscale" aria-label="Upscale" data-toolbar-action="upscale-menu">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" /><path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15z" /></svg>
    </button>
    <button type="button" title="Remove background" aria-label="Remove background" data-toolbar-action="remove-bg">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /><path d="M7 3l14 14" /><path d="M3 7l14 14" /></svg>
    </button>
    <button type="button" title="Expand" aria-label="Expand" data-toolbar-action="expand-image">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5" /><path d="M16 3h5v5" /><path d="M21 16v5h-5" /><path d="M8 21H3v-5" /><path d="M3 3l6 6" /><path d="M21 3l-6 6" /><path d="M21 21l-6-6" /><path d="M3 21l6-6" /></svg>
    </button>
    <button type="button" title="Edit text" aria-label="Edit text" data-toolbar-action="edit-text">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14" /><path d="M12 5v14" /><path d="M8 19h8" /><path d="M4 9V5h16v4" /></svg>
    </button>
    <span class="toolbar-separator"></span>
    <button type="button" title="Add to assets" aria-label="Add to assets">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h6l2 3h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" /><path d="M16 13v5" /><path d="M13.5 15.5h5" /></svg>
    </button>
    <button type="button" class="toolbar-strong" title="Download" aria-label="Download" data-toolbar-action="download">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" /></svg>
    </button>
    <div class="image-toolbar-menu" role="menu" aria-label="Upscale size">
      <button type="button" data-toolbar-action="upscale-2k" title="Upscale to 2K">
        <strong>2K</strong>
        <small>HD</small>
      </button>
      <button type="button" data-toolbar-action="upscale-4k" title="Upscale to 4K">
        <strong>4K</strong>
        <small>Max</small>
      </button>
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
