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
