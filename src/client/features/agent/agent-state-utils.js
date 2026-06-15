export function readNodeJson(node, key, fallback = null) {
  if (!node?.dataset?.[key]) return fallback;
  try {
    return JSON.parse(node.dataset[key]);
  } catch {
    return fallback;
  }
}

export const readAgentNodeJson = readNodeJson;

export function getRecentSuggestionEvents(events = [], nodeId = "") {
  return events
    .filter((event) => (event.originalType || event.type) === "ai_suggestion" && (!nodeId || event.payload?.nodeId === nodeId))
    .slice(-6)
    .map((event) => event.payload || {});
}

export function pickCachedActionForSuggestion({ canvasState, suggestion = {}, recentEvents = [] }) {
  const actions = canvasState?.target?.analysis?.recommendedActions || [];
  if (!actions.length) return null;
  const matched = actions.find((action) => action.type === suggestion.actionType || action.title === suggestion.actionLabel);
  if (matched && !recentEvents.some((event) => event.actionType === matched.type || event.actionLabel === matched.title)) return matched;
  const unused = actions.find((action) => !recentEvents.some((event) => event.actionType === action.type || event.actionLabel === action.title));
  return unused || actions[0];
}
