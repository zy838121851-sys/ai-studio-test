import { buildAgentContext } from "./agent-context.js";
import { evaluateAgentRules } from "./agent-rules.js";

export function createSuggestionEngine({ canvasController, eventBus } = {}) {
  function evaluate(target = null) {
    const context = buildAgentContext({
      canvasState: canvasController?.getState?.(),
      target
    });
    const suggestion = evaluateAgentRules(context);
    if (suggestion) eventBus?.emit?.("agent:suggestion", { suggestion, context });
    return suggestion;
  }

  return { evaluate };
}
