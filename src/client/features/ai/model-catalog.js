import {
  getModelMenuLabel,
  getModelOptionTitle,
  renderModelPreferenceMenu
} from "./model-preference-menu.js?v=20260627-library-bulk-select-1";

export const DEFAULT_IMAGE_MODEL = "gpt-image-2";
export const DEFAULT_3D_MODEL = "tripo-v31";

const FALLBACK_MODELS = [
  {
    id: DEFAULT_IMAGE_MODEL,
    label: "GPT Image 2",
    type: "image",
    displayGroup: "图像模型",
    supports: ["文生图", "图生图", "图片编辑"],
    description: "高质量图像模型，适合复杂指令、参考图生成和图片编辑",
    surfaces: ["home", "chat", "generator", "imageEdit"],
    priority: 10,
    credits: 8,
    estimatedSeconds: 45,
    isDefault: true
  }
];

const MODEL_SELECT_TARGETS = [
  { selector: "#homeModelSelect", surface: "home" },
  { selector: "#chatModelSelect", surface: "chat" },
  { selector: "#imageEditModel", surface: "imageEdit" },
  { selector: "[data-generator-model]", surface: "generator" }
];

const HOME_LIST_SURFACES = new Set(["generator", "imageEdit"]);

const MODEL_STATE_KEY = "__AI_STUDIO_MODEL_CATALOG_STATE__";

function getSharedModelState() {
  const root = globalThis || window;
  if (!root[MODEL_STATE_KEY]) {
    root[MODEL_STATE_KEY] = {
      models: FALLBACK_MODELS,
      selectedBySurface: Object.create(null)
    };
  }
  return root[MODEL_STATE_KEY];
}

function getCatalogModels() {
  const models = getSharedModelState().models;
  return Array.isArray(models) && models.length ? models : FALLBACK_MODELS;
}

function setCatalogModels(models) {
  getSharedModelState().models = Array.isArray(models) && models.length ? models : FALLBACK_MODELS;
}

function setSelectedModel(surface, modelId) {
  const id = String(modelId || "").trim();
  if (!id) return;
  const state = getSharedModelState();
  state.selectedBySurface.global = id;
  if (surface) state.selectedBySurface[surface] = id;
}

function getSelectedModel(surface) {
  const state = getSharedModelState();
  return state.selectedBySurface?.[surface] || state.selectedBySurface?.global || "";
}

export function getSelectedModelId(surface = "") {
  return getSelectedModel(surface);
}

export async function initModelCatalog(root = document) {
  setCatalogModels(await fetchModelCatalog());
  hydrateModelSelects(root);
  root.dispatchEvent?.(new CustomEvent("ai-studio-models-updated", {
    detail: {
      defaultModel: DEFAULT_IMAGE_MODEL,
      models: getCatalogModels()
    }
  }));
  return getCatalogModels();
}

export function getCachedImageModels(surface) {
  return filterModelsForSurface(getCatalogModels(), surface);
}

export function getModelType(modelId) {
  return normalizeModelType(getModelById(modelId));
}

export function resolveImageModelId(modelId, surface) {
  const id = String(modelId || "").trim();
  const models = filterModelsForSurface(getCatalogModels(), surface);
  return models.some((model) => model.id === id) ? id : DEFAULT_IMAGE_MODEL;
}

export function getImageModelDisplayName(modelId) {
  const id = String(modelId || "").trim() || DEFAULT_IMAGE_MODEL;
  if (id === "wanx2.1-imageedit") return "Wanx 2.1 ImageEdit";
  const model = [...getCatalogModels(), ...FALLBACK_MODELS].find((item) => item.id === id);
  return model?.label || id;
}

export function formatModelUsage(result = {}, fallbackModel = "") {
  const calls = Array.isArray(result?.providerCalls) ? result.providerCalls : [];
  const actualCalls = calls
    .map((call) => formatProviderCall(call))
    .filter(Boolean);
  if (actualCalls.length) {
    return `实际调用：${dedupeStrings(actualCalls).join("；")}`;
  }
  const model = result?.requestedModel || result?.model || fallbackModel;
  return `模型：${getImageModelDisplayName(model)}`;
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
  if (id === "apimart") return "";
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
  renderModelPreferenceMenu({
    menu,
    select,
    surface: "home",
    models: filterModelsForSurface(getCatalogModels(), "home"),
    allowVideo: true,
    onChoose: () => {
      syncHomeButtonLabel(select, button, menu);
    },
    onClose: () => {
      root.querySelector("#homeModelPicker")?.classList.remove("open");
      button?.setAttribute("aria-expanded", "false");
    }
  });
  syncHomeButtonLabel(select, button, menu);
}

