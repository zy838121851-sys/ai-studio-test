const DEFAULT_GENERATOR_POPOVER_SELECTOR = "#imageGeneratorPopover";

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
