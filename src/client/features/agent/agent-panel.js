import { patchState } from "../../core/state.js";

export function initAgentPanel({ eventBus, onAction, root = document } = {}) {
  const bubble = createAgentBubble(root);

  const unsubscribeSuggestion = eventBus?.on?.("agent:suggestion", (event) => {
    const { suggestion, context } = event.payload || {};
    if (!suggestion) return;
    patchState("agent", {
      status: "suggested",
      lastSuggestion: suggestion
    });
    renderSuggestionBubble(bubble, suggestion, context);
  });

  const unsubscribeAction = eventBus?.on?.("agent:action", (event) => {
    patchState("agent", {
      status: "completed",
      lastAction: event.payload
    });
    hideSuggestionBubble(bubble);
  });

  bubble?.addEventListener("click", () => {
    const suggestion = bubble._suggestion;
    if (!suggestion) return;
    patchState("agent", { status: "generating" });
    onAction?.(suggestion);
  });

  return {
    destroy() {
      unsubscribeSuggestion?.();
      unsubscribeAction?.();
      bubble?.remove();
    }
  };
}

function createAgentBubble(root) {
  if (!root?.body) return null;
  const existing = root.querySelector("#agentSuggestionBubble");
  if (existing) return existing;

  const bubble = root.createElement("button");
  bubble.id = "agentSuggestionBubble";
  bubble.type = "button";
  bubble.className = "agent-suggestion-bubble";
  bubble.hidden = true;
  root.body.appendChild(bubble);
  return bubble;
}

function renderSuggestionBubble(bubble, suggestion) {
  if (!bubble) return;
  bubble._suggestion = suggestion;
  bubble.textContent = suggestion.label || "Suggest next step";
  bubble.hidden = false;
  requestAnimationFrame(() => {
    bubble.classList.add("show");
  });
}

function hideSuggestionBubble(bubble) {
  if (!bubble) return;
  bubble.classList.remove("show");
  window.setTimeout(() => {
    bubble.hidden = true;
  }, 240);
}
