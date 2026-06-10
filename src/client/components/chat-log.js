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
  message.innerHTML = `
    <strong>${escapeHtml(title)}</strong>
    <ul>
      ${steps.map((step, index) => `<li class="${index === 0 ? "active" : ""}">${escapeHtml(step)}</li>`).join("")}
    </ul>
  `;
  chatLog?.appendChild(message);
  scrollChatToBottom(chatLog);
  return message;
}

export function updateThinkingMessage(message, activeIndex, done = false) {
  if (!message) return;
  const items = message.querySelectorAll("li");
  items.forEach((item, index) => {
    item.classList.toggle("done", index < activeIndex || done);
    item.classList.toggle("active", index === activeIndex && !done);
  });
  if (done) message.classList.add("complete");
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
