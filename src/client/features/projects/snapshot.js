export function createProjectSavePatch({
  project,
  canvasWorld,
  selectedNode,
  projectTitleElement,
  resolveAssetUrl = null
} = {}) {
  const nodes = Array.from(canvasWorld?.querySelectorAll(".node-card") || []);
  const selectedImage = getStableNodeMediaUrl(selectedNode, resolveAssetUrl);
  const firstImage = getStableNodeMediaUrl(canvasWorld?.querySelector(".node-image"), resolveAssetUrl);
  return {
    title: projectTitleElement?.textContent?.trim() || project?.title || "Fresh Ideas",
    thumbnail: selectedImage || firstImage || stableUrl(project?.thumbnail) || "",
    itemCount: nodes.length,
    canvasSnapshotJson: serializeCanvasSnapshot({ canvasWorld, resolveAssetUrl })
  };
}

export function serializeCanvasSnapshot({ canvasWorld, resolveAssetUrl = null } = {}) {
  const nodes = Array.from(canvasWorld?.querySelectorAll(".node-card") || [])
    .map((node) => snapshotCanvasNode(node, resolveAssetUrl))
    .filter(Boolean);
  return JSON.stringify({
    version: 1,
    savedAt: Date.now(),
    nodes
  });
}

export function restoreCanvasSnapshotJson({
  snapshotJson,
  addNode,
  canvasWorld,
  resolveAssetUrl = null,
  nodeOptions = {}
} = {}) {
  const snapshot = parseSnapshot(snapshotJson);
  if (!snapshot?.nodes?.length || typeof addNode !== "function") return 0;

  let restoredCount = 0;
  snapshot.nodes.forEach((item) => {
    const media = normalizeSnapshotMedia(item, resolveAssetUrl);
    const node = addNode({
      kind: item.kind || item.dataset?.kind || "image",
      title: item.title || item.dataset?.title || "Restored node",
      desc: item.desc || "",
      x: Number(item.x || 0),
      y: Number(item.y || 0),
      media
    }, nodeOptions);
    if (!node) return;
    applyNodeSnapshot(node, item);
    restoredCount += 1;
  });

  if (canvasWorld && restoredCount > 0) {
    canvasWorld.querySelectorAll(".node-card.selected").forEach((node, index, list) => {
      node.classList.toggle("selected", index === list.length - 1);
    });
  }

  return restoredCount;
}

function snapshotCanvasNode(node, resolveAssetUrl = null) {
  if (!node) return null;
  const image = node.querySelector(".image-frame img");
  const video = node.querySelector("video");
  const editor = node.querySelector(".canvas-text-editor");
  const kind = node.dataset.kind || kindFromClass(node) || "image";
  const title = node.dataset.title
    || node.querySelector(".image-file-name")?.textContent?.replace(/^.*?\s/, "").trim()
    || node.querySelector("h3")?.textContent?.trim()
    || "Canvas node";
  const desc = node.querySelector("p")?.textContent?.trim() || "";
  const mediaUrl = getStableNodeMediaUrl(node, resolveAssetUrl);
  const dataset = sanitizeSnapshotDataset(node.dataset, resolveAssetUrl, title);
  const html = snapshotNodeHtml(node, kind, mediaUrl);
  return {
    kind,
    title,
    desc,
    x: parseFloat(node.style.left || "0") || 0,
    y: parseFloat(node.style.top || "0") || 0,
    className: node.className || "",
    style: node.getAttribute("style") || "",
    dataset,
    html,
    media: {
      url: mediaUrl,
      name: title,
      type: video ? "video/mp4" : (image ? "image/png" : ""),
      tool: node.dataset.tool || "",
      label: editor?.textContent || title
    }
  };
}

function applyNodeSnapshot(node, item) {
  if (item.className) node.className = item.className;
  if (item.style) node.setAttribute("style", item.style);
  Object.entries(item.dataset || {}).forEach(([key, value]) => {
    if (key === "objectUrl" && isTransientUrl(value)) return;
    node.dataset[key] = value;
  });
  if ((item.kind || item.dataset?.kind) === "image" && node.style.width) {
    node.dataset.manualSize = node.dataset.manualSize || "true";
  }
  const itemKind = item.kind || item.dataset?.kind || "";
  if (item.html && itemKind !== "image" && itemKind !== "video") {
    node.innerHTML = sanitizeSnapshotHtml(item.html);
  }
}

