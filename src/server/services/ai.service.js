import { getAIProvider, resolveImageGenerationRoute } from "./providers/index.js";
import {
  DEFAULT_EXPAND_MODEL,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_UPSCALE_MODEL,
  getModelConfig
} from "./model-catalog.service.js";
import {
  buildAnalyzeImagePrompt,
  buildCanvasAgentPrompt,
  buildExpandImagePlanPrompt,
  buildExtractImageTextPrompt,
  buildExtractPromptPrompt,
  buildPrepareActionPrompt
} from "./prompt-builder.service.js";
import { getApimartTaskStatus } from "./providers/apimart/apimart-task.service.js";

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
      role: item?.role || item?.type || "other",
      x: Number(item?.x || 0) || 0,
      y: Number(item?.y || 0) || 0,
      width: Number(item?.width || item?.w || 0) || 0,
      height: Number(item?.height || item?.h || 0) || 0
    }))
    .filter((item) => item.text);

  if (normalized.length) return normalized;

  return rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\\d.\\s]+/, "").trim())
    .filter((line) => line.length >= 2 && line.length <= 80)
    .slice(0, 20)
    .map((text) => ({ text, role: "other", x: 0, y: 0, width: 0, height: 0 }));
}

export async function generateImage({ model = DEFAULT_IMAGE_MODEL, prompt, images = [], size, requestId } = {}) {
  const requestedModel = String(model || "").trim() || DEFAULT_IMAGE_MODEL;
  const route = resolveImageGenerationRoute(requestedModel, "generateImage");
  const result = await route.provider.generateImage({
    model: route.providerModel,
    prompt,
    images,
    size,
    requestId
  });
  return {
    ...result,
    model: result.model || route.providerModel,
    requestedModel: route.requestedModel,
    resolvedModel: route.resolvedModel,
    provider: route.providerId,
    providerModel: route.providerModel,
    providerCalls: normalizeProviderCalls(result.providerCalls, {
      provider: route.providerId,
      model: route.providerModel,
      operation: "generateImage"
    })
  };
}

export async function generateVideo({ model, prompt, images = [], videoOptions = {}, requestId } = {}) {
  const requestedModel = String(model || "").trim();
  const route = resolveImageGenerationRoute(requestedModel, "generateVideo");
  const result = await route.provider.generateVideo({
    model: route.providerModel,
    prompt,
    images,
    videoOptions,
    requestId
  });
  return {
    ...result,
    model: result.model || route.providerModel,
    requestedModel: route.requestedModel,
    resolvedModel: route.resolvedModel,
    provider: route.providerId,
    providerModel: route.providerModel,
    providerCalls: normalizeProviderCalls(result.providerCalls, {
      provider: route.providerId,
      model: route.providerModel,
      operation: "generateVideo"
    })
  };
}

export async function generateFixedQwenImageEdit({
  prompt,
  images = [],
  size,
  requestId
} = {}) {
  const requestedModel = "qwen-image-edit-plus";
  const result = await getAIProvider("qwen").generateImage({
    model: requestedModel,
    prompt,
    images,
    size,
    requestId
  });
  return {
    ...result,
    model: result.model || requestedModel,
    requestedModel,
    resolvedModel: result.resolvedModel || result.model || requestedModel,
    provider: "qwen",
    providerModel: result.providerModel || result.resolvedModel || result.model || requestedModel,
    providerCalls: normalizeProviderCalls(result.providerCalls, {
      provider: "qwen",
      model: requestedModel,
      operation: "generateImage"
    })
  };
}

export async function expandImage({ image, prompt, expand } = {}) {
  if (!image) throw new Error("Missing image");
  const requestedModel = String(DEFAULT_EXPAND_MODEL).trim() || DEFAULT_IMAGE_MODEL;
  const plan = await buildAutoExpandPrompt({ image, prompt, expand });
  const enhancedPrompt = plan.prompt;
  const rawResult = await getAIProvider("apimart").expandImage({
    model: DEFAULT_EXPAND_MODEL,
    image,
    prompt: enhancedPrompt,
    expand
  });
  const result = await resolveImmediateApimartImageResult(rawResult, {
    model: DEFAULT_EXPAND_MODEL,
    operation: "expandImage"
  });
  return {
    ...result,
    model: result.model || DEFAULT_EXPAND_MODEL,
    provider: "apimart",
    requestedModel,
    resolvedModel: DEFAULT_EXPAND_MODEL,
    providerModel: DEFAULT_EXPAND_MODEL,
    providerCalls: [
      ...normalizeProviderCalls(plan.providerCalls),
      ...normalizeProviderCalls(result.providerCalls, {
        provider: "apimart",
        model: DEFAULT_EXPAND_MODEL,
        operation: "expandImage"
      })
    ]
  };
}

