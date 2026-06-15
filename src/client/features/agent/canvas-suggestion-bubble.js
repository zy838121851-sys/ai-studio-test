import { buildCoreActions, getFallbackCoreActions } from "./ai-core-workspace.js";

export function ensureCanvasSuggestionBubble({
  node,
  appRoot,
  ensureNodeId,
  clearBubbles,
  positionBubble,
  onAction
}) {
  ensureNodeId?.(node);
  const existing = document.querySelector(`.canvas-ai-suggestions[data-node-id="${node.dataset.nodeId}"]`);
  if (existing) {
    existing._sourceNode = node;
    return existing;
  }

  clearBubbles?.();
  const bubble = document.createElement("div");
  bubble.className = "canvas-ai-suggestions loading";
  bubble.dataset.nodeId = node.dataset.nodeId;
  bubble._sourceNode = node;
  bubble.innerHTML = `
    <div class="canvas-ai-window-title">AI Core 正在理解素材</div>
    <div class="canvas-ai-actions">
      <button type="button" disabled><span>识别中</span></button>
    </div>
  `;

  bubble.addEventListener("pointerdown", (event) => event.stopPropagation());
  bubble.addEventListener("dblclick", (event) => event.stopPropagation());
  bubble.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-canvas-ai-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const action = bubble._actions?.[Number(button.dataset.canvasAiAction)];
    if (!action) return;
    button.classList.add("running");
    button.disabled = true;
    try {
      await onAction?.(node, bubble, action);
    } finally {
      button.classList.remove("running");
      button.disabled = false;
    }
  });

  appRoot?.appendChild(bubble);
  positionBubble?.(node, bubble);
  return bubble;
}

export function positionCanvasSuggestionBubble({ node, bubble, positionBubbleAtAgent, aiCore }) {
  const target = bubble || document.querySelector(`.canvas-ai-suggestions[data-node-id="${node.dataset.nodeId}"]`);
  if (!target) return;
  positionBubbleAtAgent(target, aiCore);
}

export function renderCanvasSuggestionBubble({
  bubble,
  analysis,
  loading = false,
  normalizeAnalysis,
  directorActions,
  escapeHtml
}) {
  if (!bubble) return;
  const data = normalizeAnalysis(analysis);
  const actions = data.recommendedActions.length
    ? data.recommendedActions.slice(0, 4)
    : getFallbackCoreActions(data).slice(0, 4);

  bubble._analysis = data;
  bubble._actions = buildCoreActions({ ...data, recommendedActions: actions }, directorActions);
  window.currentAICoreBubble = bubble;
  bubble.classList.toggle("loading", loading);

  const actionsWrap = bubble.querySelector(".canvas-ai-actions");
  if (!actionsWrap) return;
  actionsWrap.innerHTML = bubble._actions.map((action, index) => `
    <button type="button" data-canvas-ai-action="${index}">
      <span>${escapeHtml(String(action.title || "生成").slice(0, 4))}</span>
    </button>
  `).join("");
}
