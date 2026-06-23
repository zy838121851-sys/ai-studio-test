const MODE_LABELS = {
  slider: "\u6ed1\u52a8\u5bf9\u6bd4",
  sideBySide: "\u5de6\u53f3\u5e76\u6392",
  overlay: "\u900f\u660e\u53e0\u52a0"
};

let activeModal = null;

export function openImageCompareModal({ before, after } = {}) {
  if (!before?.src || !after?.src) return null;
  closeImageCompareModal();

  const modal = document.createElement("section");
  modal.className = "image-compare-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "\u56fe\u7247\u5bf9\u6bd4");
  modal.dataset.mode = "slider";
  modal.dataset.position = "50";
  modal._imageCompareItems = { before, after };
  modal.innerHTML = renderImageCompareModal({ before, after });
  document.body.appendChild(modal);
  activeModal = modal;
  bindImageCompareModal(modal);
  updateSliderPosition(modal, 50);
  return modal;
}

export function closeImageCompareModal() {
  if (activeModal?._imageCompareKeydown) {
    document.removeEventListener("keydown", activeModal._imageCompareKeydown);
  }
  activeModal?.remove();
  activeModal = null;
}

function renderImageCompareModal({ before, after }) {
  return `
    <button class="image-compare-backdrop" type="button" data-image-compare-close aria-label="\u5173\u95ed\u56fe\u7247\u5bf9\u6bd4"></button>
    <div class="image-compare-card">
      <header class="image-compare-header">
        <div>
          <span>Image compare</span>
          <strong>\u56fe\u7247\u5bf9\u6bd4</strong>
        </div>
        <button class="image-compare-close" type="button" data-image-compare-close aria-label="\u5173\u95ed">×</button>
      </header>
      <nav class="image-compare-tabs" aria-label="\u5bf9\u6bd4\u6a21\u5f0f">
        ${Object.entries(MODE_LABELS).map(([mode, label]) => `
          <button type="button" class="${mode === "slider" ? "active" : ""}" data-image-compare-mode="${mode}">${label}</button>
        `).join("")}
      </nav>
      <div class="image-compare-titlebar">
        <span data-image-compare-before-title>${escapeHtml(before.title || "\u539f\u56fe")}</span>
        <button type="button" data-image-compare-swap>\u4ea4\u6362 A/B</button>
        <span data-image-compare-after-title>${escapeHtml(after.title || "\u4fee\u6539\u540e")}</span>
      </div>
      <div class="image-compare-stage" data-image-compare-stage>
        ${renderSliderMode(before, after)}
      </div>
    </div>
  `;
}

function renderSliderMode(before, after) {
  return `
    <div class="image-compare-slider" data-image-compare-slider>
      <img class="image-compare-base" src="${escapeHtml(after.src)}" alt="${escapeHtml(after.title || "\u4fee\u6539\u540e")}" draggable="false" />
      <div class="image-compare-before" data-image-compare-before>
        <img src="${escapeHtml(before.src)}" alt="${escapeHtml(before.title || "\u539f\u56fe")}" draggable="false" />
      </div>
      <div class="image-compare-divider" data-image-compare-divider>
        <span></span>
      </div>
      <input class="image-compare-range" type="range" min="0" max="100" value="50" data-image-compare-range aria-label="\u6ed1\u52a8\u5bf9\u6bd4\u4f4d\u7f6e" />
    </div>
  `;
}

function renderSideBySideMode(before, after) {
  return `
    <div class="image-compare-side-by-side">
      <figure>
        <img src="${escapeHtml(before.src)}" alt="${escapeHtml(before.title || "\u539f\u56fe")}" draggable="false" />
      </figure>
      <figure>
        <img src="${escapeHtml(after.src)}" alt="${escapeHtml(after.title || "\u4fee\u6539\u540e")}" draggable="false" />
      </figure>
    </div>
  `;
}

