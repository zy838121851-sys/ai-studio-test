export function appendChatMessage({ chatPanel, chatLog, role, text }) {
  chatPanel?.classList.add("has-chat");
  const message = document.createElement("div");
  message.className = `message ${role}`;
  message.textContent = text;
  chatLog?.appendChild(message);
  scrollChatToBottom(chatLog);
  return message;
}

export function updateChatMessage({ chatLog, message, text }) {
  if (!message) return;
  message.classList.remove("loading");
  message.textContent = text;
  scrollChatToBottom(chatLog);
}

export function appendThinkingMessage({ chatPanel, chatLog, title, steps = [], escapeHtml }) {
  chatPanel?.classList.add("has-chat");
  const message = document.createElement("div");
  message.className = "message assistant thinking";
  const normalizedSteps = steps.map((step) => typeof step === "string" ? { label: step } : step);
  message.innerHTML = `
    <strong>${escapeHtml(title)}</strong>
    <details class="thinking-summary" hidden>
      <summary>决策摘要</summary>
      <p></p>
    </details>
    <ul>
      ${normalizedSteps.map((step, index) => `<li class="${index === 0 ? "active" : ""}" data-step-key="${escapeHtml(step.key || "")}">${escapeHtml(step.label || step.key || "")}</li>`).join("")}
    </ul>
  `;
  chatLog?.appendChild(message);
  scrollChatToBottom(chatLog);
  return message;
}

export function updateThinkingMessage(message, activeIndex, done = false) {
  if (!message) return;
  if (Array.isArray(activeIndex)) {
    updateThinkingStepList(message, activeIndex);
    return;
  }
  const items = message.querySelectorAll("li");
  items.forEach((item, index) => {
    item.classList.toggle("done", index < activeIndex || done);
    item.classList.toggle("active", index === activeIndex && !done);
  });
  if (done) message.classList.add("complete");
}

export function updateThinkingSummary(message, summary = "") {
  if (!message) return;
  const details = message.querySelector(".thinking-summary");
  const body = details?.querySelector("p");
  if (!details || !body) return;
  const text = String(summary || "").trim();
  details.hidden = !text;
  body.textContent = text;
}

export function appendChatImage({ chatLog, role, imageUrl, caption, escapeHtml }) {
  const message = document.createElement("div");
  message.className = `message ${role} image-message`;
  const safeCaption = caption || "生成图片";
  message.innerHTML = `
    <img src="${imageUrl}" alt="${escapeHtml(safeCaption)}" />
    <span>${escapeHtml(safeCaption)}</span>
  `;
  chatLog?.appendChild(message);
  scrollChatToBottom(chatLog);
  return message;
}

export function appendChatBlocks({ chatPanel, chatLog, role = "assistant", blocks = [], escapeHtml }) {
  chatPanel?.classList.add("has-chat");
  const message = document.createElement("div");
  message.className = `message ${role} agent-ui-blocks`;
  message.__updateBlocks = (nextBlocks = []) => {
    renderAgentBlocksInto(message, nextBlocks, escapeHtml);
    scrollChatToBottom(chatLog);
  };
  message.__updateBlocks(blocks);
  if (!message.childElementCount) return null;
  chatLog?.appendChild(message);
  scrollChatToBottom(chatLog);
  return message;
}

function scrollChatToBottom(chatLog) {
  if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
}

function renderAgentBlock(block = {}, escapeHtml = (value = "") => String(value)) {
  if (block.type === "analysis_card") return renderAnalysisCardV2(block, escapeHtml);
  if (block.type === "prompt_card") return renderPromptCardV2(block, escapeHtml);
  if (block.type === "generation_result") return renderGenerationResultV2(block, escapeHtml);
  if (block.type === "assistant_summary") return renderAssistantSummary(block, escapeHtml);
  if (block.type === "task_status") return "";
  return null;
}

function renderAgentBlocksInto(message, blocks = [], escapeHtml) {
  const detailState = new Map(Array.from(message.querySelectorAll("details[data-agent-block-id]"))
    .map((details) => [details.dataset.agentBlockId, details.open]));
  message.innerHTML = "";
  blocks.forEach((block, index) => {
    const blockId = block.id || `${block.type || "block"}-${index}`;
    const element = renderAgentBlock({ ...block, id: blockId }, escapeHtml);
    if (!element) return;
    if (element.matches?.("details")) {
      element.dataset.agentBlockId = blockId;
      if (detailState.has(blockId)) element.open = detailState.get(blockId);
    }
    message.appendChild(element);
  });
}

