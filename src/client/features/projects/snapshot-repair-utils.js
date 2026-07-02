import {
  isRestorableSnapshotItem,
  normalizePersistentMediaUrl
} from "./snapshot.js";

export function projectHasRestorableCanvasContent(project = {}) {
  if (normalizePersistentMediaUrl(project.thumbnail)) return true;
  const snapshot = parseSnapshotJson(project.canvasSnapshotJson);
  if (Array.isArray(snapshot?.nodes)) {
    return snapshot.nodes.some((node) => isRestorableSnapshotItem(node));
  }
  return Number(project.itemCount || 0) > 0;
}

export function getProjectMediaUrls(project = {}) {
  const urls = new Set();
  const thumbnail = normalizePersistentMediaUrl(project.thumbnail);
  if (isPreloadableImageUrl(thumbnail)) urls.add(thumbnail);
  const snapshot = parseSnapshotJson(project.canvasSnapshotJson);
  (snapshot?.nodes || []).forEach((node) => {
    [
      node?.media?.url,
      node?.dataset?.objectUrl,
      extractSnapshotImageUrl(node?.html)
    ].forEach((url) => {
      const value = String(url || "").trim();
      if (isPreloadableImageUrl(value)) urls.add(value);
    });
  });
  return Array.from(urls).slice(0, 8);
}

export function snapshotNeedsUrlRepair(snapshotJson = "") {
  const snapshot = parseSnapshotJson(snapshotJson);
  return Array.isArray(snapshot?.nodes) && snapshot.nodes.some((node) => (
    !isRestorableSnapshotItem(node)
    || (isMediaSnapshotNode(node) && snapshotMediaNeedsRepair(node))
  ));
}

export function snapshotHasUnresolvedMedia(snapshotJson = "") {
  const snapshot = parseSnapshotJson(snapshotJson);
  return Array.isArray(snapshot?.nodes) && snapshot.nodes.some((node) => (
    isMediaSnapshotNode(node) && !hasStableMediaUrl(node?.media?.url)
  ));
}

function parseSnapshotJson(snapshotJson = "") {
  if (!snapshotJson) return null;
  try {
    const parsed = typeof snapshotJson === "string" ? JSON.parse(snapshotJson) : snapshotJson;
    return parsed && Array.isArray(parsed.nodes) ? parsed : null;
  } catch {
    return null;
  }
}

function extractSnapshotImageUrl(html = "") {
  const match = String(html || "").match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  return decodeHtmlAttribute(match?.[1] || "");
}

function decodeHtmlAttribute(value = "") {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function isPreloadableImageUrl(url = "") {
  const value = String(url || "").trim();
  if (!value || value.startsWith("blob:")) return false;
  return /^(?:https?:|data:image\/|\/)/i.test(value);
}

function isMediaSnapshotNode(node = {}) {
  const kind = String(node.kind || node.dataset?.kind || "").toLowerCase();
  const html = String(node.html || "");
  return kind === "image"
    || kind === "video"
    || /<(?:img|video)\b/i.test(html);
}

function snapshotMediaNeedsRepair(node = {}) {
  return !hasStableMediaUrl(node?.media?.url)
    || containsTransientUrl(node)
    || [
      node?.media?.url,
      node?.dataset?.objectUrl,
      extractSnapshotImageUrl(node?.html)
    ].some((url) => mediaUrlNeedsNormalization(url));
}

function hasStableMediaUrl(url = "") {
  const value = String(url || "").trim();
  return Boolean(value && !value.startsWith("blob:") && normalizePersistentMediaUrl(value) === value);
}

function mediaUrlNeedsNormalization(url = "") {
  const value = String(url || "").trim();
  if (!value || value.startsWith("blob:")) return false;
  const normalized = normalizePersistentMediaUrl(value);
  return Boolean(normalized && normalized !== value);
}

function containsTransientUrl(value) {
  return JSON.stringify(value || {}).includes("blob:");
}
