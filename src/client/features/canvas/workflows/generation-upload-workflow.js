import {
  addImageFilesToPreview,
  renderChatImagePreviewList
} from "../../workspace/chat/components/chat-image-preview.js?v=20260627-chat-agent-2";
import {
  getSelectedImageReferencePreviews
} from "../../workspace/chat/workflows/prompt-reference-image-utils.js";
import {
  createGenerationChoiceOverlay,
  hideGenerationChoiceOverlay,
  showGenerationChoiceOverlay
} from "../components/generation-choice-overlay.js";
import {
  hideUploadChoiceBubbles,
  setUploadChoiceHover,
  showUploadChoiceBubbles
} from "../components/upload-choice-bubbles.js";
import {
  buildUploadedNodeConfig,
  markUploadedNode
} from "../upload-nodes.js";

export function createGenerationUploadWorkflow({
  elements = {},
  state = {},
  services = {}
} = {}) {
  const {
    appRoot = null,
    chatImagePreview = null,
    promptForm = null,
    promptInput = null,
    canvasViewport = null
  } = elements;

  const {
    getChatImageFiles = () => [],
    setChatImageFiles = () => {},
    addChat = () => {},
    resolveUploadKind = () => null,
    addNode = () => null,
    viewportPointToWorld = () => ({ x: 0, y: 0 }),
    scheduleAICoreAgent = () => {},
    recordCanvasEvent = () => {},
    getImageFilesFromList = () => [],
    runDirectorAction = () => {},
    inferDirectorProductProfile = () => ({ type: "", name: "" }),
    directorActions = [],
    createDirectorCard = () => null,
    setUploadDragDepth = () => {},
    setChatDragDepth = () => {},
    setUploadChoiceHover = () => {},
    syncCanvasTransform = () => {},
    registerUploadedAsset = () => Promise.resolve(null),
    saveCurrentProjectAfterGeneration = null,
    escapeHtml = (value = "") => String(value),
  } = services;

  let pendingUploadChoice = null;
  let generationOverlayState = null;

  promptForm?.ownerDocument?.addEventListener?.("canvas:selection-changed", () => {
    renderChatImagePreview();
  });

  function getPendingUploadChoice() {
    return pendingUploadChoice;
  }

  function setPendingUploadChoice(value) {
    pendingUploadChoice = value;
  }

  function addUploadedFile(file, index = 0, point) {
    const kind = resolveUploadKind(file);
    if (!kind) return false;

    const url = URL.createObjectURL(file);
    const rect = canvasViewport?.getBoundingClientRect?.();
    const basePoint = point || (rect ? viewportPointToWorld(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    ) : { x: 0, y: 0 });

    const node = addNode(buildUploadedNodeConfig(file, { kind, index, basePoint, url }));
    if (node) {
      markUploadedNode(node, kind);
      syncCanvasTransform();
      return node;
    }

    return false;
  }

  function addUploadedFiles(files, point, options = {}) {
    const createDirector = options.createDirector === true;
    const accepted = Array.from(files)
      .map((file, index) => ({ file, node: addUploadedFile(file, index, point) }))
      .filter((item) => item.node);

    if (accepted.length) {
      addChat("assistant", `Loaded ${accepted.length} items to workspace. You can delete with Delete.`);
      accepted.forEach((item) => {
        const kind = resolveUploadKind(item.file);
        if (createDirector && (kind === "image" || kind === "model")) {
          createDirectorCard(item.node, item.file);
        }
        recordCanvasEvent("upload", {
          nodeId: item.node.dataset.nodeId,
          kind,
          name: item.file.name
        });
        persistUploadedAssetForNode(item.node, item.file, kind);
        if (kind === "image") scheduleAICoreAgent("upload_pause", item.node, 5000);
      });
    }

    return accepted;
  }

  function persistUploadedAssetForNode(node, file, kind) {
    if (!node || !file) return null;
    node.dataset.uploadPending = "true";
    const transientUrl = node.dataset.objectUrl || node.querySelector?.(".image-frame img")?.src || "";
    const promise = Promise.resolve(registerUploadedAsset(file, {
      type: kind === "model" ? "model3d" : kind,
      title: file.name,
      source: "upload"
    }))
      .then((result) => {
        const asset = result?.asset || result || null;
        applyPersistentAssetToNode(node, asset, transientUrl);
        if (asset?.url && node.isConnected) {
          saveCurrentProjectAfterGeneration?.();
        }
        return asset;
      })
      .catch((error) => {
        console.warn("[canvas] Failed to persist uploaded asset", error);
        return null;
      })
      .finally(() => {
        if (node._uploadPersistencePromise === promise) delete node._uploadPersistencePromise;
        delete node.dataset.uploadPending;
      });
    node._uploadPersistencePromise = promise;
    return promise;
  }

  function applyPersistentAssetToNode(node, asset, transientUrl = "") {
    const persistentUrl = asset?.url || asset?.thumbnailUrl || asset?.thumbnail || "";
    if (!node || !persistentUrl || String(persistentUrl).startsWith("blob:")) return;
    const image = node.querySelector?.(".image-frame img");
    const video = node.querySelector?.("video");
    node.dataset.objectUrl = persistentUrl;
    node.dataset.assetId = asset?.id || "";
    node.dataset.uploadPersisted = "true";
    if (image) {
      image.src = persistentUrl;
      image.removeAttribute("srcset");
    }
    if (video) video.src = persistentUrl;
    if (
      transientUrl
      && String(transientUrl).startsWith("blob:")
      && typeof URL !== "undefined"
      && typeof URL.revokeObjectURL === "function"
    ) {
      URL.revokeObjectURL(transientUrl);
    }
  }

  function renderChatImagePreview() {
    renderChatImagePreviewList({
      container: chatImagePreview,
      files: getChatImageFiles(),
      canvasReferences: getSelectedImageReferencePreviews(chatImagePreview?.ownerDocument || globalThis.document),
      escapeHtml,
      onRemove: (index) => {
        const chatImageFiles = getChatImageFiles();
        chatImageFiles.splice(index, 1);
        renderChatImagePreview();
      }
    });
  }

  function addChatImageFiles(files) {
    return addImageFilesToPreview({
      incomingFiles: files,
      currentFiles: getChatImageFiles(),
    getImageFiles: getImageFilesFromList,
    render: renderChatImagePreview,
    promptForm,
    promptInput,
    resetDragDepth: () => setChatDragDepth(0)
  });
}

  function showUploadModeBubbles(files, point, clientX, clientY) {
    const images = getImageFilesFromList(files);
    if (files.length && !images.length) {
      addUploadedFiles(files, point);
      return;
    }
    pendingUploadChoice = showUploadChoiceBubbles({ appRoot, files, point, clientX, clientY });
  }

  function hideUploadModeBubbles() {
    hideUploadChoiceBubbles({ appRoot });
    setUploadDragDepth(0);
    pendingUploadChoice = null;
  }

  function setUploadModeHoverMode(mode) {
    setUploadChoiceHover(mode);
  }

  function chooseUploadMode(mode) {
    if (!pendingUploadChoice) return;
    const { files, point } = pendingUploadChoice;
    pendingUploadChoice = null;
    hideUploadModeBubbles();
    setUploadChoiceHoverMode(null);
    if (mode === "reference") {
      addUploadedFiles(files, point, { createDirector: false });
      return;
    }
    showGenerationOverlay(files, point);
  }

  function ensureGenerationOverlay() {
    let overlay = document.querySelector(".generation-choice-overlay");
    if (overlay) return overlay;
    overlay = createGenerationChoiceOverlay({
      actions: directorActions,
      escapeHtml,
      onClose: hideGenerationOverlay,
      onChoose: async (type) => {
        if (!generationOverlayState) return;
        const action = directorActions.find((item) => item.type === type);
        if (action) await uploadAndGenerateFromOverlay(action);
      }
    });
    appRoot.appendChild(overlay);
    return overlay;
  }

  function showGenerationOverlay(files, point) {
    const [file] = getImageFilesFromList(files);
    if (!file) return;
    const overlay = ensureGenerationOverlay();
    generationOverlayState = showGenerationChoiceOverlay({
      overlay,
      file,
      point,
      previousState: generationOverlayState
    });
  }

  function hideGenerationOverlay() {
    const overlay = document.querySelector(".generation-choice-overlay");
    generationOverlayState = hideGenerationChoiceOverlay({ overlay, state: generationOverlayState });
  }

  async function uploadAndGenerateFromOverlay(action) {
    const state = generationOverlayState;
    if (!state) return;

    const [accepted] = addUploadedFiles([state.file], state.point, { createDirector: false });
    if (!accepted?.node) return;

    const profile = inferDirectorProductProfile(state.file);
    accepted.node.dataset.productType = profile.type;
    accepted.node.dataset.productName = profile.name;
    hideGenerationOverlay();
    await runDirectorAction({ dataset: { productNodeId: accepted.node.dataset.nodeId } }, action);
  }

  return {
    addUploadedFile,
    addUploadedFiles,
    renderChatImagePreview,
    addChatImageFiles,
    showUploadModeBubbles,
    hideUploadModeBubbles,
    setUploadModeHover: setUploadModeHoverMode,
    chooseUploadMode,
    ensureGenerationOverlay,
    showGenerationOverlay,
    hideGenerationOverlay,
    uploadAndGenerateFromOverlay,
    getPendingUploadChoice,
    setPendingUploadChoice
  };
}
