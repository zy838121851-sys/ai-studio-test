export function createModelViewerWorkflow({
  services = {}
} = {}) {
  const {
    initModelViewerPreview = () => null,
    hideAddNodeMenu = () => {},
    selectNode = () => {}
  } = services;

  async function initModelViewer(node, fileOrUrl) {
    try {
      const file = typeof fileOrUrl === "string"
        ? await modelUrlToFile(fileOrUrl)
        : fileOrUrl;
      if (!file) return null;
      return await initModelViewerPreview(node, file, {
        hideAddNodeMenu,
        selectNode
      });
    } catch (error) {
      const loading = node?.querySelector?.(".model-loading");
      if (loading) loading.textContent = "3D 模型预览加载失败";
      console.warn("[model-viewer] Failed to load model", error);
      return null;
    }
  }

  return {
    initModelViewer
  };
}

async function modelUrlToFile(url = "") {
  const source = String(url || "").trim();
  if (!source) return null;
  const response = await fetch(source, { credentials: "include" });
  if (!response.ok) throw new Error(`Unable to load 3D model: ${response.status}`);
  const blob = await response.blob();
  const filename = source.split("?")[0].split("#")[0].split("/").pop() || "model.glb";
  return new File([blob], filename, {
    type: blob.type || guessModelMimeType(filename)
  });
}

function guessModelMimeType(filename = "") {
  return String(filename || "").toLowerCase().endsWith(".gltf")
    ? "model/gltf+json"
    : "model/gltf-binary";
}
