import {
  buildDirectorPrompt as buildDirectorPromptText,
  buildTextAssetDescription
} from "../director-workflow.js";

export function createDirectorActionWorkflow({
  services = {}
} = {}) {
  const {
    findCanvasNodeById = () => null,
    getNodeTitle = () => "",
    addNode = () => null,
    renderStackTray = () => {},
    stackNode = () => {},
    getNodeBounds = () => ({ x: 0, y: 0, width: 0 }),
    setChatCollapsed = () => {},
    addGenerationPreview = () => null,
    updateChat = () => {},
    addChat = () => {},
    addChatImage = () => {},
    postJsonRequest = async () => ({}),
    readImageSourceAsDataUrl = async () => "",
    buildChatImagePayload = () => ({}),
    getChatModel = () => "",
    addSourceBadge = () => {},
    replacePreviewWithImage = () => null,
    getGenerationAspectRatio = (previewNode) =>
      previewNode.querySelector(".image-frame")?.style.aspectRatio || "1 / 1",
    escapeHtml = (value = "") => String(value)
  } = services;

  function buildDirectorPrompt(productNode, action) {
    return buildDirectorPromptText({ productNode, action, getTitle: getNodeTitle });
  }

  function createTextAssetNode(productNode, action) {
    const bounds = getNodeBounds(productNode);
    const desc = buildTextAssetDescription({ productNode, action, getTitle: getNodeTitle });
    const node = addNode({
      kind: "2d",
      title: action.title,
      desc,
      x: bounds.x + bounds.width + 420,
      y: bounds.y + (productNode._stackChildren?.length || 0) * 34
    });
    stackNode(productNode, node);
    productNode.classList.add("stack-expanded");
    renderStackTray(productNode);
    addChat("assistant", `Generated material ready: ${action.title}`);
    return node;
  }

  function getCorePreviewCard(workspace, index = 0) {
    if (!workspace) return null;
    const cards = Array.from(workspace.querySelectorAll(".ai-result-preview"));
    return cards[index % Math.max(1, cards.length)] || null;
  }

  function updateCorePreviewCard(workspace, index, action, state, url = "") {
    const card = getCorePreviewCard(workspace, index);
    if (!card) return;
    card.querySelector("strong").textContent = state === "done" ? action.title : `${action.title}: generation failed`;
    const body = card.querySelector("div");
    if (state === "done" && url) {
      body.innerHTML = `<img src="${url}" alt="${escapeHtml(action.title)}" /><span>${escapeHtml(action.title)}</span>`;
      return;
    }
    body.innerHTML = `<span>${escapeHtml(action.title)}</span><p>AI is generating your result...`;
  }

  function rememberCoreGeneratedNode(workspace, node) {
    if (!workspace || !node) return;
    workspace._generatedNodes = workspace._generatedNodes || [];
    if (!workspace._generatedNodes.includes(node)) workspace._generatedNodes.push(node);
  }

  async function runDirectorAction(directorNode, action, options = {}) {
    const productNode = findCanvasNodeById(directorNode.dataset.productNodeId);
    if (!productNode) return;
    if (action.kind !== "image") {
      const node = createTextAssetNode(productNode, action);
      rememberCoreGeneratedNode(options.coreWorkspace, node);
      return node;
    }

    setChatCollapsed(false);
    const bounds = getNodeBounds(productNode);
    const previewNode = addGenerationPreview({
      title: `${action.title}.png`,
      desc: "AI-generated result ready",
      x: bounds.x + bounds.width + 420,
      y: bounds.y + (productNode._stackChildren?.length || 0) * 34,
      width: Math.max(280, Math.min(420, productNode.offsetWidth || 320)),
      aspectRatio: "1 / 1"
    });
    updateCorePreviewCard(options.coreWorkspace, options.coreIndex || 0, action, "loading");
    const progress = addChat("assistant", `Generating result for ${action.title}`);
    progress.classList.add("loading");

    try {
      const productImage = productNode.querySelector(".image-frame img");
      const images = productImage ? [await readImageSourceAsDataUrl(productImage.src)] : [];
      const modelPrompt = buildDirectorPrompt(productNode, action);
      const result = await postJsonRequest("/api/chat", buildChatImagePayload({
        model: getChatModel(),
        prompt: modelPrompt,
        images
      }));
      if (result.imageUrl) {
        const imageNode = replacePreviewWithImage(previewNode, {
          title: `${action.title}.png`,
          desc: `${productNode.dataset.productName || "Product"} generated`,
          url: result.imageUrl,
          width: previewNode.offsetWidth,
          aspectRatio: getGenerationAspectRatio(previewNode),
          prompt: modelPrompt,
          sourceNode: productNode,
          actionType: action.type,
          model: getChatModel()
        });
        addSourceBadge(imageNode, productNode);
        stackNode(productNode, imageNode);
        rememberCoreGeneratedNode(options.coreWorkspace, imageNode);
        updateCorePreviewCard(options.coreWorkspace, options.coreIndex || 0, action, "done", result.imageUrl);
        productNode.classList.add("stack-expanded");
        renderStackTray(productNode);
        addChatImage("assistant", result.imageUrl, action.title);
        return imageNode;
      } else {
        previewNode.classList.add("generation-failed");
        previewNode.querySelector(".generation-frame span").textContent = "Generation failed, please retry.";
      }
      updateChat(progress, result.message || `Failed generating image for ${action.title}`);
    } catch (error) {
      previewNode.classList.add("generation-failed");
      previewNode.querySelector(".generation-frame span").textContent = "Generation failed, please retry.";
      updateChat(progress, `Generation failed for ${action.title}: ${error.message}`);
    }
    return null;
  }

  return {
    runDirectorAction
  };
}
