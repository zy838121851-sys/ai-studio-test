export const DEFAULT_IMAGE_MODEL = "doubao-seedream-5-0-lite-260128";
const FALLBACK_MODELS = [
  { id: DEFAULT_IMAGE_MODEL, label: "Doubao-Seedream-5.0-lite", surfaces: ["home", "chat", "generator", "imageEdit"], priority: 10, isDefault: true },
  { id: "doubao-seedream-4-5-251128", label: "Doubao-Seedream-4.5", surfaces: ["home", "chat", "generator", "imageEdit"], priority: 20 },
  { id: "doubao-seedream-4-0-250828", label: "Doubao-Seedream-4.0", surfaces: ["home", "chat", "generator", "imageEdit"], priority: 30 },
  { id: "wan2.7-image-pro", label: "Wan 2.7 Image Pro", surfaces: ["home", "chat", "generator", "imageEdit"], priority: 40 },
  { id: "wan2.7-image", label: "Wan 2.7 Image", surfaces: ["home", "chat", "generator", "imageEdit"], priority: 50 },
  { id: "z-image-turbo", label: "Z-Image Turbo", surfaces: ["home", "chat", "generator"], priority: 60 },
  { id: "qwen-image-2.0-pro", label: "Qwen Image 2.0 Pro", surfaces: ["home", "chat", "generator", "imageEdit"], priority: 70 },
  { id: "qwen-image-2.0", label: "Qwen Image 2.0", surfaces: ["home", "chat", "generator", "imageEdit"], priority: 80 },
  { id: "qwen-image-max", label: "Qwen Image Max", surfaces: ["home", "chat", "generator"], priority: 90 },
  { id: "qwen-image-plus", label: "Qwen Image Plus", surfaces: ["home", "chat", "generator"], priority: 100 },
  { id: "qwen-image-edit-max", label: "Qwen Image Edit Max", surfaces: ["imageEdit"], priority: 110 },
  { id: "qwen-image-edit-plus", label: "Qwen Image Edit Plus", surfaces: ["imageEdit"], priority: 120 }
];

const MODEL_SELECT_TARGETS = [
  { selector: "#homeModelSelect", surface: "home" },
  { selector: "#chatModelSelect", surface: "chat" },
  { selector: "#imageEditModel", surface: "imageEdit" },
  { selector: "[data-generator-model]", surface: "generator" }
];

let cachedModels = FALLBACK_MODELS;

export async function initModelCatalog(root = document) {
  cachedModels = await fetchModelCatalog();
  hydrateModelSelects(root);
  root.dispatchEvent?.(new CustomEvent("ai-studio-models-updated", {
    detail: {
      defaultModel: DEFAULT_IMAGE_MODEL,
      models: cachedModels
    }
  }));
  return cachedModels;
}

export function getCachedImageModels(surface) {
  return filterModelsForSurface(cachedModels, surface);
}

export function resolveImageModelId(modelId, surface) {
  const id = String(modelId || "").trim();
  const models = filterModelsForSurface(cachedModels, surface);
  return models.some((model) => model.id === id) ? id : DEFAULT_IMAGE_MODEL;
}

export function getImageModelDisplayName(modelId) {
  const id = String(modelId || "").trim() || DEFAULT_IMAGE_MODEL;
  if (id === "wanx2.1-imageedit") return "Wanx 2.1 ImageEdit";
  const model = [...cachedModels, ...FALLBACK_MODELS].find((item) => item.id === id);
  return model?.label || id;
}

export function formatModelUsage(result = {}, fallbackModel = "") {
  const calls = Array.isArray(result?.providerCalls) ? result.providerCalls : [];
  const actualCalls = calls
    .map((call) => formatProviderCall(call))
    .filter(Boolean);
  if (actualCalls.length) {
    return `\u5b9e\u9645\u8c03\u7528\uff1a${dedupeStrings(actualCalls).join("\uff1b")}`;
  }
  const model = result?.requestedModel || result?.model || fallbackModel;
  return `\u6a21\u578b\uff1a${getImageModelDisplayName(model)}`;
}
function formatProviderCall(call = {}) {
  const provider = formatProviderName(call.provider);
  const model = getImageModelDisplayName(call.model);
  if (!provider && !model) return "";
  if (!provider) return model;
  if (!model) return provider;
  return `${provider} / ${model}`;
}

