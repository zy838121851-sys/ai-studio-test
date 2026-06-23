const chatPreviewUrls = new WeakMap();

function getChatPreviewUrl(file) {
  if (!file) return "";
  const current = chatPreviewUrls.get(file);
  if (current) return current;
  const next = URL.createObjectURL(file);
  chatPreviewUrls.set(file, next);
  return next;
}

export function renderChatImagePreviewList({
  container,
  files = [],
  escapeHtml,
  onRemove
}) {
  if (!container) return;
  container.innerHTML = "";
  container.classList.toggle("open", files.length > 0);
  files.forEach((file, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.title = "移除图片";
    item.innerHTML = `<img src="${getChatPreviewUrl(file)}" alt="${escapeHtml(file.name)}" /><b>图${index + 1}</b><span aria-hidden="true">x</span>`;
    item.addEventListener("click", () => onRemove?.(index));
    container.appendChild(item);
  });
}

export function addImageFilesToPreview({
  incomingFiles,
  currentFiles,
  getImageFiles,
  render,
  promptForm,
  promptInput,
  resetDragDepth
}) {
  const images = getImageFiles(incomingFiles);
  if (!images.length) return false;
  const remaining = Math.max(0, 3 - currentFiles.length);
  if (!remaining) return false;
  currentFiles.push(...images.slice(0, remaining));
  render();
  promptForm?.classList.remove("drag-over");
  resetDragDepth?.();
  promptInput?.focus();
  return true;
}
