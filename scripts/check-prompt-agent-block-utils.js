import {
  buildAgentCompletionSummary,
  buildAgentProgressBlocks,
  buildAgentResultBlocks,
  buildAnalysisCardContent,
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

console.log("Prompt agent block utility checks passed.");
