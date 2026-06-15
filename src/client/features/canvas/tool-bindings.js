export function bindCanvasToolControls({
  root = document,
  elements = {},
  actions = {}
} = {}) {
  const {
    textFontFamily,
    textFontWeight,
    textFontSize,
    textColorInput,
    textFormatToolbar,
    toolRail,
    toggleToolRail
  } = elements;

  const {
    setActiveRailPanelButton = () => {},
    runCanvasTool = () => {},
    setShapeTool = () => {},
    applyTextStyle = () => {},
    toggleToolRailCollapsed = () => {}
  } = actions;

  root.querySelectorAll(".rail-btn[data-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveRailPanelButton(button);
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
}

