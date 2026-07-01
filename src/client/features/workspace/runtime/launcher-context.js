import { createWorkspaceLauncherCanvasContext } from "./launcher-canvas-context.js";
import { createWorkspaceLauncherElementsContext } from "./launcher-elements-context.js";
import { createWorkspaceLauncherStateContext } from "./launcher-state-context.js";
import { createWorkspaceLauncherWorkspaceContext } from "./launcher-workspace-context.js?v=20260628-boot-inline-1";

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

function createWorkspaceLauncherAIContext({
  actions = {},
  safeBindings = {}
} = {}) {
  return {
    setAICoreState: actions.setAICoreState,
    isPointInAICore: actions.isPointInAICore,
    updateAICoreDragState: actions.updateAICoreDragState,
    uploadIntoAICore: actions.uploadIntoAICore,
    uploadAsReference: safeBindings.safeUploadAsReference,
    hideAICoreWorkspace: actions.hideAICoreWorkspace,
    setAiCoreAgentEnabled: actions.setAiCoreAgentEnabled,
    positionCanvasSuggestionBubble: actions.positionCanvasSuggestionBubble,
    positionAgentBubble: actions.positionAgentBubble
  };
}