function hydrateNativeSelect(select, surface) {
  if (!select) return;
  const models = filterModelsForSurface(getCatalogModels(), getMenuSurface(surface));
  const current = select.dataset.modelUserSelected === "true"
    ? (select.dataset.selectedModelId || select.value)
    : (getSelectedModel(surface) || DEFAULT_IMAGE_MODEL);
  select.innerHTML = "";
  groupModels(models).forEach(({ group, models: groupItems }) => {
    const container = document.createElement("optgroup");
    container.label = group;
    groupItems.forEach((model) => {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = getModelLabel(model, getMenuSurface(surface));
      option.title = getModelOptionTitle(model);
      option.dataset.modelLabel = model.label || model.id;
      option.dataset.modelType = normalizeModelType(model);
      option.dataset.modelModality = normalizeModelType(model);
      option.dataset.modelProvider = model.provider || "";
      container.append(option);
    });
    select.append(container);
  });
  select.value = models.some((model) => model.id === current) ? current : DEFAULT_IMAGE_MODEL;
  select.dataset.selectedModelId = select.value;
  applySelectedModelDataset(select);
  setSelectedModel(surface, select.value);
  if (!select.value && select.options.length) select.selectedIndex = 0;
  select.__modelPreferenceModels = models;
  select.__modelPreferenceSurface = surface;
  select.__modelPreferenceAllowVideo = true;
  if (select.dataset.modelCatalogBound !== "true") {
    select.addEventListener("change", () => {
      select.dataset.modelUserSelected = "true";
      select.dataset.modelAuto = "false";
      select.dataset.selectedModelId = select.value;
      applySelectedModelDataset(select);
      setSelectedModel(surface, select.value);
      syncModelSelectionAcrossSurfaces(select.value, select);
    });
    select.dataset.modelCatalogBound = "true";
  }
  select.__compactSelectRebuild?.();
  select.__compactSelectSync?.();
  select.__generatorSelectRebuild?.();
}

function syncModelSelectionAcrossSurfaces(modelId, sourceSelect) {
  const id = String(modelId || "").trim();
  if (!id) return;
  const sourceSurface = sourceSelect?.__modelPreferenceSurface || "";
  setSelectedModel(sourceSurface, id);
  MODEL_SELECT_TARGETS.forEach(({ selector, surface }) => {
    document.querySelectorAll(selector).forEach((select) => {
      if (select === sourceSelect) return;
      const models = filterModelsForSurface(getCatalogModels(), getMenuSurface(surface));
      if (!models.some((model) => model.id === id)) return;
      select.value = id;
      select.dataset.modelUserSelected = "true";
      select.dataset.modelAuto = "false";
      select.dataset.selectedModelId = id;
      applySelectedModelDataset(select);
      setSelectedModel(surface, id);
      select.__compactSelectRebuild?.();
      select.__compactSelectSync?.();
      select.__generatorSelectRebuild?.();
    });
  });
  hydrateHomeModelPicker(document);
  document.dispatchEvent(new CustomEvent("ai-studio-model-selection-changed", {
    detail: { model: id }
  }));
}

function getMenuSurface(surface) {
  return HOME_LIST_SURFACES.has(surface) ? "home" : surface;
}

function filterModelsForSurface(models, surface) {
  return Array.from(models || [])
    .filter((model) => !surface || model.surfaces?.includes?.(surface))
    .sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));
}

function groupModels(models = []) {
  const groups = new Map();
  models.forEach((model) => {
    const key = model.displayGroup || fallbackModelGroup(model);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(model);
  });
  return Array.from(groups.entries()).map(([group, items]) => ({ group, models: items }));
}

function getModelLabel(model, surface) {
  if (!model) return "";
  if (surface === "home") return model.label || model.id;
  const type = normalizeModelType(model);
  const typeLabel = type === "video" ? "视频" : (type === "3d" ? "3D" : "图像");
  return `${model.label || model.id} · ${typeLabel}`;
}

function fallbackModelGroup(model = {}) {
  const type = normalizeModelType(model);
  if (type === "video") return "视频模型";
  if (type === "3d") return "3D模型";
  return "图像模型";
}

function applySelectedModelDataset(select) {
  if (!select) return;
  const model = getModelById(select.value);
  const type = normalizeModelType(model);
  select.dataset.selectedModality = type;
  select.dataset.selectedProvider = model?.provider || "";
  select.dataset.modelType = type;
}

function syncHomeButtonLabel(select, button, menu) {
  if (!select || !button) return;
  const selected = select.options[select.selectedIndex];
  const label = selected?.dataset?.modelLabel || selected?.textContent || getImageModelDisplayName(DEFAULT_IMAGE_MODEL);
  button.querySelector("span")?.replaceChildren(document.createTextNode(label));
  menu?.querySelectorAll?.("[data-model-value]").forEach((item) => {
    item.classList.toggle("active", item.dataset.modelValue === select.value);
    item.classList.toggle("selected", item.dataset.modelValue === select.value);
  });
}

function getModelById(modelId) {
  const id = String(modelId || "").trim();
  return getCatalogModels().find((model) => model.id === id) || FALLBACK_MODELS.find((model) => model.id === id) || null;
}

function normalizeModelType(model = {}) {
  const type = String(model?.modality || model?.type || "").trim().toLowerCase();
  if (type === "video") return "video";
  if (type === "3d" || type === "model3d") return "3d";
  return "image";
}
