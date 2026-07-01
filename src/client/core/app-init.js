import { eventBus } from "./event-bus.js";
import { appState, patchState } from "./state.js";
import { initCanvasController } from "../features/canvas/canvas-controller.js";
import { createAgentEventSystem } from "../features/agent/agent-event-system.js";
import { createSuggestionEngine } from "../features/agent/agent-suggestions.js";
import { executeAgentAction } from "../features/agent/agent-actions.js";
import { registerAIProvider, setActiveAIProvider } from "../features/ai/ai-client.js";
import { mockProvider } from "../features/ai/providers/mock-provider.js";
import { serverAPIProvider } from "../features/ai/providers/server-api-provider.js";
import { initModelCatalog } from "../features/ai/model-catalog.js?v=20260628-boot-inline-1";
import { initAuthEntry } from "../features/auth/auth-entry.js";
import { initCreditQuoteBadges } from "../features/credits/quote-badges.js?v=20260628-boot-inline-1";
import { initAssetPanel } from "../features/workspace/asset-library/asset-panel.js?v=20260628-boot-inline-1";
import { initAgentPanel } from "../features/agent/agent-panel.js";
import { mountWorkspaceApp } from "../features/workspace/workflows/workspace-app-mount.js?v=20260628-boot-inline-1";

function markAppBootState(state = "ready") {
  const body = globalThis.document?.body;
  if (!body) return;
  body.classList.remove("app-booting", "app-ready", "app-boot-failed");
  body.classList.add(state === "failed" ? "app-boot-failed" : "app-ready");
}

function waitForBootTask(task, timeoutMs = 1800) {
  if (!task || typeof task.then !== "function") return Promise.resolve(null);
  let timer = 0;
  const timeout = new Promise((resolve) => {
    timer = globalThis.setTimeout?.(() => resolve(null), timeoutMs) || 0;
  });
  return Promise.race([
    task.catch((error) => {
      console.warn("AI Studio boot task failed", error);
      return null;
    }),
    timeout
  ]).finally(() => {
    if (timer) globalThis.clearTimeout?.(timer);
  });
}

export async function initApp() {
  try {
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

    await Promise.all([
      waitForBootTask(authEntry.ready, 1800),
      waitForBootTask(authEntry.providersReady, 1200),
      waitForBootTask(workspaceRuntime.ready, 1800),
      waitForBootTask(workspaceRuntime.syncRemoteProjects?.(), 1800)
    ]);

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
    markAppBootState("ready");

    return architecture;
  } catch (error) {
    markAppBootState("failed");
    throw error;
  }
}
