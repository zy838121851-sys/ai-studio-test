export function initCanvasToolbar({
  root = document,
  handlers = {}
} = {}) {
  if (!handlers || typeof handlers !== "object") return {};

  const dispatcher = (type, detail = {}) => {
    if (handlers?.eventBus?.emit) {
      handlers.eventBus.emit(type, detail);
    } else {
      root.dispatchEvent(new CustomEvent(type, { detail }));
    }
  };

  const {
    runCanvasTool = null,
    setShapeTool = null,
    applyTextStyle = null,
    toggleToolRailCollapsed = null,
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
      if (typeof setActiveRailPanelButton === "function") {
        setActiveRailPanelButton(button, root);
      }
      if (button.dataset.tool === "pen") {
        root.querySelectorAll("[data-pen-tool]").forEach((item) => item.classList.toggle("active", item.dataset.penTool === "pen"));
      }
      if (typeof runCanvasTool === "function") {
        runCanvasTool(button.dataset.tool);
      } else {
        dispatcher("canvas:tool-request", { tool: button.dataset.tool, button });
      }
    });
  });

  root.querySelectorAll("[data-shape-tool]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof setShapeTool === "function") {
        setShapeTool(button.dataset.shapeTool);
      } else {
        dispatcher("canvas:shape-tool-request", { tool: button.dataset.shapeTool, button });
      }
    });
  });

  root.querySelectorAll("[data-pen-tool]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      root.querySelectorAll("[data-pen-tool]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      if (typeof setActiveRailPanelButton === "function") {
        setActiveRailPanelButton(root.querySelector('.rail-btn[data-tool="pen"]'), root);
      }
      if (typeof runCanvasTool === "function") {
        runCanvasTool(button.dataset.penTool);
      } else {
        dispatcher("canvas:tool-request", { tool: button.dataset.penTool, button });
      }
    });
  });

  textFontFamily?.addEventListener("change", () => {
    if (typeof applyTextStyle === "function") {
      applyTextStyle({ fontFamily: textFontFamily.value });
    } else {
      dispatcher("canvas:text-style-request", { type: "font-family", value: textFontFamily.value });
    }
  });

  textFontWeight?.addEventListener("change", () => {
    if (typeof applyTextStyle === "function") {
      applyTextStyle({ fontWeight: textFontWeight.value });
    } else {
      dispatcher("canvas:text-style-request", { type: "font-weight", value: textFontWeight.value });
    }
  });

  textFontSize?.addEventListener("change", () => {
    if (typeof applyTextStyle === "function") {
      applyTextStyle({ fontSize: `${textFontSize.value}px` });
    } else {
      dispatcher("canvas:text-style-request", { type: "font-size", value: textFontSize.value });
    }
  });

  textColorInput?.addEventListener("input", () => {
    const value = textColorInput.value;
    textColorInput.closest(".text-color-picker")?.style.setProperty("--text-toolbar-color", value);
    if (typeof applyTextStyle === "function") {
      applyTextStyle({ color: value });
    } else {
      dispatcher("canvas:text-style-request", { type: "color", value });
    }
  });

  textFormatToolbar?.querySelectorAll("[data-text-color]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.textColor;
      if (typeof applyTextStyle === "function") {
        applyTextStyle({ color: value });
      } else {
        dispatcher("canvas:text-style-request", { type: "color", value });
      }
    });
  });

  textFormatToolbar?.querySelectorAll("[data-text-align]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.textAlign;
      if (typeof applyTextStyle === "function") {
        applyTextStyle({ textAlign: value });
      } else {
        dispatcher("canvas:text-style-request", { type: "text-align", value });
      }
    });
  });

  toggleToolRail?.addEventListener("click", () => {
    if (typeof toggleToolRailCollapsed === "function") {
      toggleToolRailCollapsed(toolRail, toggleToolRail);
    } else {
      dispatcher("canvas:tool-rail-toggle", { button: toggleToolRail });
    }
  });

  return {
    runCanvasToolbarBinding: () => true
  };
}

export function setActiveRailButton(tool, root = document) {
  root.querySelectorAll(".rail-btn").forEach((item) => item.classList.remove("active"));
  if (tool) root.querySelector(`.rail-btn[data-tool="${tool === "laser" ? "pen" : tool}"]`)?.classList.add("active");
  root.querySelectorAll("[data-pen-tool]").forEach((item) => item.classList.toggle("active", item.dataset.penTool === tool));
}

export function setActiveRailPanelButton(button, root = document) {
  root.querySelectorAll(".rail-btn").forEach((item) => item.classList.remove("active"));
  button?.classList.add("active");
}

export function setToolRailCollapsed(toolRail, toggleButton, collapsed) {
  toolRail?.classList.toggle("collapsed", collapsed);
  toggleButton?.setAttribute("aria-expanded", String(!collapsed));
  if (toggleButton) {
    toggleButton.textContent = "+";
    toggleButton.title = collapsed ? "展开工具栏" : "收起工具栏";
  }
}

export function toggleToolRailCollapsed(toolRail, toggleButton) {
  const collapsed = !toolRail?.classList.contains("collapsed");
  setToolRailCollapsed(toolRail, toggleButton, collapsed);
  return collapsed;
}
