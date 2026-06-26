import { createCanvasNodeElement } from "./node-factory.js";
import {
  applyNodePreviewSize,
  buildGenerationPreviewConfig
} from "./upload-nodes.js";

export function createWorkspaceNode({
  config,
  options = {},
  renderTemplate,
  emptyState,
  canvasWorld,
  ensureNodeId,
  makeDraggable,
  selectNode,
  initModelViewer,
  onImageLoaded,
  onImageDoubleClick
}) {
  const { kind, title, desc, x, y, media } = config;
  if (!options.suppressEmptyState) emptyState?.classList.add("hidden");

  const node = createCanvasNodeElement({
    kind,
    title,
    x,
    y,
    media,
    html: renderTemplate(kind, title, desc, media)
  });

  ensureNodeId(node);
  if (kind === "image-generator") {
    node.style.width = `${Number(media?.width) || 560}px`;
    node.dataset.outputWidth = String(Number(media?.outputWidth) || 1024);
    node.dataset.outputHeight = String(Number(media?.outputHeight) || 1024);
    node.dataset.generatorReferenceCount = "0";
  }
  makeDraggable(node);

  if (kind === "image") {
    const image = node.querySelector(".image-frame img");
    image?.addEventListener("load", () => onImageLoaded?.(node, image), { once: true });
    node.addEventListener("dblclick", (event) => onImageDoubleClick?.(event, node));
  }

  canvasWorld.appendChild(node);
  if (kind === "model" && media?.file) initModelViewer(node, media.file);
  if (options.select !== false) selectNode(node);
  if (kind === "image-generator" && options.openGeneratorPopover !== false) {
    requestAnimationFrame(() => {
      node.ownerDocument?.dispatchEvent(new CustomEvent("canvas:image-generator-selected", {
        detail: { node, openPopover: true, reason: "created", focusPrompt: true }
      }));
    });
  }
  return node;
}

export function createGenerationPreviewNode({
  addNode,
  title,
  desc,
  x,
  y,
  width,
  aspectRatio
}) {
  const node = addNode(buildGenerationPreviewConfig({ title, desc, x, y }));
  applyNodePreviewSize(node, { width, aspectRatio });
  return node;
}

export function replacePreviewNodeWithImage({
  previewNode,
  addNode,
  applyGeneratedContext,
  recordGenerationCreated,
  title,
  desc,
  url,
  width,
  aspectRatio,
  prompt = "",
  sourceNode = null,
  actionType = "",
  model = "",
  registerGeneratedAsset = null
}) {
  const x = parseFloat(previewNode.style.left || "0");
  const y = parseFloat(previewNode.style.top || "0");
  previewNode.remove();

  const node = addNode({
    kind: "image",
    title,
    desc,
    x,
    y,
    media: {
      url,
      name: title,
      type: "image/png"
    }
  });

  applyNodePreviewSize(node, { width, aspectRatio });
  applyGeneratedContext(node, { prompt, sourceNode, actionType, model });
  recordGenerationCreated(node, { sourceNode, actionType, model });
  const localizationPromise = localizeGeneratedImageSource(node, url);
  node._generatedImageLocalizationPromise = localizationPromise;
  const persistencePromise = persistGeneratedImageAsset({
    node,
    sourceUrl: url,
    title,
    prompt,
    model,
    registerGeneratedAsset,
    localizationPromise
  });
  if (persistencePromise) node._generatedAssetPersistencePromise = persistencePromise;
  return node;
}

function localizeGeneratedImageSource(node, sourceUrl = "") {
  const image = node?.querySelector?.(".image-frame img");
  if (!image || !sourceUrl) return Promise.resolve("");
  if (String(sourceUrl).startsWith("data:")) {
    image.dataset.localSourceReady = "true";
    return Promise.resolve(sourceUrl);
  }
  if (!isFetchableImageUrl(sourceUrl)) return Promise.resolve(sourceUrl);
  image.dataset.remoteSource = sourceUrl;
  return imageSourceToDataUrl(sourceUrl)
    .then((dataUrl) => {
      if (!dataUrl || !image.isConnected || image.dataset.remoteSource !== sourceUrl) return "";
      image.src = dataUrl;
      image.dataset.localSourceReady = "true";
      return dataUrl;
    })
    .catch((error) => {
      console.warn("[canvas] Failed to localize generated image", error);
      return "";
    });
}

async function persistGeneratedImageAsset({
  node,
  sourceUrl = "",
  title = "Generated image.png",
  prompt = "",
  model = "",
  registerGeneratedAsset,
  localizationPromise
} = {}) {
  if (typeof registerGeneratedAsset !== "function") return null;
  if (!shouldPersistGeneratedSource(sourceUrl)) return null;
  try {
    const image = node?.querySelector?.(".image-frame img");
    const localizedSource = await localizationPromise;
    const dataUrl = String(localizedSource || image?.src || "").startsWith("data:")
      ? String(localizedSource || image?.src || "")
      : "";
    if (!dataUrl) return null;
    const result = await registerGeneratedAsset({
      title,
      url: dataUrl,
      dataUrl,
      thumbnailUrl: "",
      type: "image",
      source: "generated",
      prompt,
      modelName: model,
      libraryVisible: false
    });
    const asset = result?.asset || result;
    applyPersistentGeneratedAsset(node, asset);
    return asset || null;
  } catch (error) {
    console.warn("[canvas] Failed to persist generated image asset", error);
    return null;
  }
}

function applyPersistentGeneratedAsset(node, asset = {}) {
  const url = asset?.url || asset?.thumbnailUrl || "";
  if (!url) return;
  const image = node?.querySelector?.(".image-frame img");
  if (image) {
    image.src = url;
    image.removeAttribute?.("srcset");
    delete image.dataset.remoteSource;
    image.dataset.localSourceReady = "true";
  }
  if (asset.id) node.dataset.assetId = asset.id;
  node.dataset.objectUrl = url;
  node.dataset.uploadPersisted = "true";
}

async function imageSourceToDataUrl(src) {
  let response;
  try {
    response = await fetch(src, { credentials: "include" });
  } catch (error) {
    response = await fetchProxiedImage(src, error);
  }
  if (!response?.ok && isHttpUrl(src)) {
    response = await fetchProxiedImage(src);
  }
  if (!response?.ok) throw new Error("Unable to read generated image");
  return blobToDataUrl(await response.blob());
}

async function fetchProxiedImage(src, cause = null) {
  if (!isHttpUrl(src)) {
    if (cause) throw cause;
    throw new Error("Image source cannot be proxied");
  }
  return fetch(`/api/image-proxy?url=${encodeURIComponent(src)}`, { credentials: "include" });
}

function isHttpUrl(value = "") {
  return /^https?:\/\//i.test(String(value || ""));
}

function isFetchableImageUrl(value = "") {
  const source = String(value || "");
  return isHttpUrl(source) || source.startsWith("blob:");
}

function shouldPersistGeneratedSource(value = "") {
  const source = String(value || "");
  return source.startsWith("data:") || isFetchableImageUrl(source);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read image blob"));
    reader.readAsDataURL(blob);
  });
}
