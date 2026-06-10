import { buildAgentContext } from "./agent-context.js";
import { evaluateAgentRules } from "./agent-rules.js";
import { executeAgentAction } from "./agent-actions.js";

export function createAgentEventSystem({ eventBus, canvasController } = {}) {
  function handleCanvasEvent(event) {
    const context = buildAgentContext({
      canvasState: canvasController?.getState?.(),
      recentEvents: [event.payload || event]
    });
    const suggestion = evaluateAgentRules(context);
    if (suggestion) {
      eventBus?.emit?.("agent:suggestion", { suggestion, context });
    }
    return suggestion;
  }

  const unsubscribe = eventBus?.on?.("canvas:event", handleCanvasEvent);

  return {
    handleCanvasEvent,
    execute(suggestion) {
      return executeAgentAction(suggestion, { eventBus });
    },
    destroy() {
      unsubscribe?.();
    }
  };
}
