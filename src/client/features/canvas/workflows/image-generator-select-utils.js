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
