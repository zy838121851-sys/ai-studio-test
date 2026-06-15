import { createAICoreStateController } from "./ai-core-state-controller.js";

export function createAICoreStateRuntime({
  elements = {},
  services = {}
} = {}) {
  return createAICoreStateController({
    aiCore: elements.aiCore,
    aiCoreHint: elements.aiCoreHint,
    setAICoreOrbState: services.setAICoreOrbState,
    isPointInsideAICoreOrb: services.isPointInsideAICoreOrb,
    isPointNearAICoreOrb: services.isPointNearAICoreOrb
  });
}
