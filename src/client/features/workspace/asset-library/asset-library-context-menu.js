export function getAssetContextMenu(list) {
  return list?.querySelector?.("[data-asset-context-menu]") || null;
}

export function closeAssetContextMenu(list) {
  const menu = getAssetContextMenu(list);
  if (!menu) return false;
  menu.hidden = true;
  menu.dataset.assetId = "";
  menu.style.left = "";
  menu.style.top = "";
  menu.classList.remove("submenu-open");
  return true;
}

export function openAssetContextMenu({
  list,
  event,
  assetId = "",
  viewportWidth = globalThis.innerWidth,
  viewportHeight = globalThis.innerHeight
} = {}) {
  const menu = getAssetContextMenu(list);
  if (!menu || !assetId) return null;
  menu.hidden = false;
  menu.dataset.assetId = assetId;
  menu.classList.remove("submenu-open");
  const bounds = menu.getBoundingClientRect();
  const left = Math.max(12, Math.min(event?.clientX || 0, viewportWidth - bounds.width - 12));
  const top = Math.max(12, Math.min(event?.clientY || 0, viewportHeight - bounds.height - 12));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  return menu;
}

export function shouldCloseAssetContextMenuOnPointer({
  list,
  target
} = {}) {
  const menu = getAssetContextMenu(list);
  return Boolean(menu && !menu.hidden && !menu.contains(target));
}
