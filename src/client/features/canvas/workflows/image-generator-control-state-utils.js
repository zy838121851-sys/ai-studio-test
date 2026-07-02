export function saveGeneratorControlDataset(node, controls = {}, {
  defaultRatio = "1:1",
  defaultCount = "1"
} = {}) {
  if (!node) return;
  if (controls.ratioSelect) node.dataset.generatorRatio = controls.ratioSelect.value || defaultRatio;
  if (controls.countSelect) node.dataset.generatorCount = controls.countSelect.value || defaultCount;
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
