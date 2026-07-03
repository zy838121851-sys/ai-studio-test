import {
  cleanFileName,
  stripImageExtension
} from "./canvas-menu-text-utils.js";

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
