export const DEFAULT_IMAGE_MODEL = "doubao-seedream-5-0-lite-260128";
export const DEFAULT_EXPAND_MODEL = "wan2.7-image-pro";
export const DEFAULT_UPSCALE_MODEL = "wanx2.1-imageedit";

const IMAGE_SURFACES = ["home", "chat", "generator"];
const EDIT_SURFACES = ["imageEdit"];
const ALL_IMAGE_SURFACES = [...IMAGE_SURFACES, ...EDIT_SURFACES];

const MODEL_CATALOG = [
  {
    id: DEFAULT_IMAGE_MODEL,
    label: "Doubao-Seedream-5.0-lite",
    provider: "volcengine",
    providerId: "volcengine",
    capabilities: ["image_generation", "image_edit", "image_reference"],
    surfaces: ALL_IMAGE_SURFACES,
    defaultSize: "2K",
    maxOutputs: 4,
    priority: 10,
    isDefault: true
  },
  {
    id: "doubao-seedream-4-5-251128",
    label: "Doubao-Seedream-4.5",
    provider: "volcengine",
    providerId: "volcengine",
    capabilities: ["image_generation", "image_edit", "image_reference"],
    surfaces: ALL_IMAGE_SURFACES,
    defaultSize: "2K",
    maxOutputs: 4,
    priority: 20,
    isDefault: false
  },
  {
    id: "doubao-seedream-4-0-250828",
    label: "Doubao-Seedream-4.0",
    provider: "volcengine",
    providerId: "volcengine",
    capabilities: ["image_generation", "image_edit", "image_reference"],
    surfaces: ALL_IMAGE_SURFACES,
    defaultSize: "2K",
    maxOutputs: 4,
    priority: 30,
    isDefault: false
  },
  {
    id: "wan2.7-image-pro",
    label: "Wan 2.7 Image Pro",
    provider: "aliyun",
    providerId: "qwen",
    capabilities: ["image_generation", "image_edit", "image_reference", "image_expand"],
    surfaces: ALL_IMAGE_SURFACES,
    defaultSize: "2K",
    maxOutputs: 4,
    priority: 40,
    isDefault: false
  },
  {
    id: "wan2.7-image",
    label: "Wan 2.7 Image",
    provider: "aliyun",
    providerId: "qwen",
    capabilities: ["image_generation", "image_edit", "image_reference"],
    surfaces: ALL_IMAGE_SURFACES,
    defaultSize: "2K",
    maxOutputs: 4,
    priority: 50,
    isDefault: false
  },
  {
    id: "z-image-turbo",
    label: "Z-Image Turbo",
    provider: "aliyun",
    providerId: "qwen",
    capabilities: ["image_generation"],
    surfaces: IMAGE_SURFACES,
    defaultSize: "1024*1024",
    maxOutputs: 1,
    priority: 60,
    isDefault: false
  },
  {
    id: "qwen-image-2.0-pro",
    label: "Qwen Image 2.0 Pro",
    provider: "aliyun",
    providerId: "qwen",
    capabilities: ["image_generation", "image_edit", "image_reference"],
    surfaces: ALL_IMAGE_SURFACES,
    defaultSize: "2048*2048",
    maxOutputs: 6,
    priority: 70,
    isDefault: false
  },
  {
    id: "qwen-image-2.0",
    label: "Qwen Image 2.0",
    provider: "aliyun",
    providerId: "qwen",
    capabilities: ["image_generation", "image_edit", "image_reference"],
    surfaces: ALL_IMAGE_SURFACES,
    defaultSize: "2048*2048",
    maxOutputs: 6,
    priority: 80,
    isDefault: false
  },
  {
    id: "qwen-image-max",
    label: "Qwen Image Max",
    provider: "aliyun",
    providerId: "qwen",
    capabilities: ["image_generation"],
    surfaces: IMAGE_SURFACES,
    defaultSize: "1664*928",
    maxOutputs: 1,
    priority: 90,
    isDefault: false
  },
  {
    id: "qwen-image-plus",
    label: "Qwen Image Plus",
    provider: "aliyun",
    providerId: "qwen",
    capabilities: ["image_generation"],
    surfaces: IMAGE_SURFACES,
    defaultSize: "1664*928",
    maxOutputs: 1,
    priority: 100,
    isDefault: false
  },
  {
    id: "qwen-image-edit-max",
    label: "Qwen Image Edit Max",
    provider: "aliyun",
    providerId: "qwen",
    capabilities: ["image_edit", "image_reference"],
    surfaces: EDIT_SURFACES,
    defaultSize: "2048*2048",
    maxOutputs: 6,
    priority: 110,
    isDefault: false
  },
  {
    id: "qwen-image-edit-plus",
    label: "Qwen Image Edit Plus",
    provider: "aliyun",
    providerId: "qwen",
    capabilities: ["image_edit", "image_reference"],
    surfaces: EDIT_SURFACES,
    defaultSize: "2048*2048",
    maxOutputs: 6,
    priority: 120,
    isDefault: false
  }
];

export function listImageModels({ surface } = {}) {
  return MODEL_CATALOG
    .filter((model) => !surface || model.surfaces.includes(surface))
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map(toPublicModel);
}

export function getModelConfig(modelId) {
  const id = String(modelId || "").trim() || DEFAULT_IMAGE_MODEL;
  return MODEL_CATALOG.find((model) => model.id === id) || null;
}

export function getDefaultImageModel() {
  return getModelConfig(DEFAULT_IMAGE_MODEL);
}

export function getProviderIdForModel(modelId) {
  return getModelConfig(modelId)?.providerId || null;
}

function toPublicModel(model) {
  const {
    providerId,
    ...publicModel
  } = model;
  return {
    ...publicModel,
    capabilities: [...model.capabilities],
    surfaces: [...model.surfaces]
  };
}