function formatProviderName(provider = "") {
  const id = String(provider || "").trim().toLowerCase();
  if (id === "volcengine") return "Volcengine";
  if (id === "qwen") return "Alibaba";
  return provider;
}

function dedupeStrings(values = []) {
  return Array.from(new Set(values));
}

async function fetchModelCatalog() {
  try {
    const response = await fetch("/api/models", {
      credentials: "include"
    });
    if (!response.ok) throw new Error(`Model catalog request failed: ${response.status}`);
    const payload = await response.json();
    const models = Array.isArray(payload?.models) ? payload.models : [];
    if (!models.length) return FALLBACK_MODELS;
    return models
      .filter((model) => model?.id && Array.isArray(model.surfaces))
      .sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));
  } catch (error) {
    console.warn("[models] Failed to load model catalog", error);
    return FALLBACK_MODELS;
  }
}

function hydrateModelSelects(root = document) {
  const scope = root || document;
  hydrateHomeModelPicker(scope);
  hydrateNativeSelect(scope.querySelector("#chatModelSelect"), "chat");
  hydrateNativeSelect(scope.querySelector("#imageEditModel"), "imageEdit");
  scope.querySelectorAll("[data-generator-model]").forEach((select) => hydrateNativeSelect(select, "generator"));
}

function hydrateHomeModelPicker(root) {
  const select = root.querySelector("#homeModelSelect");
  const menu = root.querySelector("#homeModelMenu");
  const button = root.querySelector("#homeModelButton");
  if (!select || !menu) return;
  hydrateNativeSelect(select, "home");
  menu.innerHTML = "";
  filterModelsForSurface(cachedModels, "home").forEach((model) => {
    const item = document.createElement("button");
    item.type = "button";
    item.dataset.modelValue = model.id;
    item.textContent = model.label || model.id;
    item.classList.toggle("active", model.id === select.value);
    menu.append(item);
  });
  syncHomeButtonLabel(select, button, menu);
}

function hydrateNativeSelect(select, surface) {
  if (!select) return;
  const models = filterModelsForSurface(cachedModels, surface);
  const current = select.dataset.modelUserSelected === "true" ? select.value : DEFAULT_IMAGE_MODEL;
  select.innerHTML = "";
  models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = getModelLabel(model, surface);
    select.append(option);
  });
  select.value = models.some((model) => model.id === current) ? current : DEFAULT_IMAGE_MODEL;
  if (!select.value && select.options.length) select.selectedIndex = 0;
  if (select.dataset.modelCatalogBound !== "true") {
    select.addEventListener("change", () => {
      select.dataset.modelUserSelected = "true";
      syncModelSelectionAcrossSurfaces(select.value, select);
    });
    select.dataset.modelCatalogBound = "true";
  }
  select.__compactSelectRebuild?.();
  select.__compactSelectSync?.();
}

function syncModelSelectionAcrossSurfaces(modelId, sourceSelect) {
  const id = String(modelId || "").trim();
  if (!id) return;
  MODEL_SELECT_TARGETS.forEach(({ selector, surface }) => {
    document.querySelectorAll(selector).forEach((select) => {
      if (select === sourceSelect) return;
      const models = filterModelsForSurface(cachedModels, surface);
      if (!models.some((model) => model.id === id)) return;
      select.value = id;
      select.dataset.modelUserSelected = "true";
      select.__compactSelectSync?.();
    });
  });
  hydrateHomeModelPicker(document);
  document.dispatchEvent(new CustomEvent("ai-studio-model-selection-changed", {
    detail: { model: id }
  }));
}

function filterModelsForSurface(models, surface) {
  return Array.from(models || [])
    .filter((model) => !surface || model.surfaces?.includes?.(surface))
    .sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));
}

function getModelLabel(model, surface) {
  return model.label || model.id;
}

function syncHomeButtonLabel(select, button, menu) {
  if (!select || !button) return;
  const selected = select.options[select.selectedIndex];
  button.querySelector("span")?.replaceChildren(document.createTextNode(selected?.textContent || getImageModelDisplayName(DEFAULT_IMAGE_MODEL)));
  menu?.querySelectorAll?.("[data-model-value]").forEach((item) => {
    item.classList.toggle("active", item.dataset.modelValue === select.value);
  });
}
