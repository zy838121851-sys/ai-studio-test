let modelViewerModulePromise = null;

function loadModelViewerModule() {
  if (!modelViewerModulePromise) {
    modelViewerModulePromise = import("./model-viewer.js");
  }
  return modelViewerModulePromise;
}

export function initModelViewerPreview(node, file, options = {}) {
  if (!node?.querySelector?.("[data-model-viewer]") || !file) return null;
  return loadModelViewerModule().then(({ initModelViewerPreview: initPreview }) => (
    initPreview(node, file, options)
  ));
}
