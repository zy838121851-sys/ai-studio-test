import {
  cleanFileName,
  stripImageExtension
} from "./canvas-menu-text-utils.js";

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Unable to read image blob"));
    reader.readAsDataURL(blob);
  });
}

export function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas export returned an empty blob"));
      }
    }, type);
  });
}

export function drawImageIntoRect({ context, image, x, y, width, height, objectFit = "cover" }) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) return;
  if (objectFit === "contain") {
    const scale = Math.min(width / sourceWidth, height / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
    return;
  }
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  const sourceX = (sourceWidth - cropWidth) / 2;
  const sourceY = (sourceHeight - cropHeight) / 2;
  context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, x, y, width, height);
}

export function getImageExportFileName(node) {
  const title = cleanFileName(stripImageExtension(node.querySelector(".image-file-name, h3, .node-title, [data-node-title]")?.textContent
    || node.querySelector(".image-frame img")?.alt
    || "canvas-image"));
  return `${title}.png`;
}

export function getUniqueExportFileName(existingFiles, fileName) {
  const used = new Set(existingFiles.map((file) => file.fileName));
  if (!used.has(fileName)) return fileName;
  const base = stripImageExtension(fileName);
  let index = 2;
  let nextName = `${base}-${index}.png`;
  while (used.has(nextName)) {
    index += 1;
    nextName = `${base}-${index}.png`;
  }
  return nextName;
}

export function isHttpUrl(value = "") {
  return /^https?:\/\//i.test(String(value || ""));
}

export function prepareExportClone(clone) {
  clone.classList.remove("selected", "node-locked");
  clone.querySelectorAll(".resize-handle, .image-node-toolbar, .canvas-asset-savebar, .node-download, .node-expand, .stack-toggle, .stack-tray").forEach((item) => item.remove());
}
