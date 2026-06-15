import { AGENT_EVENT_TYPES } from "./agent-events.js";

export function evaluateAgentRules(context = {}) {
  const events = context.recentEvents || [];
  const latest = events[events.length - 1];
  const nodeCount = context.canvas?.nodeCount || 0;

  if (latest?.type === AGENT_EVENT_TYPES.IMAGE_UPLOADED) {
    return createSuggestion("Analyze style", "analyze_style", latest.payload);
  }

  if (latest?.type === AGENT_EVENT_TYPES.IMAGE_SELECTED) {
    return createSuggestion("Generate variant", "generate_variation", latest.payload, [
      "Extract prompt",
      "Unify style"
    ]);
  }

  if (latest?.type === AGENT_EVENT_TYPES.ASSETS_GROUPED) {
    return createSuggestion("Generate series", "generate_series", latest.payload);
  }

  if (nodeCount >= 12) {
    return createSuggestion("Organize canvas", "organize_canvas", { nodeCount });
  }

  if (latest?.type === AGENT_EVENT_TYPES.CANVAS_IDLE) {
    return createSuggestion("Suggest next step", "suggest_next_step", latest.payload);
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
