import {
  getGeneratorReferenceStatusText,
  getGeneratorReferences,
  removeGeneratorReferenceAtIndex
} from "./image-generator-reference-utils.js";
import {
  escapeAttribute
} from "./image-generator-escape-utils.js";

const DEFAULT_GENERATOR_POPOVER_SELECTOR = "#imageGeneratorPopover";
const DEFAULT_GENERATOR_SELECTOR = ".node-image-generator";

export function hasGeneratorDropData(dataTransfer) {
  const types = Array.from(dataTransfer?.types || []);
  return types.includes("Files")
    || types.includes("text/html")
    || types.includes("text/uri-list")
    || types.includes("text/plain");
}

export function updateGeneratorStatus(node, text, {
  documentRef = globalThis.document,
  popoverSelector = DEFAULT_GENERATOR_POPOVER_SELECTOR
} = {}) {
  if (node) node.dataset.generatorStatus = text || "";
  const popover = documentRef?.querySelector?.(popoverSelector);
  if (popover) popover.dataset.generatorStatus = text || "";
}

export function setGeneratorBusy(node, busy, {
  documentRef = globalThis.document,
  popoverSelector = DEFAULT_GENERATOR_POPOVER_SELECTOR
} = {}) {
  if (!node) return;
  node.dataset.generatorBusy = busy ? "true" : "false";
  node.classList.toggle("generator-busy", busy);
  const loading = node.querySelector(".image-generator-loading");
  const popover = documentRef?.querySelector?.(popoverSelector);
  const submit = popover?.querySelector?.("[data-generator-submit]");
  if (loading) loading.hidden = !busy;
  if (submit) submit.disabled = busy;
  popover?.querySelectorAll?.("[data-generator-model], [data-generator-ratio], [data-generator-count], [data-generator-add-reference], [data-generator-cancel]")
    .forEach((control) => {
      control.disabled = busy;
    });
  popover?.querySelectorAll?.("[data-generator-model], [data-generator-ratio], [data-generator-count]")
    .forEach((select) => {
      const kind = select.matches("[data-generator-model]")
        ? "model"
        : (select.matches("[data-generator-ratio]") ? "ratio" : "count");
      const trigger = popover.querySelector(`[data-generator-select-trigger="${kind}"]`);
      if (trigger) trigger.disabled = busy;
    });
}

export function setGeneratorReferences(node, references = [], {
  documentRef = globalThis.document,
  popoverSelector = DEFAULT_GENERATOR_POPOVER_SELECTOR,
  generatorSelector = DEFAULT_GENERATOR_SELECTOR
} = {}) {
  if (!node) return;
  node._generatorReferences = references;
  node.dataset.generatorReferenceCount = String(references.length);
  updateGeneratorStatus(node, getGeneratorReferenceStatusText(references), { documentRef, popoverSelector });
  renderGeneratorReferences(node, references, { documentRef, popoverSelector, generatorSelector });
  node.classList.toggle("has-generator-reference", references.length > 0);
}

export function clearGeneratorReferences(node, options = {}) {
  setGeneratorReferences(node, [], options);
}

export function removeGeneratorReference(node, index, options = {}) {
  const references = getGeneratorReferences(node);
  const nextReferences = removeGeneratorReferenceAtIndex(node, index);
  if (nextReferences === references) return;
  setGeneratorReferences(node, nextReferences, options);
}

export function resetGeneratorInput(node, {
  documentRef = globalThis.document,
  popoverSelector = DEFAULT_GENERATOR_POPOVER_SELECTOR,
  generatorSelector = DEFAULT_GENERATOR_SELECTOR
} = {}) {
  if (!node) return;
  const popover = documentRef?.querySelector?.(popoverSelector);
  const promptInput = popover?.querySelector?.("[data-image-generator-prompt]");
  if (promptInput) promptInput.value = "";
  node._generatorPromptDraft = "";
  clearGeneratorReferences(node, { documentRef, popoverSelector, generatorSelector });
  updateGeneratorStatus(node, "文生图", { documentRef, popoverSelector });
}

export function renderGeneratorReferences(node, references = [], {
  documentRef = globalThis.document,
  popoverSelector = DEFAULT_GENERATOR_POPOVER_SELECTOR,
  generatorSelector = DEFAULT_GENERATOR_SELECTOR
} = {}) {
  const popover = documentRef?.querySelector?.(popoverSelector);
  const list = popover?.querySelector?.("[data-generator-reference-list]");
  if (!list || (node && !node.matches?.(generatorSelector))) return;
  list.innerHTML = references.map((reference, index) => `
    <button type="button" class="image-generator-reference-thumb" data-generator-reference-index="${index}" title="${escapeAttribute(reference.name || "参考图")}">
      <img src="${reference.dataUrl}" alt="${escapeAttribute(reference.name || "参考图")}" />
    </button>
  `).join("");
}
