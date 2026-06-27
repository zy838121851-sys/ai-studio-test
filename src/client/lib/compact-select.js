import { renderModelPreferenceMenu } from "../features/ai/model-preference-menu.js";

const COMPACT_SELECT_IDS = new Set([
  "chatModelSelect",
  "imageEditModel",
  "imageEditSize",
  "imageEditCount"
]);

export function enhanceCompactSelects(root = document) {
  const scope = root || document;
  scope.querySelectorAll("select").forEach((select) => {
    if (!COMPACT_SELECT_IDS.has(select.id) || select.dataset.compactSelectReady === "true") return;
    createCompactSelect(select);
  });
}

function createCompactSelect(select) {
  select.dataset.compactSelectReady = "true";
  select.classList.add("native-compact-select");

  const wrapper = document.createElement("div");
  wrapper.className = "compact-select";
  wrapper.dataset.selectId = select.id;
  wrapper.dataset.compactKind = getCompactKind(select);

  const button = document.createElement("button");
  button.className = "compact-select-trigger";
  button.type = "button";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");

  const label = document.createElement("span");
  label.className = "compact-select-label";
  const chevron = document.createElement("span");
  chevron.className = "compact-select-chevron";
  chevron.setAttribute("aria-hidden", "true");
  button.append(label, chevron);

  const menu = document.createElement("div");
  menu.className = "compact-select-menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;
  wrapper.__compactSelectMenu = menu;

  wrapper.append(button, menu);
  select.after(wrapper);

  function sync({ skipModelRebuild = false } = {}) {
    const selected = getSelectedOption(select);
    label.textContent = selected?.dataset?.modelLabel || selected?.textContent?.trim() || "";
    if (!skipModelRebuild && shouldUseModelPreferenceMenu(select) && menu.classList.contains("model-preference-menu")) {
      rebuildMenu();
      return;
    }
    Array.from(menu.querySelectorAll(".compact-select-option")).forEach((option) => {
      const active = option.dataset.value === select.value;
      option.classList.toggle("selected", active);
      option.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function rebuildMenu() {
    menu.innerHTML = "";
    menu.classList.remove("model-preference-menu");
    delete menu.dataset.modelPreferenceSurface;
    delete menu.dataset.modelPreferenceType;
    if (shouldUseModelPreferenceMenu(select)) {
      renderModelPreferenceMenu({
        menu,
        select,
        surface: select.__modelPreferenceSurface || getModelSurface(select),
        models: select.__modelPreferenceModels || [],
        allowVideo: select.__modelPreferenceAllowVideo !== false,
        onChoose: () => sync(),
        onClose: () => closeMenu(wrapper)
      });
      sync({ skipModelRebuild: true });
      return;
    }
    Array.from(select.options).forEach((item) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "compact-select-option";
      option.dataset.value = item.value;
      option.setAttribute("role", "option");
      option.textContent = item.textContent.trim();
      option.addEventListener("click", () => {
        select.value = item.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        closeMenu(wrapper);
        sync();
      });
      menu.append(option);
    });
    sync();
  }

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    sync();
    if (wrapper.classList.contains("open")) {
      closeMenu(wrapper);
      return;
    }
    closeAllCompactSelects();
    openMenu(wrapper);
  });
  button.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu(wrapper);
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      sync();
      closeAllCompactSelects();
      openMenu(wrapper);
      menu.querySelector(".compact-select-option.selected")?.focus();
    }
  });
  menu.addEventListener("keydown", (event) => {
    const options = Array.from(menu.querySelectorAll(".compact-select-option"));
    const index = options.indexOf(document.activeElement);
    if (event.key === "Escape") {
      closeMenu(wrapper);
      button.focus();
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      options[Math.min(options.length - 1, index + 1)]?.focus();
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      options[Math.max(0, index - 1)]?.focus();
    }
  });
  select.addEventListener("change", sync);
  select.__compactSelectSync = sync;
  select.__compactSelectRebuild = rebuildMenu;
  rebuildMenu();
}

function getCompactKind(select) {
  if (select.id === "imageEditSize") return "ratio";
  if (select.id === "imageEditCount") return "count";
  return "model";
}

function shouldUseModelPreferenceMenu(select) {
  return getCompactKind(select) === "model";
}

function getModelSurface(select) {
  if (select.id === "imageEditModel") return "imageEdit";
  return "chat";
}

function getSelectedOption(select) {
  return select.options[select.selectedIndex] || select.options[0] || null;
}

