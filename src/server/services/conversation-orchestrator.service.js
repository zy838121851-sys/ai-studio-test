import {
  analyzeImage,
  generateSuggestions
} from "./ai.service.js";
import { getModelConfig } from "./model-catalog.service.js";
import {
  appendConversationMessage,
  completeConversationMessage,
  getConversationForUser,
  listRecentConversationMessages,
  updateConversationSummary
} from "./conversation.service.js";

const THINKING_STEPS = [
  { key: "context", label: "读取上下文" },
  { key: "references", label: "图片分析" },
  { key: "prompt", label: "优化提示词" },
  { key: "tool", label: "执行生成" },
  { key: "final", label: "整理结果" }
];

const EDIT_RE = /(修改|改成|调整|替换|去掉|删除|扩图|补全|补图|补画|补齐|延展|扩展|放大|修图|编辑|outpaint|complete|extend|upscale|edit|change|remove|replace)/i;
const FIGURINE_RE = /(手办|盲盒|潮玩|公仔|玩偶|玩具|figurine|designer toy|collectible|toy)/i;
const ECOMMERCE_RE = /(电商|主图|商品图|产品图|卖点|详情页|促销|购买|价格|banner|shop|commerce|product listing)/i;
const POSTER_RE = /(海报|封面|宣传图|招贴|poster|cover|key visual)/i;
const PRODUCT_RENDER_RE = /(3d|3D|效果图|产品渲染|渲染图|材质|结构|建模|立体|product render|render)/i;
const STYLE_TRANSFER_RE = /(风格化|风格迁移|改成.*风格|换成.*风格|像.*一样|style transfer|in the style)/i;
const CHAT_AGENT_CONFIG = {
  autoExecute: true,
  qwenVlModeForGeneration: "required",
  promptOptimizerModeForGeneration: "required",
  intentTimeoutMs: 2000,
  imageAnalysisTimeoutMs: 5000,
  promptOptimizerTimeoutMs: 4000,
  totalAgentBudgetMs: 8000
};
const IMAGE_ANALYSIS_TIMEOUT_MS = CHAT_AGENT_CONFIG.imageAnalysisTimeoutMs;
const PROMPT_OPTIMIZE_TIMEOUT_MS = CHAT_AGENT_CONFIG.promptOptimizerTimeoutMs;
const QWEN_VL_MODE = {
  disabledForGeneration: "disabled_for_generation",
  optionalTimeout: "optional_timeout",
  required: "required",
  requiredWithBudget: "required_with_budget",
  requiredForAnalysis: "required_for_analysis"
};
const PROMPT_OPTIMIZER_MODE = {
  disabledForGeneration: "disabled_for_generation",
  lightweight: "lightweight",
  required: "required",
  requiredWithBudget: "required_with_budget"
};
const TASK_TYPE = {
  figurineRender: "figurine_render",
  ecommerceMainImage: "ecommerce_main_image",
  productRender: "product_render",
  posterDesign: "poster_design",
  styleTransfer: "style_transfer",
  imageEdit: "image_edit",
  videoGeneration: "video_generation",
  generalImage: "general_image"
};
const PROMPT_STRATEGIES = {
  [TASK_TYPE.figurineRender]: {
    name: "figurine_render_v1",
    instructions: [
      "Task goal: transform the reference subject into a 3D collectible figurine or designer toy render.",
      "Must preserve: subject identity, face/expression, hairstyle, outfit, main colors, key props, and the character's overall temperament from the reference image.",
      "Allowed enhancements: toy-like 3D form, PVC/resin/plush material cues when appropriate, display base, product photography lighting, clean studio background, polished commercial presentation.",
      "Do not: change the subject identity, add extra characters, add text/logos/watermarks, invent unrelated accessories, or over-realistically humanize a cartoon reference."
    ]
  },
  [TASK_TYPE.ecommerceMainImage]: {
    name: "ecommerce_main_image_v1",
    instructions: [
      "Task goal: create an ecommerce hero/main image with a clear product subject and commercial composition.",
      "Must preserve: the actual product shape, material, color, function, and visible structure from the reference image.",
      "Allowed enhancements: clean background, stronger product hierarchy, simple selling-point layout, realistic product lighting, platform-friendly spacing.",
      "Do not: invent brand names, logos, prices, certifications, or unreadable text unless the user explicitly requested them."
    ]
  },
  [TASK_TYPE.productRender]: {
    name: "product_render_v1",
    instructions: [
      "Task goal: create a polished 3D/product effect render with stronger material, lighting, structure, and display quality.",
      "Must preserve: the reference subject's core shape, proportions, colors, and identifiable design details.",
      "Allowed enhancements: controlled studio lighting, material refinement, depth, perspective, realistic shadows, and presentation-grade composition.",
      "Do not: replace the product or character with a different subject, add text/logos, or introduce unrelated scene clutter."
    ]
  },
  [TASK_TYPE.posterDesign]: {
    name: "poster_design_v1",
    instructions: [
      "Task goal: create a poster or promotional key visual based on the user's request and references.",
      "Must preserve: core subject, mood, color direction, and any explicitly requested theme.",
      "Allowed enhancements: stronger visual hierarchy, background atmosphere, graphic composition, and campaign-like polish.",
      "Do not: invent specific readable copy, logos, dates, or prices unless the user provides them."
    ]
  },
  [TASK_TYPE.styleTransfer]: {
    name: "style_transfer_v1",
    instructions: [
      "Task goal: keep the reference subject while changing visual style as requested.",
      "Must preserve: subject identity, pose/composition when relevant, key colors, and important objects.",
      "Allowed enhancements: requested art direction, rendering style, lighting, texture, and mood.",
      "Do not: drift to a new subject, add extra characters, or ignore the requested style."
    ]
  },
  [TASK_TYPE.imageEdit]: {
    name: "image_edit_v1",
    instructions: [
      "Task goal: apply the user's explicit edit to the referenced image.",
      "Must preserve: unchanged areas, original subject identity, composition, and factual product details.",
      "Allowed enhancements: only those needed to fulfill the edit cleanly.",
      "Do not: rewrite the whole image when the user asked for a local or specific edit."
    ]
  },
  [TASK_TYPE.videoGeneration]: {
    name: "video_generation_v1",
    instructions: [
      "Task goal: create a video prompt with subject, scene, motion, camera, lighting, and duration feel.",
      "Must preserve: reference subject identity and explicitly requested action or mood.",
      "Allowed enhancements: camera movement, temporal staging, natural motion, and cinematic lighting.",
      "Do not: add unrelated plot elements, text overlays, or extra subjects unless requested."
    ]
  },
  [TASK_TYPE.generalImage]: {
    name: "general_image_v1",
    instructions: [
      "Task goal: turn the user's request into a clear image generation prompt.",
      "Must preserve: all explicit user requirements and any reference-image constraints.",
      "Allowed enhancements: subject clarity, composition, style, lighting, material, color, and negative constraints.",
      "Do not: invent unsupported factual details or add text/logos unless requested."
    ]
  }
};

