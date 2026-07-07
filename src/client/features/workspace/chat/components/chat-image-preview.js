const chatPreviewUrls = new WeakMap();
const chatPreviewIds = new WeakMap();
const chatPreviewFilesById = new Map();
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

export function getChatPreviewAttachmentFile(attachmentId = "") {
  return chatPreviewFilesById.get(String(attachmentId || "")) || null;
}

export function renderChatImagePreviewList({
  container,
  files = [],
  canvasReferences = [],
  escapeHtml,
  onRemove
}) {
  if (!container) return;
  container.innerHTML = "";
  const visibleCanvasReferences = Array.from(canvasReferences || []).filter((item) => item?.src);
  container.classList.toggle("open", files.length > 0 || visibleCanvasReferences.length > 0);
  const activeAttachmentIds = new Set();
  files.forEach((file, index) => {
    const attachmentId = getChatPreviewId(file);
    if (attachmentId) {
      activeAttachmentIds.add(attachmentId);
      if (file instanceof Blob) {
        chatPreviewFilesById.set(attachmentId, file);
      }
    }
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
  visibleCanvasReferences.forEach((reference, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.title = reference.name || `Canvas reference ${index + 1}`;
    item.dataset.canvasReference = "true";
    item.dataset.attachmentName = reference.name || "";
    item.dataset.attachmentType = "image";
    item.dataset.attachmentSize = "0";
    item.innerHTML = `<img src="${escapeHtml(reference.src)}" alt="${escapeHtml(reference.name || `Canvas reference ${index + 1}`)}" /><b>Ref ${index + 1}</b>`;
    container.appendChild(item);
  });
  for (const attachmentId of chatPreviewFilesById.keys()) {
    if (!activeAttachmentIds.has(attachmentId)) {
      chatPreviewFilesById.delete(attachmentId);
    }
  }
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
