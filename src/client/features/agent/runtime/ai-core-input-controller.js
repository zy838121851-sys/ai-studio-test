export function createAICoreInputController(deps = {}) {
  const {
    addChat = () => {},
    setAICoreState = () => {},
    inferDirectorProductProfile = () => ({ name: "", type: "" }),
    getNodeTitle = () => "",
    startCanvasAICoreInsight = () => {},
    addUploadedFiles = () => [],
    readImageSourceAsDataUrl = () => null,
    readFileAsDataUrl = () => null
  } = deps;

  function sendExistingNodeToAICore(node) {
    if (!node || node.classList.contains("node-director")) return false;
    if (!node.classList.contains("node-image") && !node.classList.contains("node-model")) return false;

    const fileName = getNodeTitle(node);
    const pseudoFile = {
      name: fileName,
      type: node.classList.contains("node-image") ? "image/png" : "model/3d"
    };
    const profile = inferDirectorProductProfile(pseudoFile);

    node.dataset.productType = profile.type;
    node.dataset.productName = profile.name;
    setAICoreState("processing");
    startCanvasAICoreInsight(node, pseudoFile);
    addChat("assistant", "AI Core started analyzing this image...");
    return true;
  }

  function uploadIntoAICore(files, point) {
    setAICoreState("processing");
    const accepted = addUploadedFiles(files, point, { createDirector: false });
    if (accepted.length) {
      addChat("assistant", "AI Core is preparing material analysis...");
    }
    return accepted;
  }

  function uploadAsReference(files, point) {
    return addUploadedFiles(files, point, { createDirector: false });
  }

  async function getAICoreImageData(productNode, file) {
    const img = productNode.querySelector(".image-frame img");
    if (img?.src) return readImageSourceAsDataUrl(img.src);
    if (file instanceof Blob && file.type?.startsWith("image/")) return readFileAsDataUrl(file);
    return null;
  }

  return {
    sendExistingNodeToAICore,
    uploadIntoAICore,
    uploadAsReference,
    getAICoreImageData
  };
}
