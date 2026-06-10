export function ensureUploadChoiceBubbles({ appRoot }) {
  let bubbles = document.querySelector(".upload-choice-bubbles");
  if (bubbles) return bubbles;
  bubbles = document.createElement("div");
  bubbles.className = "upload-choice-bubbles";
  bubbles.innerHTML = `
    <button type="button" data-upload-mode="reference">
      <strong>鍙傝€冨浘</strong>
      <span>浠呮斁鍒扮敾甯?/span>
    </button>
    <button type="button" data-upload-mode="generate">
      <strong>鍋氱敓鎴?/strong>
      <span>璁?AI 缁х画鍒涗綔</span>
    </button>
  `;
  appRoot?.appendChild(bubbles);
  return bubbles;
}

export function showUploadChoiceBubbles({ appRoot, files, point, clientX, clientY }) {
  const bubbles = ensureUploadChoiceBubbles({ appRoot });
  const x = clientX ?? window.innerWidth / 2;
  const y = clientY ?? window.innerHeight / 2;
  const centered = clientX == null || clientY == null;
  bubbles.classList.toggle("centered", centered);
  if (!centered) {
    bubbles.style.left = `${Math.min(window.innerWidth - 620, Math.max(24, x - 300))}px`;
    bubbles.style.top = `${Math.min(window.innerHeight - 260, Math.max(24, y + 28))}px`;
  } else {
    bubbles.style.left = "";
    bubbles.style.top = "";
  }
  appRoot?.classList.add("upload-choosing");
  bubbles.classList.add("open");
  return { files: Array.from(files || []), point };
}

export function hideUploadChoiceBubbles({ appRoot }) {
  document.querySelector(".upload-choice-bubbles")?.classList.remove("open");
  appRoot?.classList.remove("upload-choosing");
}

export function setUploadChoiceHover(mode) {
  document.querySelectorAll("[data-upload-mode]").forEach((button) => {
    button.classList.toggle("drop-hover", button.dataset.uploadMode === mode);
  });
}
