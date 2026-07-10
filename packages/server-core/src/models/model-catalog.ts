import type { CreditQuoteDto, ModelCatalogEntryDto } from "@ai-studio/contracts";

import { ApplicationError } from "../application/application-error.js";

const MODEL_CATALOG: readonly ModelCatalogEntryDto[] = [
  {
    id: "gpt-image-2",
    label: "GPT Image 2",
    modality: "image",
    group: "图像模型",
    description: "高质量图像模型，适合复杂指令、参考图生成和图片编辑",
    capabilities: ["文生图", "图生图", "图片编辑"],
    creditCost: 8,
    estimatedSeconds: 45,
    outputCount: 1,
    isDefault: true,
    enabled: true
  },
  {
    id: "nano-banana-pro",
    label: "Nano Banana Pro",
    modality: "image",
    group: "图像模型",
    description: "高质量海外图像模型，适合精修和复杂画面生成",
    capabilities: ["文生图", "图生图", "多参考图"],
    creditCost: 10,
    estimatedSeconds: 45,
    outputCount: 1,
    isDefault: false,
    enabled: true
  },
  {
    id: "midjourney",
    label: "Midjourney",
    modality: "image",
    group: "图像模型",
    description: "风格化图像模型，一次任务默认生成 4 张候选图",
    capabilities: ["文生图", "图生图"],
    creditCost: 8,
    estimatedSeconds: 60,
    outputCount: 4,
    isDefault: false,
    enabled: true
  },
  {
    id: "qwen-image-2.0-pro",
    label: "Qwen Image 2.0 Pro",
    modality: "image",
    group: "图像模型",
    description: "适合中文提示词和精细画面生成的高质量图像模型",
    capabilities: ["文生图", "图生图"],
    creditCost: 30,
    estimatedSeconds: 30,
    outputCount: 1,
    isDefault: false,
    enabled: true
  },
  {
    id: "seedream-5-lite",
    label: "Seedream 5.0 Lite",
    modality: "image",
    group: "图像模型",
    description: "适合角色风格生成和多参考图转换",
    capabilities: ["文生图", "图生图", "多参考图"],
    creditCost: 12,
    estimatedSeconds: 30,
    outputCount: 1,
    isDefault: false,
    enabled: true
  },
  {
    id: "seedance-2",
    label: "Seedance 2.0",
    modality: "video",
    group: "视频模型",
    description: "适合文生视频、图生视频和镜头运动",
    capabilities: ["文生视频", "图生视频", "首尾帧"],
    creditCost: 18,
    estimatedSeconds: 90,
    outputCount: 1,
    isDefault: true,
    enabled: true
  },
  {
    id: "tripo-v31",
    label: "Tripo v3.1",
    modality: "3d",
    group: "3D 模型",
    description: "适合产品、角色和概念模型的高质量 3D 生成",
    capabilities: ["文生 3D", "图生 3D", "GLB"],
    creditCost: 30,
    estimatedSeconds: 120,
    outputCount: 1,
    isDefault: true,
    enabled: true
  }
];

export function listModels(): ModelCatalogEntryDto[] {
  return MODEL_CATALOG.map((model) => ({ ...model, capabilities: [...model.capabilities] }));
}

export function findModel(modelId: string): ModelCatalogEntryDto {
  const model = MODEL_CATALOG.find((candidate) => candidate.id === modelId && candidate.enabled);
  if (!model) {
    throw new ApplicationError("MODEL_NOT_AVAILABLE", 400, "所选模型当前不可用");
  }

  return { ...model, capabilities: [...model.capabilities] };
}

export function quoteModel(modelId: string, count: number): CreditQuoteDto {
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    throw new ApplicationError("INVALID_COUNT", 400, "生成数量必须在 1 到 10 之间");
  }
  const model = findModel(modelId);

  return {
    modelId: model.id,
    count,
    unitCredits: model.creditCost,
    totalCredits: model.creditCost * count
  };
}
