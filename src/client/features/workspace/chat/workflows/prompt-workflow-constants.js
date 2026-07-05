export const MIDJOURNEY_IMAGE_COUNT = 4;

export const CONVERSATION_THINKING_STEPS = [
  { key: "context", label: "读取上下文" },
  { key: "references", label: "图片分析" },
  { key: "prompt", label: "优化提示词" },
  { key: "tool", label: "执行生成" },
  { key: "final", label: "整理结果" }
];

export const CONVERSATION_STREAM_TIMEOUT_MS = 0;

export const CHAT_AGENT_WORKFLOW_VERSION = "20260628-boot-inline-1";

export const CHAT_AGENT_CONFIG = {
  autoExecute: true
};

export const CHAT_AGENT_DEBUG_PREFIX = "[chat-agent]";
