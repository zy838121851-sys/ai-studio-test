export function ensureImageLightbox({ onClose }) {
  let lightbox = document.querySelector(".image-lightbox");
  if (lightbox) return lightbox;
  lightbox = document.createElement("div");
  lightbox.className = "image-lightbox";
  lightbox.innerHTML = `
    <button type="button" class="image-lightbox-close" aria-label="关闭预览">×</button>
    <figure>
      <img alt="" />
      <figcaption></figcaption>
    </figure>
  `;
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) onClose?.();
  });
  lightbox.querySelector(".image-lightbox-close")?.addEventListener("click", () => onClose?.());
  document.body.appendChild(lightbox);
  return lightbox;
}

export function showImageLightbox(lightbox, { src, title = "图片预览" }) {
  if (!lightbox || !src) return;
  const img = lightbox.querySelector("img");
  const caption = lightbox.querySelector("figcaption");
  img.src = src;
  img.alt = title;
  caption.textContent = title;
  lightbox.classList.add("open");
}

export function hideImageLightboxElement() {
  document.querySelector(".image-lightbox")?.classList.remove("open");
}
