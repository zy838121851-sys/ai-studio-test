export function initCanvasToolbar({
  root = document,
  handlers = {}
} = {}) {
  if (!handlers || !Object.keys(handlers).length) return {};
  const {
    runCanvasTool = () => {},
    setShapeTool = () => {},
    applyTextStyle = () => {},
    toggleToolRailCollapsed = () => false,
    toolRail = null,
    toggleToolRail = null,
    textFontFamily = null,
    textFontWeight = null,
    textFontSize = null,
    textColorInput = null,
    textFormatToolbar = null,
    setActiveRailPanelButton = () => {}
  } = handlers;

  root.querySelectorAll(".rail-btn[data-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveRailPanelButton(button, root);
      runCanvasTool(button.dataset.tool);
    });
  });

  root.querySelectorAll("[data-shape-tool]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setShapeTool(button.dataset.shapeTool);
    });
  });

  textFontFamily?.addEventListener("change", () => {
    applyTextStyle({ fontFamily: textFontFamily.value });
  });

  textFontWeight?.addEventListener("change", () => {
    applyTextStyle({ fontWeight: textFontWeight.value });
  });

  textFontSize?.addEventListener("change", () => {
    applyTextStyle({ fontSize: `${textFontSize.value}px` });
  });

  textColorInput?.addEventListener("input", () => {
    textColorInput.closest(".text-color-picker")?.style.setProperty("--text-toolbar-color", textColorInput.value);
    applyTextStyle({ color: textColorInput.value });
  });

  textFormatToolbar?.querySelectorAll("[data-text-color]").forEach((button) => {
    button.addEventListener("click", () => {
      applyTextStyle({ color: button.dataset.textColor });
    });
  });

  textFormatToolbar?.querySelectorAll("[data-text-align]").forEach((button) => {
    button.addEventListener("click", () => {
      applyTextStyle({ textAlign: button.dataset.textAlign });
    });
  });

  toggleToolRail?.addEventListener("click", () => {
    toggleToolRailCollapsed(toolRail, toggleToolRail);
  });

  return {
    runCanvasToolbarBinding: () => true
  };
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
  if (toggleButton) toggleButton.textContent = collapsed ? "+" : "x";
}

export function toggleToolRailCollapsed(toolRail, toggleButton) {
  const collapsed = !toolRail?.classList.contains("collapsed");
  setToolRailCollapsed(toolRail, toggleButton, collapsed);
  return collapsed;
}
