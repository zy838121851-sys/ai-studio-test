export function executeAgentAction(suggestion, { eventBus, canvasRoot = document } = {}) {
  if (!suggestion) return null;

  const result = {
    action: suggestion.action,
    label: suggestion.label,
    status: "mock_completed",
    nodeId: createMockResultNode(suggestion, canvasRoot),
    time: Date.now()
  };

  eventBus?.emit?.("agent:action", result);
  return result;
}

function createMockResultNode(suggestion, root) {
  const canvasWorld = root?.querySelector?.("#canvasWorld");
  if (!canvasWorld) return "";

  const target = getSelectedNode(root) || getLatestNode(root);
  const targetX = Number.parseFloat(target?.style?.left || "0");
  const targetY = Number.parseFloat(target?.style?.top || "0");
  const targetWidth = target?.offsetWidth || 280;
  const id = `agent-result-${Date.now()}`;

  const node = document.createElement("article");
  node.className = "node-card agent-result-node";
  node.dataset.nodeId = id;
  node.dataset.kind = "2d";
  node.dataset.createdBy = "agent";
  node.style.left = `${target ? targetX + targetWidth + 36 : 120}px`;
  node.style.top = `${target ? targetY : 120}px`;
  node.innerHTML = `
    <div class="node-header">
      <span class="node-kind">Agent</span>
      <strong>${escapeHtml(suggestion.label || "Agent result")}</strong>
    </div>
    <div class="node-body">
      <p>${escapeHtml(getMockResultText(suggestion))}</p>
    </div>
  `;
  canvasWorld.appendChild(node);
  return id;
}

function getSelectedNode(root) {
  return root?.querySelector?.(".node-card.selected") || null;
}

function getLatestNode(root) {
  const nodes = Array.from(root?.querySelectorAll?.(".node-card") || []);
  return nodes[nodes.length - 1] || null;
}

function getMockResultText(suggestion) {
  const map = {
    analyze_style: "Style analysis mock result created from the selected asset.",
    generate_variation: "Variation mock result created near the current asset.",
    generate_series: "Series mock result created from grouped assets.",
    organize_canvas: "Canvas organization mock result created.",
    suggest_next_step: "Next-step direction mock result created."
  };
  return map[suggestion.action] || "Agent mock result created.";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
