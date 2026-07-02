export function getModeOptions(allowed = {}) {
  const options = [{ value: "reference", label: "All ref" }];
  if (Array.isArray(allowed.return_last_frame) && allowed.return_last_frame.includes(true)) {
    options.push({ value: "last-frame", label: "First/last" });
  }
  return options;
}

export function toOptions(values = [], format = (value) => String(value)) {
  return Array.from(values || []).map((value) => ({ value: String(value), label: format(value) }));
}

export function getVideoOptionGroupValue(group = null) {
  const selected = group?.querySelector?.("[data-video-option].selected");
  return selected?.dataset?.value || group?.dataset?.value || "";
}

export function getVideoSavedOption(node = null, kind = "") {
  return node?.dataset?.[`videoGenerator${capitalize(kind)}`] || "";
}

export function formatRatioLabel(value, fallback = "16:9") {
  return String(value || fallback);
}

export function getVideoSelectedModelId({
  controls = {},
  models = [],
  selectedModelId = ""
} = {}) {
  const selected = controls.modelSelect?.value || controls.modelSelect?.dataset?.selectedModelId || "";
  if (models.some((model) => model.id === selected)) return selected;
  if (models.some((model) => model.id === selectedModelId)) return selectedModelId;
  return models[0]?.id || "";
}

export function getVideoModelByIdFromList(models = [], modelId = "") {
  const id = String(modelId || "").trim();
  return models.find((model) => model.id === id) || models[0] || null;
}

export function capitalize(value = "") {
  const text = String(value || "");
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "";
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