function renderAnalysisCardV2(block = {}, escapeHtml) {
  const content = block.content || {};
  const entries = [
    ["内容", content.content],
    ["风格", content.style],
    ["色彩", content.color],
    ["主题", content.theme],
    ["布局与特点", content.layout],
    ["为生成设计提供参考", content.suggestion]
  ].filter(([, value]) => String(value || "").trim());
  const statusText = block.status === "pending" ? (block.pendingText || "正在分析参考图...") : "";
  if (!entries.length && !block.errorText && !statusText) return null;
  const details = document.createElement("details");
  details.className = "agent-analysis-card";
  details.open = block.collapsed === false;
  details.innerHTML = `
    <summary><span aria-hidden="true">⌕</span>${escapeHtml(block.title || "图片分析")}</summary>
    <div class="agent-analysis-body">
      ${statusText ? `<p class="agent-analysis-pending">${escapeHtml(statusText)}</p>` : ""}
      ${block.errorText ? `<p class="agent-analysis-error">${escapeHtml(block.errorText)}</p>` : ""}
      ${entries.map(([label, value]) => `
        <p><strong>${escapeHtml(label)}：</strong>${escapeHtml(value)}</p>
      `).join("")}
    </div>
  `;
  return details;
}

function renderPromptCardV2(block = {}, escapeHtml) {
  const prompt = block.optimizedPrompt || block.prompt || "";
  const statusText = block.status === "pending" ? (block.pendingText || "正在优化提示词...") : "";
  if (!prompt && !statusText && !block.errorText) return null;
  const details = document.createElement("details");
  details.className = "agent-prompt-details agent-prompt-card";
  details.open = block.collapsed === false;
  details.innerHTML = `
    <summary>${escapeHtml(block.title || "查看提示词")}</summary>
    ${statusText ? `<p class="agent-prompt-pending">${escapeHtml(statusText)}</p>` : ""}
    ${block.errorText ? `<p class="agent-analysis-error">${escapeHtml(block.errorText)}</p>` : ""}
    ${prompt ? `<p>${escapeHtml(prompt)}</p><button type="button" data-copy-agent-prompt>复制提示词</button>` : ""}
  `;
  bindPromptCopy(details, prompt);
  return details;
}

function renderGenerationResultV2(block = {}, escapeHtml) {
  const imageUrl = block.imageUrl || block.imageUrls?.[0] || "";
  const videoUrl = block.videoUrl || "";
  const mediaUrl = imageUrl || videoUrl;
  if (!mediaUrl && block.status !== "pending" && block.status !== "failed") return null;
  const card = document.createElement("section");
  card.className = `agent-result-card ${block.status === "pending" ? "is-pending" : ""} ${block.status === "failed" ? "is-failed" : ""}`;
  const prompt = block.optimizedPrompt || block.prompt || "";
  const statusLabel = block.status === "pending"
    ? (block.statusText || "正在生成...")
    : (block.status === "failed" ? (block.statusText || "生成失败") : (block.status || "已在画布中"));
  card.innerHTML = `
    <div class="agent-result-kicker">◈ ${escapeHtml(block.generationType === "video" ? "智能视频 V2" : "智能图片 V2")}</div>
    <h3>${escapeHtml(block.title || "生成结果")}</h3>
    ${mediaUrl ? `
      <a class="agent-result-media" href="${escapeHtml(mediaUrl)}" target="_blank" rel="noreferrer">
        ${imageUrl
          ? `<img class="agent-result-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(block.title || "生成结果")}" />`
          : `<video class="agent-result-image" src="${escapeHtml(videoUrl)}" controls></video>`}
      </a>
    ` : `<div class="agent-result-media agent-result-placeholder"><span>${escapeHtml(statusLabel)}</span></div>`}
    <div class="agent-result-meta">
      <span>${escapeHtml(block.generationType === "video" ? "生成视频" : "生成图片")}</span>
      <span>模型：${escapeHtml(block.modelLabel || block.modelId || "当前模型")}</span>
      ${block.size ? `<span>尺寸：${escapeHtml(block.size)}</span>` : ""}
      <span>${escapeHtml(statusLabel)}</span>
    </div>
  `;
  bindPromptCopy(card, prompt);
  return card;
}

function bindPromptCopy(root, prompt = "") {
  const copyButton = root.querySelector("[data-copy-agent-prompt]");
  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard?.writeText?.(prompt);
      copyButton.textContent = "已复制";
    } catch {
      copyButton.textContent = "复制失败";
    }
  });
}

