const TYPE_LABELS = {
  image: "图像",
  video: "视频"
};

const GROUP_ORDER = ["图像模型", "视频模型", "其他模型"];

export function renderModelPreferenceMenu({
  menu,
  select,
  models = [],
  surface = "",
  allowVideo = true,
  onChoose = null,
  onClose = null
} = {}) {
  if (!menu || !select) return;
  const visibleModels = getVisibleModels(models, allowVideo);
  const availableTypes = getAvailableTypes(visibleModels, allowVideo);
  const activeType = resolveActiveType(menu, select, visibleModels, availableTypes);
  const selectedValue = select.value || "";
  const autoEnabled = select.dataset.modelAuto !== "false" && select.dataset.modelUserSelected !== "true";

  menu.classList.add("model-preference-menu");
  menu.dataset.modelPreferenceSurface = surface || "";
  menu.dataset.modelPreferenceType = activeType;
  menu.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "model-preference-panel";

  const header = document.createElement("div");
  header.className = "model-preference-header";
  const title = document.createElement("strong");
  title.textContent = "模型偏好";
  const autoButton = document.createElement("button");
  autoButton.type = "button";
  autoButton.className = "model-preference-auto";
  autoButton.classList.toggle("active", autoEnabled);
  autoButton.setAttribute("aria-pressed", autoEnabled ? "true" : "false");
  autoButton.innerHTML = "<span>自动</span><i aria-hidden=\"true\"></i>";
  autoButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const nextAuto = !autoButton.classList.contains("active");
    select.dataset.modelAuto = nextAuto ? "true" : "false";
    if (nextAuto) {
      const defaultModel = getDefaultModel(visibleModels, activeType) || getModelsByType(visibleModels, activeType)[0];
      if (defaultModel) chooseModel(defaultModel.id);
      return;
    }
    renderModelPreferenceMenu({ menu, select, models, surface, allowVideo, onChoose, onClose });
  });
  header.append(title, autoButton);

  const tabs = document.createElement("div");
  tabs.className = "model-preference-tabs";
  ["image", "video"].forEach((type) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.textContent = TYPE_LABELS[type];
    tab.dataset.modelPreferenceTab = type;
    tab.classList.toggle("active", type === activeType);
    tab.disabled = !availableTypes.includes(type);
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (tab.disabled) return;
      menu.dataset.modelPreferenceType = type;
      renderModelPreferenceMenu({ menu, select, models, surface, allowVideo, onChoose, onClose });
    });
    tabs.append(tab);
  });

  const list = document.createElement("div");
  list.className = "model-preference-list";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", `${TYPE_LABELS[activeType] || "模型"}模型`);

  const typeModels = getModelsByType(visibleModels, activeType);
  groupModels(typeModels).forEach(({ group, items }) => {
    const section = document.createElement("section");
    section.className = "model-preference-section";
    const heading = document.createElement("h4");
    heading.textContent = group;
    section.append(heading);
    items.forEach((model) => {
      section.append(createModelOption(model, {
        selected: model.id === selectedValue,
        onChoose: chooseModel
      }));
    });
    list.append(section);
  });

  if (!typeModels.length) {
    const empty = document.createElement("div");
    empty.className = "model-preference-empty";
    empty.textContent = "暂无可用模型";
    list.append(empty);
  }

  panel.append(header, tabs, list);
  menu.append(panel);

  function chooseModel(modelId) {
    const id = String(modelId || "").trim();
    if (!id) return;
    select.value = id;
    select.dataset.modelUserSelected = "true";
    select.dataset.modelAuto = "false";
    select.dataset.selectedModelId = id;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    if (typeof onChoose === "function") onChoose(id);
    if (typeof onClose === "function") onClose();
    renderModelPreferenceMenu({ menu, select, models, surface, allowVideo, onChoose, onClose });
  }
}

export function getModelMenuLabel(model = {}) {
  return model.label || model.id || "";
}

export function getModelOptionTitle(model = {}) {
  return [
    model.displayGroup,
    TYPE_LABELS[getModelType(model)],
    ...(model.supports || [])
  ].filter(Boolean).join(" · ");
}

