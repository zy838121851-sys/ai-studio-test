import { callQwenImage, callQwenText, callQwenVision } from "./providers/qwen.provider.js";
import {
  buildAnalyzeImagePrompt,
  buildCanvasAgentPrompt,
  buildExtractImageTextPrompt,
  buildExtractPromptPrompt,
  buildPrepareActionPrompt
} from "./prompt-builder.service.js";

function parseJsonValue(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = (fenced?.[1] || text).trim();
  const candidates = [source];
  const objectStart = source.indexOf("{");
  const objectEnd = source.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd > objectStart) candidates.push(source.slice(objectStart, objectEnd + 1));
  const arrayStart = source.indexOf("[");
  const arrayEnd = source.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd > arrayStart) candidates.push(source.slice(arrayStart, arrayEnd + 1));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next possible JSON fragment.
    }
  }
  return null;
}

function normalizeExtractedTexts(value, rawText = "") {
  const source = Array.isArray(value)
    ? value
    : Array.isArray(value?.texts)
      ? value.texts
      : [];

  const normalized = source
    .map((item) => typeof item === "string" ? { text: item } : item)
    .map((item) => ({
      text: String(item?.text || item?.content || "").trim(),
      role: item?.role || item?.type || "其他",
      x: Number(item?.x || 0) || 0,
      y: Number(item?.y || 0) || 0,
      width: Number(item?.width || item?.w || 0) || 0,
      height: Number(item?.height || item?.h || 0) || 0
    }))
    .filter((item) => item.text);

  if (normalized.length) return normalized;

  return rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•\d.\s]+/, "").trim())
    .filter((line) => line.length >= 2 && line.length <= 80)
    .slice(0, 20)
    .map((text) => ({ text, role: "其他", x: 0, y: 0, width: 0, height: 0 }));
}

export async function generateImage({ model = "qwen-image-2.0-pro", prompt, images = [], size } = {}) {
  return callQwenImage({ model, prompt, images, size });
}

export async function analyzeImage({ image, title = "当前素材", refreshCount = 0 } = {}) {
  if (!image) throw new Error("Missing image");
  {
    const prompt = buildAnalyzeImagePrompt({ title, refreshCount });
    const result = await callQwenVision({ image, prompt });
    const text = result.text;
    return {
      text,
      analysis: parseJsonValue(text),
      raw: result.raw
    };
  }
  // TODO: remove legacy inline prompt after provider verification.
  const prompt = `
你是 AI 创作画布里的行业工作流识别 Skill。
请识别图片主体、所属行业、可能的用户工作流，并推荐最可能被点击的下一步物料。
不要给泛泛的“图片优化/高级海报/电商转化”。建议必须像真实设计工作流里的下一步产物。
如果 refreshCount 大于 0，只换一组建议，不要重新改变主体判断。

行业到物料参考：
- 潮玩/IP/公仔/手办/角色插画：3D渲染、实拍质感、毛绒设计、模型设定、盲盒包装、角色设定、周边样机。
- 服装/鞋包/配饰：模特上身、街拍图、Lookbook、面料特写、色款变体、详情页。
- 美妆/香水/个护：产品摄影、质地特写、成分功效图、礼盒包装、社媒主图。
- 食品/饮料/餐饮：食欲实拍、包装设计、货架陈列、礼盒组合、菜单海报、短视频分镜。
- 家具/家居/灯具：空间搭配、材质细节、风格变体、场景渲染、尺寸说明、安装示意。
- 3C/小家电/工具：功能拆解、使用场景、结构爆点、参数图、卖点长图、演示分镜。
- 五金/建材/机械：安装场景、结构拆解、工艺特写、工程说明、工业渲染、对比图。

只返回严格 JSON：
{
  "productName": "主体名称",
  "category": "主体类别",
  "industry": "行业",
  "workflowIntent": "最可能工作流",
  "materials": ["1-3个材质或质感"],
  "colors": ["1-3个主色"],
  "style": "视觉风格",
  "sellingPoints": ["1-3个识别点"],
  "targetAudience": "目标用户",
  "recommendedActions": [
    {
      "type": "render3d | productPhoto | plush | model | packaging | characterSheet | scene | poster | detail | closeup | copy | script | mockup",
      "title": "不超过6个中文字符",
      "description": "12-24字，说明为什么适合"
    }
  ]
}

素材标题：${title}
刷新次数：${Number(refreshCount) || 0}
`;

  const result = await callQwenVision({ image, prompt });
  const text = result.text;
  return {
    text,
    analysis: parseJsonValue(text),
    raw: result.raw
  };
}

