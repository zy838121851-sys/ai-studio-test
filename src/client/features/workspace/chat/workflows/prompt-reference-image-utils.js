import { getChatPreviewAttachmentFile } from "../components/chat-image-preview.js?v=20260627-chat-agent-2";
import { findActiveImageNode } from "./prompt-generation-metrics-utils.js";
import {
  summarizeDataUrl,
  summarizeFiles
} from "./prompt-debug-summary-utils.js";

export async function imageSourceToDataUrl(source = "", {
  fetchImpl = globalThis.fetch,
  blobToDataUrlImpl = blobToDataUrl
} = {}) {
  const src = String(source || "");
  if (!src) return "";
  if (src.startsWith("data:")) return src;
  const response = await fetchImpl(src);
  if (!response.ok) throw new Error(`preview fetch failed: ${response.status}`);
  const blob = await response.blob();
  return blobToDataUrlImpl(blob);
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("blob read failed"));
    reader.readAsDataURL(blob);
  });
}

export function inferMimeTypeFromDataUrl(dataUrl = "") {
  const match = String(dataUrl || "").match(/^data:([^;,]+)/);
  return match?.[1] || "";
}

export async function collectReferenceImages({
  files = [],
  domPreviewAttachments = [],
  readFileAsDataUrl,
  readImageSourceAsDataUrl,
  debugRecord = null,
  logDebug = () => {},
  readDomPreviewReferencesImpl = readDomPreviewReferences,
  readSelectedImageReferenceImpl = readSelectedImageReference
} = {}) {
  const attachments = [];
  let successCount = 0;
  let failureCount = 0;
  logDebug("attachments.collect.input", {
    fileCount: files.length,
    domPreviewAttachmentCount: domPreviewAttachments.length,
    files: summarizeFiles(files),
    domPreviewAttachments
  });

  for (const [index, file] of files.entries()) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) throw new Error("empty dataURL");
      successCount += 1;
      attachments.push({
        type: file?.type || "image",
        name: file?.name || `Reference ${index + 1}`,
        source: "upload",
        dataUrl
      });
    } catch (error) {
      failureCount += 1;
      logDebug("attachments.dataurl_failed", {
        index,
        name: file?.name || "",
        type: file?.type || "",
        size: Number(file?.size || 0),
        error: error.message || String(error)
      });
    }
  }

  if (files.length && !attachments.length) {
    throw new Error("No uploaded reference images could be converted to dataURL.");
  }

  if (!attachments.length && !files.length && domPreviewAttachments.length) {
    const domReferences = await readDomPreviewReferencesImpl({
      readFileAsDataUrl,
      logDebug
    });
    attachments.push(...domReferences);
    if (!attachments.length) {
      const error = new Error("参考图读取失败，请重新上传参考图。");
      error.failureCode = "REFERENCE_ATTACHMENT_UNREADABLE";
      error.stage = "attachments";
      throw error;
    }
  }

  if (!attachments.length && !files.length && !domPreviewAttachments.length) {
    const selectedReference = await readSelectedImageReferenceImpl(readImageSourceAsDataUrl);
    if (selectedReference) attachments.push(selectedReference);
  }

  if (debugRecord) {
    debugRecord.dataUrlSuccessCount = successCount;
    debugRecord.dataUrlFailureCount = failureCount;
  }
  logDebug("attachments.dataurl_complete", {
    successCount,
    failureCount,
    finalReferenceCount: attachments.length,
    sources: attachments.map((item) => item.source || "unknown")
  });

  return {
    attachments,
    images: attachments.map((item) => item.dataUrl).filter(Boolean)
  };
}

export async function readDomPreviewReferences({
  readFileAsDataUrl = null,
  root = globalThis.document,
  getAttachmentFile = getChatPreviewAttachmentFile,
  imageSourceToDataUrlImpl = imageSourceToDataUrl,
  logDebug = () => {}
} = {}) {
  const items = Array.from(root?.querySelectorAll?.(".chat-image-preview button") || []);
  const references = [];
  for (const [index, button] of items.entries()) {
    const image = button.querySelector("img");
    const attachmentId = button.dataset.attachmentId || "";
    const registeredFile = getAttachmentFile(attachmentId);
    if (registeredFile && typeof readFileAsDataUrl === "function") {
      try {
        const dataUrl = await readFileAsDataUrl(registeredFile);
        if (!dataUrl) throw new Error("empty dataURL");
        references.push({
          type: registeredFile.type || button.dataset.attachmentType || inferMimeTypeFromDataUrl(dataUrl) || "image",
          name: registeredFile.name || button.dataset.attachmentName || image?.alt || `Reference ${index + 1}`,
          source: "upload",
          attachmentId,
          dataUrl
        });
        continue;
      } catch (error) {
        logDebug("attachments.dom_registry_failed", {
          index,
          attachmentId,
          name: registeredFile.name || button.dataset.attachmentName || image?.alt || "",
          type: registeredFile.type || button.dataset.attachmentType || "",
          size: Number(registeredFile.size || button.dataset.attachmentSize || 0),
          error: error.message || String(error)
        });
      }
    }
    const source = image?.currentSrc || image?.src || "";
    if (!source) continue;
    try {
      const dataUrl = await imageSourceToDataUrlImpl(source);
      if (!dataUrl) throw new Error("empty dataURL");
      references.push({
        type: button.dataset.attachmentType || inferMimeTypeFromDataUrl(dataUrl) || "image",
        name: button.dataset.attachmentName || image?.alt || `Reference ${index + 1}`,
        source: "upload",
        attachmentId,
        dataUrl
      });
    } catch (error) {
      logDebug("attachments.dom_preview_failed", {
        index,
        attachmentId,
        name: button.dataset.attachmentName || image?.alt || "",
        src: summarizeDataUrl(source),
        error: error.message || String(error)
      });
    }
  }
  logDebug("attachments.dom_preview_complete", {
    domPreviewCount: items.length,
    recoveredReferenceCount: references.length,
    sources: references.map((item) => item.source)
  });
  return references;
}

export async function readSelectedImageReference(readImageSourceAsDataUrl, {
  root = globalThis.document,
  warn = console.warn
} = {}) {
  if (typeof readImageSourceAsDataUrl !== "function") return null;
  const node = findActiveImageNode(root);
  const image = node?.querySelector?.("img");
  const source = image?.currentSrc || image?.src || node?.dataset?.objectUrl || "";
  if (!source) return null;
  try {
    const dataUrl = await readImageSourceAsDataUrl(source);
    if (!dataUrl) return null;
    return {
      type: "image",
      name: node?.dataset?.title || node?.querySelector?.(".node-title")?.textContent?.trim?.() || "Selected canvas image",
      source: "canvas-selection",
      dataUrl
    };
  } catch (error) {
    warn?.("[conversation] Failed to read selected image reference", error);
    return null;
  }
}
