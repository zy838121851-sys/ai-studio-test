export function createAICoreStateController(deps = {}) {
  const {
    aiCore,
    aiCoreHint,
    setAICoreOrbState,
    isPointInsideAICoreOrb = () => false,
    isPointNearAICoreOrb = () => false
  } = deps;

  function setAICoreState(state = "idle") {
    setAICoreOrbState?.({ aiCore, aiCoreHint, state });
  }

  function isPointInAICore(clientX, clientY) {
    return isPointInsideAICoreOrb?.({ aiCore, clientX, clientY });
  }

  function isPointNearAICore(clientX, clientY) {
    return isPointNearAICoreOrb?.({ aiCore, clientX, clientY });
  }

  function updateAICoreDragState() {
    setAICoreState("idle");
  }

  return {
    setAICoreState,
    isPointInAICore,
    isPointNearAICore,
    updateAICoreDragState
  };
}
