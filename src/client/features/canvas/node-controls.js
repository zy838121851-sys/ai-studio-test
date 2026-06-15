import { createImageToolbar } from "./image-toolbar.js";

export function createNodeControlsManager({
  getNodeTitle,
  openImageLightbox,
  positionTextFormatToolbar,
  runImageEditCommand,
  showImageTextEditor,
  startImageCrop,
  isEditingImageNode = () => false,
  isImageEditPopoverOpen = () => false,
  selectImageNode = () => {}
}) {
  const ensureResizeHandles = (node) => {
    if (node.querySelector(".resize-handle")) return;
    ["nw", "ne", "sw", "se"].forEach((corner) => {
      const handle = document.createElement("span");
      handle.className = `resize-handle resize-${corner}`;
      handle.dataset.resize = corner;
      node.appendChild(handle);
    });
  };

  const ensureImageToolbar = (node) => {
    if (node.querySelector(".image-node-toolbar")) return;
    const managedToolbar = createImageToolbar((action, currentToolbar) => {
      const img = node.querySelector(".image-frame img");
      if (!img) return;
      if (action === "more") {
        currentToolbar.classList.toggle("menu-open");
        return;
      }
      currentToolbar.classList.remove("menu-open");
      if (action === "crop") return startImageCrop(node);
      if (action === "upscale-menu") {
        currentToolbar.classList.toggle("menu-open");
        return;
      }
      if (action === "upscale-2k" || action === "upscale-4k") {
        const target = action === "upscale-4k" ? "4K" : "2K";
        runImageEditCommand(node, `Upscale this image to ${target} resolution. Preserve composition, colors, identity, and all visible details. Reduce noise and sharpen natural texture without changing the design.`, `Upscale to ${target}`);
        return;
      }
      if (action === "remove-bg") {
        runImageEditCommand(node, "Remove image background and clean edge artifacts", "Remove background");
        return;
      }
      if (action === "expand-image") {
        runImageEditCommand(node, "Expand/crop image composition to fit surrounding context", "Expand image area");
        return;
      }
      if (action === "edit-text") {
        selectImageNode(node);
        showImageTextEditor(node);
        return;
      }
      if (action === "download") {
        const link = document.createElement("a");
        link.href = img.src;
        link.download = getNodeTitle(node).replace(/^\s+/, "") || "image.png";
        link.click();
      }
    });
    node.appendChild(managedToolbar);
    return;
  };

  const ensureNodeControls = (node) => {
    if (node.querySelector(".node-expand")) return;
    if (node.classList.contains("node-image")) ensureImageToolbar(node);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "node-expand";
    button.title = "放大预览";
    button.setAttribute("aria-label", "查看图片原图");
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 3h6v6" />
        <path d="M21 3l-7 7" />
        <path d="M9 21H3v-6" />
        <path d="M3 21l7-7" />
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
