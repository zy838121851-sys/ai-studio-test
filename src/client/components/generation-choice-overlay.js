export function createGenerationChoiceOverlay({ actions = [], escapeHtml, onClose, onChoose }) {
  const overlay = document.createElement("div");
  overlay.className = "generation-choice-overlay";
  overlay.innerHTML = `
    <button class="generation-choice-close" type="button" title="关闭">×</button>
    <div class="generation-choice-stage">
      <img class="generation-choice-image" alt="上传图片预览" />
      <div class="floating-suggestions">
        ${actions.slice(0, 4).map((action, index) => `
          <button type="button" data-generate-choice="${action.type}">
            <small>${String(index + 1).padStart(2, "0")}</small>
            <span>${escapeHtml(action.title)}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
  overlay.querySelector(".generation-choice-close")?.addEventListener("click", () => onClose?.());
  overlay.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-generate-choice]");
    if (!button) return;
    button.classList.add("running");
    button.disabled = true;
    try {
      await onChoose?.(button.dataset.generateChoice);
    } finally {
      button.classList.remove("running");
      button.disabled = false;
    }
  });
  return overlay;
}

export function showGenerationChoiceOverlay({ overlay, file, point, previousState }) {
  if (previousState?.url) URL.revokeObjectURL(previousState.url);
  const url = URL.createObjectURL(file);
  const image = overlay.querySelector(".generation-choice-image");
  if (image) image.src = url;
  overlay.classList.add("open");
  return { file, point, url };
}

export function hideGenerationChoiceOverlay({ overlay, state }) {
  overlay?.classList.remove("open");
  if (state?.url) URL.revokeObjectURL(state.url);
  return null;
}
