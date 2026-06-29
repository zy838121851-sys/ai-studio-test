import { env } from "../config/env.js";

export const DEFAULT_IMAGE_MODEL = "gpt-image-2";
export const DEFAULT_3D_MODEL = "tripo-v31";
export const DEFAULT_EXPAND_MODEL = "wan2.7-image-pro";
export const DEFAULT_UPSCALE_MODEL = "wanx2.1-imageedit";

const IMAGE_GROUP = "图像模型";
const VIDEO_GROUP = "视频模型";

const IMAGE_SURFACES = ["home", "chat", "generator"];
const VIDEO_SURFACES = ["home", "chat"];
const TRIPO_GROUP = "3D模型";
const MODEL_3D_SURFACES = ["home", "chat"];
const EDIT_SURFACES = ["imageEdit"];
const ALL_IMAGE_SURFACES = [...IMAGE_SURFACES, ...EDIT_SURFACES];

const MODEL_CATALOG = [
  apimartImage({
    id: DEFAULT_IMAGE_MODEL,
    label: "GPT Image 2",
    vendor: "openai",
    providerModel: "gpt-image-2",
    supports: ["文生图", "图生图", "图片编辑"],
    description: "高质量图像模型，适合复杂指令、参考图生成和图片编辑",
    capabilities: ["image_generation", "image_edit", "image_reference"],
    enabledByEnv: "ENABLE_APIMART_GPT_IMAGE",
    priority: 10,
    credits: 8,
    estimatedSeconds: 45,
    isDefault: true
  }),
  apimartImage({
    id: "nano-banana-pro",
    label: "Nano Banana Pro",
    vendor: "google",
    providerModel: "gemini-3-pro-image-preview",
    supports: ["文生图", "图生图", "多参考图"],
    description: "高质量海外图像模型，适合精修和复杂画面生成",
    capabilities: ["image_generation", "image_reference"],
    enabledByEnv: "ENABLE_APIMART_NANO",
    priority: 20,
    credits: 10,
    estimatedSeconds: 45
  }),
  apimartImage({
    id: "midjourney",
    label: "Midjourney",
    vendor: "midjourney",
    providerModel: "midjourney",
    supports: ["文生图", "图生图"],
    description: "风格化图像模型，一次任务默认生成 4 张候选图",
    capabilities: ["image_generation", "image_reference"],
    enabledByEnv: "ENABLE_APIMART_MJ",
    priority: 30,
    credits: 8,
    estimatedSeconds: 60,
    outputCount: 4,
    billingUnitLabel: "次"
  }),
  apimartImage({
    id: "nano-banana",
    label: "Nano Banana",
    vendor: "google",
    providerModel: "gemini-2.5-flash-image-preview",
    supports: ["文生图", "图生图", "多参考图"],
    description: "轻量海外图像模型，适合多参考图和自然风格生成",
    capabilities: ["image_generation", "image_reference"],
    enabledByEnv: "ENABLE_APIMART_NANO",
    priority: 40,
    credits: 6,
    estimatedSeconds: 35
  }),
  apimartImage({
    id: "nano-banana-2",
    label: "Nano Banana 2",
    vendor: "google",
    providerModel: "gemini-3.1-flash-image-preview",
    supports: ["文生图", "图生图", "多参考图"],
    description: "新一代轻量海外图像模型，适合快速迭代和参考图生成",
    capabilities: ["image_generation", "image_reference"],
    enabledByEnv: "ENABLE_APIMART_NANO",
    priority: 50,
    credits: 8,
    estimatedSeconds: 35
  }),
  apimartQwenImage({
    id: "qwen-image-2.0-pro",
    label: "Qwen Image 2.0 Pro",
    providerModel: "qwen-image-2.0-pro",
    supports: ["文生图", "图生图"],
    description: "阿里高质量图像模型，适合中文提示词和精细画面生成",
    capabilities: ["image_generation", "image_reference"],
    priority: 60,
    credits: 30
  }),
  apimartQwenImage({
    id: "wan2.7-image-pro",
    label: "Wan 2.7 Image Pro",
    providerModel: "wan2.7-image-pro",
    supports: ["文生图", "图生图"],
    description: "万相高质量图像模型，适合画面补全和视觉一致性生成",
    capabilities: ["image_generation", "image_reference", "image_expand"],
    priority: 70,
    credits: 30
  }),
  apimartQwenImage({
    id: "qwen-image-edit-plus",
    label: "Qwen Image Edit Plus",
    providerModel: "qwen-image-edit-plus",
    surfaces: ["home", "chat", "imageEdit"],
    supports: ["图片编辑", "图生图"],
    description: "阿里图片编辑模型，适合局部修改、风格转换和图生图编辑",
    capabilities: ["image_edit", "image_reference"],
    priority: 80,
    credits: 12
  }),
  apimartImage({
    id: "seedream-5-lite",
    label: "Seedream 5.0 Lite",
    vendor: "doubao",
    providerModel: "doubao-seedream-5-0-lite",
    supports: ["文生图", "图生图", "多参考图"],
    description: "豆包图像模型，适合角色风格生成和参考图转换",
    capabilities: ["image_generation", "image_edit", "image_reference"],
    enabledByEnv: "ENABLE_APIMART_DOUBAO",
    priority: 90,
    credits: 12,
    estimatedSeconds: 30
  }),
  apimartImage({
    id: "seedream-4-5",
    label: "Seedream 4.5",
    vendor: "doubao",
    providerModel: "doubao-seedream-4.5",
    supports: ["文生图", "图生图", "多参考图"],
    description: "豆包高质量图像模型，适合多参考图和角色一致性生成",
    capabilities: ["image_generation", "image_edit", "image_reference"],
    enabledByEnv: "ENABLE_APIMART_DOUBAO",
    priority: 100,
    credits: 16,
    estimatedSeconds: 35
  }),
  apimartVideo({
    id: "seedance-2",
    label: "Seedance 2.0",
    vendor: "doubao",
    providerModel: "doubao-seedance-2.0",
    supports: ["文生视频", "图生视频", "首尾帧视频"],
    description: "豆包视频模型，适合文生视频、图生视频和镜头运动",
    enabledByEnv: "ENABLE_APIMART_SEEDANCE",
    priority: 110,
    credits: 18,
    estimatedSeconds: 90,
    allowedOptions: seedanceOptions()
  }),
  apimartVideo({
    id: "seedance-1-5-pro",
    label: "Seedance 1.5 Pro",
    vendor: "doubao",
    providerModel: "doubao-seedance-1-5-pro",
    supports: ["文生视频", "图生视频", "首尾帧视频"],
    description: "豆包专业视频模型，适合带音频和首尾帧的视频生成",
    enabledByEnv: "ENABLE_APIMART_SEEDANCE",
    priority: 120,
    credits: 18,
    estimatedSeconds: 90,
    allowedOptions: seedanceOptions()
  }),
  apimartVideo({
    id: "kling-v3",
    label: "Kling V3",
    vendor: "kling",
    providerModel: "kling-v3",
    supports: ["文生视频", "图生视频"],
    description: "Kling 视频模型，适合动态画面和镜头生成",
    enabledByEnv: "ENABLE_APIMART_KLING",
    priority: 130,
    credits: 22,
    estimatedSeconds: 120,
    allowedOptions: klingOptions()
  }),
  apimartVideo({
    id: "kling-v3-omni",
    label: "Kling V3 Omni",
    vendor: "kling",
    providerModel: "kling-v3-omni",
    supports: ["文生视频", "图生视频", "音频视频"],
    description: "Kling 全能视频模型，适合图生视频和带声音的短片生成",
    enabledByEnv: "ENABLE_APIMART_KLING",
    priority: 140,
    credits: 22,
    estimatedSeconds: 120,
    allowedOptions: klingOptions({ generateAudio: true })
  }),
  tripoModel({
    id: DEFAULT_3D_MODEL,
    label: "Tripo v3.1",
    name: "Tripo v3.1",
    apiModel: "v3.1-20260211",
    providerModel: "v3.1-20260211",
    description: "高质量 3D 模型生成，适合潮玩、产品、角色、概念模型",
    badges: ["10-120s", "20-30积分", "文生3D", "图生3D", "GLB"],
    supports: ["文生3D", "图生3D", "GLB"],
    capabilities: {
      textTo3D: true,
      imageTo3D: true,
      texture: true,
      rig: false
    },
    priority: 210,
    credits: 30,
    estimatedSeconds: 120,
    isDefault: true
  }),
  tripoModel({
    id: "tripo-p1",
    label: "Tripo P1",
    name: "Tripo P1",
    apiModel: "P1-20260311",
    providerModel: "P1-20260311",
    description: "低面数 / 游戏资产方向，适合网页预览、移动端、游戏模型",
    badges: ["低面数", "图生3D", "可绑骨", "GLB"],
    supports: ["低面数", "图生3D", "GLB"],
    capabilities: {
      textTo3D: false,
      imageTo3D: true,
      texture: true,
      rig: true
    },
    defaultParams: {
      face_limit: 5000
    },
    priority: 220,
    credits: 45,
    estimatedSeconds: 120
  }),
  tripoModel({
    id: "tripo-turbo",
    label: "Tripo Turbo",
    name: "Tripo Turbo",
    apiModel: "Turbo-v1.0-20250506",
    providerModel: "Turbo-v1.0-20250506",
    description: "快速预览模型，适合先出草模、快速试方向",
    badges: ["更快", "草模预览", "文生3D", "图生3D"],
    supports: ["文生3D", "图生3D", "草模预览"],
    capabilities: {
      textTo3D: true,
      imageTo3D: true,
      texture: true,
      rig: false
    },
    priority: 230,
    credits: 30,
    estimatedSeconds: 60,
    visible: false
  })
];

