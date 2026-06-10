export function syncHomeModelPicker({ select, button, menu }) {
  if (!select || !button || !menu) return;
  const selected = select.options[select.selectedIndex];
  const label = button.querySelector("span");
  if (label) label.textContent = selected?.textContent || "智能模型";
  menu.querySelectorAll("[data-model-value]").forEach((item) => {
    item.classList.toggle("active", item.dataset.modelValue === select.value);
  });
}

export function renderHomeFilePreview({ container, files = [], escapeHtml, onRemove }) {
  if (!container) return;
  container.innerHTML = "";
  files.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "home-file-thumb";
    const url = URL.createObjectURL(file);
    item.innerHTML = `
      <img src="${url}" alt="${escapeHtml(file.name)}" />
      <button type="button" aria-label="移除文件">×</button>
    `;
    item.querySelector("img")?.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
    item.querySelector("button")?.addEventListener("click", () => onRemove?.(index));
    container.appendChild(item);
  });
}

export function applyHomeFileState({ form, uploadButton, count }) {
  form?.classList.toggle("has-files", count > 0);
  if (!uploadButton) return;
  uploadButton.title = count ? `已选择 ${count} 张参考图` : "上传文件";
  uploadButton.setAttribute("aria-label", uploadButton.title);
}