const HIGH_RISK_PROMPT_DRIFT_RULES = [
  {
    tag: "ecommerce_scene",
    test: /(电商|主图|详情页|促销|购买|价格|卖点|e-?commerce|commerce|hero image|product listing|selling point|commercial-grade|shop)/i,
    allow: ECOMMERCE_RE
  },
  {
    tag: "banner_layout",
    test: /(banner|横幅|移动端|桌面端|mobile banner|desktop banner|social media ad)/i,
    allow: /(banner|横幅|移动端|桌面端|广告|社媒|social media|ad)/i
  },
  {
    tag: "poster_layout",
    test: /(海报|封面|宣传图|招贴|poster|cover|key visual|campaign)/i,
    allow: POSTER_RE
  },
  {
    tag: "extra_subjects",
    test: /(多角色|多人|多个主体|额外角色|群像|extra characters|multiple characters|crowd|group of characters)/i,
    allow: /(多角色|多人|多个主体|额外角色|群像|extra characters|multiple characters|crowd|group)/i
  },
  {
    tag: "invented_copy",
    test: /(品牌名|品牌标识|价格标签|促销文案|可读文字|headline|slogan|copywriting|price tag|brand name)/i,
    allow: /(品牌|logo|价格|文字|文案|标题|标语|headline|slogan|copywriting|price|brand|text|logo)/i
  }
];

function normalizeText(value = "", maxLength = 4000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function compactJson(value, maxLength = 9000) {
  const text = JSON.stringify(value || {});
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`;
}

function parseJsonValue(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = (fenced?.[1] || text).trim();
  const objectStart = source.indexOf("{");
  const objectEnd = source.lastIndexOf("}");
  const candidates = [
    source,
    objectStart !== -1 && objectEnd > objectStart ? source.slice(objectStart, objectEnd + 1) : ""
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next fragment.
    }
  }
  return null;
}

function getModelType(model = "") {
  return getModelConfig(model)?.type === "video" ? "video" : "image";
}

function isGenerationIntent(intent = "") {
  return ["generate_image", "edit_image", "generate_video"].includes(intent);
}

function hasChineseText(text = "") {
  return /[\u3400-\u9fff]/.test(String(text || ""));
}

function getWeakStrategyTags({ text = "", taskType = "", modelType = "image", attachments = [] } = {}) {
  const clean = normalizeText(text);
  const tags = new Set();
  if (attachments.length) tags.add("reference_guided");
  if (modelType === "video") tags.add("video_generation");
  if (FIGURINE_RE.test(clean) || taskType === TASK_TYPE.figurineRender) tags.add("figurine_style");
  if (ECOMMERCE_RE.test(clean) || taskType === TASK_TYPE.ecommerceMainImage) tags.add("ecommerce_main_image");
  if (POSTER_RE.test(clean) || taskType === TASK_TYPE.posterDesign) tags.add("poster_design");
  if (STYLE_TRANSFER_RE.test(clean) || taskType === TASK_TYPE.styleTransfer) tags.add("style_transfer");
  if (PRODUCT_RENDER_RE.test(clean) || taskType === TASK_TYPE.productRender) tags.add("product_render");
  if (/(补全|补图|补画|补齐|延展|扩展|outpaint|complete|extend)/i.test(clean)) tags.add("outpaint_complete");
  if (/(背景|换背景|替换背景|background)/i.test(clean)) tags.add("background_edit");
  if (/(修改|改成|调整|替换|去掉|删除|修图|编辑|edit|change|remove|replace)/i.test(clean)) tags.add("image_edit");
  return Array.from(tags);
}

function buildConservativePrompt({ text = "", modelType = "image", attachments = [] } = {}) {
  const original = normalizeText(text, 2000);
  const quoted = original ? `「${original}」` : "当前需求";
  const hasReferences = attachments.length > 0;
  const chinese = hasChineseText(original);
  const isOutpaint = /(补全|补图|补画|补齐|延展|扩展|outpaint|complete|extend)/i.test(original);
  const isBackgroundEdit = /(背景|换背景|替换背景|background)/i.test(original);
  const isStyleTransfer = STYLE_TRANSFER_RE.test(original);
  const isFigurine = FIGURINE_RE.test(original);
  if (chinese) {
    if (modelType === "video") {
      return hasReferences
        ? `基于参考图，按用户要求${quoted}生成视频。保留主体、主要颜色和关键细节，补充必要镜头与光线；不要添加无关文字、logo、品牌、价格或额外主体。`
        : `按用户要求${quoted}生成视频。补充主体、镜头和光线细节；不要添加用户未要求的文字、品牌或无关元素。`;
    }
    if (hasReferences && isOutpaint) {
      return `基于参考图，按用户要求${quoted}补全画面。保持主体、透视、边缘和光线连续；不要改变主体或添加无关元素。`;
    }
    if (hasReferences && isBackgroundEdit) {
      return `基于参考图，按用户要求${quoted}调整背景。保持主体、姿态、主要颜色和轮廓；不要添加无关文字、logo、品牌、价格或额外主体。`;
    }
    if (hasReferences && isStyleTransfer) {
      return `基于参考图，按用户要求${quoted}转换风格。保持主体、主要颜色、构图和关键细节；不要添加无关文字、logo、品牌、价格或额外主体。`;
    }
    if (hasReferences && isFigurine) {
      return `基于参考图，按用户要求${quoted}生成手办效果。保留主体特征、主要颜色和关键道具，轻度增强 3D 手办材质与灯光；不要添加无关文字、logo、品牌、价格或额外主体。`;
    }
    return hasReferences
      ? `基于参考图，按用户要求${quoted}生成。保留主体、主要颜色、构图和关键细节；不要添加无关文字、logo、品牌、价格或额外主体。`
      : `按用户要求${quoted}生成。补充清晰主体、构图和光线；不要添加用户未要求的文字、品牌或无关元素。`;
  }
  if (modelType === "video") {
    return hasReferences
      ? `Use the reference image and follow the user's request: "${original || "the current request"}". Preserve the subject, main colors, and key details; add only necessary camera and lighting details. No unrelated text, logos, brands, prices, or extra subjects.`
      : `Follow the user's request: "${original || "the current request"}". Add concise subject, camera, and lighting details. No unrequested text, brands, or unrelated elements.`;
  }
  if (hasReferences && isOutpaint) {
    return `Use the reference image and follow the user's request: "${original || "the current request"}". Preserve subject, perspective, edges, and lighting continuity. Do not change the subject or add unrelated elements.`;
  }
  if (hasReferences && isBackgroundEdit) {
    return `Use the reference image and follow the user's request: "${original || "the current request"}". Preserve the subject, pose, main colors, and silhouette. Change only the background. No unrelated text, logos, brands, prices, or extra subjects.`;
  }
  if (hasReferences && isStyleTransfer) {
    return `Use the reference image and follow the user's request: "${original || "the current request"}". Preserve the subject, main colors, composition, and key details. Change only the requested style. No unrelated text, logos, brands, prices, or extra subjects.`;
  }
  if (hasReferences && isFigurine) {
    return `Use the reference image and follow the user's request: "${original || "the current request"}". Preserve subject features, main colors, and key props; lightly enhance 3D figurine material and lighting. No unrelated text, logos, brands, prices, or extra subjects.`;
  }
  return hasReferences
    ? `Use the reference image and follow the user's request: "${original || "the current request"}". Preserve the subject, main colors, composition, and key details. No unrelated text, logos, brands, prices, or extra subjects.`
    : `Follow the user's request: "${original || "the current request"}". Add concise subject, composition, and lighting details. No unrequested text, brands, or unrelated elements.`;
}

