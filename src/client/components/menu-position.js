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
