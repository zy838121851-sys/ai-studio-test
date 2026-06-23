export function createImageTextPanel({ onRefresh, onClose, onApply }) {
  const panel = document.createElement("aside");
  panel.id = "imageTextPanel";
  panel.className = "image-text-panel";
  panel.innerHTML = `
    <header>
      <strong>&#32534;&#36753;&#25991;&#23383;</strong>
      <button type="button" data-text-edit-refresh aria-label="&#37325;&#26032;&#35782;&#21035;">&#8635;</button>
      <button type="button" data-text-edit-close aria-label="&#20851;&#38381;">&times;</button>
    </header>
    <div class="image-text-status" data-text-edit-status>&#27491;&#22312;&#35782;&#21035;&#22270;&#29255;&#25991;&#23383;...</div>
    <div class="image-text-list" data-text-edit-list></div>
    <footer>
      <button type="button" data-text-edit-cancel>&#21462;&#28040;</button>
      <button type="button" data-text-edit-apply>&#24212;&#29992;&#20462;&#25913;</button>
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
    ? `\u8bc6\u522b\u5230 ${normalized.length} \u5904\u6587\u5b57\uff0c\u53ef\u76f4\u63a5\u4fee\u6539\u540e\u5e94\u7528\u3002`
    : "\u672a\u8bc6\u522b\u5230\u660e\u786e\u6587\u5b57\uff0c\u4e5f\u53ef\u4ee5\u624b\u52a8\u8f93\u5165\u9700\u8981\u66ff\u6362\u6216\u65b0\u589e\u7684\u6587\u5b57\u3002";
  const rows = normalized.length ? normalized : [{ text: "" }];
  rows.forEach((item, index) => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = item.text || "";
    input.dataset.originalText = item.text || "";
    input.placeholder = `\u6587\u5b57 ${index + 1}`;
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
    "Only edit the text content inside the image.",
    "Keep the original image composition, product/character, background, icon shapes, layout hierarchy, font style, color, lighting, and perspective as unchanged as possible.",
    "Replace the following text items with the new text:",
    ...edits.map((item, index) => `${index + 1}. ${item.from || "the visible text at the matching location"} -> ${item.to}`),
    "Repair the underlying image area naturally after replacement.",
    "Do not add unrelated elements, do not change the main subject, and do not translate or rewrite text that is not listed above."
  ].join("\n");
}