function detectPromptDrift({ originalPrompt = "", optimizedPrompt = "" } = {}) {
  const original = normalizeText(originalPrompt, 4000);
  const optimized = normalizeText(optimizedPrompt, 4000);
  const matched = HIGH_RISK_PROMPT_DRIFT_RULES
    .filter((rule) => rule.test.test(optimized) && !rule.allow.test(original))
    .map((rule) => rule.tag);
  const languageMismatch = hasChineseText(original) && optimized && !hasChineseText(optimized);
  if (languageMismatch) matched.push("language_mismatch");
  return {
    driftDetected: matched.length > 0,
    matched
  };
}

function finalizeOptimizedPrompt({
  originalPrompt = "",
  candidatePrompt = "",
  parsedStrategyTags = [],
  modelType = "image",
  attachments = [],
  taskType = ""
} = {}) {
  const strategyTags = Array.from(new Set([
    ...getWeakStrategyTags({ text: originalPrompt, taskType, modelType, attachments }),
    ...(Array.isArray(parsedStrategyTags) ? parsedStrategyTags.map((item) => normalizeText(item, 80)).filter(Boolean) : [])
  ]));
  const candidate = normalizeText(candidatePrompt, 4000);
  const drift = detectPromptDrift({ originalPrompt, optimizedPrompt: candidate });
  if (!candidate || drift.driftDetected) {
    return {
      optimizedPrompt: buildConservativePrompt({ text: originalPrompt, modelType, attachments }),
      strategyTags,
      promptDriftDetected: drift.driftDetected,
      usedConservativeFallback: true,
      fallbackReason: drift.matched.length
        ? `prompt drift detected: ${drift.matched.join(", ")}`
        : "empty optimized prompt"
    };
  }
  return {
    optimizedPrompt: candidate,
    strategyTags,
    promptDriftDetected: false,
    usedConservativeFallback: false,
    fallbackReason: ""
  };
}

function classifyTaskType({ text = "", intent = "", modelType = "image", attachments = [] } = {}) {
  const clean = normalizeText(text);
  const hasReferences = attachments.length > 0;
  if (intent === "generate_video" || modelType === "video") return TASK_TYPE.videoGeneration;
  if (intent === "edit_image") return TASK_TYPE.imageEdit;
  if (!isGenerationIntent(intent)) return "";
  if (EDIT_RE.test(clean) && hasReferences) return TASK_TYPE.imageEdit;
  if (FIGURINE_RE.test(clean)) return TASK_TYPE.figurineRender;
  if (ECOMMERCE_RE.test(clean)) return TASK_TYPE.ecommerceMainImage;
  if (POSTER_RE.test(clean)) return TASK_TYPE.posterDesign;
  if (STYLE_TRANSFER_RE.test(clean) && hasReferences) return TASK_TYPE.styleTransfer;
  if (PRODUCT_RENDER_RE.test(clean)) return TASK_TYPE.productRender;
  return TASK_TYPE.generalImage;
}

function getPromptStrategy(taskType = "") {
  return PROMPT_STRATEGIES[taskType] || PROMPT_STRATEGIES[TASK_TYPE.generalImage];
}

function summarizeDecision({ intent, taskType = "", attachments = [], canvasContext = {}, model = "" } = {}) {
  const selectedCount = Array.isArray(canvasContext?.selected) ? canvasContext.selected.length : 0;
  const referenceText = [
    attachments.length ? `${attachments.length} 张引用图` : "",
    selectedCount ? `${selectedCount} 个选中画布节点` : ""
  ].filter(Boolean).join("、");
  if (taskType === TASK_TYPE.figurineRender) {
    return `我会先分析参考图主体，再按手办/潮玩效果整理提示词，保留角色特征并增强 3D 材质和产品展示感。`;
  }
  if (taskType === TASK_TYPE.ecommerceMainImage) {
    return `我会先分析产品主体，再按电商主图策略整理提示词，强化商品展示和卖点表达。`;
  }
  if (taskType === TASK_TYPE.productRender) {
    return `我会把当前上下文${referenceText ? `和 ${referenceText}` : ""}整理成 3D/产品效果图提示词，强化材质、灯光和结构展示。`;
  }
  if (intent === "generate_video") {
    return `我会把当前上下文${referenceText ? `和 ${referenceText}` : ""}整理成视频生成提示词，再调用 ${model || "当前视频模型"}。`;
  }
  if (intent === "generate_image") {
    return `我会把当前上下文${referenceText ? `和 ${referenceText}` : ""}整理成图片生成提示词，再调用 ${model || "当前图像模型"}。`;
  }
  if (intent === "edit_image") {
    return `我会优先使用当前引用图或选中图片作为编辑对象，并把修改要求整理成可执行的图像提示词。`;
  }
  if (intent === "analyze_image") {
    return "我会先分析引用图片和画布信息，提取后续生成可用的主体、风格、构图和约束。";
  }
  return "我会根据当前项目上下文直接回答，不触发图片或视频生成。";
}

