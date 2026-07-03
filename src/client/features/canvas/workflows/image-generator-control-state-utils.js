export function saveGeneratorControlDataset(node, controls = {}, {
  defaultRatio = "1:1",
  defaultCount = "1"
} = {}) {
  if (!node) return;
  if (controls.ratioSelect) node.dataset.generatorRatio = controls.ratioSelect.value || defaultRatio;
  if (controls.countSelect) node.dataset.generatorCount = controls.countSelect.value || defaultCount;
}

export function getGeneratorControls(popover = null) {
  return {
    popover,
    promptInput: popover?.querySelector?.("[data-image-generator-prompt]") || null,
    referenceInput: popover?.querySelector?.("[data-generator-reference-input]") || null,
    referenceList: popover?.querySelector?.("[data-generator-reference-list]") || null,
    modelSelect: popover?.querySelector?.("[data-generator-model]") || null,
    ratioSelect: popover?.querySelector?.("[data-generator-ratio]") || null,
    countSelect: popover?.querySelector?.("[data-generator-count]") || null,
    submitButton: popover?.querySelector?.("[data-generator-submit]") || null
  };
}

export function getSyncedGeneratorModelValue(selectedModelId = "", defaultModel = "") {
  return selectedModelId || defaultModel;
}

export function setGeneratorModelSelectValue(select, value) {
  if (!select) return;
  setSelectValue(select, value);
  select.dataset.selectedModelId = select.value || "";
  select.dataset.modelUserSelected = "true";
  select.dataset.modelAuto = "false";
}

export function setSelectValue(select, value) {
  if (!select) return;
  const hasValue = Array.from(select.options || []).some((option) => option.value === value);
  select.value = hasValue ? value : select.options?.[0]?.value || "";
}

export function getGeneratorRatioValueFromControls(controls = {}, node = null, defaultRatio = "1:1") {
  return controls.ratioSelect?.value || node?.dataset.generatorRatio || defaultRatio;
}

export function getGeneratorCountValue(controls = {}, defaultCount = "1") {
  const value = Number.parseInt(controls.countSelect?.value || defaultCount, 10);
  if (!Number.isFinite(value) || value <= 0) return Number(defaultCount);
  return Math.max(1, Math.min(4, value));
}

export function getGeneratorBatchCount(modelType = "", midjourney = false, selectedCount = 1, midjourneyCount = 4) {
  if (modelType === "video") return 1;
  if (midjourney) return midjourneyCount;
  return selectedCount;
}

export function isMidjourneyGeneratorModel(model = "") {
  return String(model || "").trim().toLowerCase() === "midjourney";
}

export function getGeneratorModelValue({
  generatorSelect = null,
  chatSelect = null,
  defaultModel = ""
} = {}) {
  return generatorSelect?.dataset?.selectedModelId
    || generatorSelect?.value
    || chatSelect?.dataset?.selectedModelId
    || chatSelect?.value
    || defaultModel;
}

export function resolveGeneratorModelValue({
  documentRef = globalThis.document,
  popoverSelector = "#imageGeneratorPopover",
  chatSelector = "#chatModelSelect",
  defaultModel = ""
} = {}) {
  const generatorSelect = documentRef?.querySelector?.(`${popoverSelector} [data-generator-model]`);
  const chatSelect = documentRef?.querySelector?.(chatSelector);
  return getGeneratorModelValue({
    generatorSelect,
    chatSelect,
    defaultModel
  });
}
