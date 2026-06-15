export function createImageTextPanel({ onRefresh, onClose, onApply }) {
  const panel = document.createElement("aside");
  panel.id = "imageTextPanel";
  panel.className = "image-text-panel";
  panel.innerHTML = `
    <header>
      <strong>编辑文字</strong>
      <button type="button" data-text-edit-refresh aria-label="重新识别">↻</button>
      <button type="button" data-text-edit-close aria-label="关闭">×</button>
    </header>
    <div class="image-text-status" data-text-edit-status>正在识别图片文字...</div>
    <div class="image-text-list" data-text-edit-list></div>
    <footer>
      <button type="button" data-text-edit-cancel>取消</button>
      <button type="button" data-text-edit-apply>应用修改</button>
    </footer>
  `;
  panel.addEventListener("pointerdown", (event) => event.stopPropagation());
  panel.addEventListener("click", async (event) => {
    if (event.target.closest("[data-text-edit-refresh]")) return onRefresh?.();
    if (event.target.closest("[data-text-edit-close], [data-text-edit-cancel]")) return onClose?.();
    if (event.target.closest("[data-text-edit-apply]")) return onApply?.();
  });
  return panel;
}

export function positionImageTextPanel({ panel, node, width = 330, gap = 22 }) {
  if (!panel || !node) return;
  const nodeX = Number.parseFloat(node.style.left || "0");
  const nodeY = Number.parseFloat(node.style.top || "0");
  panel.style.width = `${width}px`;
  panel.style.left = `${nodeX + node.offsetWidth + gap}px`;
  panel.style.top = `${nodeY}px`;
}

export function renderImageTextInputs(panel, texts = []) {
  const list = panel.querySelector("[data-text-edit-list]");
  const status = panel.querySelector("[data-text-edit-status]");
  if (!list || !status) return;
  list.innerHTML = "";
  const normalized = texts
    .map((item) => (typeof item === "string" ? { text: item } : item))
    .filter((item) => item?.text?.trim());
  panel._texts = normalized;
  status.textContent = normalized.length
    ? `识别到 ${normalized.length} 处文字，可直接修改后应用。`
    : "未识别到明确文字，你也可以手动添加需要替换的文字。";
  const rows = normalized.length ? normalized : [{ text: "" }];
  rows.forEach((item, index) => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = item.text || "";
    input.dataset.originalText = item.text || "";
    input.placeholder = `文字 ${index + 1}`;
    list.appendChild(input);
  });
}

export function getImageTextEdits(panel) {
  return Array.from(panel?.querySelectorAll("[data-text-edit-list] input") || [])
    .map((input) => ({
      from: input.dataset.originalText || "",
      to: input.value.trim()
    }))
    .filter((item) => item.to && item.to !== item.from);
}

export function buildImageTextEditPrompt(edits) {
  return [
    "请只修改图片中的文字内容，并保持原图构图、产品、背景、图标、排版层级、字体风格、颜色和光影尽量不变。",
    "把以下文字替换为新的文字：",
    ...edits.map((item, index) => `${index + 1}. ${item.from || "对应位置文字"} -> ${item.to}`),
    "修复被替换区域的底图，文字要自然贴合原海报，不要新增无关元素，不要改变产品主体。"
  ].join("\n");
}
