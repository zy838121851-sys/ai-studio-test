import {
  buildDirectorPrompt as buildDirectorPromptText,
  buildTextAssetDescription
} from "../director-workflow.js";
import {
  getQwenImageSizeForDimensions,
  getQwenImageSizeForElement
} from "../../ai/image-generator.js";
import {
  formatModelUsage,
  resolveImageModelId
} from "../../ai/model-catalog.js";
import { getImageNodePreviewMetrics } from "../../canvas/upload-nodes.js";

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
    const sourceMetrics = getImageNodePreviewMetrics(productNode, {
      minWidth: 160,
      maxWidth: Infinity
    });
    const previewNode = addGenerationPreview({
      title: `${action.title}.png`,
      desc: "正在根据当前图片生成结果",
      x: bounds.x + bounds.width + 420,
      y: bounds.y + (productNode._stackChildren?.length || 0) * 34,
      width: sourceMetrics.width,
      aspectRatio: sourceMetrics.aspectRatio
    });
    updateCorePreviewCard(options.coreWorkspace, options.coreIndex || 0, action, "loading");
    const progress = addChat("assistant", `Generating result for ${action.title}`);
    progress.classList.add("loading");

    try {
      const productImage = productNode.querySelector(".image-frame img");
      const images = productImage ? [await readImageSourceAsDataUrl(productImage.src)] : [];
      const outputSize = sourceMetrics.naturalWidth && sourceMetrics.naturalHeight
        ? getQwenImageSizeForDimensions(sourceMetrics.naturalWidth, sourceMetrics.naturalHeight)
        : (productImage ? getQwenImageSizeForElement(productImage) : "");
      const modelPrompt = buildDirectorPrompt(productNode, action);
      const model = resolveImageModelId(getChatModel(), "chat");
      const result = await postJsonRequest("/api/chat", buildChatImagePayload({
        model,
        prompt: modelPrompt,
        images,
        size: outputSize
      }));
      if (result.imageUrl) {
        const resultModel = result.requestedModel || result.model || model;
        const modelUsage = formatModelUsage(result, resultModel);
        const imageNode = replacePreviewWithImage(previewNode, {
          title: `${action.title}.png`,
          desc: `${productNode.dataset.productName || "Product"} generated`,
          url: result.imageUrl,
          width: previewNode.offsetWidth,
          aspectRatio: getGenerationAspectRatio(previewNode),
          prompt: modelPrompt,
          sourceNode: productNode,
          actionType: action.type,
          model: resultModel
        });
        addSourceBadge(imageNode, productNode);
        stackNode(productNode, imageNode);
        rememberCoreGeneratedNode(options.coreWorkspace, imageNode);
        updateCorePreviewCard(options.coreWorkspace, options.coreIndex || 0, action, "done", result.imageUrl);
        productNode.classList.add("stack-expanded");
        renderStackTray(productNode);
        addChatImage("assistant", result.imageUrl, `${action.title}\n${modelUsage}`);
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
