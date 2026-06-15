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
  getActiveProject,
  makeProjectTitle,
  postJsonRequest,
  buildChatImagePayload,
  readFileAsDataUrl,
  recordCanvasEvent,
  chatModelSelect,
  setChatCollapsed,
  detectGenerationKind,
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
    const currentFiles = chatImageFilesRef();

    if (!prompt && !currentFiles.length) return;

    recordCanvasEvent("prompt_submitted", {
      source: "chat-panel",
      hasPrompt: Boolean(prompt),
      imageCount: currentFiles.length,
      model: resolvedChatModelSelect.value
    });

    setChatCollapsed(false);
    const model = resolvedChatModelSelect.value;
    const attachmentText = currentFiles.length ? ` Attached ${currentFiles.length} reference image(s)` : "";
    addChat("user", `${prompt || "[image reference]"} ${attachmentText}`);
    promptInput.value = "";

    const files = currentFiles;
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
    const previewNode = addGenerationPreview({
      title: "Qwen Generated Image.png",
      desc: prompt || "Generated visual from prompt",
      x: target.x - 160,
      y: target.y - 120,
      width: 320,
      aspectRatio: "1 / 1"
    });

    updateThinking(thinking, 2);

    try {
      const images = await Promise.all(files.map(readFileAsDataUrl));
      updateThinking(thinking, 3);

      const result = await postJsonRequest("/api/chat", buildChatImagePayload({ model, prompt, images }));
      updateChat(progress, result.text || result.message || "Generation finished.");

      if (result.imageUrl) {
        replacePreviewWithImage(previewNode, {
          title: "Qwen Generated Image.png",
          desc: "Generated image from your prompt.",
          url: result.imageUrl,
          width: previewNode.offsetWidth,
          aspectRatio: previewNode.querySelector(".image-frame")?.style.aspectRatio || "1 / 1",
          prompt,
          actionType: detectGenerationKind(prompt),
          model
        });
        updateActiveProject({
          title: getActiveProject()?.title || makeProjectTitle(prompt),
          prompt,
          thumbnail: result.imageUrl,
          itemCount: (getActiveProject()?.itemCount || 0) + 1
        });
        onProjectTitleRefresh();
        addChatImage("assistant", result.imageUrl, "Qwen Generated Image");
      }

      updateThinking(thinking, 4, true);
    } catch (error) {
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