export function listImageModels({ surface } = {}) {
  return MODEL_CATALOG
    .filter((model) => isModelVisible(model))
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

export function inferProviderIdForModel(modelId) {
  const id = String(modelId || "").trim().toLowerCase();
  const catalogProvider = getProviderIdForModel(id);
  if (catalogProvider) return catalogProvider;
  return null;
}

export function isApimartModel(modelId) {
  return getProviderIdForModel(modelId) === "apimart";
}

function apimartImage(input = {}) {
  const capabilities = input.capabilities || ["image_generation", "image_reference"];
  return {
    provider: "apimart",
    providerId: "apimart",
    type: "image",
    displayGroup: IMAGE_GROUP,
    surfaces: capabilities.includes("image_edit") ? ALL_IMAGE_SURFACES : IMAGE_SURFACES,
    defaultSize: "1024*1024",
    maxOutputs: 4,
    isOfficialDirect: false,
    isExperimental: true,
    showProviderBadge: false,
    ...input,
    capabilities
  };
}

function apimartVideo(input = {}) {
  return {
    provider: "apimart",
    providerId: "apimart",
    type: "video",
    displayGroup: VIDEO_GROUP,
    surfaces: VIDEO_SURFACES,
    defaultSize: "16:9",
    maxOutputs: 1,
    capabilities: ["video_generation", "video_reference"],
    isOfficialDirect: false,
    isExperimental: true,
    showProviderBadge: false,
    ...input
  };
}

function tripoModel(input = {}) {
  return {
    provider: "tripo",
    providerId: "tripo",
    vendor: "tripo",
    type: "3d",
    modality: "3d",
    displayGroup: TRIPO_GROUP,
    surfaces: MODEL_3D_SURFACES,
    maxOutputs: 1,
    outputFormat: "glb",
    isOfficialDirect: false,
    isExperimental: false,
    showProviderBadge: true,
    ...input
  };
}

function apimartQwenImage(input = {}) {
  return {
    provider: "apimart",
    providerId: "apimart",
    vendor: "qwen",
    type: "image",
    displayGroup: IMAGE_GROUP,
    surfaces: input.surfaces || IMAGE_SURFACES,
    defaultSize: "2K",
    maxOutputs: 4,
    capabilities: ["image_generation", "image_reference"],
    isOfficialDirect: false,
    isExperimental: true,
    showProviderBadge: false,
    estimatedSeconds: 30,
    ...input
  };
}

function seedanceOptions() {
  return {
    duration: [5, 10],
    size: ["16:9", "9:16", "1:1"],
    resolution: ["720p", "1080p"],
    generate_audio: [false, true],
    return_last_frame: [false, true]
  };
}

function klingOptions({ generateAudio = false } = {}) {
  return {
    duration: [5, 10],
    size: ["16:9", "9:16", "1:1"],
    resolution: ["720p", "1080p"],
    generate_audio: generateAudio ? [false, true] : [false],
    return_last_frame: [false]
  };
}

function isModelVisible(model) {
  if (model.visible === false) return false;
  if (model.isOfficialDirect && !env.showOfficialModels) return false;
  if (model.providerId !== "apimart") return true;
  if (!env.enableApimart) return false;
  if (model.type === "image" && !env.enableApimartImage) return false;
  if (model.type === "video" && !env.enableApimartVideo) return false;
  return envFlagForModel(model);
}

function envFlagForModel(model = {}) {
  const key = String(model.enabledByEnv || "").trim();
  if (!key) return true;
  const map = {
    ENABLE_APIMART_QWEN: env.enableApimartQwen,
    ENABLE_APIMART_DOUBAO: env.enableApimartDoubao,
    ENABLE_APIMART_NANO: env.enableApimartNano,
    ENABLE_APIMART_GPT_IMAGE: env.enableApimartGptImage,
    ENABLE_APIMART_MJ: env.enableApimartMj,
    ENABLE_APIMART_SEEDANCE: env.enableApimartSeedance,
    ENABLE_APIMART_KLING: env.enableApimartKling
  };
  return map[key] !== false;
}

function toPublicModel(model) {
  const {
    provider,
    providerId,
    providerModel,
    vendor,
    enabledByEnv,
    isOfficialDirect,
    showProviderBadge,
    visible,
    ...publicModel
  } = model;
  return {
    ...publicModel,
    provider: providerId || provider || "",
    modality: model.modality || model.type || "image",
    capabilities: Array.isArray(model.capabilities) ? [...model.capabilities] : { ...(model.capabilities || {}) },
    surfaces: [...(model.surfaces || [])],
    supports: [...(model.supports || [])],
    badges: Array.isArray(model.badges) ? [...model.badges] : undefined,
    defaultParams: model.defaultParams ? { ...model.defaultParams } : undefined,
    allowedOptions: model.allowedOptions ? { ...model.allowedOptions } : undefined
  };
}
