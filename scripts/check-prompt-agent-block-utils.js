import {
  applyAgentProgressStreamEvent,
  applyAgentProgressFailureState,
  applyAgentProgressResultState,
  buildAgentCompletionSummary,
  buildAgentProgressResultOptions,
  buildAgentProgressBlocks,
  buildAgentResultBlocks,
  buildAnalysisCardContent,
  createAgentProgressState,
  formatAgentModelLabel,
  inferAgentResultTitle
} from "../src/client/features/workspace/chat/workflows/prompt-agent-block-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const analysis = buildAnalysisCardContent({
  prompt: "电商主图",
  imageAnalysis: {
    subject: "主体：白色耳机",
    style: "风格：极简棚拍",
    colors: "色彩：白色与蓝色",
    composition: "布局：居中构图",
    suggestion: "生成建议：突出卖点"
  }
});

assert(analysis.content === "白色耳机", "Analysis content section should be extracted");
assert(analysis.style === "极简棚拍", "Analysis style section should be extracted");
assert(analysis.color === "白色与蓝色", "Analysis color section should be extracted");
assert(analysis.theme === "突出产品主体、卖点和展示信息。", "Ecommerce prompt should keep the ecommerce theme fallback");
assert(analysis.layout === "居中构图", "Analysis layout section should be extracted");
assert(analysis.suggestion === "突出卖点", "Analysis suggestion section should be extracted");

assert(inferAgentResultTitle("做一张海报", "image", "") === "海报设计图", "Prompt title inference should keep poster behavior");
assert(inferAgentResultTitle("", "video", "") === "生成视频", "Video title inference should win");
assert(formatAgentModelLabel("gpt-image-2", "") === "GPT Image 2", "Known model label should stay stable");
assert(formatAgentModelLabel("custom-model", "Custom Model") === "Custom Model", "Model usage should be the fallback label");

const resultBlocks = buildAgentResultBlocks({
  conversationResult: { imageAnalysis: "主体：产品\n风格：写实" },
  finalResult: { job: { id: "job-1" } },
  imageUrls: ["/uploads/a.png"],
  model: "gpt-image-2",
  prompt: "电商主图",
  generationPrompt: "优化后的提示词",
  generationMetrics: { outputSize: "1024x1024" },
  taskType: "ecommerce_main_image"
});

assert(resultBlocks.length === 3, "Result blocks should include analysis, generation result, and summary");
assert(resultBlocks[0].type === "analysis_card", "First result block should be the analysis card");
assert(resultBlocks[1].title === "电商主图", "Generation result title should preserve task title");
assert(resultBlocks[1].jobId === "job-1", "Generation result should preserve nested job id");
assert(resultBlocks[2].text.includes("电商主图"), "Summary should preserve ecommerce wording");

const progressBlocks = buildAgentProgressBlocks({
  hasReference: true,
  analysisStatus: "error",
  imageAnalysisError: "分析失败",
  promptStatus: "pending",
  resultStatus: "succeeded",
  imageUrls: ["/uploads/a.png"],
  model: "nano-banana",
  prompt: "手办效果图",
  summary: "完成"
});

assert(progressBlocks.length === 4, "Progress blocks should include analysis, prompt, result, and summary");
assert(progressBlocks[0].errorText === "分析失败", "Progress analysis error text should be preserved");
assert(progressBlocks[1].pendingText === "正在优化提示词...", "Prompt pending text should stay stable");
assert(progressBlocks[2].status === "已在画布中", "Succeeded result status should stay stable");
assert(progressBlocks[3].text === "完成", "Progress summary should be preserved");

assert(
  buildAgentCompletionSummary({ hasReference: true, generationType: "video" }) === "已完成！我已根据参考图生成了视频，并放入画布中。",
  "Completion summary should preserve reference video wording"
);

