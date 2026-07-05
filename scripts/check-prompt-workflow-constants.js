import {
  CHAT_AGENT_CONFIG,
  CHAT_AGENT_DEBUG_PREFIX,
  CHAT_AGENT_WORKFLOW_VERSION,
  CONVERSATION_STREAM_TIMEOUT_MS,
  CONVERSATION_THINKING_STEPS,
  MIDJOURNEY_IMAGE_COUNT
} from "../src/client/features/workspace/chat/workflows/prompt-workflow-constants.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(MIDJOURNEY_IMAGE_COUNT === 4, "Midjourney image count should remain stable");
assert(CONVERSATION_STREAM_TIMEOUT_MS === 0, "Conversation stream timeout should remain disabled");
assert(CHAT_AGENT_WORKFLOW_VERSION === "20260628-boot-inline-1", "Chat agent workflow version should remain stable");
assert(CHAT_AGENT_CONFIG.autoExecute === true, "Chat agent auto-execute should remain enabled");
assert(CHAT_AGENT_DEBUG_PREFIX === "[chat-agent]", "Chat agent debug prefix should remain stable");

assert(Array.isArray(CONVERSATION_THINKING_STEPS), "Thinking steps should be an array");
assert(CONVERSATION_THINKING_STEPS.length === 5, "Thinking steps should preserve existing step count");
assert(
  CONVERSATION_THINKING_STEPS.map((step) => step.key).join(",") === "context,references,prompt,tool,final",
  "Thinking step keys should preserve existing order"
);
assert(
  CONVERSATION_THINKING_STEPS.map((step) => step.label).join(",") === "读取上下文,图片分析,优化提示词,执行生成,整理结果",
  "Thinking step labels should preserve existing copy"
);

console.log("prompt workflow constants checks passed");
