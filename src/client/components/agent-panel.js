export function initAgentPanel({ eventBus } = {}) {
  const unsubscribe = eventBus?.on?.("agent:suggestion", () => {});
  return {
    destroy() {
      unsubscribe?.();
    }
  };
}