function buildAnswerPrompt({ conversation, recentMessages, text, canvasContext, attachments, imageAnalysis = null } = {}) {
  return [
    "You are the conversational design assistant inside AI Studio.",
    "Answer in Chinese unless the user clearly asks otherwise.",
    "Use the current project context and recent conversation. Be concise, practical, and specific.",
    "Do not claim that you generated an image or video unless a generation tool actually ran.",
    "",
    `Conversation summary: ${conversation?.summary || "(none)"}`,
    `Recent messages: ${compactJson(recentMessages.map((message) => ({
      role: message.role,
      text: message.content?.text || "",
      decisionSummary: message.decisionSummary || ""
    })), 6000)}`,
    `Canvas context: ${compactJson(canvasContext, 7000)}`,
    attachments.length ? `Attachments: ${compactJson(attachments.map((item) => ({
      type: item.type || "image",
      name: item.name || "",
      source: item.source || ""
    })), 2000)}` : "",
    imageAnalysis ? `Image analysis: ${compactJson(imageAnalysis, 5000)}` : "",
    "",
    `User request: ${text || "(no text)"}`
  ].filter(Boolean).join("\n");
}

function buildPromptOptimizationPrompt({
  intent,
  taskType = "",
  promptStrategy = "",
  text,
  model,
  modelType,
  conversation,
  recentMessages,
  canvasContext,
  attachments,
  imageAnalysis
} = {}) {
  const strategy = getPromptStrategy(taskType);
  const strategyName = promptStrategy || strategy.name;
  const strategyTags = getWeakStrategyTags({ text, taskType, modelType, attachments });
  const languageInstruction = hasChineseText(text)
    ? "The user's request is Chinese. The optimizedPrompt must be Chinese."
    : "Keep the optimizedPrompt in the same language as the user's request.";
  return [
    "You are the prompt optimizer for AI Studio's right-side project agent.",
    "Return JSON only with keys: optimizedPrompt, summary, strategyTags.",
    "Do not reveal private reasoning.",
    "Your job is to strengthen the user's request, not rewrite it into a different task.",
    "Hard priority order: 1) current user request, 2) current reference image facts, 3) selected canvas nodes, 4) recent context only for pronoun resolution.",
    "Never let conversation history change this turn into ecommerce, poster, figurine, video, or any other scene unless the current user request explicitly asks for it.",
    "Preserve the user's core verb and target exactly: generate, complete/outpaint, replace background, change style, make a figurine, generate video, or other explicit goal.",
    "Only add execution details that support the user's current goal: subject constraints, composition, material, light, style, quality, and negative constraints.",
    "Do not add brands, prices, logos, promotional copy, poster layouts, banner layouts, extra subjects, or unrelated props unless the user explicitly requested them.",
    languageInstruction,
    modelType === "video"
      ? "Optimize for video generation: include subject, scene, movement, camera, duration feel, lighting, style, and constraints."
      : "Optimize for image generation or image editing: include subject, composition, style, lighting, material, color, and constraints.",
    "If reference images are present, use the image analysis as constraints; do not invent unsupported details.",
    "Separate preserved reference constraints from allowed creative enhancements. The final optimizedPrompt should be directly usable by the generation model, but it must stay close to the user's original intent.",
    "Use these weak strategy hints only when they support the current request; they must not decide or expand the task direction:",
    ...strategy.instructions.map((item) => `- ${item}`),
    "",
    `Intent: ${intent}`,
    `Task type: ${taskType || "(none)"}`,
    `Prompt strategy: ${strategyName}`,
    `Weak strategy tags: ${compactJson(strategyTags, 1000)}`,
    `Target model: ${model || "(current model)"}`,
    `User request (hard constraint): ${text || "(no text)"}`,
    `Conversation summary (pronoun resolution only): ${conversation?.summary || "(none)"}`,
    `Recent messages: ${compactJson(recentMessages.map((message) => ({
      role: message.role,
      text: message.content?.text || "",
      intent: message.content?.intent || ""
    })), 4000)}`,
    `Canvas context: ${compactJson(canvasContext, 5000)}`,
    attachments.length ? `References: ${compactJson(attachments.map((item) => ({
      type: item.type || "image",
      name: item.name || "",
      source: item.source || ""
    })), 2000)}` : "References: none",
    imageAnalysis ? `Image analysis: ${compactJson(imageAnalysis, 5000)}` : "Image analysis: none"
  ].join("\n");
}

function getFirstImageAttachment(attachments = []) {
  return attachments.find((item) => String(item?.type || "image").startsWith("image") && item.dataUrl)
    || attachments.find((item) => item.dataUrl)
    || null;
}

function appendThinkingStatus(steps, key, status, detail = "") {
  return steps.map((step) => step.key === key ? { ...step, status, detail } : step);
}

function formatAnalysisDetail(imageAnalysis, { hadReferences = false, failedMessage = "" } = {}) {
  if (failedMessage) return `图片分析失败：${failedMessage}`;
  if (!imageAnalysis) return hadReferences ? "已收到引用图，未生成分析摘要" : "没有新的引用图";
  const parsed = imageAnalysis && typeof imageAnalysis === "object" ? imageAnalysis : null;
  const parts = [
    parsed?.subject || parsed?.content || parsed?.description || "",
    parsed?.style || "",
    parsed?.colors || parsed?.color || "",
    parsed?.composition || ""
  ].filter(Boolean);
  return normalizeText(parts.length ? parts.join("；") : JSON.stringify(imageAnalysis), 500);
}

function withTimeout(promise, timeoutMs, label) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function getRemainingBudgetMs(startedAt, totalBudgetMs) {
  const elapsed = Date.now() - startedAt;
  return Math.max(0, totalBudgetMs - elapsed);
}

function getStepBudgetMs(startedAt, totalBudgetMs, stepTimeoutMs) {
  const remaining = getRemainingBudgetMs(startedAt, totalBudgetMs);
  return Math.max(0, Math.min(stepTimeoutMs, remaining));
}

