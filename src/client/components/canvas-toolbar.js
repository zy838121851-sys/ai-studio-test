export function initCanvasToolbar() {
  // TODO: migrate canvas tool rail and shape/text toolbar from legacy-app.js.
  return {};
}

export function setActiveRailButton(tool, root = document) {
  root.querySelectorAll(".rail-btn").forEach((item) => item.classList.remove("active"));
  if (tool) root.querySelector(`.rail-btn[data-tool="${tool}"]`)?.classList.add("active");
}

export function setActiveRailPanelButton(button, root = document) {
  root.querySelectorAll(".rail-btn").forEach((item) => item.classList.remove("active"));
  button?.classList.add("active");
}

export function setToolRailCollapsed(toolRail, toggleButton, collapsed) {
  toolRail?.classList.toggle("collapsed", collapsed);
  toggleButton?.setAttribute("aria-expanded", String(!collapsed));
  if (toggleButton) toggleButton.textContent = collapsed ? "☰" : "×";
}

export function toggleToolRailCollapsed(toolRail, toggleButton) {
  const collapsed = !toolRail?.classList.contains("collapsed");
  setToolRailCollapsed(toolRail, toggleButton, collapsed);
  return collapsed;
}