function renderOverlayMode(before, after) {
  return `
    <div class="image-compare-overlay">
      <img src="${escapeHtml(before.src)}" alt="${escapeHtml(before.title || "\u539f\u56fe")}" draggable="false" />
      <img class="image-compare-overlay-after" src="${escapeHtml(after.src)}" alt="${escapeHtml(after.title || "\u4fee\u6539\u540e")}" draggable="false" />
      <label>
        <span>\u4fee\u6539\u540e\u900f\u660e\u5ea6</span>
        <input type="range" min="0" max="100" value="55" data-image-compare-opacity />
      </label>
    </div>
  `;
}

function bindImageCompareModal(modal) {
  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-image-compare-close]")) {
      closeImageCompareModal();
      return;
    }
    const modeButton = event.target.closest("[data-image-compare-mode]");
    if (modeButton) {
      setCompareMode(modal, modeButton.dataset.imageCompareMode || "slider");
      return;
    }
    if (event.target.closest("[data-image-compare-swap]")) {
      swapCompareImages(modal);
    }
  });
  modal.addEventListener("input", (event) => {
    const range = event.target.closest("[data-image-compare-range]");
    if (range) updateSliderPosition(modal, Number(range.value));
    const opacity = event.target.closest("[data-image-compare-opacity]");
    if (opacity) {
      modal.querySelector(".image-compare-overlay-after")?.style.setProperty("opacity", String(Number(opacity.value) / 100));
    }
  });
  modal.addEventListener("pointerdown", (event) => {
    const stage = event.target.closest("[data-image-compare-slider]");
    if (!stage || event.target.closest("[data-image-compare-range]")) return;
    event.preventDefault();
    dragSlider(modal, event);
  });
  const onKeydown = (event) => {
    if (event.key === "Escape") closeImageCompareModal();
  };
  modal._imageCompareKeydown = onKeydown;
  document.addEventListener("keydown", onKeydown);
}

function setCompareMode(modal, mode = "slider") {
  const safeMode = Object.hasOwn(MODE_LABELS, mode) ? mode : "slider";
  modal.dataset.mode = safeMode;
  modal.querySelectorAll("[data-image-compare-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.imageCompareMode === safeMode);
  });
  renderStage(modal);
}

function swapCompareImages(modal) {
  const items = modal._imageCompareItems;
  if (!items) return;
  modal._imageCompareItems = { before: items.after, after: items.before };
  modal.querySelector("[data-image-compare-before-title]").textContent = modal._imageCompareItems.before.title || "\u539f\u56fe";
  modal.querySelector("[data-image-compare-after-title]").textContent = modal._imageCompareItems.after.title || "\u4fee\u6539\u540e";
  renderStage(modal);
}

function renderStage(modal) {
  const stage = modal.querySelector("[data-image-compare-stage]");
  const { before, after } = modal._imageCompareItems || {};
  if (!stage || !before || !after) return;
  if (modal.dataset.mode === "sideBySide") stage.innerHTML = renderSideBySideMode(before, after);
  else if (modal.dataset.mode === "overlay") stage.innerHTML = renderOverlayMode(before, after);
  else {
    stage.innerHTML = renderSliderMode(before, after);
    updateSliderPosition(modal, Number(modal.dataset.position || 50));
  }
}

function updateSliderPosition(modal, value = 50) {
  const position = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 50));
  modal.dataset.position = String(position);
  modal.querySelector("[data-image-compare-before]")?.style.setProperty("--compare-position", `${position}%`);
  modal.querySelector("[data-image-compare-divider]")?.style.setProperty("--compare-position", `${position}%`);
  const range = modal.querySelector("[data-image-compare-range]");
  if (range) range.value = String(position);
}

function dragSlider(modal, event) {
  const slider = modal.querySelector("[data-image-compare-slider]");
  if (!slider) return;
  const updateFromPointer = (pointerEvent) => {
    const rect = slider.getBoundingClientRect();
    const next = ((pointerEvent.clientX - rect.left) / Math.max(1, rect.width)) * 100;
    updateSliderPosition(modal, next);
  };
  updateFromPointer(event);
  const onMove = (pointerEvent) => updateFromPointer(pointerEvent);
  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}