export async function superResolutionImage({ image, prompt, upscaleFactor } = {}) {
  if (!image) throw new Error("Missing image");
  const requestedModel = String(DEFAULT_UPSCALE_MODEL).trim() || "wanx2.1-imageedit";
  const result = await getAIProvider("qwen").superResolutionImage({
    image,
    prompt,
    upscaleFactor
  });
  return {
    ...result,
    provider: "qwen",
    requestedModel,
    resolvedModel: DEFAULT_UPSCALE_MODEL,
    providerModel: DEFAULT_UPSCALE_MODEL,
    upscaleFactor: result.upscaleFactor || upscaleFactor,
    providerCalls: normalizeProviderCalls(result.providerCalls, {
      provider: "qwen",
      model: DEFAULT_UPSCALE_MODEL,
      operation: "superResolutionImage"
    })
  };
}

export async function analyzeImage({ image, title = "Current asset", refreshCount = 0, model, signal, runId = "" } = {}) {
  if (!image) throw new Error("Missing image");
  {
    assertAuxiliaryProviderAllowed({ model, operation: "图片分析" });
    const prompt = buildAnalyzeImagePrompt({ title, refreshCount });
    console.debug("[ai.service] analyzeImage signal", {
      runId,
      hasSignal: Boolean(signal),
      signalAborted: Boolean(signal?.aborted),
      provider: "qwen"
    });
    let result;
    try {
      result = await getAIProvider("qwen").analyzeImage({ image, prompt, signal, runId });
    } catch (error) {
      console.debug("[ai.service] analyzeImage error", {
        runId,
        aborted: error?.name === "AbortError",
        signalAborted: Boolean(signal?.aborted),
        errorName: error?.name || "",
        error: error?.message || String(error)
      });
      throw error;
    }
    const text = result.text;
    return {
      text,
      analysis: parseJsonValue(text),
      provider: "qwen",
      providerModel: "qwen-vision",
      providerCalls: normalizeProviderCalls(result.providerCalls),
      usage: result.usage,
      raw: result.raw
    };
  }
}

export async function extractImageText({ image, model } = {}) {
  if (!image) throw new Error("Missing image");
  {
    assertAuxiliaryProviderAllowed({ model, operation: "图片文字识别" });
    const prompt = buildExtractImageTextPrompt();
    const result = await getAIProvider("qwen").analyzeImage({ image, prompt });
    const text = result.text;
    const parsed = parseJsonValue(text);
    return {
      text,
      texts: normalizeExtractedTexts(parsed, text),
      provider: "qwen",
      providerModel: "qwen-vision",
      providerCalls: normalizeProviderCalls(result.providerCalls),
      raw: result.raw
    };
  }
}

export async function prepareAction({ analysis, action, model } = {}) {
  if (!analysis) throw new Error("Missing analysis");
  if (!action?.type) throw new Error("Missing action");
  {
    assertAuxiliaryProviderAllowed({ model, operation: "动作提示词准备" });
    const prompt = buildPrepareActionPrompt({ analysis, action });
    const result = await generateSuggestions({ prompt, model });
    return {
      action: result.analysis,
      text: result.text,
      providerCalls: result.providerCalls
    };
  }
}

export async function generateSuggestions({ prompt, canvasState, model, signal } = {}) {
  assertAuxiliaryProviderAllowed({ model, operation: "智能建议" });
  if (!prompt) {
    const result = await getAIProvider("qwen").generateText({ prompt: buildCanvasAgentPrompt({ canvasState }), signal });
    const text = result.text;
    return {
      text,
      analysis: parseJsonValue(text),
      provider: "qwen",
      providerModel: "qwen-vision",
      providerCalls: normalizeProviderCalls(result.providerCalls),
      raw: result.raw
    };
  }
  const textPrompt = prompt;

  const result = await getAIProvider("qwen").generateText({ prompt: textPrompt, signal });
  const text = result.text;
  return {
    text,
    analysis: parseJsonValue(text),
    provider: "qwen",
    providerModel: "qwen-vision",
    providerCalls: normalizeProviderCalls(result.providerCalls),
    raw: result.raw
  };
}

export async function extractPrompt(input = {}) {
  return generateSuggestions({
    prompt: buildExtractPromptPrompt(input)
  });
}

async function buildAutoExpandPrompt({ image, prompt = "", expand = {} } = {}) {
  const basePrompt = String(prompt || "").trim();
  const plannerCall = {
    provider: "qwen",
    model: "qwen-vision",
    operation: "expandPlanning",
    endpoint: "dashscope-multimodal-generation"
  };
  try {
    const result = await getAIProvider("qwen").analyzeImage({
      image,
      prompt: buildExpandImagePlanPrompt({ prompt: basePrompt, expand })
    });
    const plan = normalizeExpandPlan(parseJsonValue(result.text), result.text);
    return {
      prompt: buildEnhancedExpandPrompt(basePrompt, plan),
      providerCalls: normalizeProviderCalls(result.providerCalls, plannerCall)
    };
  } catch (error) {
    console.warn("[image-expand] Failed to build automatic expansion plan", error);
    return {
      prompt: basePrompt,
      providerCalls: [plannerCall]
    };
  }
}

