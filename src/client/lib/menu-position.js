export function positionFloatingMenu({ menu, trigger, minLeft = 12, offsetY = 10 }) {
  if (!menu || !trigger) return;
  const rect = trigger.getBoundingClientRect();
  menu.style.left = `${Math.max(minLeft, rect.left)}px`;
  menu.style.top = `${rect.bottom + offsetY}px`;
}

export function closeMenuWhenOutside({ event, menu, menuSelector, triggerSelector }) {
  if (!menu) return;
  if (!event.target.closest(menuSelector) && !event.target.closest(triggerSelector)) {
    menu.classList.remove("open");
  }
}

export function showViewportMenu({
  menu,
  clientX,
  clientY,
  viewport,
  width,
  height,
  margin = 18
}) {
  if (!menu || !viewport) return;
  const viewportRect = viewport.getBoundingClientRect();
  const left = Math.min(clientX - viewportRect.left, viewportRect.width - width - margin);
  const top = Math.min(clientY - viewportRect.top, viewportRect.height - height - margin);
  menu.style.left = `${Math.max(margin, left)}px`;
  menu.style.top = `${Math.max(margin, top)}px`;
  menu.classList.add("open");
}
