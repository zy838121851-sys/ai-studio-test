export function initTaskBar({
  root = document,
  handlers = {},
  elements = {},
  state = {}
} = {}) {
  if (
    !handlers || !Object.keys(handlers).length ||
    !elements || !Object.keys(elements).length
  ) return {};
  const {
    applyTransform = () => {},
    returnViewToContent = () => {},
    setChatCollapsed = () => {},
    newBlankProject = () => {},
    saveCurrentProject = () => {},
    showView = () => {},
    commitProjectTitleEdit = () => {},
    setActiveRailPanelButton = () => {},
    jumpToCenter = () => {},
    fitView = () => {},
    zoomByStep = () => {},
    positionFloatingMenu = null
  } = handlers;
  const {
    chatFloat = null,
    collapseChat = null,
    brandMenu = null,
    projectMenu = null,
    projectTitle = null,
    jumpToCenterButton = null,
    fitViewButton = null,
    zoomRange = null,
    zoomOutButton = null,
    zoomInButton = null,
    returnToContentButton = null,
    undoButton = null,
    redoButton = null,
    promptInput = null,
    promptForm = null,
    chatModelSelect = null,
    chatImageFiles = [],
    floatingLibrary = null,
    closeLibraryButton = null
  } = elements;
  const {
    getChatImageFiles = () => chatImageFiles,
    setChatImageFiles = () => {},
    renderChatImagePreview = () => {},
    addThinking = () => {},
    addChat = () => {},
    updateThinking = () => {},
    updateChat = () => {},
    addChatImage = () => {},
    addGenerationPreview = () => ({}),
    replacePreviewWithImage = () => {},
    recordCanvasEvent = () => {},
    postJson = async () => ({}),
    buildChatImagePayload = () => ({}),
    detectKind = () => "",
    makeProjectTitle = () => "",
    updateActiveProject = () => {},
    getActiveProject = () => null,
    applyFileToDataUrl = async () => "",
    viewportPointToWorld = () => ({ x: 0, y: 0 }),
    viewportRectToWorldCenter = () => ({ x: 0, y: 0 }),
    bindPromptSubmit = true,
    bindPromptPresets = true
  } = state;

  let chatFloatDrag = null;

  if (chatFloat) {
    chatFloat.addEventListener("pointerdown", (event) => {
      chatFloatDrag = {
        x: event.clientX,
        y: event.clientY,
        left: chatFloat.offsetLeft,
        top: chatFloat.offsetTop,
        moved: false
      };
      chatFloat.setPointerCapture(event.pointerId);
    });

    chatFloat.addEventListener("pointermove", (event) => {
      if (!chatFloatDrag) return;
      const dx = event.clientX - chatFloatDrag.x;
      const dy = event.clientY - chatFloatDrag.y;
      if (Math.hypot(dx, dy) > 4) chatFloatDrag.moved = true;
      chatFloat.style.left = `${chatFloatDrag.left + dx}px`;
      chatFloat.style.top = `${chatFloatDrag.top + dy}px`;
      chatFloat.style.right = "auto";
      chatFloat.style.bottom = "auto";
    });

    chatFloat.addEventListener("pointerup", (event) => {
      if (!chatFloatDrag) return;
      const moved = chatFloatDrag.moved;
      chatFloatDrag = null;
      const rect = chatFloat.getBoundingClientRect();
      const left = rect.left + rect.width / 2 < window.innerWidth / 2 ? 16 : window.innerWidth - rect.width - 16;
      const top = Math.max(16, Math.min(window.innerHeight - rect.height - 16, rect.top));
      chatFloat.style.left = `${left}px`;
      chatFloat.style.top = `${top}px`;
      chatFloat.style.right = "auto";
      chatFloat.style.bottom = "auto";
      if (!event || !moved) setChatCollapsed(false);
    });
  }

  collapseChat?.addEventListener("click", () => {
    setChatCollapsed(true);
  });

  root.querySelectorAll("[data-brand-menu]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const position = positionFloatingMenu || fallbackPositionFloatingMenu;
      position({ menu: brandMenu, trigger: button, root });
      brandMenu?.classList.toggle("open");
      projectMenu?.classList.remove("open");
    });
  });

  function fallbackPositionFloatingMenu({ menu, trigger, root: menuRoot = document }) {
    if (!menu || !trigger) return;
    menu.style.left = `${trigger.getBoundingClientRect().left}px`;
    menu.style.top = `${trigger.getBoundingClientRect().bottom + 8}px`;
  }

  root.querySelectorAll("[data-nav-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.navView;
      showView(view === "library" ? "library" : view);
    });
  });

  root.querySelectorAll("[data-new-project]").forEach((button) => {
    button.addEventListener("click", () => newBlankProject());
  });

  root.querySelectorAll("[data-save-project]").forEach((button) => {
    button.addEventListener("click", () => saveCurrentProject());
  });

  projectTitle?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      projectTitle.blur();
    }
  });

  projectTitle?.addEventListener("blur", () => {
    commitProjectTitleEdit();
  });

  root.querySelectorAll(".rail-btn[data-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveRailPanelButton(button, root);
      floatingLibrary && floatingLibrary.classList.add("open");
    });
  });

  closeLibraryButton?.addEventListener("click", () => {
    floatingLibrary?.classList.remove("open");
  });

  jumpToCenterButton?.addEventListener("click", () => {
    jumpToCenter();
  });

  fitViewButton?.addEventListener("click", () => {
    fitView();
  });

  zoomRange?.addEventListener("input", () => {
    if (zoomRange) {
      zoomByStep(zoomRange.value / 100, true);
    } else {
      applyTransform();
    }
  });

  zoomOutButton?.addEventListener("click", () => {
    zoomByStep(-0.1);
  });

  zoomInButton?.addEventListener("click", () => {
    zoomByStep(0.1);
  });

  returnToContentButton?.addEventListener("click", () => {
    returnViewToContent();
  });

  undoButton?.addEventListener("click", () => {
    recordCanvasEvent("undo", { source: "bottom-control" });
  });

  redoButton?.addEventListener("click", () => {
    recordCanvasEvent("redo", { source: "bottom-control" });
  });

  if (bindPromptSubmit) promptForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = promptInput.value.trim();
    const currentFiles = getChatImageFiles();
    if (!prompt && !(currentFiles?.length > 0)) return;

    recordCanvasEvent("prompt_submitted", {
      source: "chat-panel",
      hasPrompt: Boolean(prompt),
      imageCount: currentFiles.length,
      model: chatModelSelect?.value
    });

    setChatCollapsed(false);
    setChatCollapsed(false);
    addChat("user", `${prompt || "Analyze assets"}${currentFiles.length ? ` (${currentFiles.length} images attached)` : ""}`);
    promptInput.value = "";
    setChatImageFiles([]);
    renderChatImagePreview();

    const thinking = addThinking("Generation flow", [
      "Read prompt and references",
      "Prepare canvas preview",
      "Call image model",
      "Sync result"
    ]);
    const progress = addChat("assistant", "Processing, please wait...");
    progress.classList.add("loading");
    updateThinking(thinking, 1);

    const target = viewportRectToWorldCenter
      ? viewportRectToWorldCenter()
      : viewportPointToWorld(window.innerWidth / 2, window.innerHeight / 2);
    const previewNode = addGenerationPreview({
      title: "Qwen generated asset.png",
      desc: prompt || "Generated from prompt",
      x: target.x - 160,
      y: target.y - 120,
      width: 320,
      aspectRatio: "1 / 1"
    });

    updateThinking(thinking, 2);

    try {
      const images = await Promise.all(currentFiles.map(applyFileToDataUrl));
      updateThinking(thinking, 3);
      const result = await postJson("/api/chat", buildChatImagePayload({ model: chatModelSelect?.value, prompt, images }));
      updateChat(progress, result.text || result.message || "Generation complete.");
      if (result.imageUrl) {
        replacePreviewWithImage(previewNode, {
          title: "Qwen generated image.png",
          desc: "AI generation result",
          url: result.imageUrl,
          width: previewNode.offsetWidth,
          aspectRatio: previewNode.querySelector(".image-frame")?.style.aspectRatio || "1 / 1",
          prompt,
          actionType: detectKind(prompt),
          model: chatModelSelect?.value
        });
        updateActiveProject({
          title: getActiveProject()?.title || makeProjectTitle(prompt),
          prompt,
          thumbnail: result.imageUrl,
          itemCount: (getActiveProject()?.itemCount || 0) + 1
        });
        addChatImage("assistant", result.imageUrl, "Qwen generated image");
      }
      updateThinking(thinking, 4, true);
    } catch (error) {
      previewNode.classList.add("generation-failed");
      updateThinking(thinking, 0, true);
      updateChat(progress, `Generation failed: ${error.message}`);
    }
  });

  if (bindPromptPresets) root.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!promptInput) return;
      promptInput.value = button.dataset.prompt;
      promptInput.focus();
    });
  });

  return {
    setChatCollapsed,
    run: () => true
  };
}
