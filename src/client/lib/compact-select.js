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

  wrapper.append(button, menu);
  select.after(wrapper);

  function sync() {
    const selected = getSelectedOption(select);
    label.textContent = selected?.textContent?.trim() || "";
    Array.from(menu.querySelectorAll(".compact-select-option")).forEach((option) => {
      const active = option.dataset.value === select.value;
      option.classList.toggle("selected", active);
      option.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function rebuildMenu() {
    menu.innerHTML = "";
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

function getSelectedOption(select) {
  return select.options[select.selectedIndex] || select.options[0] || null;
}

function openMenu(wrapper) {
  const button = wrapper.querySelector(".compact-select-trigger");
  const menu = wrapper.querySelector(".compact-select-menu");
  wrapper.classList.add("open");
  button?.setAttribute("aria-expanded", "true");
  if (menu) menu.hidden = false;
}

function closeMenu(wrapper) {
  const button = wrapper.querySelector(".compact-select-trigger");
  const menu = wrapper.querySelector(".compact-select-menu");
  wrapper.classList.remove("open");
  button?.setAttribute("aria-expanded", "false");
  if (menu) menu.hidden = true;
}

function closeAllCompactSelects() {
  document.querySelectorAll(".compact-select.open").forEach(closeMenu);
}

document.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".compact-select")) return;
  closeAllCompactSelects();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAllCompactSelects();
});
