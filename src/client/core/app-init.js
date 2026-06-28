import { eventBus } from "./event-bus.js";
import { appState, patchState } from "./state.js";
import { initCanvasController } from "../features/canvas/canvas-controller.js";
import { createAgentEventSystem } from "../features/agent/agent-event-system.js";
import { createSuggestionEngine } from "../features/agent/agent-suggestions.js";
import { executeAgentAction } from "../features/agent/agent-actions.js";
import { registerAIProvider, setActiveAIProvider } from "../features/ai/ai-client.js";
import { mockProvider } from "../features/ai/providers/mock-provider.js";
import { serverAPIProvider } from "../features/ai/providers/server-api-provider.js";
import { initModelCatalog } from "../features/ai/model-catalog.js?v=20260628-lightweight-prompt-1";
import { initAuthEntry } from "../features/auth/auth-entry.js";
import { initCreditQuoteBadges } from "../features/credits/quote-badges.js?v=20260628-lightweight-prompt-1";
import { initAssetPanel } from "../features/workspace/asset-library/asset-panel.js?v=20260628-lightweight-prompt-1";
import { initAgentPanel } from "../features/agent/agent-panel.js";
import { mountWorkspaceApp } from "../features/workspace/runtime/index.js?v=20260628-lightweight-prompt-1";

export async function initApp() {
  console.info("[runtime] AI Studio client", {
    origin: globalThis.location?.origin || "",
    build: "library-bulk-select-20260627"
  });
  registerAIProvider("mock", mockProvider);
  registerAIProvider("server", serverAPIProvider);
  setActiveAIProvider("server");

  const workspaceMount = mountWorkspaceApp(document);
  const modelCatalog = await initModelCatalog(document);
  const authEntry = initAuthEntry(document);
  const creditQuoteBadges = initCreditQuoteBadges(document);
  const workspaceRuntime = workspaceMount.runtime;
  const canvasController = initCanvasController({ eventBus, root: document });
  const agentEventSystem = createAgentEventSystem({ eventBus, canvasController });
  const suggestionEngine = createSuggestionEngine({ canvasController, eventBus });

  const assetPanel = initAssetPanel({ eventBus });
  initAgentPanel({
    eventBus,
    onAction: (suggestion) => executeAgentAction(suggestion, {
      eventBus,
      canvasRoot: document
    })
  });
  const architecture = {
    eventBus,
    state: appState,
    canvasController,
    agentEventSystem,
    suggestionEngine,
    assetPanel,
    authEntry,
    creditQuoteBadges,
    workspaceMount,
    workspaceRuntime,
    modelCatalog,
    executeAgentAction: (suggestion) => executeAgentAction(suggestion, {
      eventBus,
      canvasRoot: document
    })
  };

  window.AIStudio = architecture;
  patchState("app", { initialized: true });

  return architecture;
}
