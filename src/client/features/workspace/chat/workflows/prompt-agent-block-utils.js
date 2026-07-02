function compactText(value = "", maxLength = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function normalizeAnalysisText(imageAnalysis = null) {
  if (!imageAnalysis) return "";
  if (typeof imageAnalysis === "string") return imageAnalysis;
  if (typeof imageAnalysis === "object") {
    return [
      imageAnalysis.subject,
      imageAnalysis.content,
      imageAnalysis.description,
      imageAnalysis.style,
      imageAnalysis.colors || imageAnalysis.color,
      imageAnalysis.composition,
      imageAnalysis.suggestion
    ].filter(Boolean).join("\n");
  }
  return String(imageAnalysis || "");
}

function pickAnalysisSection(text = "", labels = [], fallback = "") {
  const source = String(text || "");
  for (const label of labels) {
    const pattern = new RegExp(`${label}[：:、\\s]+([\\s\\S]*?)(?=\\n\\s*(?:内容|主体|风格|色彩|颜色|主题|布局|特点|生成建议|为.*参考)[：:]|$)`, "i");
    const match = source.match(pattern);
    if (match?.[1]) return compactText(match[1], 240);
  }
  return fallback;
}

export function buildAnalysisCardContent({ imageAnalysis = null, prompt = "" } = {}) {
  const text = normalizeAnalysisText(imageAnalysis);
  if (!text) return null;
  const firstSentence = compactText(text.split(/[。.!！?？]\s*/).filter(Boolean)[0] || text, 220);
  const isEcommerce = /电商|主图|商品|产品|卖点|促销/.test(prompt);
  const is3d = /3d|3D|立体|效果图|手办/.test(prompt);
  return {
    content: pickAnalysisSection(text, ["内容", "主体", "图片主体"], firstSentence),
    style: pickAnalysisSection(text, ["风格"], is3d ? "适合强化立体质感、材质和灯光表现。" : "整体风格可作为生成时的视觉参考。"),
    color: pickAnalysisSection(text, ["色彩", "颜色"], "保留参考图中的主要色彩关系，并增强画面层次。"),
    theme: pickAnalysisSection(text, ["主题"], isEcommerce ? "突出产品主体、卖点和展示信息。" : "围绕参考图主体进行视觉延展。"),
    layout: pickAnalysisSection(text, ["布局与特点", "布局", "特点"], "参考图的主体位置、构图关系和关键特征会用于生成约束。"),
    suggestion: pickAnalysisSection(text, ["为生成设计提供参考", "生成建议", "建议"], isEcommerce
      ? "适合生成电商主图、详情页首图、卖点图和场景展示图。"
      : "适合生成效果图、风格化展示图和细节强化图。")
  };
}

export function inferAgentResultTitle(prompt = "", generationType = "image", taskType = "") {
  const text = String(prompt || "");
  if (generationType === "video") return "生成视频";
  if (taskType === "figurine_render") return "手办效果图";
  if (taskType === "ecommerce_main_image") return "电商主图";
  if (taskType === "product_render") return "3D效果图";
  if (taskType === "poster_design") return "海报设计图";
  if (taskType === "style_transfer") return "风格化效果图";
  if (/电商|主图/.test(text)) return "电商主图";
  if (/3d|3D|立体|效果图/.test(text)) return "3D效果图";
  if (/手办/.test(text)) return "手办效果图";
  if (/海报/.test(text)) return "海报设计图";
  return "生成图片";
}

function buildAgentSummary({ prompt = "", hasReference = false, generationType = "image" } = {}) {
  const text = String(prompt || "");
  const prefix = hasReference ? "已根据参考图" : "已根据你的需求";
  if (generationType === "video") {
    return `已完成！我${prefix}生成了一段视频，并放入画布中。`;
  }
  if (/电商|主图/.test(text)) {
    return `已完成！我${prefix}生成了一张电商主图，并强化了产品主体、核心卖点和展示信息。`;
  }
  if (/3d|3D|立体|效果图|手办/.test(text)) {
    return `已完成！我${prefix}为你生成了一张 3D 效果图，并增强了材质、灯光和立体感。`;
  }
  return `已完成！我${prefix}生成了图片，并放入画布中。`;
}

export function formatAgentModelLabel(model = "", modelUsage = "") {
  const id = String(model || "").trim();
  const normalized = id.toLowerCase();
  const labels = {
    "gpt-image-2": "GPT Image 2",
    "nano-banana-pro": "Nano Banana Pro",
    "nano-banana": "Nano Banana",
    "midjourney": "Midjourney"
  };
  return labels[normalized] || modelUsage || id || "当前模型";
}

export function buildAgentResultBlocks({
  conversationResult = {},
  finalResult = {},
  imageUrls = [],
  videoUrls = [],
  model,
  modelUsage = "",
  prompt = "",
  generationPrompt = "",
  generationMetrics = {},
  generationType = "image",
  taskType = ""
} = {}) {
  const blocks = [];
  const analysisContent = buildAnalysisCardContent({
    imageAnalysis: conversationResult.imageAnalysis,
    prompt: prompt || generationPrompt
  });
  if (analysisContent) {
    blocks.push({
      type: "analysis_card",
      title: "图片分析",
      collapsed: false,
      content: analysisContent
    });
  } else if (conversationResult.imageAnalysisError) {
    blocks.push({
      type: "analysis_card",
      title: "图片分析",
      collapsed: false,
      errorText: "图片分析未完成，已使用原始需求继续生成。"
    });
  }
  const title = inferAgentResultTitle(prompt || generationPrompt, generationType, taskType);
  blocks.push({
    type: "generation_result",
    imageUrl: imageUrls[0] || "",
    imageUrls,
    videoUrl: videoUrls[0] || "",
    modelId: model,
    modelLabel: formatAgentModelLabel(model, modelUsage),
    generationType,
    title,
    prompt,
    optimizedPrompt: generationPrompt,
    size: generationMetrics.outputSize || "",
    jobId: finalResult.jobId || finalResult.job?.id || "",
    status: "已在画布中"
  });
  blocks.push({
    type: "assistant_summary",
    text: buildAgentSummary({
      prompt: prompt || generationPrompt,
      hasReference: Boolean(conversationResult.imageAnalysis || conversationResult.imageAnalysisError),
      generationType
    })
  });
  return blocks;
}

export function buildAgentCompletionSummary({ hasReference = false, generationType = "image" } = {}) {
  if (generationType === "video") {
    return hasReference
      ? "已完成！我已根据参考图生成了视频，并放入画布中。"
      : "已完成！我已根据你的需求生成了视频，并放入画布中。";
  }
  return hasReference
    ? "已完成！我已根据参考图生成了图片，并放入画布中。"
    : "已完成！我已根据你的需求生成了图片，并放入画布中。";
}

export function createAgentProgressState({
  prompt = "",
  model = "",
  generationType = "image"
} = {}) {
  return {
    hasReference: false,
    analysisStatus: "idle",
    imageAnalysis: null,
    imageAnalysisError: "",
    promptStatus: "idle",
    prompt,
    optimizedPrompt: "",
    promptError: "",
    resultStatus: "idle",
    resultError: "",
    imageUrls: [],
    videoUrls: [],
    model,
    modelUsage: "",
    generationType,
    taskType: "",
    size: "",
    jobId: "",
    summary: ""
  };
}

export function applyAgentProgressStreamEvent(state, event = {}, { prompt = "" } = {}) {
  if (!state || !event?.type) return false;
  if (event.type === "agent.intent") {
    state.taskType = event.taskType || state.taskType;
    state.generationType = event.generationType || state.generationType;
    if (event.shouldGenerate) {
      state.resultStatus = "pending";
      return true;
    }
    return false;
  }
  if (event.type === "image.analysis.start") {
    state.hasReference = true;
    state.analysisStatus = "pending";
    return true;
  }
  if (event.type === "image.analysis") {
    state.hasReference = true;
    state.analysisStatus = "done";
    state.imageAnalysis = event.analysis || event.summary || "";
    state.imageAnalysisError = "";
    return true;
  }
  if (event.type === "image.analysis.error") {
    state.hasReference = true;
    state.analysisStatus = "error";
    state.imageAnalysisError = "图片分析未完成，已继续优化提示词并生成。";
    return true;
  }
  if (event.type === "prompt.optimizer.start") {
    state.promptStatus = "pending";
    return true;
  }
  if (event.type === "prompt.optimized") {
    state.promptStatus = "done";
    state.optimizedPrompt = event.optimizedPrompt || state.optimizedPrompt || prompt;
    state.taskType = event.taskType || state.taskType;
    state.promptError = event.optimizerError || "";
    return true;
  }
  return false;
}

export function applyAgentProgressResultState(state, {
  generationType = "image",
  imageUrls = [],
  videoUrls = [],
  model = "",
  modelUsage = "",
  taskType = "",
  optimizedPrompt = "",
  size = "",
  jobId = "",
  resultStatus = "succeeded",
  hasReference = false
} = {}) {
  if (!state) return false;
  state.imageUrls = imageUrls;
  state.videoUrls = videoUrls;
  state.model = model;
  state.modelUsage = modelUsage;
  state.generationType = generationType;
  state.taskType = taskType;
  state.optimizedPrompt = optimizedPrompt;
  state.size = size;
  state.jobId = jobId;
  state.resultStatus = resultStatus;
  state.summary = buildAgentCompletionSummary({
    hasReference,
    generationType
  });
  return true;
}

export function applyAgentProgressFailureState(state, {
  resultError = "生成失败，请重试。"
} = {}) {
  if (!state) return false;
  state.resultStatus = "failed";
  state.resultError = resultError;
  return true;
}

export function buildAgentProgressResultOptions({
  generationType = "image",
  imageUrls = [],
  videoUrls = [],
  model = "",
  modelUsage = "",
  conversationResult = {},
  agentDebug = {},
  generationPrompt = "",
  generationMetrics = {},
  finalResult = {},
  resultStatus = "succeeded",
  hasReference = false
} = {}) {
  return {
    imageUrls,
    videoUrls,
    model,
    modelUsage,
    generationType,
    taskType: conversationResult.taskType || agentDebug.taskType,
    optimizedPrompt: generationPrompt,
    size: generationMetrics.outputSize || "",
    jobId: finalResult.jobId || finalResult.job?.id || "",
    resultStatus,
    hasReference
  };
}

export function buildAgentProgressBlocks(state = {}) {
  const blocks = [];
  const hasReference = Boolean(state.hasReference);
  if (hasReference || state.analysisStatus === "pending" || state.analysisStatus === "done" || state.analysisStatus === "error") {
    const analysisContent = state.imageAnalysis
      ? buildAnalysisCardContent({
        imageAnalysis: state.imageAnalysis,
        prompt: state.prompt || state.optimizedPrompt
      })
      : null;
    blocks.push({
      id: "analysis",
      type: "analysis_card",
      title: "图片分析",
      status: state.analysisStatus || "pending",
      collapsed: state.analysisStatus !== "done",
      content: analysisContent,
      errorText: state.analysisStatus === "error"
        ? (state.imageAnalysisError || "图片分析未完成，已继续优化提示词并生成。")
        : "",
      pendingText: "正在分析参考图..."
    });
  }

  if (state.promptStatus && state.promptStatus !== "idle") {
    blocks.push({
      id: "prompt",
      type: "prompt_card",
      title: "查看提示词",
      status: state.promptStatus,
      collapsed: true,
      prompt: state.prompt,
      optimizedPrompt: state.optimizedPrompt,
      errorText: state.promptError || "",
      pendingText: "正在优化提示词..."
    });
  }

  if (state.resultStatus && state.resultStatus !== "idle") {
    blocks.push({
      id: "result",
      type: "generation_result",
      imageUrl: state.imageUrls?.[0] || "",
      imageUrls: state.imageUrls || [],
      videoUrl: state.videoUrls?.[0] || "",
      videoUrls: state.videoUrls || [],
      modelId: state.model,
      modelLabel: formatAgentModelLabel(state.model, state.modelUsage),
      generationType: state.generationType || "image",
      title: inferAgentResultTitle(state.prompt || state.optimizedPrompt, state.generationType || "image", state.taskType || ""),
      prompt: state.prompt,
      optimizedPrompt: state.optimizedPrompt,
      size: state.size || "",
      status: state.resultStatus === "succeeded" ? "已在画布中" : state.resultStatus,
      statusText: state.resultStatus === "pending" ? "正在生成..." : (state.resultError || ""),
      jobId: state.jobId || ""
    });
  }

  if (state.summary) {
    blocks.push({
      id: "summary",
      type: "assistant_summary",
      text: state.summary
    });
  }
  return blocks;
}
