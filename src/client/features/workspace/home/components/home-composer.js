const homePreviewUrls = new WeakMap();

function getHomePreviewUrl(file) {
  if (!file) return "";
  const current = homePreviewUrls.get(file);
  if (current) return current;
  const next = URL.createObjectURL(file);
  homePreviewUrls.set(file, next);
  return next;
}

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
    const url = getHomePreviewUrl(file);
    item.innerHTML = `
      <img src="${url}" alt="${escapeHtml(file.name)}" />
      <b>图${index + 1}</b>
      <button type="button" aria-label="移除文件" title="移除文件"><span aria-hidden="true">×</span></button>
    `;
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
