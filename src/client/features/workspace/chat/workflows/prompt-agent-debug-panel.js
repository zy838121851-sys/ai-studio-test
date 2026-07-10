import {
  buildAgentDebugPanelSnapshot,
  sanitizeDebugValue
} from "./prompt-agent-debug-utils.js";
import {
  CHAT_AGENT_DEBUG_PREFIX,
  CHAT_AGENT_WORKFLOW_VERSION
} from "./prompt-workflow-constants.js";

function isChatAgentDev() {
  const host = globalThis.location?.hostname || "";
  return ["localhost", "127.0.0.1"].includes(host);
}

export function logAgentDebug(record, label, data = {}) {
  if (!isChatAgentDev()) return;
  const payload = sanitizeDebugValue(data);
  console.debug(CHAT_AGENT_DEBUG_PREFIX, label, {
    runId: record?.runId || "",
    ...payload
  });
}

export function updateAgentDebugPanel(record) {
  if (!record || !isChatAgentDev()) return;
  const panel = ensureAgentDebugPanel();
  if (!panel) return;
  const pre = panel.querySelector("[data-agent-debug-output]");
  if (!pre) return;
  pre.textContent = JSON.stringify(buildAgentDebugPanelSnapshot(record, {
    workflowVersion: CHAT_AGENT_WORKFLOW_VERSION,
    loadedWorkflowVersion: globalThis.__chatAgentWorkflowVersion || ""
  }), null, 2);
}

function ensureAgentDebugPanel() {
  if (!isChatAgentDev()) return null;
  let panel = globalThis.document?.querySelector?.("#chatAgentDebugPanel");
  if (panel) {
    positionAgentDebugPanel(panel);
    return panel;
  }
  panel = globalThis.document.createElement("section");
  panel.id = "chatAgentDebugPanel";
  panel.className = "agent-debug-panel";
  panel.innerHTML = `
    <button type="button" data-agent-debug-toggle class="agent-debug-toggle">Agent Debug</button>
    <pre data-agent-debug-output class="agent-debug-output"></pre>
  `;
  const output = panel.querySelector("[data-agent-debug-output]");
  if (output) output.hidden = true;
  panel.querySelector("[data-agent-debug-toggle]")?.addEventListener("click", () => {
    const pre = panel.querySelector("[data-agent-debug-output]");
    if (pre) {
      pre.hidden = !pre.hidden;
      panel.dataset.userExpandedOnNarrow = pre.hidden ? "" : "true";
    }
  });
  globalThis.document.body.append(panel);
  positionAgentDebugPanel(panel);
  if (!globalThis.__chatAgentDebugPanelPositionBound) {
    globalThis.__chatAgentDebugPanelPositionBound = true;
    globalThis.addEventListener("resize", () => {
      const current = globalThis.document?.querySelector?.("#chatAgentDebugPanel");
      if (current) positionAgentDebugPanel(current);
    });
  }
  return panel;
}

function positionAgentDebugPanel(panel) {
  if (!panel) return;
  const viewportWidth = globalThis.innerWidth || 0;
  const viewportHeight = globalThis.innerHeight || 0;
  const gutter = 16;
  const gap = 18;
  const preferredWidth = 360;
  const promptRect = globalThis.document?.querySelector?.("#promptForm")?.getBoundingClientRect?.();
  const availableLeftWidth = promptRect ? Math.max(0, promptRect.left - gap - gutter) : viewportWidth - gutter * 2;
  const wideEnough = availableLeftWidth >= 280;
  const width = wideEnough
    ? Math.min(preferredWidth, availableLeftWidth)
    : Math.min(320, Math.max(240, viewportWidth - gutter * 2));
  const left = wideEnough && promptRect
    ? Math.max(gutter, promptRect.left - gap - width)
    : gutter;
  const bottom = promptRect
    ? Math.max(gutter, viewportHeight - promptRect.bottom)
    : 24;
  panel.style.left = `${left}px`;
  panel.style.right = "auto";
  panel.style.bottom = `${bottom}px`;
  panel.style.width = `${width}px`;
  panel.style.maxHeight = wideEnough ? "44vh" : "30vh";
  const pre = panel.querySelector("[data-agent-debug-output]");
  if (pre) {
    pre.style.maxHeight = wideEnough ? "calc(44vh - 32px)" : "calc(30vh - 32px)";
    if (!wideEnough && !panel.dataset.userExpandedOnNarrow) pre.hidden = true;
  }
}