function openMenu(wrapper) {
  const button = wrapper.querySelector(".compact-select-trigger");
  const menu = getCompactSelectMenu(wrapper);
  wrapper.classList.add("open");
  button?.setAttribute("aria-expanded", "true");
  if (menu) {
    if (isChatModelMenu(wrapper, menu)) {
      menu.dataset.portalOwner = wrapper.dataset.selectId || "";
      menu.classList.add("compact-select-menu-portal", "chat-model-menu");
      document.body.append(menu);
    }
    menu.hidden = false;
    positionChatModelMenu(wrapper, menu, { reset: true });
  }
}

function closeMenu(wrapper) {
  const button = wrapper.querySelector(".compact-select-trigger");
  const menu = getCompactSelectMenu(wrapper);
  wrapper.classList.remove("open");
  button?.setAttribute("aria-expanded", "false");
  if (menu) {
    menu.hidden = true;
    menu.classList.remove("compact-select-menu-portal", "chat-model-menu");
    delete menu.dataset.portalOwner;
    delete menu.__chatModelMenuGeometry;
    menu.removeAttribute("style");
    if (menu.parentElement !== wrapper) wrapper.append(menu);
  }
}

export function closeAllCompactSelects() {
  document.querySelectorAll(".compact-select.open").forEach(closeMenu);
}

function getCompactSelectMenu(wrapper) {
  return wrapper?.__compactSelectMenu || wrapper?.querySelector?.(".compact-select-menu") || null;
}

function isChatModelMenu(wrapper, menu) {
  return wrapper?.dataset?.selectId === "chatModelSelect" && menu?.classList?.contains("model-preference-menu");
}

function positionChatModelMenu(wrapper, menu, { reset = false } = {}) {
  if (!isChatModelMenu(wrapper, menu) || menu.hidden) return;
  if (!reset && menu.__chatModelMenuGeometry) {
    applyChatModelMenuGeometry(menu, menu.__chatModelMenuGeometry);
    return;
  }
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth || 0;
  const viewportHeight = document.documentElement.clientHeight || window.innerHeight || 0;
  const wrapperRect = wrapper.getBoundingClientRect();
  const triggerRect = wrapper.querySelector(".compact-select-trigger")?.getBoundingClientRect?.() || wrapperRect;
  const gutter = 12;
  const gap = 16;
  const preferredHeight = 360;
  const minUsefulHeight = 280;
  const width = Math.max(260, Math.min(390, viewportWidth - gutter * 2));
  const left = Math.max(gutter, Math.min(triggerRect.left - 72, viewportWidth - gutter - width));
  const spaceAbove = Math.max(0, triggerRect.top - gutter - gap);
  const spaceBelow = Math.max(0, viewportHeight - triggerRect.bottom - gutter - gap);
  const openAbove = spaceAbove >= minUsefulHeight || spaceAbove >= spaceBelow;
  const availableHeight = openAbove ? spaceAbove : spaceBelow;
  const naturalHeight = Math.ceil(menu.scrollHeight || 0);
  const desiredHeight = naturalHeight > 0
    ? Math.min(preferredHeight, Math.max(minUsefulHeight, naturalHeight))
    : preferredHeight;
  const height = Math.max(
    Math.min(minUsefulHeight, Math.max(spaceAbove, spaceBelow)),
    Math.min(desiredHeight, availableHeight)
  );
  const geometry = {
    left,
    right: "auto",
    top: openAbove ? "auto" : triggerRect.bottom + gap,
    bottom: openAbove ? viewportHeight - triggerRect.top + gap : "auto",
    width,
    height
  };
  menu.__chatModelMenuGeometry = geometry;
  applyChatModelMenuGeometry(menu, geometry);
}

function applyChatModelMenuGeometry(menu, geometry) {
  menu.style.left = `${geometry.left}px`;
  menu.style.right = geometry.right;
  menu.style.top = geometry.top === "auto" ? "auto" : `${geometry.top}px`;
  menu.style.bottom = geometry.bottom === "auto" ? "auto" : `${geometry.bottom}px`;
  menu.style.width = `${geometry.width}px`;
  menu.style.minWidth = "0";
  menu.style.maxWidth = `${geometry.width}px`;
  menu.style.height = `${geometry.height}px`;
  menu.style.maxHeight = `${geometry.height}px`;
}

document.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".compact-select")) return;
  if (event.target.closest(".compact-select-menu-portal")) return;
  closeAllCompactSelects();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAllCompactSelects();
});

document.addEventListener("canvas:view-transformed", closeAllCompactSelects);

function repositionOpenChatModelMenus() {
  document.querySelectorAll('.compact-select.open[data-select-id="chatModelSelect"]').forEach((wrapper) => {
    const menu = getCompactSelectMenu(wrapper);
    if (menu) delete menu.__chatModelMenuGeometry;
    if (menu && !menu.hidden) positionChatModelMenu(wrapper, menu, { reset: true });
  });
}

window.addEventListener("resize", repositionOpenChatModelMenus);