function renderAnalysisCard(block = {}, escapeHtml) {
  const content = block.content || {};
  const entries = [
    ["内容", content.content],
    ["风格", content.style],
    ["色彩", content.color],
    ["主题", content.theme],
    ["布局与特点", content.layout],
    ["为生成设计提供参考", content.suggestion]
  ].filter(([, value]) => String(value || "").trim());
  if (!entries.length && !block.errorText) return null;
  const details = document.createElement("details");
  details.className = "agent-analysis-card";
  details.open = block.collapsed === false;
  details.innerHTML = `
    <summary><span aria-hidden="true">⌕</span>${escapeHtml(block.title || "图片分析")}</summary>
    <div class="agent-analysis-body">
      ${block.errorText ? `<p class="agent-analysis-error">${escapeHtml(block.errorText)}</p>` : ""}
      ${entries.map(([label, value]) => `
        <p><strong>${escapeHtml(label)}：</strong>${escapeHtml(value)}</p>
      `).join("")}
    </div>
  `;
  return details;
}

function renderGenerationResult(block = {}, escapeHtml) {
  const imageUrl = block.imageUrl || block.imageUrls?.[0] || "";
  const videoUrl = block.videoUrl || "";
  const mediaUrl = imageUrl || videoUrl;
  if (!mediaUrl) return null;
  const card = document.createElement("section");
  card.className = "agent-result-card";
  const prompt = block.optimizedPrompt || block.prompt || "";
  card.innerHTML = `
    <div class="agent-result-kicker">◈ ${escapeHtml(block.generationType === "video" ? "智能视频 V2" : "智能图片 V2")}</div>
    <h3>${escapeHtml(block.title || "生成结果")}</h3>
    <a class="agent-result-media" href="${escapeHtml(mediaUrl)}" target="_blank" rel="noreferrer">
      ${imageUrl
        ? `<img class="agent-result-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(block.title || "生成结果")}" />`
        : `<video class="agent-result-image" src="${escapeHtml(videoUrl)}" controls></video>`}
    </a>
    <div class="agent-result-meta">
      <span>${escapeHtml(block.generationType === "video" ? "生成视频" : "生成图片")}</span>
      <span>模型：${escapeHtml(block.modelLabel || block.modelId || "当前模型")}</span>
      ${block.size ? `<span>尺寸：${escapeHtml(block.size)}</span>` : ""}
      <span>${escapeHtml(block.status || "已在画布中")}</span>
    </div>
    ${prompt ? `
      <details class="agent-prompt-details">
        <summary>查看提示词</summary>
        <p>${escapeHtml(prompt)}</p>
        <button type="button" data-copy-agent-prompt>复制提示词</button>
      </details>
    ` : ""}
  `;
  const copyButton = card.querySelector("[data-copy-agent-prompt]");
  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard?.writeText?.(prompt);
      copyButton.textContent = "已复制";
    } catch {
      copyButton.textContent = "复制失败";
    }
  });
  return card;
}

function renderAssistantSummary(block = {}, escapeHtml) {
  const text = String(block.text || "").trim();
  if (!text) return null;
  const paragraph = document.createElement("p");
  paragraph.className = "agent-assistant-summary";
  paragraph.textContent = text;
  return paragraph;
}

function renderTaskStatus(block = {}, escapeHtml) {
  const status = document.createElement("div");
  status.className = "agent-task-status";
  status.innerHTML = `
    <span>${escapeHtml(block.text || "星流已完成当前任务")}</span>
    ${block.feedback ? '<div class="agent-feedback"><button type="button">👍</button><button type="button">👎</button></div>' : ""}
  `;
  return status;
}

function updateThinkingStepList(message, steps = []) {
  const list = message.querySelector("ul");
  if (!list) return;
  const items = Array.from(list.querySelectorAll("li"));
  steps.forEach((step, index) => {
    const item = items[index];
    if (!item) return;
    const status = step.status || "pending";
    const label = step.label || step.key || "";
    const detail = step.key === "prompt" && status === "done" ? "" : step.detail;
    item.textContent = detail ? `${label}: ${detail}` : label;
    item.classList.toggle("active", status === "active");
    item.classList.toggle("done", status === "done");
    item.classList.toggle("failed", status === "failed");
  });
  if (steps.every((step) => step.status === "done")) message.classList.add("complete");
}
