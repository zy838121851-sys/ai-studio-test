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

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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

export function getImageExportRect(node, getNodeLayoutBounds) {
  const frame = node?.querySelector?.(".image-frame");
  const image = frame?.querySelector?.("img");
  if (!frame || !image) return null;
  const nodeBounds = getNodeLayoutBounds(node);
  const width = Math.max(1, frame.offsetWidth || node.offsetWidth || nodeBounds.width);
  const height = Math.max(1, frame.offsetHeight || node.offsetHeight || nodeBounds.height);
  return {
    image,
    x: nodeBounds.x + frame.offsetLeft,
    y: nodeBounds.y + frame.offsetTop,
    width,
    height
  };
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

export function rasterizeSvg(svgText, width, height, format) {
  return new Promise((resolve, reject) => {
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
    const image = new Image();
    image.onload = () => {
      const scale = Math.max(1, Math.min(3, window.devicePixelRatio || 2));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(width * scale));
      canvas.height = Math.max(1, Math.ceil(height * scale));
      const context = canvas.getContext("2d");
      context.scale(scale, scale);
      if (format === "jpg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas export returned an empty blob"));
          return;
        }
        resolve(blob);
      }, format === "jpg" ? "image/jpeg" : "image/png", 0.94);
    };
    image.onerror = () => {
      reject(new Error("Unable to render SVG export"));
    };
    image.src = url;
  });
}
