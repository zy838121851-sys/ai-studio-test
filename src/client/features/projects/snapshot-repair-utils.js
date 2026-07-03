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
    getSnapshotMediaCandidateUrls(node).forEach((url) => {
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

function extractSnapshotHtmlMediaUrls(html = "") {
  const urls = [];
  String(html || "").replace(/<(?:img|video|source|model-viewer)\b[^>]*>/gi, (tag) => {
    String(tag || "").replace(/\s(?:src|poster|href)=["']([^"']+)["']/gi, (_match, value) => {
      urls.push(decodeHtmlAttribute(value));
      return "";
    });
    return "";
  });
  return urls;
}

function getSnapshotMediaCandidateUrls(node = {}) {
  const urls = [
    node?.media?.url,
    node?.dataset?.objectUrl,
    ...extractSnapshotHtmlMediaUrls(node?.html)
  ];
  const dataset = node?.dataset && typeof node.dataset === "object" ? node.dataset : {};
  Object.entries(dataset).forEach(([key, value]) => {
    if (looksLikeMediaDatasetKey(key)) urls.push(value);
  });
  const media = node?.media && typeof node.media === "object" ? node.media : {};
  Object.entries(media).forEach(([key, value]) => {
    if (looksLikeMediaDatasetKey(key)) urls.push(value);
  });
  return urls;
}

function looksLikeMediaDatasetKey(key = "") {
  return /(?:url|src|poster|thumbnail|media|model|object)/i.test(String(key || ""));
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
    || kind === "model"
    || /<(?:img|video|source|model-viewer)\b/i.test(html);
}

function snapshotMediaNeedsRepair(node = {}) {
  return !getSnapshotMediaCandidateUrls(node).some((url) => hasStableMediaUrl(url))
    || containsTransientUrl(node)
    || getSnapshotMediaCandidateUrls(node).some((url) => mediaUrlNeedsNormalization(url));
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
