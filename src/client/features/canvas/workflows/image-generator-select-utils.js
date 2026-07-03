import {
  escapeAttribute,
  escapeHtml
} from "./image-generator-escape-utils.js";

export function getGeneratorSelectKind(select) {
  if (select?.matches?.("[data-generator-model]")) return "model";
  if (select?.matches?.("[data-generator-ratio]")) return "ratio";
  if (select?.matches?.("[data-generator-count]")) return "count";
  return "unknown";
}

export function getGeneratorSelectByKind(controls = {}, kind = "") {
  if (kind === "model") return controls.modelSelect;
  if (kind === "ratio") return controls.ratioSelect;
  if (kind === "count") return controls.countSelect;
  return null;
}

export function getGeneratorSelectTriggerText(select) {
  const selectedOption = select?.selectedOptions?.[0]
    || select?.options?.[select?.selectedIndex]
    || select?.options?.[0]
    || null;
  return selectedOption?.dataset?.modelLabel || selectedOption?.textContent || "";
}

export function getGeneratorCountSelectState({
  kind = "",
  modelType = "",
  isMidjourney = false
} = {}) {
  if (kind !== "count") return null;
  if (modelType === "video") {
    return {
      text: "1 video",
      value: "video-default-1",
      disabled: true,
      clearMenu: true
    };
  }
  if (isMidjourney) {
    return {
      text: "\u9ed8\u8ba44\u5f20",
      value: "midjourney-default-4",
      disabled: true,
      clearMenu: true
    };
  }
  return null;
}

export function closeGeneratorCustomSelects(root = null) {
  root?.querySelectorAll?.(".generator-select-wrap.open")
    .forEach((wrap) => wrap.classList.remove("open"));
}

export function toggleGeneratorCustomSelect(trigger, {
  closeSelects = () => {}
} = {}) {
  const wrap = trigger?.closest?.(".generator-select-wrap");
  if (!wrap || trigger.disabled) return false;
  const isOpen = wrap.classList.contains("open");
  closeSelects();
  wrap.classList.toggle("open", !isOpen);
  return !isOpen;
}

export function renderGeneratorSelectOptions(select, kind = getGeneratorSelectKind(select)) {
  return Array.from(select?.options || []).map((option) => `
      <button type="button"
        class="generator-select-option${option.value === select.value ? " selected" : ""}"
        data-generator-select-option="${escapeAttribute(kind)}"
        data-value="${escapeAttribute(option.value)}"
        role="option"
        aria-selected="${option.value === select.value ? "true" : "false"}">
        ${escapeHtml(option.textContent || option.value)}
      </button>
    `).join("");
}

export function createGeneratorCustomSelect(select, {
  documentRef = globalThis.document,
  onRebuild = null
} = {}) {
  if (!select || !documentRef?.createElement) return null;
  const kind = getGeneratorSelectKind(select);
  select.dataset.generatorCustomReady = "true";
  select.classList.add("generator-native-select");
  const wrap = documentRef.createElement("div");
  wrap.className = "generator-select-wrap";
  wrap.dataset.generatorSelectKind = kind;
  const trigger = documentRef.createElement("button");
  trigger.type = "button";
  trigger.className = "generator-select-trigger";
  trigger.dataset.generatorSelectTrigger = kind;
  const menu = documentRef.createElement("div");
  menu.className = "generator-select-menu";
  menu.dataset.generatorSelectMenu = kind;
  menu.setAttribute("role", "listbox");
  wrap.append(trigger, menu);
  select.after(wrap);
  select.__generatorSelectRebuild = typeof onRebuild === "function" ? () => onRebuild(select) : null;
  return { wrap, trigger, menu, kind };
}