function sanitizeSnapshotHtml(html = "") {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<(?:iframe|object|embed|base|link|meta)\b[^>]*>[\s\S]*?<\/(?:iframe|object|embed|base|link|meta)\s*>/gi, "")
    .replace(/<(?:iframe|object|embed|base|link|meta)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:href|src|xlink:href)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, "")
    .replace(/\s+(?:href|src|xlink:href)\s*=\s*javascript:[^\s>]+/gi, "")
    .replace(/\s+style\s*=\s*(["'])([\s\S]*?)\1/gi, (_match, quote, value) => {
      const clean = String(value || "")
        .replace(/expression\s*\([^)]*\)/gi, "")
        .replace(/url\s*\(\s*(['"]?)\s*javascript:[^)]+\)/gi, "");
      return clean.trim() ? ` style=${quote}${clean}${quote}` : "";
    });
}

function normalizeSnapshotMedia(item, resolveAssetUrl = null) {
  const media = { ...(item.media || {}) };
  const title = media.name || item.title || item.dataset?.title || "";
  const fallback = item.dataset?.objectUrl || media.url || extractSnapshotHtmlMediaUrl(item.html) || "";
  media.url = stableUrl(media.url)
    || resolvePersistentUrl(resolveAssetUrl, { title, node: item, url: fallback })
    || stableUrl(fallback)
    || "";
  return media;
}

function getStableNodeMediaUrl(node, resolveAssetUrl = null) {
  if (!node) return "";
  const image = node.querySelector?.(".image-frame img");
  const video = node.querySelector?.("video");
  const title = node.dataset?.title
    || node.querySelector?.(".image-file-name")?.textContent?.replace(/^.*?\s/, "").trim()
    || node.querySelector?.("h3")?.textContent?.trim()
    || "";
  const currentUrl = image?.currentSrc || image?.src || video?.currentSrc || video?.src || node.dataset?.objectUrl || "";
  return stableUrl(currentUrl)
    || resolvePersistentUrl(resolveAssetUrl, { title, node, url: currentUrl })
    || "";
}

function sanitizeSnapshotDataset(dataset = {}, resolveAssetUrl = null, title = "") {
  const next = { ...dataset };
  if (isTransientUrl(next.objectUrl)) {
    const resolved = resolvePersistentUrl(resolveAssetUrl, { title, url: next.objectUrl });
    if (resolved) next.objectUrl = resolved;
    else delete next.objectUrl;
  }
  return next;
}

function snapshotNodeHtml(node, kind = "", mediaUrl = "") {
  const rawHtml = node?.innerHTML || "";
  if (!node?.cloneNode) return stripTransientUrls(rawHtml);
  const clone = node.cloneNode(true);
  if (kind === "image") {
    const image = clone.querySelector?.(".image-frame img");
    sanitizeMediaElementSource(image, mediaUrl);
  } else if (kind === "video") {
    const video = clone.querySelector?.("video");
    sanitizeMediaElementSource(video, mediaUrl);
  }
  clone.querySelectorAll?.("[src]")?.forEach((item) => {
    const src = item.getAttribute("src") || item.src || "";
    if (isTransientUrl(src)) item.removeAttribute("src");
  });
  return stripTransientUrls(clone.innerHTML || rawHtml);
}

function sanitizeMediaElementSource(element, mediaUrl = "") {
  if (!element) return;
  if (mediaUrl) {
    element.setAttribute("src", mediaUrl);
  } else {
    const src = element.getAttribute("src") || element.src || "";
    if (isTransientUrl(src)) element.removeAttribute("src");
  }
  element.removeAttribute("srcset");
}

function extractSnapshotHtmlMediaUrl(html = "") {
  const match = String(html || "").match(/<(?:img|video)\b[^>]*\bsrc=["']([^"']+)["']/i);
  return stableUrl(decodeHtmlAttribute(match?.[1] || ""));
}

function stripTransientUrls(html = "") {
  return String(html || "").replace(/blob:[^"'<>\s]+/g, "");
}

function decodeHtmlAttribute(value = "") {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function stableUrl(url = "") {
  const value = String(url || "").trim();
  return value && !isTransientUrl(value) ? value : "";
}

function isTransientUrl(url = "") {
  return String(url || "").startsWith("blob:");
}

function resolvePersistentUrl(resolveAssetUrl, details = {}) {
  if (typeof resolveAssetUrl !== "function") return "";
  try {
    return stableUrl(resolveAssetUrl(details));
  } catch {
    return "";
  }
}

function parseSnapshot(snapshotJson) {
  if (!snapshotJson) return null;
  try {
    const parsed = typeof snapshotJson === "string" ? JSON.parse(snapshotJson) : snapshotJson;
    return parsed && Array.isArray(parsed.nodes) ? parsed : null;
  } catch {
    return null;
  }
}

function kindFromClass(node) {
  const match = String(node.className || "").match(/\bnode-([a-z0-9-]+)/i);
  return match?.[1] || "";
}
