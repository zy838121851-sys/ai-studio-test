export function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim().slice(0, 120);
}

export function cleanFileName(value = "") {
  return cleanText(value).replace(/[\\/:*?"<>|]+/g, "-") || "canvas-node";
}

export function stripImageExtension(value = "") {
  return String(value).replace(/\.(png|jpe?g|webp|gif|avif|bmp|svg)$/i, "");
}

export function escapeAttributeValue(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
