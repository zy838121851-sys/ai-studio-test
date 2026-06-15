const AGENT_STATES = ["idle", "sensing", "thinking", "suggested", "generating", "completed"];

export function applyAgentEnabledState(agentElement, hintElement, enabled) {
  if (!agentElement) return;
  agentElement.classList.toggle("agent-enabled", enabled);
  agentElement.classList.toggle("agent-disabled", !enabled);
  agentElement.classList.remove("agent-toggle-pop");
  void agentElement.offsetWidth;
  agentElement.classList.add("agent-toggle-pop");
  if (hintElement) {
    hintElement.textContent = enabled ? "AI Core 已开启" : "点击启用 AI Core";
  }
}

export function applyAgentState(agentElement, state) {
  if (!agentElement) return;
  AGENT_STATES.forEach((name) => {
    agentElement.classList.toggle(`agent-${name}`, state === name);
  });
}

export function clearAgentBubbles(root = document) {
  root.querySelectorAll(".canvas-ai-suggestions").forEach((item) => item.remove());
}

export function positionBubbleAtAgent(bubble, agentElement, offsetY = -18) {
  if (!bubble || !agentElement) return;
  const rect = agentElement.getBoundingClientRect();
  bubble.style.left = `${rect.left + rect.width / 2}px`;
  bubble.style.top = `${rect.top + offsetY}px`;
}

export function positionBubbleAtNode(bubble, node, getNodeRect, fallbackAgent) {
  if (!bubble) return;
  if (!node) {
    positionBubbleAtAgent(bubble, fallbackAgent);
    return;
  }
  const rect = getNodeRect(node);
  bubble.style.left = `${rect.left + rect.width / 2}px`;
  bubble.style.top = `${rect.top - 14}px`;
}

export function typeAgentText(target, text, interval = 42) {
  if (!target) return;
  target.textContent = "";
  const chars = Array.from(text || "");
  let index = 0;
  window.clearInterval(target._typeTimer);
  target._typeTimer = window.setInterval(() => {
    target.textContent += chars[index] || "";
    index += 1;
    if (index >= chars.length) {
      window.clearInterval(target._typeTimer);
      target._typeTimer = null;
    }
  }, interval);
}
