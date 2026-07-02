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

export function renderVideoOptionGroup(group, {
  kind = "",
  options = [],
  selectedValue = "",
  escapeAttribute = (value) => String(value),
  escapeHtml = (value) => String(value)
} = {}) {
  if (!group) return;
  group.hidden = !options.length;
  group.innerHTML = options.map((option) => {
    const selected = String(option.value) === String(selectedValue);
    return `<button type="button" class="${selected ? "selected" : ""}" data-video-option="${escapeAttribute(kind)}" data-value="${escapeAttribute(option.value)}" aria-pressed="${selected ? "true" : "false"}">${escapeHtml(option.label)}</button>`;
  }).join("");
  if (!options.some((option) => String(option.value) === String(selectedValue)) && options[0]) {
    group.querySelector("[data-video-option]")?.classList.add("selected");
  }
}

export function chooseVideoOptionElement(option) {
  const group = option?.closest?.("[data-video-option-group]");
  if (!group) return;
  group.querySelectorAll("[data-video-option]").forEach((item) => {
    const selected = item === option;
    item.classList.toggle("selected", selected);
    item.setAttribute("aria-pressed", selected ? "true" : "false");
  });
  group.dataset.value = option.dataset.value || "";
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

export function getVideoGenerationModels(models = [], getModelType = () => "") {
  return Array.from(models || [])
    .filter((model) => getModelType(model.id) === "video" || model.type === "video")
    .filter((model) => !Array.isArray(model.capabilities) || model.capabilities.includes("video_generation"))
    .sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));
}

export function capitalize(value = "") {
  const text = String(value || "");
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "";
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
