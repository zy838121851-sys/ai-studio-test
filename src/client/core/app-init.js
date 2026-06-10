import { eventBus } from "./event-bus.js";
import { appState, patchState } from "./state.js";
import { initCanvasController } from "../canvas/canvas-controller.js";
import { createAgentEventSystem } from "../agent/agent-event-system.js";
import { createSuggestionEngine } from "../agent/agent-suggestions.js";
import { executeAgentAction } from "../agent/agent-actions.js";
import { registerAIProvider, setActiveAIProvider } from "../ai/ai-client.js";
import { mockProvider } from "../ai/providers/mock-provider.js";
import { serverAPIProvider } from "../ai/providers/server-api-provider.js";
import { initAssetPanel } from "../components/asset-panel.js";
import { initAgentPanel } from "../components/agent-panel.js";
import { initCanvasToolbar } from "../components/canvas-toolbar.js";
import { initTaskBar } from "../components/task-bar.js";

export async function initApp() {
  // Load the compatibility layer first so existing UI interactions keep working
  // while the new architecture is migrated module by module.
  await import("../legacy-app.js");

  registerAIProvider("mock", mockProvider);
  registerAIProvider("server", serverAPIProvider);
  setActiveAIProvider("mock");

  const canvasController = initCanvasController({ eventBus, root: document });
  const agentEventSystem = createAgentEventSystem({ eventBus, canvasController });
  const suggestionEngine = createSuggestionEngine({ canvasController, eventBus });

  initAssetPanel({ eventBus });
  initAgentPanel({ eventBus });
  initCanvasToolbar({ eventBus });
  initTaskBar({ eventBus });

  const architecture = {
    eventBus,
    state: appState,
    canvasController,
    agentEventSystem,
    suggestionEngine,
    executeAgentAction: (suggestion) => executeAgentAction(suggestion, { eventBus })
  };

  window.AIStudio = architecture;
  patchState("app", { initialized: true });

  return architecture;
}