function createModelOption(model, { selected = false, onChoose } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "model-preference-option";
  button.classList.toggle("selected", selected);
  button.classList.toggle("active", selected);
  button.dataset.modelValue = model.id;
  button.setAttribute("role", "option");
  button.setAttribute("aria-selected", selected ? "true" : "false");
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onChoose?.(model.id);
  });

  const icon = document.createElement("span");
  icon.className = "model-preference-icon";
  icon.setAttribute("aria-hidden", "true");

  const body = document.createElement("span");
  body.className = "model-preference-body";
  const title = document.createElement("span");
  title.className = "model-preference-title";
  const name = document.createElement("strong");
  name.textContent = getModelMenuLabel(model);
  title.append(name);
  if (model.isDefault) {
    const badge = document.createElement("span");
    badge.className = "model-preference-default";
    badge.textContent = "默认模型";
    title.append(badge);
  }

  const description = document.createElement("span");
  description.className = "model-preference-description";
  description.textContent = model.description || buildDescription(model);

  const tags = document.createElement("span");
  tags.className = "model-preference-tags";
  getModelTags(model).forEach((tag) => {
    const chip = document.createElement("span");
    chip.textContent = tag;
    tags.append(chip);
  });

  body.append(title, description, tags);
  const state = document.createElement("span");
  state.className = "model-preference-state";
  state.setAttribute("aria-hidden", "true");

  button.append(icon, body, state);
  return button;
}

function getVisibleModels(models = [], allowVideo = true) {
  return Array.from(models || [])
    .filter((model) => model?.id)
    .filter((model) => allowVideo || getModelType(model) !== "video")
    .sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));
}

function getAvailableTypes(models = [], allowVideo = true) {
  const types = new Set(models.map(getModelType));
  if (!allowVideo) return ["image"];
  return ["image", "video"].filter((type) => types.has(type));
}

function resolveActiveType(menu, select, models, availableTypes) {
  const current = menu.dataset.modelPreferenceType;
  if (availableTypes.includes(current)) return current;
  const selectedModel = models.find((model) => model.id === select.value);
  const selectedType = getModelType(selectedModel);
  if (availableTypes.includes(selectedType)) return selectedType;
  return availableTypes[0] || "image";
}

function getModelsByType(models = [], type = "image") {
  return models.filter((model) => getModelType(model) === type);
}

function getDefaultModel(models = [], type = "image") {
  return getModelsByType(models, type).find((model) => model.isDefault) || null;
}

function groupModels(models = []) {
  const groups = new Map();
  models.forEach((model) => {
    const key = model.displayGroup || (getModelType(model) === "video" ? "视频模型" : "图像模型");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(model);
  });
  return Array.from(groups.entries())
    .sort(([a], [b]) => groupSortIndex(a) - groupSortIndex(b))
    .map(([group, items]) => ({ group, items }));
}

function groupSortIndex(group) {
  const index = GROUP_ORDER.indexOf(group);
  return index === -1 ? GROUP_ORDER.length : index;
}

function getModelType(model = {}) {
  return model?.type === "video" ? "video" : "image";
}

function buildDescription(model = {}) {
  const typeLabel = TYPE_LABELS[getModelType(model)] || "模型";
  const supports = Array.isArray(model.supports) ? model.supports.slice(0, 3).join("、") : "";
  return supports ? `${typeLabel}模型，支持${supports}` : `${typeLabel}模型`;
}

function getModelTags(model = {}) {
  const tags = [];
  if (Number(model.estimatedSeconds) > 0) tags.push(`${Number(model.estimatedSeconds)}s`);
  if (Number(model.credits) > 0) {
    const unit = model.billingUnitLabel ? `/${model.billingUnitLabel}` : "";
    tags.push(`${Number(model.credits)}积分${unit}`);
  }
  if (Number(model.outputCount) > 1) tags.push(`默认${Number(model.outputCount)}张`);
  (model.supports || []).slice(0, 2).forEach((item) => tags.push(item));
  return tags;
}