async function resolveImmediateApimartImageResult(result = {}, {
  model = "",
  operation = "generateImage",
  attempts = 90,
  delayMs = 2000,
  returnPending = false
} = {}) {
  if (result?.imageUrl || !result?.taskId && !result?.remoteTaskId) return result;
  const remoteTaskId = result.remoteTaskId || result.taskId;
  let lastStatus = result.status || "queued";
  for (let index = 0; index < attempts; index += 1) {
    await delay(delayMs);
    const remote = await getApimartTaskStatus(remoteTaskId, {
      type: "image",
      model: result.model || model
    });
    lastStatus = remote.status || lastStatus;
    if (remote.status === "succeeded") {
      const first = remote.outputs?.[0];
      if (!first?.url) {
        throw new Error(`${operation} completed without an output image`);
      }
      return {
        ...result,
        imageUrl: first.url,
        model: result.model || model,
        remoteTaskId,
        taskId: remoteTaskId,
        status: "succeeded"
      };
    }
    if (["failed", "cancelled", "timeout"].includes(remote.status)) {
      throw new Error(remote.errorMessage || `${operation} ${remote.status}`);
    }
  }
  if (returnPending) {
    return {
      ...result,
      model: result.model || model,
      remoteTaskId,
      taskId: remoteTaskId,
      status: lastStatus || "running"
    };
  }
  throw new Error(`${operation} is still running (${lastStatus}). Please try again later.`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeProviderCalls(calls, fallback = null) {
  const normalized = Array.isArray(calls)
    ? calls
      .map((call) => ({
        provider: String(call?.provider || "").trim(),
        model: String(call?.model || "").trim(),
        operation: String(call?.operation || "").trim(),
        endpoint: String(call?.endpoint || "").trim()
      }))
      .filter((call) => call.provider || call.model || call.operation || call.endpoint)
    : [];
  if (normalized.length) return normalized;
  return fallback ? [fallback] : [];
}

function assertAuxiliaryProviderAllowed({ model, operation = "辅助能力" } = {}) {
  const requestedModel = String(model || DEFAULT_IMAGE_MODEL).trim() || DEFAULT_IMAGE_MODEL;
  const config = getModelConfig(requestedModel);
  if (!config) {
    const error = new Error(`Unsupported image model: ${requestedModel}`);
    error.status = 400;
    throw error;
  }
  if (config.providerId === "volcengine") {
    const error = new Error(`${operation}当前只支持阿里/Qwen 辅助模型。已选择 ${config.label || config.id}，为避免隐藏调用千问，请切换到 Wan/Qwen 模型后再使用该功能。`);
    error.status = 400;
    throw error;
  }
}

export function buildEnhancedExpandPrompt(basePrompt = "", rawPlan = null) {
  const prompt = String(basePrompt || "").trim();
  const plan = normalizeExpandPlan(rawPlan);
  if (!plan) return prompt;
  return [
    prompt,
    "Automatic expansion plan from the source image:",
    plan.sceneSummary ? `Scene: ${plan.sceneSummary}` : "",
    Object.keys(plan.outsideAreaPlan || {}).length ? `Outside area plan: ${formatOutsideAreaPlan(plan.outsideAreaPlan)}` : "",
    plan.continuityRules?.length ? `Continuity rules: ${plan.continuityRules.join("; ")}` : "",
    plan.outpaintPrompt ? `Use this outpaint direction: ${plan.outpaintPrompt}` : "",
    plan.negative?.length ? `Avoid: ${plan.negative.join("; ")}` : ""
  ].filter(Boolean).join("\n");
}

function normalizeExpandPlan(value, rawText = "") {
  const source = value && typeof value === "object" ? value : {};
  const outpaintPrompt = normalizeCompactText(source.outpaintPrompt || source.prompt || rawText, 900);
  const sceneSummary = normalizeCompactText(source.sceneSummary || source.summary || "", 360);
  const outsideAreaPlan = normalizeOutsideAreaPlan(source.outsideAreaPlan || source.expansionPlan || {});
  const continuityRules = normalizeStringList(source.continuityRules || source.rules).slice(0, 5);
  const negative = normalizeStringList(source.negative || source.avoid).slice(0, 5);
  if (!outpaintPrompt && !sceneSummary && !Object.keys(outsideAreaPlan).length) return null;
  return {
    sceneSummary,
    outsideAreaPlan,
    continuityRules,
    outpaintPrompt,
    negative
  };
}

function normalizeOutsideAreaPlan(value = {}) {
  if (!value || typeof value !== "object") return {};
  return ["left", "right", "top", "bottom"].reduce((next, key) => {
    const text = normalizeCompactText(value[key], 260);
    if (text) next[key] = text;
    return next;
  }, {});
}

function normalizeStringList(value) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\n|;|,/) : [];
  return source
    .map((item) => normalizeCompactText(item, 220))
    .filter(Boolean);
}

function normalizeCompactText(value, maxLength = 600) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function formatOutsideAreaPlan(plan = {}) {
  return ["left", "right", "top", "bottom"]
    .filter((key) => plan[key])
    .map((key) => `${key}: ${plan[key]}`)
    .join("; ");
}