async function withAbortableTimeout(operation, timeoutMs, label) {
  if (timeoutMs <= 0) {
    throw new Error(`${label} skipped because time budget was exhausted`);
  }
  const controller = new AbortController();
  let timedOut = false;
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } catch (error) {
    if (timedOut || error?.name === "AbortError") {
      throw new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function makeBudgetTimeoutError(label, timeoutMs) {
  return new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`);
}

async function runBudgetedOperation({ label, timeoutMs, operation, runId = "", logPrefix = "" } = {}) {
  const safeTimeoutMs = Math.max(0, Number(timeoutMs || 0));
  if (safeTimeoutMs <= 0) {
    return {
      ok: false,
      timedOut: true,
      error: new Error(`${label} skipped because time budget was exhausted`)
    };
  }

  const controller = new AbortController();
  let settled = false;
  let timeoutFired = false;
  let timer = null;
  const operationPromise = Promise.resolve()
    .then(() => operation(controller.signal))
    .then((value) => {
      settled = true;
      return { ok: true, value };
    })
    .catch((error) => {
      settled = true;
      if (logPrefix) {
        console.debug(`${logPrefix} catch error`, {
          runId,
          label,
          afterTimeout: timeoutFired,
          aborted: error?.name === "AbortError",
          error: error?.message || String(error)
        });
      }
      return { ok: false, error };
    });
  const timeoutPromise = new Promise((resolve) => {
    if (logPrefix) {
      console.debug(`${logPrefix} timeout armed`, {
        runId,
        label,
        timeoutMs: safeTimeoutMs
      });
    }
    timer = setTimeout(() => {
      if (settled) return;
      timeoutFired = true;
      if (logPrefix) {
        console.debug(`${logPrefix} abort fired`, {
          runId,
          label,
          timeoutMs: safeTimeoutMs
        });
      }
      controller.abort();
      resolve({
        ok: false,
        timedOut: true,
        error: makeBudgetTimeoutError(label, safeTimeoutMs)
      });
    }, safeTimeoutMs);
  });

  const result = await Promise.race([operationPromise, timeoutPromise]);
  if (timer) clearTimeout(timer);
  return result;
}

function getToolNameForIntent(intent = "") {
  if (intent === "edit_image") return "edit_image";
  if (intent === "generate_video") return "generate_video";
  if (intent === "generate_image") return "generate_image";
  return "";
}

function buildGenerationFallbackPrompt({ text = "", modelType = "image", attachments = [] } = {}) {
  const original = normalizeText(text, 4000);
  if (original) return original;
  if (modelType === "video") {
    return attachments.length
      ? "根据当前引用素材生成一段高质量视频。"
      : "生成一段高质量视频。";
  }
  return attachments.length
    ? "根据当前引用素材生成一张高质量视觉图。"
    : "生成一张高质量视觉图。";
}

async function optimizePrompt(input = {}) {
  const original = normalizeText(input.text || "", 4000);
  const fallback = original || (input.modelType === "video"
    ? "根据当前项目上下文和引用素材生成一段高质量视频。"
    : "根据当前项目上下文和引用素材生成一张高质量视觉图。");
  try {
    const attempt = await runBudgetedOperation({
      label: "Prompt optimization",
      timeoutMs: input.timeoutMs || PROMPT_OPTIMIZE_TIMEOUT_MS,
      operation: (signal) => generateSuggestions({
        prompt: buildPromptOptimizationPrompt(input),
        model: input.model,
        signal
      })
    });
    if (!attempt.ok) {
      const message = attempt.error?.message || "unknown error";
      return {
        optimizedPrompt: buildConservativePrompt({
          text: original || fallback,
          modelType: input.modelType,
          attachments: input.attachments
        }),
        summary: `提示词优化失败，已使用原始需求继续生成：${message}`,
        providerCalls: [],
        fallback: true,
        timedOut: Boolean(attempt.timedOut),
        strategyTags: getWeakStrategyTags({
          text: original,
          taskType: input.taskType,
          modelType: input.modelType,
          attachments: input.attachments
        }),
        promptDriftDetected: false,
        usedConservativeFallback: true,
        fallbackReason: message,
        error: message
      };
    }
    const result = attempt.value;
    const parsed = parseJsonValue(result.text);
    const guard = finalizeOptimizedPrompt({
      originalPrompt: original,
      candidatePrompt: parsed?.optimizedPrompt || parsed?.prompt || result.text,
      parsedStrategyTags: parsed?.strategyTags,
      modelType: input.modelType,
      attachments: input.attachments,
      taskType: input.taskType
    });
    return {
      optimizedPrompt: guard.optimizedPrompt || fallback,
      summary: normalizeText(guard.usedConservativeFallback
        ? `提示词已保守处理，避免偏离本轮需求：${guard.fallbackReason}`
        : (parsed?.summary || "已根据本轮需求和引用素材优化提示词。"), 900),
      providerCalls: result.providerCalls || [],
      fallback: guard.usedConservativeFallback,
      timedOut: false,
      strategyTags: guard.strategyTags,
      promptDriftDetected: guard.promptDriftDetected,
      usedConservativeFallback: guard.usedConservativeFallback,
      fallbackReason: guard.fallbackReason
    };
  } catch (error) {
    return {
      optimizedPrompt: buildConservativePrompt({
        text: original || fallback,
        modelType: input.modelType,
        attachments: input.attachments
      }),
      summary: `提示词优化失败，已使用原始需求继续生成：${error.message}`,
      providerCalls: [],
      fallback: true,
      timedOut: false,
      strategyTags: getWeakStrategyTags({
        text: original,
        taskType: input.taskType,
        modelType: input.modelType,
        attachments: input.attachments
      }),
      promptDriftDetected: false,
      usedConservativeFallback: true,
      fallbackReason: error.message || "prompt optimization failed",
      error: error.message || "unknown error"
    };
  }
}

async function optimizePromptWithoutStepBudget(input = {}) {
  const original = normalizeText(input.text || "", 4000);
  const optimizedPrompt = buildConservativePrompt({
    text: original,
    modelType: input.modelType,
    attachments: input.attachments
  });
  return {
    optimizedPrompt,
    summary: "已按本轮需求轻量整理提示词。",
    providerCalls: [],
    fallback: false,
    timedOut: false,
    strategyTags: getWeakStrategyTags({
      text: original,
      taskType: input.taskType,
      modelType: input.modelType,
      attachments: input.attachments
    }),
    promptDriftDetected: false,
    usedConservativeFallback: false,
    fallbackReason: ""
  };
}

export async function runConversationTurn({
  userId,
  conversationId,
  runId = "",
  text = "",
  model = "",
  mode = "auto",
  attachments = [],
  canvasContext = {},
  emit = () => {}
} = {}) {
  const conversation = getConversationForUser(userId, conversationId);
  if (!conversation) {
    const error = new Error("Conversation not found");
    error.status = 404;
    throw error;
  }
  const cleanText = normalizeText(text);
  const cleanAttachments = Array.isArray(attachments) ? attachments.slice(0, 8) : [];
  const cleanCanvasContext = canvasContext && typeof canvasContext === "object" ? canvasContext : {};
  if (!cleanText && !cleanAttachments.length && !Object.keys(cleanCanvasContext).length) {
    const error = new Error("Missing text or context");
    error.status = 400;
    throw error;
  }

  const userMessage = appendConversationMessage({
    conversationId,
    userId,
    projectId: conversation.projectId,
    role: "user",
    content: { text: cleanText },
    attachments: cleanAttachments.map((item) => ({
      type: item.type || "image",
      name: item.name || "",
      source: item.source || "upload"
    }))
  });
  const assistantMessage = appendConversationMessage({
    conversationId,
    userId,
    projectId: conversation.projectId,
    role: "assistant",
    status: "running",
    content: { text: "" },
    thinkingSteps: THINKING_STEPS
  });

  emit({
    type: "run.started",
    conversation,
    userMessage,
    assistantMessage
  });

  let thinkingSteps = THINKING_STEPS.map((step, index) => ({
    ...step,
    status: index === 0 ? "active" : "pending",
    detail: ""
  }));
  emit({ type: "thinking.step", messageId: assistantMessage.id, steps: thinkingSteps });

  const recentMessages = listRecentConversationMessages(userId, conversationId, { limit: 12 });
  const agentStartedAt = Date.now();
  const modelType = getModelType(model);
  const intent = modelType === "video" ? "generate_video" : "generate_image";
  const shouldGenerate = true;
  const generationType = modelType === "video" ? "video" : "image";
  const taskType = classifyTaskType({
    text: cleanText,
    intent,
    modelType,
    attachments: cleanAttachments
  });
  const promptStrategy = shouldGenerate ? getPromptStrategy(taskType).name : "";
  const qwenVlMode = QWEN_VL_MODE.required;
  const promptOptimizerMode = PROMPT_OPTIMIZER_MODE.lightweight;
  const toolCalls = [];
  let imageAnalysis = null;
  let imageAnalysisError = "";
  let optimizerError = "";
  let skippedOptimizer = false;
  let usedFallbackPrompt = false;
  let promptDriftDetected = false;
  let usedConservativeFallback = false;
  let strategyTags = getWeakStrategyTags({
    text: cleanText,
    taskType,
    modelType,
    attachments: cleanAttachments
  });
  let totalBudgetExceeded = false;
  const firstImage = getFirstImageAttachment(cleanAttachments);
  const needsImageAnalysis = false;
  const shouldAnalyzeImage = Boolean(firstImage?.dataUrl);
  const decisionSummary = summarizeDecision({
    intent,
    taskType,
    attachments: cleanAttachments,
    canvasContext: cleanCanvasContext,
    model
  });

  thinkingSteps = appendThinkingStatus(thinkingSteps, "context", "done", "已读取当前项目会话、画布节点和模型状态");
  thinkingSteps = appendThinkingStatus(
    thinkingSteps,
    "references",
    shouldAnalyzeImage ? "active" : "done",
    shouldAnalyzeImage
      ? "正在使用 Qwen VL 分析参考图"
      : (cleanAttachments.length
        ? (shouldGenerate ? "已收到引用图，本次没有可分析的图片数据" : "已收到引用图，本次无需图片分析")
        : "没有新的引用图")
  );
  emit({
    type: "agent.intent",
    messageId: assistantMessage.id,
    intent,
    taskType,
    promptStrategy,
    strategyTags,
    shouldGenerate,
    generationType,
    qwenVlMode,
    promptOptimizerMode,
    referenceImageCount: cleanAttachments.length,
    modelType,
    decisionSummary
  });
  emit({ type: "thinking.summary", messageId: assistantMessage.id, summary: decisionSummary });
  emit({ type: "thinking.step", messageId: assistantMessage.id, steps: thinkingSteps });

  if (shouldAnalyzeImage) {
    const analysisToolCall = { name: "analyze_image", status: "running" };
    emit({
      type: "image.analysis.start",
      messageId: assistantMessage.id,
      message: "正在使用 Qwen VL 分析参考图",
      intent,
      taskType,
      promptStrategy,
      shouldGenerate,
      generationType,
      qwenVlMode,
      promptOptimizerMode
    });
    emit({ type: "tool.call", messageId: assistantMessage.id, toolCall: analysisToolCall });
    try {
      console.debug("[image-analysis] start", {
        runId,
        conversationId,
        messageId: assistantMessage.id,
        intent,
        qwenVlMode,
        stepBudgetEnabled: !shouldGenerate,
        timeoutMs: shouldGenerate ? 0 : IMAGE_ANALYSIS_TIMEOUT_MS,
        referenceImageCount: cleanAttachments.length
      });
      const attempt = shouldGenerate
        ? {
          ok: true,
          value: await analyzeImage({
            image: firstImage.dataUrl,
            title: firstImage.name || "Reference image",
            runId
          })
        }
        : await runBudgetedOperation({
          label: "Qwen VL image analysis",
          timeoutMs: IMAGE_ANALYSIS_TIMEOUT_MS,
          runId,
          logPrefix: "[image-analysis]",
          operation: (signal) => analyzeImage({
            image: firstImage.dataUrl,
            title: firstImage.name || "Reference image",
            runId,
            signal
          })
        });
      if (!attempt.ok) {
        imageAnalysisError = attempt.error?.message || "unknown error";
        const failedToolCall = { ...analysisToolCall, status: "failed" };
        toolCalls.push(failedToolCall);
        console.debug("[image-analysis] continue fallback", {
          runId,
          conversationId,
          messageId: assistantMessage.id,
          intent,
          timedOut: Boolean(attempt.timedOut),
          error: imageAnalysisError
        });
        emit({
          type: "image.analysis.error",
          messageId: assistantMessage.id,
          error: imageAnalysisError,
          recoverable: shouldGenerate,
          timedOut: Boolean(attempt.timedOut),
          qwenVlMode,
          promptOptimizerMode,
          intent,
          shouldGenerate,
          generationType
        });
        emit({
          type: "tool.result",
          messageId: assistantMessage.id,
          toolCall: failedToolCall,
          error: imageAnalysisError
        });
      } else {
      const result = attempt.value;
      imageAnalysis = result.analysis || result.text || null;
      if (imageAnalysis) {
        console.debug("[image-analysis] done", {
          runId,
          conversationId,
          messageId: assistantMessage.id,
          intent
        });
        emit({
          type: "image.analysis",
          messageId: assistantMessage.id,
          analysis: imageAnalysis,
          summary: formatAnalysisDetail(imageAnalysis),
          providerCalls: result.providerCalls || []
        });
      } else {
        imageAnalysisError = "Qwen VL returned empty analysis";
        emit({
          type: "image.analysis.error",
          messageId: assistantMessage.id,
          error: imageAnalysisError,
          recoverable: shouldGenerate,
          timedOut: false,
          qwenVlMode,
          promptOptimizerMode,
          intent,
          shouldGenerate,
          generationType
        });
      }
      const doneToolCall = { ...analysisToolCall, status: imageAnalysis ? "done" : "failed" };
      toolCalls.push(doneToolCall);
      emit({
        type: "tool.result",
        messageId: assistantMessage.id,
        toolCall: doneToolCall,
        result: { analysis: imageAnalysis, providerCalls: result.providerCalls || [] }
      });
      }
    } catch (error) {
      imageAnalysisError = error.message || "unknown error";
      const failedToolCall = { ...analysisToolCall, status: "failed" };
      toolCalls.push(failedToolCall);
      console.debug("[image-analysis] catch error", {
        runId,
        conversationId,
        messageId: assistantMessage.id,
        intent,
        timedOut: false,
        error: imageAnalysisError
      });
      emit({
        type: "image.analysis.error",
        messageId: assistantMessage.id,
        error: imageAnalysisError,
        recoverable: shouldGenerate,
        timedOut: false,
        qwenVlMode,
        promptOptimizerMode,
        intent,
        shouldGenerate,
        generationType
      });
      emit({
        type: "tool.result",
        messageId: assistantMessage.id,
        toolCall: failedToolCall,
        error: error.message
      });
      console.debug("[image-analysis] continue fallback", {
        runId,
        conversationId,
        messageId: assistantMessage.id,
        intent,
        error: imageAnalysisError
      });
    }
  } else if (needsImageAnalysis && !firstImage?.dataUrl) {
    imageAnalysisError = "没有可分析的引用图";
  }

  const analysisFailedDetail = imageAnalysisError && shouldGenerate
    ? `${imageAnalysisError}，已跳过分析继续生成`
    : imageAnalysisError;
  thinkingSteps = appendThinkingStatus(thinkingSteps, "references", imageAnalysisError && !shouldGenerate ? "failed" : "done", formatAnalysisDetail(imageAnalysis, {
    hadReferences: cleanAttachments.length > 0,
    failedMessage: analysisFailedDetail
  }));
  emit({ type: "thinking.step", messageId: assistantMessage.id, steps: thinkingSteps });

  let assistantText = "";
  let optimizedPrompt = "";
  let promptSummary = "";

  if (isGenerationIntent(intent)) {
    const fallbackPrompt = buildGenerationFallbackPrompt({
      text: cleanText,
      modelType,
      attachments: cleanAttachments
    });
    thinkingSteps = appendThinkingStatus(thinkingSteps, "prompt", "active", "正在根据图片分析和上下文优化提示词");
    emit({ type: "thinking.step", messageId: assistantMessage.id, steps: thinkingSteps });
    emit({
      type: "prompt.optimizer.start",
      messageId: assistantMessage.id,
      qwenVlMode,
      promptOptimizerMode
    });
    try {
      console.debug("[conversation-agent] prompt.optimizer.started", {
        conversationId,
        messageId: assistantMessage.id,
        intent,
        promptOptimizerMode,
        stepBudgetEnabled: false,
        timeoutMs: 0
      });
      const promptResult = await optimizePromptWithoutStepBudget({
        intent,
        taskType,
        promptStrategy,
        text: cleanText,
        model,
        modelType,
        conversation,
        recentMessages,
        canvasContext: cleanCanvasContext,
        attachments: cleanAttachments,
        imageAnalysis
      });
      optimizedPrompt = promptResult.optimizedPrompt || fallbackPrompt;
      promptSummary = promptResult.summary;
      usedFallbackPrompt = Boolean(promptResult.fallback);
      promptDriftDetected = Boolean(promptResult.promptDriftDetected);
      usedConservativeFallback = Boolean(promptResult.usedConservativeFallback);
      strategyTags = Array.isArray(promptResult.strategyTags) ? promptResult.strategyTags : [];
      optimizerError = promptResult.error || "";
      console.debug(promptResult.fallback
        ? "[conversation-agent] prompt.optimizer.fallback"
        : "[conversation-agent] prompt.optimizer.done", {
        conversationId,
        messageId: assistantMessage.id,
        intent,
        timedOut: Boolean(promptResult.timedOut),
        fallback: Boolean(promptResult.fallback),
        promptDriftDetected,
        usedConservativeFallback,
        strategyTags,
        error: optimizerError
      });
    } catch (error) {
      optimizedPrompt = buildConservativePrompt({
        text: cleanText || fallbackPrompt,
        modelType,
        attachments: cleanAttachments
      });
      optimizerError = error.message || "unknown error";
      promptSummary = `提示词优化失败，已使用原始提示词继续生成：${optimizerError}`;
      usedFallbackPrompt = true;
      usedConservativeFallback = true;
      strategyTags = getWeakStrategyTags({
        text: cleanText,
        taskType,
        modelType,
        attachments: cleanAttachments
      });
      console.debug("[conversation-agent] prompt.optimizer.fallback", {
        conversationId,
        messageId: assistantMessage.id,
        intent,
        timedOut: false,
        fallback: true,
        error: optimizerError
      });
    }
    skippedOptimizer = false;
    totalBudgetExceeded = false;
    thinkingSteps = appendThinkingStatus(thinkingSteps, "prompt", "done", usedConservativeFallback ? "已保守处理" : "完成");
    emit({
      type: "prompt.optimized",
      messageId: assistantMessage.id,
      originalPrompt: cleanText,
      optimizedPrompt,
      taskType,
      promptStrategy,
      summary: promptSummary,
      fallback: usedFallbackPrompt,
      skippedOptimizer,
      usedFallbackPrompt,
      promptDriftDetected,
      usedConservativeFallback,
      strategyTags,
      optimizerError,
      optimizerTimedOut: /timed out|time budget/i.test(optimizerError),
      qwenVlMode,
      promptOptimizerMode,
      totalBudgetExceeded
    });
    emit({ type: "thinking.step", messageId: assistantMessage.id, steps: thinkingSteps });

    const toolName = getToolNameForIntent(intent);
    const toolCall = {
      name: toolName,
      status: "ready",
      arguments: {
        prompt: optimizedPrompt,
        originalPrompt: cleanText,
        model,
        mode: intent,
        taskType,
        promptStrategy,
        strategyTags,
        referenceCount: cleanAttachments.length,
        outputType: modelType,
        qwenVlMode,
        promptOptimizerMode,
        skippedOptimizer,
        usedFallbackPrompt,
        promptDriftDetected,
        usedConservativeFallback,
        totalBudgetExceeded
      }
    };
    toolCalls.push(toolCall);
    thinkingSteps = appendThinkingStatus(thinkingSteps, "tool", "active", toolName);
    emit({ type: "thinking.step", messageId: assistantMessage.id, steps: thinkingSteps });
    emit({ type: "tool.call", messageId: assistantMessage.id, toolCall });
    assistantText = `思考完成，已优化提示词，正在调用${modelType === "video" ? "视频" : "图像"}生成模型。`;
    emit({ type: "assistant.delta", messageId: assistantMessage.id, delta: assistantText });
  } else if (intent === "analyze_image") {
    thinkingSteps = appendThinkingStatus(thinkingSteps, "prompt", "done", "无需生成提示词");
    assistantText = imageAnalysis
      ? `图片分析：${formatAnalysisDetail(imageAnalysis)}`
      : `图片分析失败：${imageAnalysisError || "未能获取图片分析结果"}`;
    emit({ type: "assistant.delta", messageId: assistantMessage.id, delta: assistantText });
  } else {
    thinkingSteps = appendThinkingStatus(thinkingSteps, "prompt", "done", "无需生成提示词");
    const prompt = buildAnswerPrompt({
      conversation,
      recentMessages,
      text: cleanText,
      canvasContext: cleanCanvasContext,
      attachments: cleanAttachments,
      imageAnalysis
    });
    try {
      const result = await withAbortableTimeout((signal) => generateSuggestions({ prompt, signal }), PROMPT_OPTIMIZE_TIMEOUT_MS, "Text answer generation");
      const parsed = parseJsonValue(result.text);
      assistantText = normalizeText(parsed?.answer || parsed?.text || result.text || "我已阅读当前上下文。");
      emit({ type: "assistant.delta", messageId: assistantMessage.id, delta: assistantText });
      if (result.providerCalls?.length) {
        toolCalls.push({
          name: "generate_text",
          status: "done",
          providerCalls: result.providerCalls
        });
      }
    } catch (error) {
      assistantText = `回答生成失败：${error.message || "未知错误"}`;
      emit({ type: "assistant.delta", messageId: assistantMessage.id, delta: assistantText });
      toolCalls.push({
        name: "generate_text",
        status: "failed",
        error: error.message || "unknown error"
      });
    }
  }

  const finalToolCall = toolCalls.slice().reverse().find((item) => getToolNameForIntent(item?.name) || item?.name === "generate_text")
    || toolCalls[toolCalls.length - 1]
    || null;
  thinkingSteps = appendThinkingStatus(thinkingSteps, "tool", "done", finalToolCall?.name || "text_answer");
  thinkingSteps = appendThinkingStatus(thinkingSteps, "final", "done", isGenerationIntent(intent) ? "已交给生成链路" : "已完成回答");
  emit({ type: "thinking.step", messageId: assistantMessage.id, steps: thinkingSteps });

  const completed = completeConversationMessage(userId, assistantMessage.id, {
    status: "done",
    content: {
      text: assistantText,
      intent,
      originalPrompt: cleanText,
      optimizedPrompt,
      taskType,
      promptStrategy,
      strategyTags,
      imageAnalysis,
      imageAnalysisError,
      shouldGenerate,
      generationType,
      qwenVlMode,
      promptOptimizerMode,
      skippedOptimizer,
      optimizerError,
      usedFallbackPrompt,
      promptDriftDetected,
      usedConservativeFallback,
      totalBudgetExceeded
    },
    attachments: [],
    toolCalls,
    thinkingSteps,
    decisionSummary
  });

  if (recentMessages.length >= 18) {
    updateConversationSummary(userId, conversationId, buildRollingSummary(conversation.summary, recentMessages));
  }

  console.debug("[message.done] emit", {
    runId,
    conversationId,
    messageId: assistantMessage.id,
    intent,
    taskType,
    promptStrategy,
    strategyTags,
    shouldGenerate,
    generationType,
    imageAnalysisError,
    optimizerError
  });

  emit({
    type: "message.done",
    conversationId,
    message: completed,
    intent,
    taskType,
    promptStrategy,
    strategyTags,
    toolCalls,
    optimizedPrompt,
    originalPrompt: cleanText,
    imageAnalysis,
    imageAnalysisError,
    referenceImageCount: cleanAttachments.length,
    shouldGenerate,
    generationType,
    qwenVlMode,
    promptOptimizerMode,
    skippedOptimizer,
    optimizerError,
    usedFallbackPrompt,
    promptDriftDetected,
    usedConservativeFallback,
    totalBudgetExceeded,
    timeBudget: {
      stepBudgetEnabled: !shouldGenerate,
      intentTimeoutMs: CHAT_AGENT_CONFIG.intentTimeoutMs,
      imageAnalysisTimeoutMs: shouldGenerate ? 0 : CHAT_AGENT_CONFIG.imageAnalysisTimeoutMs,
      promptOptimizerTimeoutMs: shouldGenerate ? 0 : CHAT_AGENT_CONFIG.promptOptimizerTimeoutMs,
      totalAgentBudgetMs: CHAT_AGENT_CONFIG.totalAgentBudgetMs
    },
    thinkingSteps,
    decisionSummary,
    promptSummary
  });
  return completed;
}

function buildRollingSummary(existing = "", messages = []) {
  const source = messages
    .slice(-12)
    .map((message) => `${message.role}: ${message.content?.text || message.decisionSummary || ""}`)
    .filter(Boolean)
    .join(" / ");
  return normalizeText([existing, source].filter(Boolean).join(" | "), 4000);
}