const progressState = createAgentProgressState({
  prompt: "create image",
  model: "gpt-image-2",
  generationType: "image"
});
assert(progressState.prompt === "create image", "Progress state should keep prompts");
assert(progressState.model === "gpt-image-2", "Progress state should keep models");
assert(progressState.generationType === "image", "Progress state should keep generation types");
assert(progressState.analysisStatus === "idle", "Progress state should initialize analysis status");
assert(progressState.promptStatus === "idle", "Progress state should initialize prompt status");
assert(progressState.resultStatus === "idle", "Progress state should initialize result status");
assert(Array.isArray(progressState.imageUrls) && progressState.imageUrls.length === 0, "Progress state should initialize image URLs");
assert(Array.isArray(progressState.videoUrls) && progressState.videoUrls.length === 0, "Progress state should initialize video URLs");

assert(
  applyAgentProgressStreamEvent(progressState, {
    type: "agent.intent",
    taskType: "poster_design",
    generationType: "image",
    shouldGenerate: true
  }) === true,
  "Agent intent events should request progress refresh when generation starts"
);
assert(progressState.taskType === "poster_design", "Agent intent events should update task type");
assert(progressState.resultStatus === "pending", "Agent intent events should mark pending generation");

assert(
  applyAgentProgressStreamEvent(progressState, { type: "image.analysis.start" }) === true,
  "Image analysis start should request progress refresh"
);
assert(progressState.hasReference === true, "Image analysis start should mark reference presence");
assert(progressState.analysisStatus === "pending", "Image analysis start should mark pending status");

assert(
  applyAgentProgressStreamEvent(progressState, {
    type: "image.analysis",
    analysis: "subject"
  }) === true,
  "Image analysis events should request progress refresh"
);
assert(progressState.analysisStatus === "done", "Image analysis events should mark done status");
assert(progressState.imageAnalysis === "subject", "Image analysis events should store analysis text");
assert(progressState.imageAnalysisError === "", "Image analysis events should clear analysis errors");

assert(
  applyAgentProgressStreamEvent(progressState, { type: "prompt.optimizer.start" }) === true,
  "Prompt optimizer start should request progress refresh"
);
assert(progressState.promptStatus === "pending", "Prompt optimizer start should mark pending status");

assert(
  applyAgentProgressStreamEvent(progressState, {
    type: "prompt.optimized",
    optimizedPrompt: "",
    taskType: "product_render",
    optimizerError: "timeout"
  }, { prompt: "fallback prompt" }) === true,
  "Prompt optimized events should request progress refresh"
);
assert(progressState.promptStatus === "done", "Prompt optimized events should mark done status");
assert(progressState.optimizedPrompt === "fallback prompt", "Prompt optimized events should fall back to original prompts");
assert(progressState.taskType === "product_render", "Prompt optimized events should update task type");
assert(progressState.promptError === "timeout", "Prompt optimized events should keep optimizer errors");

assert(
  applyAgentProgressStreamEvent(progressState, { type: "unknown.event" }) === false,
  "Unknown progress events should not request progress refresh"
);

assert(
  applyAgentProgressResultState(progressState, {
    generationType: "image",
    imageUrls: ["/uploads/a.png"],
    videoUrls: [],
    model: "gpt-image-2",
    modelUsage: "GPT Image 2",
    taskType: "poster_design",
    optimizedPrompt: "optimized prompt",
    size: "1024x1024",
    jobId: "job-image",
    resultStatus: "succeeded",
    hasReference: true
  }) === true,
  "Progress result state should apply image results"
);
assert(progressState.imageUrls[0] === "/uploads/a.png", "Progress result state should store image URLs");
assert(progressState.videoUrls.length === 0, "Progress result state should clear video URLs for image results");
assert(progressState.model === "gpt-image-2", "Progress result state should store result models");
assert(progressState.modelUsage === "GPT Image 2", "Progress result state should store model usage");
assert(progressState.generationType === "image", "Progress result state should store generation type");
assert(progressState.taskType === "poster_design", "Progress result state should store task type");
assert(progressState.optimizedPrompt === "optimized prompt", "Progress result state should store optimized prompts");
assert(progressState.size === "1024x1024", "Progress result state should store output sizes");
assert(progressState.jobId === "job-image", "Progress result state should store job ids");
assert(progressState.resultStatus === "succeeded", "Progress result state should store result status");
assert(progressState.summary === buildAgentCompletionSummary({ hasReference: true, generationType: "image" }), "Progress result state should build completion summaries");

