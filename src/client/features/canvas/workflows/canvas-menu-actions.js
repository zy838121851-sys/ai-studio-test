const NODE_PRESETS = {
  text: { kind: "2d", title: "文本节点", desc: "脚本、广告词、品牌文案" },
  audio: { kind: "video", title: "音频节点", desc: "音频素材、节奏和可视化参考" },
  playlist: { kind: "video", title: "播放列表", desc: "整理多个镜头、图片或视频片段" }
};

export function bindCanvasMenuActions({
  elements = {},
  state = {},
  actions = {}
} = {}) {
  const {
    imageEditPopover,
    addNodeMenu,
    canvasContextMenu,
    canvasViewport,
    assetUploadInput,
    promptInput
  } = elements;

  const {
    getAddMenuPoint = () => null,
    setAddMenuPoint = () => {},
    getContextMenuPoint = () => null,
    setPendingUploadPoint = () => {}
  } = state;

  const {
    viewportPointToWorld = () => ({ x: 0, y: 0 }),
    hideAddNodeMenu = () => {},
    hideCanvasContextMenu = () => {},
    showAddNodeMenu = () => {},
    addNode = () => {},
    addChat = () => {},
    recordCanvasEvent = () => {},
    openAssetLibrary = () => {}
  } = actions;

  imageEditPopover?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  imageEditPopover?.addEventListener("dblclick", (event) => {
    event.stopPropagation();
  });
  imageEditPopover?.addEventListener("wheel", (event) => {
    event.stopPropagation();
  }, { passive: true });

  addNodeMenu?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  addNodeMenu?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-node]");
    if (!button) return;

    const point = getAddMenuPoint() || getViewportCenterWorldPoint(canvasViewport, viewportPointToWorld);
    const type = button.dataset.addNode;
    hideAddNodeMenu();

    if (type === "upload" || type === "image" || type === "video" || type === "model") {
      setPendingUploadPoint(point);
      assetUploadInput?.click();
      return;
    }

    addNode({ ...(NODE_PRESETS[type] || NODE_PRESETS.text), x: point.x, y: point.y });
  });

  canvasContextMenu?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  canvasContextMenu?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-context-action]");
    if (!button) return;
    const action = button.dataset.contextAction;
    const point = getContextMenuPoint() || getViewportCenterWorldPoint(canvasViewport, viewportPointToWorld);
    hideCanvasContextMenu();

    if (action === "upload" || action === "asset") {
      setPendingUploadPoint(point);
      if (action === "asset") {
        openAssetLibrary();
      } else {
        assetUploadInput?.click();
      }
      return;
    }

    if (action === "node") {
      const rect = canvasViewport.getBoundingClientRect();
      showAddNodeMenu(rect.left + rect.width / 2, rect.top + rect.height / 2);
      setAddMenuPoint(point);
      return;
    }

    if (action === "tool") {
      addNode({
        kind: "2d",
        title: "辅助工具",
        desc: "用于整理素材、脚本、播放列表或工作流。",
        x: point.x,
        y: point.y
      });
      return;
    }

    if (action === "paste") {
      try {
        const text = await navigator.clipboard.readText();
        if (text && promptInput) promptInput.value = `${promptInput.value}${promptInput.value ? "\n" : ""}${text}`;
        promptInput?.focus();
      } catch {
        addChat("assistant", "浏览器没有授予剪贴板读取权限，可以用 Ctrl+V 粘贴到输入框。");
      }
      return;
    }

    if (action === "undo" || action === "redo") {
      recordCanvasEvent(action, { source: "context-menu" });
    }
    addChat("assistant", `${action === "undo" ? "撤销" : "重做"}功能已预留，下一步可以接入历史栈。`);
  });
}

function getViewportCenterWorldPoint(canvasViewport, viewportPointToWorld) {
  const rect = canvasViewport.getBoundingClientRect();
  return viewportPointToWorld(
    rect.left + canvasViewport.clientWidth / 2,
    rect.top + canvasViewport.clientHeight / 2
  );
}
