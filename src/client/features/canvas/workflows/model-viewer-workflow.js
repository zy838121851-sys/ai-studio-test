export function createModelViewerWorkflow({
  services = {}
} = {}) {
  const {
    initModelViewerPreview = () => null,
    hideAddNodeMenu = () => {},
    selectNode = () => {}
  } = services;

  function initModelViewer(node, file) {
    return initModelViewerPreview(node, file, {
      hideAddNodeMenu,
      selectNode
    });
  }

  return {
    initModelViewer
  };
}
