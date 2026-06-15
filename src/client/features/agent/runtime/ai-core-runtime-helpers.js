export function createAICoreAgentEnabledSetter({
  aiCore,
  aiCoreHint,
  getAgentTimer = () => null,
  getSuggestionTimer = () => null,
  setEnabledState,
  applyAgentEnabledState
} = {}) {
  return function setAICoreAgentEnabled(enabled) {
    const nextEnabled = Boolean(enabled);
    setEnabledState?.(nextEnabled);
    applyAgentEnabledState?.(aiCore, aiCoreHint, nextEnabled);
    if (!nextEnabled) {
      window.clearTimeout(getAgentTimer?.());
      window.clearTimeout(getSuggestionTimer?.());
    }
  };
}

export function createAgentBubblePositioners({
  aiCore,
  positionBubbleAtAgent,
  positionCanvasSuggestionBubble
} = {}) {
  return {
    positionAgentBubble: (bubble) => {
      positionBubbleAtAgent?.(bubble, aiCore);
    },
    positionCanvasSuggestionBubble: (node, bubble) => {
      positionCanvasSuggestionBubble?.({
        node,
        bubble,
        positionBubbleAtAgent,
        aiCore
      });
    }
  };
}
