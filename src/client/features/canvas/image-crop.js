export function createImageCropControls({ node, onPointerDown, onAction }) {
  const frame = node.querySelector(".image-frame");
  let layer = node.querySelector(".node-crop-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.className = "node-crop-layer";
    layer.innerHTML = `
      <div class="crop-box">
        <span class="crop-corner crop-nw"></span>
        <span class="crop-corner crop-ne"></span>
        <span class="crop-corner crop-sw"></span>
        <span class="crop-corner crop-se"></span>
        <span class="crop-edge crop-n"></span>
        <span class="crop-edge crop-s"></span>
        <span class="crop-edge crop-w"></span>
        <span class="crop-edge crop-e"></span>
      </div>
    `;
    layer.addEventListener("pointerdown", onPointerDown);
    frame.appendChild(layer);
  }

  let actions = node.querySelector(".crop-actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "crop-actions";
    actions.innerHTML = `
      <button type="button" data-crop-action="cancel">&times;</button>
      <span></span>
      <button type="button" data-crop-action="reset">&#22797;&#21407;</button>
      <button type="button" data-crop-ratio="free">&#23485;&#39640;&#27604;</button>
      <button type="button" class="crop-confirm" data-crop-action="confirm">&#10003; &#30830;&#35748;&#35009;&#21098;</button>
    `;
    actions.addEventListener("pointerdown", stopCropActionEvent);
    actions.addEventListener("pointerup", stopCropActionEvent);
    actions.addEventListener("pointercancel", stopCropActionEvent);
    actions.addEventListener("dblclick", stopCropActionEvent);
    actions.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const button = event.target.closest("button");
      const action = button?.dataset.cropAction;
      if (!action || button.disabled) return;
      onAction?.(action);
    });
    node.appendChild(actions);
  }
  return { frame, layer, actions, cropBox: layer.querySelector(".crop-box") };
}

function stopCropActionEvent(event) {
  event.stopPropagation();
}

export function setCropBoxForNode({ node, box, ensureControls, minSize = 80 }) {
  if (!node) return;
  const { frame, cropBox } = ensureControls(node);
  const stageWidth = frame.offsetWidth || 1;
  const stageHeight = frame.offsetHeight || 1;
  const width = Math.max(minSize, Math.min(box.width, stageWidth - box.x));
  const height = Math.max(minSize, Math.min(box.height, stageHeight - box.y));
  const x = Math.max(0, Math.min(box.x, stageWidth - width));
  const y = Math.max(0, Math.min(box.y, stageHeight - height));
  Object.assign(cropBox.style, {
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`
  });
}

export function getCropBoxForNode({ node, ensureControls }) {
  if (!node) return { x: 0, y: 0, width: 0, height: 0 };
  const { cropBox } = ensureControls(node);
  return {
    x: Number.parseFloat(cropBox.style.left || "0"),
    y: Number.parseFloat(cropBox.style.top || "0"),
    width: cropBox.offsetWidth,
    height: cropBox.offsetHeight
  };
}

export function updateCropRestoreButtonForNode(node) {
  const button = node?.querySelector('[data-crop-action="reset"]');
  if (button) button.disabled = !node.dataset.cropOriginalSrc;
}

export function removeImageCropOverlay(node) {
  if (!node) return;
  node.classList.remove("cropping");
  node.querySelector(".node-crop-layer")?.remove();
  node.querySelector(".crop-actions")?.remove();
}