export async function extractImageText({ image } = {}) {
  if (!image) throw new Error("Missing image");
  {
    const prompt = buildExtractImageTextPrompt();
    const result = await callQwenVision({ image, prompt });
    const text = result.text;
    const parsed = parseJsonValue(text);
    return {
      text,
      texts: normalizeExtractedTexts(parsed, text),
      raw: result.raw
    };
  }
  // TODO: remove legacy inline prompt after provider verification.
  const prompt = `
你是图片 OCR 与版面分析助手。识别图片中所有清晰可见、适合被用户编辑替换的文字。
只返回严格 JSON：
{
  "texts": [
    { "text": "原文", "role": "标题/副标题/卖点/按钮/其他", "x": 0, "y": 0, "width": 0, "height": 0 }
  ]
}
`;
  const result = await callQwenVision({ image, prompt });
  const text = result.text;
  const parsed = parseJsonValue(text);
  return {
    text,
    texts: normalizeExtractedTexts(parsed, text),
    raw: result.raw
  };
}

export async function prepareAction({ analysis, action } = {}) {
  if (!analysis) throw new Error("Missing analysis");
  if (!action?.type) throw new Error("Missing action");
  {
    const prompt = buildPrepareActionPrompt({ analysis, action });
    const result = await generateSuggestions({ prompt });
    return {
      action: result.analysis,
      text: result.text
    };
  }
  // TODO: remove legacy inline prompt after provider verification.

  const prompt = `
你是 AI 设计平台里的单个物料生成指令补全 Skill。
请基于识别信息和用户选择的建议，补全一个可直接用于图像生成的中文 prompt，以及 3 个偏好选项。

识别信息：
${JSON.stringify(analysis, null, 2)}

当前建议：
${JSON.stringify(action, null, 2)}

只返回严格 JSON：
{
  "prompt": "完整中文生成提示词",
  "decisionStyles": [
    { "label": "2-5个中文字符", "prompt": "追加到提示词里的具体偏好" }
  ]
}
`;
  const result = await generateSuggestions({ prompt });
  return {
    action: result.analysis,
    text: result.text
  };
}

export async function generateSuggestions({ prompt, canvasState } = {}) {
  if (!prompt) {
    const result = await callQwenText({ prompt: buildCanvasAgentPrompt({ canvasState }) });
    const text = result.text;
    return {
      text,
      analysis: parseJsonValue(text),
      raw: result.raw
    };
  }
  const textPrompt = prompt || `
你是隐藏在无限画布背后的 AI Core Agent。
只围绕当前选中对象，返回 1 条低打扰、可执行建议。
不要 Markdown，只返回 JSON：
{
  "text": "一句低打扰建议",
  "actionLabel": "按钮文字",
  "actionType": "generate_variant | explore | render3d | productPhoto | poster | detail | script",
  "mockResult": "点击后生成到画布上的结果卡片文案"
}

Canvas State:
${JSON.stringify(canvasState || {}, null, 2)}
`;

  const result = await callQwenText({ prompt: textPrompt });
  const text = result.text;
  return {
    text,
    analysis: parseJsonValue(text),
    raw: result.raw
  };
}

export async function extractPrompt(input = {}) {
  return generateSuggestions({
    prompt: buildExtractPromptPrompt(input)
  });
  // TODO: remove legacy inline prompt after provider verification.
  return generateSuggestions({
    prompt: `请从以下信息中提取可复用图像生成 prompt，只返回 JSON：{"prompt": "..."}\n${JSON.stringify(input, null, 2)}`
  });
}

export const qwenProvider = {
  analyzeImage,
  generateImage,
  generateSuggestions,
  extractPrompt
};
