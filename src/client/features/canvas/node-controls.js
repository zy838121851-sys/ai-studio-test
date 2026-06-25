import { createImageToolbar } from "./image-toolbar.js";
import { openImageCompareFromSelection } from "./image-compare.js";
import { getQwenImageSizeForElement } from "../ai/image-generator.js";

export function createNodeControlsManager({
  getNodeTitle,
  openImageLightbox,
  positionTextFormatToolbar,
  runImageEditCommand,
  registerImageAsset = () => Promise.resolve(null),
  removeImageAsset = () => Promise.resolve(null),
  getAssetCollections = () => [],
  createAssetCollection = () => Promise.resolve(null),
  showImageTextEditor,
  startImageCrop,
  startImageExpand = () => {},
  getSelectedNodes = () => new Set(),
  notify = (message) => window.alert(message),
  isEditingImageNode = () => false,
  isImageEditPopoverOpen = () => false,
  selectImageNode = () => {}
}) {
  const ensureResizeHandles = (node) => {
    const handleRoot = node.classList.contains("node-image-generator")
      ? node.querySelector(".image-generator-stage") || node
      : node;
    if (node.classList.contains("node-image-generator")) {
      node.querySelectorAll(":scope > .resize-handle, .image-generator-frame > .resize-handle")
        .forEach((handle) => handle.remove());
    }
    if (handleRoot.querySelector(".resize-handle")) return;
    ["nw", "ne", "sw", "se"].forEach((corner) => {
      const handle = document.createElement("span");
      handle.className = `resize-handle resize-${corner}`;
      handle.dataset.resize = corner;
      handleRoot.appendChild(handle);
    });
  };

  const ensureImageToolbar = (node) => {
    if (node.querySelector(".image-node-toolbar")) {
      ensureAssetSaveBar(node, {
        getNodeTitle,
        registerImageAsset,
        removeImageAsset,
        getAssetCollections,
        createAssetCollection
      });
      return;
    }
    const managedToolbar = createImageToolbar((action, currentToolbar, actionButton) => {
      const img = node.querySelector(".image-frame img");
      if (!img) return;
      if (action === "more") {
        currentToolbar.classList.toggle("menu-open");
        return;
      }
      currentToolbar.classList.remove("menu-open");
      if (action === "compare-images") {
        openImageCompareFromSelection({
          selectedNodes: getSelectedNodes(),
          getNodeTitle,
          notify,
          root: node.ownerDocument || document
        });
        return;
      }
      if (action === "crop") return startImageCrop(node);
      if (action === "upscale-menu") {
        setToolbarUpscaleSize(currentToolbar, currentToolbar.dataset.upscaleSize || "2k");
        currentToolbar.classList.add("mode-upscale");
        return;
      }
      if (action === "upscale-size") {
        setToolbarUpscaleSize(currentToolbar, actionButton?.dataset.upscaleSize || "2k");
        return;
      }
      if (action === "upscale-generate") {
        const targetLongEdge = currentToolbar.dataset.upscaleSize === "4k" ? 4096 : 2048;
        currentToolbar.classList.remove("mode-upscale", "menu-open");
        runImageUpscale({ node, img, targetLongEdge, runImageEditCommand });
        return;
      }
      if (action === "upscale-2k" || action === "upscale-4k") {
        const targetLongEdge = action === "upscale-4k" ? 4096 : 2048;
        runImageUpscale({ node, img, targetLongEdge, runImageEditCommand });
        return;
      }
      if (action === "remove-bg") {
        runImageEditCommand(
          node,
          [
            "Remove the entire background from the image.",
            "Keep only the main subject/object with clean, natural edges.",
            "Preserve the subject shape, colors, lighting, texture, pose, proportions, and internal details exactly.",
            "Return a transparent PNG background if alpha is supported; if not supported, use a clean pure white background.",
            "Do not add new objects, do not crop the subject, and do not change any text on the subject."
          ].join("\n"),
          "\u53bb\u9664\u80cc\u666f",
          {
            actionType: "remove_background",
            count: 1,
            outputSize: getQwenImageSizeForElement(img, { maxSize: 2048 })
          }
        );
        return;
      }
      if (action === "expand-image") {
        return startImageExpand(node);
      }
      if (action === "edit-text") {
        selectImageNode(node);
        showImageTextEditor(node);
      }
    });
    node.appendChild(managedToolbar);
    ensureAssetSaveBar(node, {
      getNodeTitle,
      registerImageAsset,
      removeImageAsset,
      getAssetCollections,
      createAssetCollection
    });
  };

  const ensureImageCornerActions = (node) => {
    if (node.querySelector(".node-download")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "node-download";
    button.title = "\u4e0b\u8f7d\u56fe\u7247";
    button.setAttribute("aria-label", "\u4e0b\u8f7d\u56fe\u7247");
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v12" />
        <path d="M7 10l5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    `;
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const img = node.querySelector(".image-frame img");
      if (!img) return;
      const link = document.createElement("a");
      link.href = img.src;
      link.download = getNodeTitle(node).replace(/^\s+/, "") || "image.png";
      link.click();
    });
    node.appendChild(button);
  };

  const ensureNodeControls = (node) => {
    const isImageNode = node.classList.contains("node-image");
    if (isImageNode) {
      ensureImageToolbar(node);
      ensureImageCornerActions(node);
    }
    if (node.classList.contains("node-image-generator")) return;
    if (node.querySelector(".node-expand")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "node-expand";
    button.title = "\u653e\u5927\u9884\u89c8";
    button.setAttribute("aria-label", "\u67e5\u770b\u56fe\u7247\u539f\u56fe");
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 4h6v6" />
        <path d="M20 4l-7 7" />
        <path d="M10 20H4v-6" />
        <path d="M4 20l7-7" />
      </svg>
    `;
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const img = node.querySelector(".image-frame img");
      if (img) {
        openImageLightbox(img.src, getNodeTitle(node));
        return;
      }
      node.classList.toggle("node-zoomed");
      if (isEditingImageNode(node) && isImageEditPopoverOpen()) positionTextFormatToolbar();
    });
    node.appendChild(button);
  };

  return {
    ensureResizeHandles,
    ensureNodeControls
  };
}

function setToolbarUpscaleSize(toolbar, size = "2k") {
  const nextSize = size === "4k" ? "4k" : "2k";
  toolbar.dataset.upscaleSize = nextSize;
  toolbar.querySelectorAll("[data-upscale-size]").forEach((button) => {
    const selected = button.dataset.upscaleSize === nextSize;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function runImageUpscale({ node, img, targetLongEdge, runImageEditCommand }) {
  const target = targetLongEdge === 4096 ? "4K" : "2K";
  runImageEditCommand(
    node,
    buildImageUpscalePrompt(targetLongEdge),
    `\u9ad8\u6e05\u5316 ${target}`,
    {
      actionType: "upscale",
      count: 1,
      outputSize: getQwenImageSizeForElement(img, { maxSize: targetLongEdge }),
      targetLongEdge
    }
  );
}

export function buildImageUpscalePrompt(targetLongEdge = 2048) {
  const target = Math.round(Number(targetLongEdge) || 0) === 4096 ? "4K" : "2K";
  return [
    `Create a genuinely sharper ${target} super-resolution version of the reference image.`,
    "Do not merely resize or interpolate pixels. Reconstruct real-looking fine detail from the source image.",
    "Remove blur, softness, compression artifacts, scaling artifacts, pixelation, and muddy texture.",
    "Restore crisp edges, local contrast, micro-texture, hair/fur/fabric/material grain, natural detail separation, and clean high-frequency detail.",
    "Keep the original composition, subject identity, silhouette, pose, layout, colors, lighting direction, camera angle, background structure, and style consistent.",
    "If the source is heavily blurred, infer plausible fine texture that matches the original image content without changing the subject or adding new objects.",
    "Do not crop, extend, replace, recolor, relight, stylize, beautify, or change any readable text."
  ].join("\n");
}

function ensureAssetSaveBar(node, {
  getNodeTitle,
  registerImageAsset,
  removeImageAsset,
  getAssetCollections,
  createAssetCollection
}) {
  if (node.querySelector(".canvas-asset-savebar")) return;
  const bar = document.createElement("div");
  bar.className = "canvas-asset-savebar";
  bar.innerHTML = `
    <button type="button" class="canvas-asset-board-select" data-canvas-asset-select aria-label="&#36873;&#25321;&#32032;&#26448;&#24211;&#39057;&#36947;">
      <span data-canvas-asset-label>&#36873;&#25321;&#20998;&#32452;</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </button>
    <button type="button" class="canvas-asset-save-submit" data-canvas-asset-save aria-label="&#25910;&#34255;" title="&#25910;&#34255;">\u2661</button>
  `;
  node.appendChild(bar);
  updateAssetSaveButtonState(node);
  bar.addEventListener("pointerdown", (event) => event.stopPropagation());
  bar.addEventListener("click", async (event) => {
    event.stopPropagation();
    const image = node.querySelector(".image-frame img");
    if (!image) return;
    const selectButton = event.target.closest("[data-canvas-asset-select]");
    if (selectButton) {
      openAssetSavePopover({
        anchor: selectButton,
        imageNode: node,
        image,
        title: getNodeTitle(node).replace(/^\s+/, "") || "Canvas image",
        registerImageAsset,
        getAssetCollections,
        createAssetCollection,
        mode: "select"
      });
      return;
    }
    if (event.target.closest("[data-canvas-asset-save]")) {
      if (node.dataset.assetSaved === "true") {
        await removeCanvasImageAsset({
          imageNode: node,
          removeImageAsset
        });
        return;
      }
      await saveCanvasImageToAsset({
        imageNode: node,
        image,
        title: getNodeTitle(node).replace(/^\s+/, "") || "Canvas image",
        registerImageAsset,
        collectionId: node.dataset.assetTargetCollectionId || "",
        collection: node.dataset.assetTargetCollectionName || ""
      });
    }
  });
}

function openAssetSavePopover({
  anchor,
  imageNode,
  image,
  title,
  registerImageAsset,
  getAssetCollections,
  createAssetCollection,
  mode = "select"
}) {
  document.querySelector(".asset-save-popover")?.remove();
  const collections = normalizeAssetCollections(getAssetCollections());
  const selectedId = imageNode.dataset.assetTargetCollectionId || "";
  const selectedName = imageNode.dataset.assetTargetCollectionName || "";
  const visibleCollections = collections.length ? collections : [];

  const popover = document.createElement("div");
  popover.className = `asset-save-popover canvas-asset-board-popover mode-${mode}`;
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", "\u4fdd\u5b58\u5230\u7d20\u6750\u5e93");
  popover.innerHTML = `
    <label class="asset-save-search">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" /><path d="M16 16l5 5" /></svg>
      <input type="search" placeholder="&#25628;&#32034;" autocomplete="off" data-asset-collection-search />
    </label>
    <div class="asset-save-list">
      ${renderCollectionSection("\u6240\u6709\u56fe\u677f", visibleCollections, selectedId, selectedName)}
    </div>
    <button type="button" class="asset-save-new-board">
      <span aria-hidden="true">+</span>
      &#21019;&#24314;&#22270;&#26495;
    </button>
  `;

  document.body.appendChild(popover);
  positionAssetSavePopover(popover, anchor);

  let teardownAssetSavePopover = () => {};
  const close = () => {
    teardownAssetSavePopover();
    popover.remove();
  };

  popover.addEventListener("pointerdown", (event) => event.stopPropagation());
  popover.addEventListener("input", (event) => {
    const input = event.target.closest("[data-asset-collection-search]");
    if (!input) return;
    const query = input.value.trim().toLowerCase();
    popover.querySelectorAll("[data-asset-collection]").forEach((item) => {
      const name = (item.dataset.assetCollection || "").toLowerCase();
      item.hidden = Boolean(query && !name.includes(query));
    });
  });
  popover.addEventListener("click", async (event) => {
    event.stopPropagation();
    const item = event.target.closest("[data-asset-collection]");
    if (item) {
      setImageNodeAssetTarget(imageNode, {
        id: item.dataset.assetCollectionId || "",
        name: item.dataset.assetCollection || ""
      });
      close();
      return;
    }
    if (event.target.closest(".asset-save-new-board")) {
      const name = window.prompt("\u65b0\u5efa\u56fe\u677f\u540d\u79f0", "");
      if (!name?.trim()) return;
      const created = await createAssetCollection(name.trim());
      setImageNodeAssetTarget(imageNode, {
        id: created?.id || "",
        name: created?.name || name.trim()
      });
      close();
      return;
    }
    if (event.target.closest(".asset-save-submit")) {
      await saveCanvasImageToAsset({
        imageNode,
        image,
        title,
        registerImageAsset,
        collectionId: imageNode.dataset.assetTargetCollectionId || "",
        collection: imageNode.dataset.assetTargetCollectionName || ""
      });
      close();
    }
  });

  const onDocumentPointerDown = (event) => {
    if (popover.contains(event.target) || anchor?.contains?.(event.target)) return;
    close();
  };
  const onKeyDown = (event) => {
    if (event.key !== "Escape") return;
    close();
  };
  teardownAssetSavePopover = () => {
    document.removeEventListener("pointerdown", onDocumentPointerDown, true);
    document.removeEventListener("keydown", onKeyDown, true);
  };
  setTimeout(() => {
    document.addEventListener("pointerdown", onDocumentPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
  }, 0);
}

function renderCollectionSection(label, collections, selectedId, selectedName) {
  if (!collections.length) return "";
  return `
    <section class="asset-save-section">
      <span>${escapeHtml(label)}</span>
      ${collections.map((collection) => {
        const selected = (selectedId && collection.id === selectedId) || (!selectedId && selectedName && collection.name === selectedName);
        return `
          <button type="button" class="${selected ? "selected" : ""}" data-asset-collection-id="${escapeAttribute(collection.id)}" data-asset-collection="${escapeAttribute(collection.name)}">
            <span class="asset-save-board-thumb" aria-hidden="true">${escapeHtml(collection.name.slice(0, 1).toUpperCase())}</span>
            <strong>${escapeHtml(collection.name)}</strong>
          </button>
        `;
      }).join("")}
    </section>
  `;
}

async function saveCanvasImageToAsset({
  imageNode,
  image,
  title,
  registerImageAsset,
  collectionId = "",
  collection = ""
}) {
  const submit = imageNode.querySelector("[data-canvas-asset-save]");
  if (submit) {
    submit.disabled = true;
    submit.classList.remove("is-saved");
    submit.textContent = "\u2661";
  }
  try {
    const persistentPayload = await buildPersistentImageAssetPayload(image);
    const asset = await registerImageAsset({
      title,
      url: persistentPayload.url,
      dataUrl: persistentPayload.dataUrl,
      thumbnailUrl: persistentPayload.dataUrl ? "" : persistentPayload.url,
      type: "image",
      source: imageNode.dataset.sourceMode === "generated" ? "generated" : "favorite",
      collection,
      collectionId,
      prompt: imageNode.dataset.generationPrompt || imageNode.dataset.editPrompt || "",
      modelName: imageNode.dataset.generationModel || imageNode.dataset.editModel || ""
    });
    if (asset?.id) imageNode.dataset.assetId = asset.id;
    imageNode.dataset.assetSaved = "true";
    if (submit) {
      submit.disabled = false;
      submit.classList.add("is-saved");
      submit.textContent = "\u2665";
    }
    return asset;
  } catch (error) {
    console.warn("[assets] Failed to save canvas image", error);
    if (submit) {
      submit.disabled = false;
      updateAssetSaveButtonState(imageNode);
    }
    return null;
  }
}

async function buildPersistentImageAssetPayload(image) {
  const src = image?.currentSrc || image?.src || "";
  if (!src || src.startsWith("data:")) {
    return { url: src, dataUrl: src };
  }
  if (!src.startsWith("blob:")) {
    return { url: src, dataUrl: "" };
  }
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    return { url: dataUrl, dataUrl };
  } catch (error) {
    console.warn("[assets] Failed to persist blob image source", error);
    return { url: src, dataUrl: "" };
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read image blob"));
    reader.readAsDataURL(blob);
  });
}

async function removeCanvasImageAsset({
  imageNode,
  removeImageAsset
}) {
  const submit = imageNode.querySelector("[data-canvas-asset-save]");
  const assetId = imageNode.dataset.assetId || "";
  if (submit) {
    submit.disabled = true;
    submit.textContent = "\u2665";
  }
  try {
    if (assetId) await removeImageAsset(assetId);
    delete imageNode.dataset.assetId;
    imageNode.dataset.assetSaved = "false";
    updateAssetSaveButtonState(imageNode);
    return true;
  } catch (error) {
    console.warn("[assets] Failed to remove canvas image asset", error);
    imageNode.dataset.assetSaved = "true";
    updateAssetSaveButtonState(imageNode);
    return false;
  } finally {
    if (submit) submit.disabled = false;
  }
}

function setImageNodeAssetTarget(imageNode, collection) {
  imageNode.dataset.assetTargetCollectionId = collection.id || "";
  imageNode.dataset.assetTargetCollectionName = collection.name || "";
  const label = imageNode.querySelector("[data-canvas-asset-label]");
  if (label) label.textContent = collection.name || "\u9009\u62e9\u5206\u7ec4";
}

function updateAssetSaveButtonState(imageNode) {
  const submit = imageNode.querySelector("[data-canvas-asset-save]");
  if (!submit) return;
  const saved = imageNode.dataset.assetSaved === "true";
  submit.classList.toggle("is-saved", saved);
  submit.textContent = saved ? "\u2665" : "\u2661";
  submit.setAttribute("aria-label", saved ? "\u53d6\u6d88\u6536\u85cf" : "\u6536\u85cf");
  submit.title = saved ? "\u53d6\u6d88\u6536\u85cf" : "\u6536\u85cf";
}

function positionAssetSavePopover(popover, anchor) {
  const rect = anchor?.getBoundingClientRect?.() || { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  const width = 340;
  const margin = 10;
  const height = popover.offsetHeight || 520;
  const preferredLeft = rect.left;
  const left = Math.max(margin, Math.min(window.innerWidth - width - margin, preferredLeft));
  const top = Math.max(margin, Math.min(window.innerHeight - height - margin, rect.bottom + 10));
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value);
}

function normalizeAssetCollections(collections = []) {
  return Array.isArray(collections)
    ? collections.filter((collection) => collection?.id || collection?.name).map((collection) => ({
      id: collection.id || "",
      name: collection.name || "Untitled board"
    }))
    : [];
}
