import {
  getImageNodePreviewMetrics,
  getPreviewHeight,
  readImageFilePreviewMetrics
} from "../../../canvas/upload-nodes.js";
import {
  getQwenImageSizeForDimensions,
  getQwenImageSizeForElement
} from "../../../ai/image-generator.js";

function findActiveImageNode(root = globalThis.document) {
  return root?.querySelector?.("#canvasWorld .node-image.selected[data-active-selection='true']")
    || root?.querySelector?.("#canvasWorld .node-image.selected")
    || null;
}

async function resolveGenerationMetrics(files = []) {
  const sourceNode = findActiveImageNode();
  if (sourceNode) {
    const metrics = getImageNodePreviewMetrics(sourceNode);
    return {
      ...metrics,
      sourceNode,
      outputSize: metrics.naturalWidth && metrics.naturalHeight
        ? getQwenImageSizeForDimensions(metrics.naturalWidth, metrics.naturalHeight)
        : (metrics.image ? getQwenImageSizeForElement(metrics.image) : "")
    };
  }

  const fileMetrics = await readImageFilePreviewMetrics(files[0]);
  if (fileMetrics) {
    return {
      ...fileMetrics,
      sourceNode: null,
      outputSize: getQwenImageSizeForDimensions(fileMetrics.naturalWidth, fileMetrics.naturalHeight)
    };
  }

  return {
    width: 320,
    height: 320,
    aspectRatio: "",
    sourceNode: null,
    outputSize: ""
  };
}

function getGenerationPlacement(metrics, target) {
  const width = metrics.width || 320;
  const height = metrics.height || getPreviewHeight(width, metrics.aspectRatio, width);
  if (metrics.sourceNode) {
    const sourceX = Number.parseFloat(metrics.sourceNode.style.left || "0");
    const sourceY = Number.parseFloat(metrics.sourceNode.style.top || "0");
    return {
      x: sourceX + (metrics.sourceNode.offsetWidth || width) + 48,
      y: sourceY
    };
  }
  return {
    x: target.x - width / 2,
    y: target.y - height / 2
  };
}

