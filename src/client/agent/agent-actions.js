export function executeAgentAction(suggestion, { eventBus } = {}) {
  if (!suggestion) return null;
  const result = {
    action: suggestion.action,
    label: suggestion.label,
    status: "mock_completed",
    time: Date.now()
  };
  eventBus?.emit?.("agent:action", result);
  return result;
}