assert(
  applyAgentProgressResultState(progressState, {
    generationType: "video",
    imageUrls: [],
    videoUrls: [],
    model: "video-model",
    modelUsage: "Video Model",
    taskType: "video_generation",
    optimizedPrompt: "video prompt",
    size: "16:9",
    jobId: "job-video",
    resultStatus: "idle",
    hasReference: false
  }) === true,
  "Progress result state should apply video results"
);
assert(progressState.generationType === "video", "Progress result state should store video generation type");
assert(progressState.resultStatus === "idle", "Progress result state should preserve video idle status");
assert(progressState.summary === buildAgentCompletionSummary({ hasReference: false, generationType: "video" }), "Progress result state should build video summaries");

assert(
  applyAgentProgressFailureState(progressState) === true,
  "Progress failure state should apply default failures"
);
assert(progressState.resultStatus === "failed", "Progress failure state should mark failed status");
assert(progressState.resultError === "生成失败，请重试。", "Progress failure state should store default failure text");
assert(
  applyAgentProgressFailureState(progressState, { resultError: "Custom failure" }) === true,
  "Progress failure state should apply custom failures"
);
assert(progressState.resultStatus === "failed", "Progress failure state should keep failed status for custom failures");
assert(progressState.resultError === "Custom failure", "Progress failure state should store custom failure text");
assert(
  applyAgentProgressFailureState(null) === false,
  "Progress failure state should ignore missing state"
);

const progressResultOptions = buildAgentProgressResultOptions({
  generationType: "image",
  imageUrls: ["/uploads/result.png"],
  videoUrls: [],
  model: "gpt-image-2",
  modelUsage: "GPT Image 2",
  conversationResult: { taskType: "poster_design" },
  agentDebug: { taskType: "fallback_task" },
  generationPrompt: "optimized prompt",
  generationMetrics: { outputSize: "1536x1024" },
  finalResult: { job: { id: "nested-job" } },
  resultStatus: "succeeded",
  hasReference: true
});
assert(progressResultOptions.imageUrls[0] === "/uploads/result.png", "Progress result options should preserve image URLs");
assert(progressResultOptions.videoUrls.length === 0, "Progress result options should preserve video URLs");
assert(progressResultOptions.model === "gpt-image-2", "Progress result options should preserve models");
assert(progressResultOptions.modelUsage === "GPT Image 2", "Progress result options should preserve model usage");
assert(progressResultOptions.generationType === "image", "Progress result options should preserve generation types");
assert(progressResultOptions.taskType === "poster_design", "Progress result options should prefer conversation task types");
assert(progressResultOptions.optimizedPrompt === "optimized prompt", "Progress result options should preserve optimized prompts");
assert(progressResultOptions.size === "1536x1024", "Progress result options should preserve output sizes");
assert(progressResultOptions.jobId === "nested-job", "Progress result options should use nested job ids");
assert(progressResultOptions.resultStatus === "succeeded", "Progress result options should preserve result statuses");
assert(progressResultOptions.hasReference === true, "Progress result options should preserve reference flags");

const fallbackProgressResultOptions = buildAgentProgressResultOptions({
  generationType: "video",
  conversationResult: {},
  agentDebug: { taskType: "video_generation" },
  finalResult: { jobId: "direct-job" }
});
assert(fallbackProgressResultOptions.taskType === "video_generation", "Progress result options should fall back to debug task types");
assert(fallbackProgressResultOptions.jobId === "direct-job", "Progress result options should prefer direct job ids");
assert(fallbackProgressResultOptions.resultStatus === "succeeded", "Progress result options should default succeeded statuses");

console.log("Prompt agent block utility checks passed.");
