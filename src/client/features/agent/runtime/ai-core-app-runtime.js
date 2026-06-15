import {
  applyAgentEnabledState,
  clearAgentBubbles,
  positionBubbleAtAgent
} from "../agent-ui.js";
import {
  isPointInsideAICoreOrb,
  isPointNearAICoreOrb,
  setAICoreOrbState
} from "../ai-core-orb.js";
import {
  ensureCanvasSuggestionBubble,
  positionCanvasSuggestionBubble,
  renderCanvasSuggestionBubble
} from "../canvas-suggestion-bubble.js";
import {
  bindAICoreWorkspaceElement,
  createAICoreWorkspaceElement
} from "../components/ai-core-workspace-panel.js";
import { writeAICoreAnalysisCache } from "../agent-node-context.js";
import { createAICoreStateRuntime } from "./ai-core-state-runtime.js";
import { createAICoreUIRuntime } from "./ai-core-ui-runtime.js";
import { createAICoreWorkspaceRuntime } from "./ai-core-workspace-runtime.js";

export function createWorkspaceAICoreUIRuntime({
  elements,
  state
}) {
  return createAICoreUIRuntime({
    elements,
    state,
    services: {
      applyAgentEnabledState,
      positionBubbleAtAgent,
      positionCanvasSuggestionBubble
    }
  });
}

export function createWorkspaceAICoreStateRuntime({
  elements
}) {
  return createAICoreStateRuntime({
    elements,
    services: {
      setAICoreOrbState,
      isPointInsideAICoreOrb,
      isPointNearAICoreOrb
    }
  });
}

export function createWorkspaceAICoreControllers({
  elements,
  uiState
}) {
  const uiRuntime = createWorkspaceAICoreUIRuntime({
    elements,
    state: uiState
  });
  const stateRuntime = createWorkspaceAICoreStateRuntime({
    elements
  });

  return {
    ...uiRuntime,
    ...stateRuntime
  };
}

export function createWorkspaceAICoreWorkspaceRuntime({
  elements,
  defaults,
  services
}) {
  const {
    appRoot,
    aiCore
  } = elements;

  const {
    ensureCanvasNodeId,
    nextCanvasNodeId,
    positionBubbleAtAgent: positionAgentBubble,
    findCanvasNodeById,
    ...runtimeServices
  } = services;

  return createAICoreWorkspaceRuntime({
    elements: {
      appRoot
    },
    defaults,
    services: {
      ...runtimeServices,
      createAICoreWorkspaceElement,
      bindAICoreWorkspaceElement,
      writeAICoreAnalysisCache,
      ensureCanvasSuggestionBubble: (node, onAction) => ensureCanvasSuggestionBubble({
        node,
        appRoot,
        ensureNodeId: (target) => ensureCanvasNodeId(target, { nextId: nextCanvasNodeId }),
        clearBubbles: clearAgentBubbles,
        positionBubble: (target, bubble) => positionCanvasSuggestionBubble({
          node: target,
          bubble,
          positionBubbleAtAgent: positionAgentBubble,
          aiCore
        }),
        onAction
      }),
      findCanvasNodeById,
      findCanvasNodeByIdUnsafe: findCanvasNodeById,
      renderCanvasSuggestionBubble
    }
  });
}
