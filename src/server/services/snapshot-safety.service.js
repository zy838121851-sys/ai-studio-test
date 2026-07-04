import { createHttpError } from "../lib/input-validation.js";

const MAX_SNAPSHOT_BYTES = 10 * 1024 * 1024;
const MAX_SNAPSHOT_NODES = 2000;

export function sanitizeCanvasSnapshotJson(input) {
  const text = String(input || "").trim();
  if (!text) return "";
  if (Buffer.byteLength(text, "utf8") > MAX_SNAPSHOT_BYTES) {
    throw createHttpError("Canvas snapshot is too large", 413);
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw createHttpError("Invalid canvas snapshot JSON", 400);
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.nodes)) {
    throw createHttpError("Invalid canvas snapshot structure", 400);
  }

  const snapshot = {
    version: Number(parsed.version || 1) || 1,
    savedAt: Number(parsed.savedAt || Date.now()) || Date.now(),
    nodes: parsed.nodes
      .slice(0, MAX_SNAPSHOT_NODES)
      .map(sanitizeSnapshotNode)
      .filter(Boolean)
  };
  return JSON.stringify(snapshot);
}

export function countSnapshotNodes(input) {
  if (!input) return 0;
  try {
    const parsed = typeof input === "string" ? JSON.parse(input) : input;
    return Array.isArray(parsed?.nodes) ? parsed.nodes.length : 0;
  } catch {
    return 0;
  }
}

export function sanitizeSnapshotHtml(html = "") {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<(?:iframe|object|embed|base|link|meta)\b[^>]*>[\s\S]*?<\/(?:iframe|object|embed|base|link|meta)\s*>/gi, "")
    .replace(/<(?:iframe|object|embed|base|link|meta)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:href|src|xlink:href)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, "")
    .replace(/\s+(?:href|src|xlink:href)\s*=\s*javascript:[^\s>]+/gi, "")
    .replace(/\s+style\s*=\s*(["'])([\s\S]*?)\1/gi, (_match, quote, value) => {
      const clean = sanitizeStyle(value);
      return clean ? ` style=${quote}${clean}${quote}` : "";
    });
}

function sanitizeSnapshotNode(node) {
  if (!node || typeof node !== "object") return null;
  const next = { ...node };
  next.kind = cleanText(next.kind, 80);
  next.title = cleanText(next.title, 500);
  next.desc = cleanText(next.desc, 2000);
  next.className = cleanClassName(next.className);
  next.style = sanitizeStyle(next.style);
  next.html = sanitizeSnapshotHtml(next.html);
  next.x = finiteNumber(next.x);
  next.y = finiteNumber(next.y);
  next.dataset = sanitizeDataset(next.dataset);
  next.media = sanitizeMedia(next.media);
  if (!isRestorableSnapshotNode(next)) return null;
  next.html = normalizeSnapshotHtmlMediaUrls(next.html);
  return next;
}

function sanitizeDataset(dataset = {}) {
  if (!dataset || typeof dataset !== "object") return {};
  const next = {};
  for (const [key, value] of Object.entries(dataset)) {
    const cleanKey = String(key || "").replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleanKey || /^on/i.test(cleanKey)) continue;
    next[cleanKey] = normalizePersistentMediaUrl(sanitizeUrlOrText(value));
  }
  return next;
}

function sanitizeMedia(media = {}) {
  if (!media || typeof media !== "object") return {};
  return {
    url: normalizePersistentMediaUrl(sanitizeUrl(media.url)),
    name: cleanText(media.name, 500),
    type: cleanText(media.type, 120),
    tool: cleanText(media.tool, 120),
    label: cleanText(media.label, 1000)
  };
}

function sanitizeUrlOrText(value) {
  const text = cleanText(value, 5000);
  return isDangerousUrl(text) ? "" : text;
}

function sanitizeUrl(value) {
  const text = cleanText(value, 5000);
  return isDangerousUrl(text) ? "" : text;
}

function normalizePersistentMediaUrl(value = "") {
  const text = String(value || "").trim();
  if (!text || text.startsWith("blob:")) return "";
  try {
    const parsed = new URL(text);
    if (
      /^https?:$/i.test(parsed.protocol)
      && parsed.pathname.startsWith("/uploads/")
      && (isLocalUploadHost(parsed.hostname) || isAppBaseUrlOrigin(parsed) || isAppBaseUrlHost(parsed))
    ) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return text;
  }
  return text;
}

function isLocalUploadHost(hostname = "") {
  const host = String(hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

function isAppBaseUrlOrigin(url) {
  const baseUrl = String(process.env.APP_BASE_URL || "").trim();
  if (!baseUrl) return false;
  try {
    return new URL(baseUrl).origin === url.origin;
  } catch {
    return false;
  }
}

function isAppBaseUrlHost(url) {
  const baseUrl = String(process.env.APP_BASE_URL || "").trim();
  if (!baseUrl) return false;
  try {
    return new URL(baseUrl).hostname === url.hostname;
  } catch {
    return false;
  }
}

function normalizeSnapshotHtmlMediaUrls(html = "") {
  return String(html || "").replace(
    /\s(src|href|poster)=("([^"]*)"|'([^']*)')/gi,
    (match, attribute, _quoted, doubleValue, singleValue) => {
      const rawValue = doubleValue ?? singleValue ?? "";
      const normalized = normalizePersistentMediaUrl(rawValue);
      if (!normalized) return "";
      const quote = doubleValue === undefined ? "'" : "\"";
      return ` ${attribute}=${quote}${normalized}${quote}`;
    }
  );
}

function isRestorableSnapshotNode(node = {}) {
  const kind = String(node.kind || node.dataset?.kind || "").trim().toLowerCase();
  const className = String(node.className || "");
  const html = String(node.html || "");
  return kind !== "loading-image"
    && !/\bnode-loading-image\b/.test(className)
    && !/\bgeneration-frame\b/.test(className)
    && !/\bgeneration-frame\b/.test(html);
}

function sanitizeStyle(value = "") {
  const text = cleanText(value, 5000);
  if (!text) return "";
  return text
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/url\s*\(\s*(['"]?)\s*javascript:[^)]+\)/gi, "");
}

function isDangerousUrl(value = "") {
  return /^\s*javascript:/i.test(String(value || ""));
}

function cleanClassName(value = "") {
  return cleanText(value, 1000).replace(/[^\w\s:-]/g, "");
}

function cleanText(value = "", maxLength = 1000) {
  return String(value || "").slice(0, maxLength);
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
