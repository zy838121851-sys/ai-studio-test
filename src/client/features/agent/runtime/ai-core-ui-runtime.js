import {
  createAICoreAgentEnabledSetter,
  createAgentBubblePositioners
} from "./ai-core-runtime-helpers.js";

export function createAICoreUIRuntime({
  elements = {},
  state = {},
  services = {}
} = {}) {
  const setAICoreAgentEnabled = createAICoreAgentEnabledSetter({
    aiCore: elements.aiCore,
    aiCoreHint: elements.aiCoreHint,
    getAgentTimer: state.getAgentTimer,
    getSuggestionTimer: state.getSuggestionTimer,
    setEnabledState: state.setEnabledState,
    applyAgentEnabledState: services.applyAgentEnabledState
  });

  return {
    setAICoreAgentEnabled,
    ...createAgentBubblePositioners({
      aiCore: elements.aiCore,
      positionBubbleAtAgent: services.positionBubbleAtAgent,
      positionCanvasSuggestionBubble: services.positionCanvasSuggestionBubble
    })
  };
}
