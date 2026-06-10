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
    item.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="${escapeHtml(file.name)}" /><span>×</span>`;
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
  currentFiles.push(...images);
  render();
  promptForm?.classList.remove("drag-over");
  resetDragDepth?.();
  promptInput?.focus();
  return true;
}
