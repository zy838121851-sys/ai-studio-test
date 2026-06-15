export function createCanvasLightboxWorkflow({
  services = {}
} = {}) {
  const {
    ensureImageLightbox = () => null,
    hideImageLightbox = () => {},
    showImageLightbox = () => {}
  } = services;

  function ensure() {
    return ensureImageLightbox();
  }

  function open(src, title = "图片预览") {
    if (!src) return;
    showImageLightbox(ensure(), { src, title });
  }

  function close() {
    hideImageLightbox();
  }

  return {
    ensureImageLightbox: ensure,
    showImageLightbox: open,
    hideImageLightbox: close
  };
}
