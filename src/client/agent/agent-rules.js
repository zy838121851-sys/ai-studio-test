import { AGENT_EVENT_TYPES } from "./agent-events.js";

export function evaluateAgentRules(context) {
  const events = context.recentEvents || [];
  const latest = events[events.length - 1];
  const nodeCount = context.canvas?.nodeCount || 0;

  if (latest?.type === AGENT_EVENT_TYPES.IMAGE_UPLOADED) {
    return createSuggestion("分析风格", "analyze_style", latest.payload);
  }

  if (latest?.type === AGENT_EVENT_TYPES.IMAGE_SELECTED) {
    return createSuggestion("生成变体", "generate_variation", latest.payload, [
      "提取 prompt",
      "统一风格"
    ]);
  }

  if (latest?.type === AGENT_EVENT_TYPES.ASSETS_GROUPED) {
    return createSuggestion("生成同系列", "generate_series", latest.payload);
  }

  if (nodeCount >= 12) {
    return createSuggestion("整理画布", "organize_canvas", { nodeCount });
  }

  if (latest?.type === AGENT_EVENT_TYPES.CANVAS_IDLE) {
    return createSuggestion("给你下一步方向", "suggest_next_step", latest.payload);
  }

  return null;
}

function createSuggestion(label, action, payload = {}, alternatives = []) {
  return {
    id: `${action}-${Date.now()}`,
    label,
    action,
    payload,
    alternatives,
    source: "mock-rule"
  };
}
