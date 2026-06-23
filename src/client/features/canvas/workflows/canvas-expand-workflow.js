import { getQwenImageSizeForDimensions } from "../../ai/image-generator.js";

const EXPAND_MIN_MARGIN = 36;
const EXPAND_DEFAULT_RATIO = 0.18;
const EXPAND_MIN_SIZE = 96;

export function createCanvasExpandWorkflow({
  elements = {},
  services = {}
} = {}) {
  const { canvasWorld } = elements;
  const {
    centerViewOnNode = () => {},
    hideImageEditPopover = () => {},
    hideImageCropOverlay = () => {},
    hideCanvasContextMenu = () => {},
    hideAddNodeMenu = () => {},
    selectNode = () => {},
    runImageEditCommand = () => Promise.resolve(),
    getZoom = () => 1
  } = services;

  const state = {
    expandingNode: null,
    overlay: null,
    sourceRect: null,
    requestId: 0,
    confirming: false
  };

  function startImageExpand(node) {
    const img = node?.querySelector?.(".image-frame img");
    if (!img || !canvasWorld) return;
    hideImageExpandOverlay();
    const requestId = state.requestId + 1;
    state.requestId = requestId;
    hideImageCropOverlay();
    hideImageEditPopover();
    hideCanvasContextMenu();
    hideAddNodeMenu();
    selectNode(node);
    centerViewOnNode(node, 1.08);
    window.setTimeout(() => {
      if (state.requestId !== requestId || !node.isConnected) return;
      state.expandingNode = node;
      node.classList.add("expanding");
      createExpandOverlay(node);
    }, 160);
  }

  function createExpandOverlay(node) {
    const sourceRect = readImageFrameWorldRect(node);
    if (!sourceRect.width || !sourceRect.height) return;
    state.sourceRect = sourceRect;
    const margin = Math.max(EXPAND_MIN_MARGIN, Math.round(Math.min(sourceRect.width, sourceRect.height) * EXPAND_DEFAULT_RATIO));
    const box = normalizeExpandBox({
      x: sourceRect.x - margin,
      y: sourceRect.y - margin,
      width: sourceRect.width + margin * 2,
      height: sourceRect.height + margin * 2
    }, sourceRect);
    const overlay = document.createElement("div");
    overlay.className = "image-expand-box";
    overlay.innerHTML = `
      <div class="image-expand-source" aria-hidden="true"></div>
      <span class="expand-corner expand-nw"></span>
      <span class="expand-corner expand-ne"></span>
      <span class="expand-corner expand-sw"></span>
      <span class="expand-corner expand-se"></span>
      <span class="expand-edge expand-n"></span>
      <span class="expand-edge expand-s"></span>
      <span class="expand-edge expand-w"></span>
      <span class="expand-edge expand-e"></span>
      <div class="crop-actions image-expand-actions">
        <button type="button" data-expand-action="cancel">&times;</button>
        <span></span>
        <button type="button" data-expand-action="reset">&#37325;&#32622;</button>
        <button type="button" class="crop-confirm" data-expand-action="confirm">&#10003; &#30830;&#35748;&#25193;&#22270;</button>
      </div>
    `;
    overlay.addEventListener("pointerdown", handleExpandPointerDown);
    bindExpandActions(overlay);
    canvasWorld.appendChild(overlay);
    state.overlay = overlay;
    setExpandBox(box);
  }

  function bindExpandActions(overlay) {
    const actions = overlay.querySelector(".image-expand-actions");
    if (!actions) return;
    actions.addEventListener("pointerdown", stopExpandActionEvent);
    actions.addEventListener("pointerup", stopExpandActionEvent);
    actions.addEventListener("pointercancel", stopExpandActionEvent);
    actions.addEventListener("click", handleExpandActionClick);
  }

  function stopExpandActionEvent(event) {
    event.stopPropagation();
  }

  function handleExpandActionClick(event) {
    const action = event.target.closest("[data-expand-action]")?.dataset.expandAction;
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    if (action === "cancel") hideImageExpandOverlay();
    if (action === "reset") resetExpandBox();
    if (action === "confirm") confirmImageExpand();
  }

  function handleExpandPointerDown(event) {
    if (event.target.closest(".image-expand-actions")) {
      event.stopPropagation();
      return;
    }
    const handle = event.target.closest(".expand-corner, .expand-edge");
    const isBox = event.target.closest(".image-expand-box");
    if (!handle && !isBox) return;
    event.preventDefault();
    event.stopPropagation();
    const mode = handle
      ? Array.from(handle.classList).find((name) => /^expand-[nsew]{1,2}$/.test(name)).replace("expand-", "")
      : "move";
    const start = { x: event.clientX, y: event.clientY };
    const original = getExpandBox();
    const onMove = (moveEvent) => {
      const scale = getSafeZoom();
      const dx = (moveEvent.clientX - start.x) / scale;
      const dy = (moveEvent.clientY - start.y) / scale;
      setExpandBox(resizeExpandBox(original, mode, dx, dy));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  }

  function resizeExpandBox(original, mode, dx, dy) {
    const sourceRect = state.sourceRect;
    if (!sourceRect) return original;
    if (mode === "move") {
      const minX = sourceRect.x + sourceRect.width - original.width;
      const maxX = sourceRect.x;
      const minY = sourceRect.y + sourceRect.height - original.height;
      const maxY = sourceRect.y;
      return normalizeExpandBox({
        ...original,
        x: clamp(original.x + dx, minX, maxX),
        y: clamp(original.y + dy, minY, maxY)
      }, sourceRect);
    }

    let left = original.x;
    let top = original.y;
    let right = original.x + original.width;
    let bottom = original.y + original.height;
    if (mode.includes("w")) left += dx;
    if (mode.includes("e")) right += dx;
    if (mode.includes("n")) top += dy;
    if (mode.includes("s")) bottom += dy;
    return normalizeExpandBox({
      x: left,
      y: top,
      width: right - left,
      height: bottom - top
    }, sourceRect);
  }

  function setExpandBox(box) {
    const overlay = state.overlay;
    const sourceRect = state.sourceRect;
    if (!overlay || !sourceRect) return;
    const normalized = normalizeExpandBox(box, sourceRect);
    Object.assign(overlay.style, {
      left: `${normalized.x}px`,
      top: `${normalized.y}px`,
      width: `${normalized.width}px`,
      height: `${normalized.height}px`
    });
    const source = overlay.querySelector(".image-expand-source");
    if (source) {
      Object.assign(source.style, {
        left: `${sourceRect.x - normalized.x}px`,
        top: `${sourceRect.y - normalized.y}px`,
        width: `${sourceRect.width}px`,
        height: `${sourceRect.height}px`
      });
    }
  }

  function getExpandBox() {
    const overlay = state.overlay;
    if (!overlay) return { x: 0, y: 0, width: 0, height: 0 };
    return {
      x: Number.parseFloat(overlay.style.left || "0"),
      y: Number.parseFloat(overlay.style.top || "0"),
      width: overlay.offsetWidth || Number.parseFloat(overlay.style.width || "0"),
      height: overlay.offsetHeight || Number.parseFloat(overlay.style.height || "0")
    };
  }

  function resetExpandBox() {
    const node = state.expandingNode;
    if (!node) return;
    state.overlay?.remove();
    state.overlay = null;
    createExpandOverlay(node);
  }

  async function confirmImageExpand() {
    if (state.confirming) return;
    const node = state.expandingNode;
    const img = node?.querySelector?.(".image-frame img");
    const sourceRect = state.sourceRect;
    if (!node || !img?.src || !sourceRect) return;
    const requestId = state.requestId;
    const box = normalizeExpandBox(getExpandBox(), sourceRect);
    const outputSize = getQwenImageSizeForDimensions(box.width, box.height, { maxSize: 2048 });
    const expand = buildWanExpandParameters({ sourceRect, box });
    setExpandConfirming(true);
    try {
      const prompt = buildExpandPrompt({ sourceRect, box });
      hideImageExpandOverlay({ invalidate: false });
      await runImageEditCommand(node, prompt, "\u6269\u56fe", {
        actionType: "expand_image",
        count: 1,
        outputSize,
        previewWidth: box.width,
        previewAspectRatio: `${Math.round(box.width)} / ${Math.round(box.height)}`,
        outputX: box.x,
        outputY: box.y,
        expand,
        referenceImages: []
      });
    } catch (error) {
      console.warn("[image-expand] Failed to confirm image expansion", error);
      if (state.requestId === requestId) setExpandConfirming(false);
    }
  }

  function hideImageExpandOverlay({ invalidate = true } = {}) {
    if (invalidate) state.requestId += 1;
    state.overlay?.remove();
    state.expandingNode?.classList?.remove("expanding");
    state.overlay = null;
    state.expandingNode = null;
    state.sourceRect = null;
    state.confirming = false;
  }

  function setExpandConfirming(confirming) {
    state.confirming = Boolean(confirming);
    const overlay = state.overlay;
    if (!overlay) return;
    overlay.classList.toggle("is-confirming", state.confirming);
    const confirmButton = overlay.querySelector('[data-expand-action="confirm"]');
    const resetButton = overlay.querySelector('[data-expand-action="reset"]');
    if (confirmButton) {
      confirmButton.disabled = state.confirming;
      confirmButton.textContent = state.confirming ? "\u51c6\u5907\u6269\u56fe..." : "\u2713 \u786e\u8ba4\u6269\u56fe";
    }
    if (resetButton) resetButton.disabled = state.confirming;
  }

  function getSafeZoom() {
    const value = Number(getZoom());
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  function readImageFrameWorldRect(node) {
    const frame = node?.querySelector?.(".image-frame");
    if (!node || !frame) return { x: 0, y: 0, width: 0, height: 0 };
    const nodeX = Number.parseFloat(node.style.left || "0");
    const nodeY = Number.parseFloat(node.style.top || "0");
    const width = frame.offsetWidth || node.offsetWidth || 1;
    const height = frame.offsetHeight || node.offsetHeight || 1;
    return {
      x: nodeX + (frame.offsetLeft || 0),
      y: nodeY + (frame.offsetTop || 0),
      width,
      height
    };
  }

  return {
    startImageExpand,
    hideImageExpandOverlay
  };
}

function normalizeExpandBox(box, sourceRect) {
  let left = Number(box.x) || 0;
  let top = Number(box.y) || 0;
  let right = left + Math.max(EXPAND_MIN_SIZE, Number(box.width) || EXPAND_MIN_SIZE);
  let bottom = top + Math.max(EXPAND_MIN_SIZE, Number(box.height) || EXPAND_MIN_SIZE);
  const sourceRight = sourceRect.x + sourceRect.width;
  const sourceBottom = sourceRect.y + sourceRect.height;
  left = clamp(Math.min(left, sourceRect.x), sourceRect.x - sourceRect.width, sourceRect.x);
  top = clamp(Math.min(top, sourceRect.y), sourceRect.y - sourceRect.height, sourceRect.y);
  right = clamp(Math.max(right, sourceRight), sourceRight, sourceRight + sourceRect.width);
  bottom = clamp(Math.max(bottom, sourceBottom), sourceBottom, sourceBottom + sourceRect.height);
  return {
    x: left,
    y: top,
    width: Math.max(EXPAND_MIN_SIZE, right - left),
    height: Math.max(EXPAND_MIN_SIZE, bottom - top)
  };
}

function buildExpandPrompt({ sourceRect, box }) {
  const left = Math.round(sourceRect.x - box.x);
  const top = Math.round(sourceRect.y - box.y);
  const right = Math.round(box.x + box.width - sourceRect.x - sourceRect.width);
  const bottom = Math.round(box.y + box.height - sourceRect.y - sourceRect.height);
  return [
    "Expand the original image into the larger area selected by the user.",
    `The selected expansion margins are left ${left}px, right ${right}px, top ${top}px, bottom ${bottom}px.`,
    "Keep the original image content unchanged and only imagine the newly exposed outside area.",
    "Continue the same scene, lighting, perspective, depth of field, texture, and style.",
    "Do not crop, stretch, move, fade, repaint, or replace the original subject. Do not add unrelated objects."
  ].join("\n");
}

function buildWanExpandParameters({ sourceRect, box }) {
  const left = Math.max(0, sourceRect.x - box.x);
  const top = Math.max(0, sourceRect.y - box.y);
  const right = Math.max(0, box.x + box.width - sourceRect.x - sourceRect.width);
  const bottom = Math.max(0, box.y + box.height - sourceRect.y - sourceRect.height);
  return {
    leftScale: marginToWanScale(left, sourceRect.width),
    rightScale: marginToWanScale(right, sourceRect.width),
    topScale: marginToWanScale(top, sourceRect.height),
    bottomScale: marginToWanScale(bottom, sourceRect.height)
  };
}

function marginToWanScale(margin, baseSize) {
  const base = Number(baseSize);
  const value = Number(margin);
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(value) || value <= 0) return 1;
  return Math.max(1, Math.min(2, Number((1 + value / base).toFixed(3))));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
