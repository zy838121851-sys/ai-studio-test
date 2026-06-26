import { env } from "../../config/env.js";
import { DEFAULT_IMAGE_MODEL } from "../model-catalog.service.js";

function assertVolcengineApiKey() {
  if (!env.volcengineApiKey) throw new Error("Missing VOLCENGINE_API_KEY in .env");
}

export async function callVolcengineSeedreamImage({ model, prompt, images = [], size } = {}) {
  assertVolcengineApiKey();
  const referenceImages = Array.from(images || []).filter(Boolean).slice(0, 14);
  const resolvedModel = normalizeVolcengineModel(model);
  const body = {
    model: resolvedModel,
    prompt: buildVolcengineImagePrompt({
      prompt,
      hasReferences: referenceImages.length > 0,
      referenceCount: referenceImages.length
    }),
    size: normalizeVolcengineSize(size, resolvedModel),
    response_format: "url",
    watermark: false,
    sequential_image_generation: "disabled",
    sequential_image_generation_options: {
      interval: 1
    }
  };
  if (supportsOutputFormat(resolvedModel)) {
    body.output_format = "png";
  }
  if (referenceImages.length > 0) {
    body.image = referenceImages.length === 1 ? referenceImages[0] : referenceImages;
  }

  const response = await fetch(env.volcengineImageUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.volcengineApiKey}`
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || data.message || `Volcengine image request failed: ${response.status}`);
  }
  const imageUrl = pickVolcengineImageUrl(data);
  if (!imageUrl) throw new Error("Volcengine image request succeeded without an image URL");
  return {
    imageUrl,
    model: resolvedModel,
    requestedModel: model,
    referenceCount: referenceImages.length,
    providerCalls: [
      {
        provider: "volcengine",
        model: resolvedModel,
        operation: "generateImage",
        endpoint: env.volcengineImageUrl
      }
    ],
    raw: data
  };
}

function normalizeVolcengineModel(model) {
  const id = String(model || "").trim();
  return id || DEFAULT_IMAGE_MODEL;
}

function supportsOutputFormat(model) {
  return String(model || "") === DEFAULT_IMAGE_MODEL;
}

function normalizeVolcengineSize(size, model) {
  const value = String(size || "").trim();
  if (/^[1-4]K$/i.test(value)) return value.toUpperCase();
  const match = value.match(/^(\d+)\*(\d+)$/);
  if (!match) return "2K";
  const longEdge = Math.max(Number(match[1]), Number(match[2]));
  if (longEdge >= 4096 && model !== DEFAULT_IMAGE_MODEL) return "4K";
  if (longEdge >= 3000) return "3K";
  return "2K";
}

function buildVolcengineImagePrompt({ prompt = "", hasReferences = false, referenceCount = 0 } = {}) {
  const userPrompt = String(prompt || "").trim() || "Generate a high quality creative image";
  if (!hasReferences) return userPrompt;
  const orderedReferences = Array.from({ length: Math.max(1, Math.min(14, referenceCount || 1)) }, (_, index) => (
    `参考图 ${index + 1}：用户上传的第 ${index + 1} 张图片。`
  ));
  return [
    "这是图生图任务。必须以参考图作为主要主体，不要生成无关的新主体。",
    "请保留参考图中的角色身份、轮廓、发型、服装、道具、主要配色、姿态和构图关系，除非用户明确要求改变。",
    ...orderedReferences,
    "如果有多张参考图，第 1 张是主体锚点，其余图片只作为风格、材质、服装或细节参考。",
    "用户提示只表示要应用到参考主体上的转换目标，不能覆盖或替换参考主体。",
    `用户提示：${userPrompt}`
  ].join("\n");
}

function pickVolcengineImageUrl(data) {
  const first = Array.isArray(data?.data) ? data.data[0] : null;
  const candidates = [
    first?.url,
    first?.image_url,
    first?.image,
    data?.imageUrl,
    data?.image_url,
    data?.url
  ];
  return candidates.find(Boolean) || null;
}