export function bindPromptSubmit({
  promptForm,
  promptInput,
  chatImageFilesRef,
  setChatImageFiles,
  renderChatImagePreview,
  canvasViewport,
  viewportPointToWorld,
  addThinking,
  updateThinking,
  addChat,
  updateChat,
  addChatImage,
  addGenerationPreview,
  replacePreviewWithImage,
  updateActiveProject,
  saveCurrentProject = null,
  getActiveProject,
  makeProjectTitle,
  postJsonRequest,
  buildChatImagePayload,
  readFileAsDataUrl,
  recordCanvasEvent,
  chatModelSelect,
  setChatCollapsed,
  detectGenerationKind,
  getPendingHomeGenerationFocus = () => false,
  setPendingHomeGenerationFocus = () => {},
  centerViewOnNode = () => {},
  onProjectTitleRefresh = () => {}
}) {
  const resolvedPromptForm = promptForm || globalThis.document?.querySelector("#promptForm");
  const resolvedPromptInput = promptInput || globalThis.document?.querySelector("#promptInput");
  const resolvedCanvasViewport = canvasViewport || globalThis.document?.querySelector("#canvasViewport");
  const resolvedChatModelSelect = chatModelSelect || globalThis.document?.querySelector("#chatModelSelect");
  if (!resolvedPromptForm || !resolvedPromptInput || !resolvedCanvasViewport || !resolvedChatModelSelect) {
    return;
  }

  resolvedPromptForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = resolvedPromptInput.value.trim();
    const pendingHomeFiles = Array.isArray(resolvedPromptForm.__pendingHomeGenerationFiles)
      ? resolvedPromptForm.__pendingHomeGenerationFiles
      : [];
    const currentFiles = chatImageFilesRef();
    const referenceFiles = currentFiles.length ? currentFiles : pendingHomeFiles;

    if (!prompt && !referenceFiles.length) return;

    recordCanvasEvent("prompt_submitted", {
      source: "chat-panel",
      hasPrompt: Boolean(prompt),
      imageCount: referenceFiles.length,
      model: resolvedChatModelSelect.value
    });

    setChatCollapsed(false);
    const model = resolvedChatModelSelect.value;
    const attachmentText = referenceFiles.length ? ` Attached ${referenceFiles.length} reference image(s)` : "";
    addChat("user", `${prompt || "[image reference]"} ${attachmentText}`);
    promptInput.value = "";

    const files = referenceFiles.slice();
    const generationMetrics = await resolveGenerationMetrics(files);
    resolvedPromptForm.__pendingHomeGenerationFiles = [];
    setChatImageFiles([]);
    renderChatImagePreview();

    const thinking = addThinking("Generating", [
      "Analyzing input and assembling style context",
      "Adjusting composition and prompt details",
      "Calling generation model",
      "Preparing output"
    ]);

    const progress = addChat("assistant", "Generating result...");
    progress.classList.add("loading");
    updateThinking(thinking, 1);

    const target = viewportPointToWorld(
      resolvedCanvasViewport.getBoundingClientRect().left + resolvedCanvasViewport.clientWidth / 2,
      resolvedCanvasViewport.getBoundingClientRect().top + resolvedCanvasViewport.clientHeight / 2
    );
    const placement = getGenerationPlacement(generationMetrics, target);
    const previewNode = addGenerationPreview({
      title: "Qwen Generated Image.png",
      desc: generationMetrics.sourceNode
        ? "正在根据当前图片生成结果"
        : (files.length ? "正在根据参考图生成结果" : "正在根据提示词生成结果"),
      x: placement.x,
      y: placement.y,
      width: generationMetrics.width,
      aspectRatio: generationMetrics.aspectRatio
    });

    updateThinking(thinking, 2);

    try {
      const images = await Promise.all(files.map(readFileAsDataUrl));
      updateThinking(thinking, 3);

      const result = await postJsonRequest("/api/chat", buildChatImagePayload({
        model,
        prompt,
        images,
        size: generationMetrics.outputSize
      }));
      updateChat(progress, result.text || result.message || "Generation finished.");

      if (result.imageUrl) {
        const imageNode = replacePreviewWithImage(previewNode, {
          title: "Qwen Generated Image.png",
          desc: "Generated image from your prompt.",
          url: result.imageUrl,
          width: previewNode.offsetWidth,
          aspectRatio: generationMetrics.aspectRatio || "",
          prompt,
          actionType: detectGenerationKind(prompt),
          model
        });
        if (getPendingHomeGenerationFocus()) {
          setPendingHomeGenerationFocus(false);
          centerViewOnNode(imageNode, 1);
        }
        updateActiveProject({
          title: getActiveProject()?.title || makeProjectTitle(prompt),
          prompt,
          thumbnail: result.imageUrl,
          itemCount: (getActiveProject()?.itemCount || 0) + 1
        });
        await saveCurrentProject?.();
        onProjectTitleRefresh();
        addChatImage("assistant", result.imageUrl, "Qwen Generated Image");
      }

      updateThinking(thinking, 4, true);
    } catch (error) {
      if (getPendingHomeGenerationFocus()) {
        setPendingHomeGenerationFocus(false);
      }
      previewNode.classList.add("generation-failed");
      const statusText = previewNode.querySelector(".generation-frame span");
      if (statusText) {
        statusText.textContent = "Generation failed, please try again.";
      }
      updateThinking(thinking, 0, true);
      updateChat(progress, `Generation failed: ${error.message}`);
    }
  });
}

export function bindPromptShortcuts({
  queryAll,
  promptInput,
  labelSelector = "[data-prompt]"
}) {
  queryAll(labelSelector).forEach((button) => {
    button.addEventListener("click", () => {
      promptInput.value = button.dataset.prompt;
      promptInput.focus();
    });
  });
}
