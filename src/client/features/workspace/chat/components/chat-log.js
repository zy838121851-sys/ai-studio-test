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

function scrollChatToBottom(chatLog) {
  if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
}

function updateThinkingStepList(message, steps = []) {
  const list = message.querySelector("ul");
  if (!list) return;
  const items = Array.from(list.querySelectorAll("li"));
  steps.forEach((step, index) => {
    const item = items[index];
    if (!item) return;
    const status = step.status || "pending";
    item.textContent = step.detail ? `${step.label || step.key}: ${step.detail}` : (step.label || step.key || "");
    item.classList.toggle("active", status === "active");
    item.classList.toggle("done", status === "done");
    item.classList.toggle("failed", status === "failed");
  });
  if (steps.every((step) => step.status === "done")) message.classList.add("complete");
}
