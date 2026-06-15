import { createWorkspaceLauncherAIContext } from "./launcher-ai-context.js";
import { createWorkspaceLauncherCanvasContext } from "./launcher-canvas-context.js";
import { createWorkspaceLauncherElementsContext } from "./launcher-elements-context.js";
import { createWorkspaceLauncherStateContext } from "./launcher-state-context.js";
import { createWorkspaceLauncherWorkspaceContext } from "./launcher-workspace-context.js";

export function createWorkspaceLauncherContext({
  state = {},
  stateSetters = {},
  constants = {},
  elements = {},
  actions = {},
  workflows = {},
  bindings = {},
  safeBindings = {}
} = {}) {
  return {
    ...createWorkspaceLauncherStateContext({ state, stateSetters, constants, workflows, safeBindings }),
    ...createWorkspaceLauncherCanvasContext({ actions, constants }),
    ...createWorkspaceLauncherAIContext({ actions, safeBindings }),
    ...createWorkspaceLauncherElementsContext({ elements }),
    ...createWorkspaceLauncherWorkspaceContext({ actions, workflows, bindings, safeBindings })
  };
}
