const chatPreviewUrls = new WeakMap();
const chatPreviewIds = new WeakMap();
let chatPreviewIdSeed = 0;

function getChatPreviewId(file) {
  if (!file) return "";
  const current = chatPreviewIds.get(file);
  if (current) return current;
  chatPreviewIdSeed += 1;
  const next = `chat-upload-${Date.now().toString(36)}-${chatPreviewIdSeed}`;
  chatPreviewIds.set(file, next);
  return next;
}

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
    const attachmentId = getChatPreviewId(file);
    const item = document.createElement("button");
    item.type = "button";
    item.title = "移除图片";
    item.dataset.attachmentId = attachmentId;
    item.dataset.attachmentName = file?.name || "";
    item.dataset.attachmentType = file?.type || "";
    item.dataset.attachmentSize = String(file?.size || 0);
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
  const accepted = images.slice(0, remaining);
  currentFiles.push(...accepted);
  render();
  accepted.forEach((file) => {
    console.debug("[chat-upload] added attachment", {
      attachmentId: getChatPreviewId(file),
      name: file?.name || "",
      type: file?.type || "",
      mime: file?.type || "",
      size: Number(file?.size || 0),
      hasFile: file instanceof File,
      hasBlob: file instanceof Blob,
      hasDataUrl: false,
      composerAttachmentCount: currentFiles.length
    });
  });
  promptForm?.classList.remove("drag-over");
  resetDragDepth?.();
  promptInput?.focus();
  return true;
}
