import { createWorkspaceCompositionDependencyBundle } from "./workspace-composition-dependencies.js";
import { eventBus } from "../../../core/event-bus.js";
import {
  createWorkspaceCompositionDefaults,
  createWorkspaceCompositionElements
} from "./workspace-app-bootstrap-composition.js";
import { createWorkspaceChatAssetsCompositionRuntime } from "./workspace-chat-assets-composition.js?v=20260627-library-bulk-select-1";
import {
  createWorkspaceCanvasCompositionBundle
} from "./workspace-canvas-composition.js";
import {
  createWorkspaceAICoreControllerCompositionRuntime,
  createWorkspaceAICoreWorkspaceBundle,
  createWorkspaceDirectorActionCompositionRuntime
} from "./workspace-agent-composition.js";
import { createWorkspaceImageEditCompositionBundle } from "./workspace-ai-composition.js";
import { createWorkspaceProjectHomeCompositionBundle } from "./workspace-project-home-composition.js?v=20260627-library-bulk-select-1";
import {
  createWorkspaceCompositionStateBundle
} from "./workspace-state-composition.js";
import { launchWorkspaceAppComposition } from "./workspace-launch-composition.js?v=20260627-library-bulk-select-1";
export function startWorkspaceApp(documentRoot = globalThis.document) {
  if (!documentRoot) {
    throw new Error("startWorkspaceApp requires a document root");
  }
  const document = documentRoot;
  const workspaceDependencies = createWorkspaceCompositionDependencyBundle();
  const {
    ai: aiDeps,
    canvas: canvasDeps,
    lib: libDeps,
    project: projectDeps,
    ui: uiDeps
  } = workspaceDependencies;
  const {
    getLibraryViewMode,
    markGeneratedImageNode,
    recordCanvasEventToStore
  } = workspaceDependencies;
  // TODO(architecture): Keep this composition flow behavior-preserving while feature
  // runtimes continue moving toward smaller Next-ready boundaries.
  const {
    workspaceElements,
    canvasWorld,
    appRoot,
    textFormatToolbar
  } = createWorkspaceCompositionElements(document);

  const {
    state: appState,
    workspaceAppScope
  } = createWorkspaceCompositionStateBundle({ getLibraryViewMode });
  const markGeneratedNodeContext = markGeneratedImageNode;
  const recordCanvasEvent = recordCanvasEventToStore;
  let runImageEditCommand = appState.runImageEditCommand;
  let centerViewOnNode = appState.centerViewOnNode;
  let applyTransform = appState.applyTransform;
  let returnViewToContent = appState.returnViewToContent;
  let setChatCollapsed = appState.setChatCollapsed;
  let getNodeBounds = appState.getNodeBounds;
  let addNode = appState.addNode;
  let ensureResizeHandles = appState.ensureResizeHandles;
  let ensureNodeControls = appState.ensureNodeControls;
  let recordUndoAction = () => {};
  let undoLastCanvasAction = () => false;
  let redoLastCanvasAction = () => false;
  let canvasGenerationRuntime;
  let canvasInteractionRuntime;
  let canvasOperationsRuntime;
  let canvasSelectionRuntime;
  let canvasSurfaceRuntime;
  let makeDraggable = () => {};
  let renderStackTray = () => {};
  let stackNode = () => false;
  let assetRuntime;
  let chatRuntime;
  const insertAssetToCanvas = (asset, point = null) => {
    if (!asset?.url && !asset?.thumbnailUrl) return null;
    const rect = workspaceElements.canvasViewport?.getBoundingClientRect?.();
    const target = point || (
      rect && canvasInteractionRuntime?.viewportPointToWorld
        ? canvasInteractionRuntime.viewportPointToWorld(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        )
        : { x: 0, y: 0 }
    );
    const kind = asset.type === "model3d" ? "model" : (asset.type === "image" ? "image" : asset.type || "image");
    return addNode({
      kind,
      title: asset.title || "Asset",
      desc: asset.prompt || asset.collection || asset.source || "Asset library item",
      x: target.x - 160,
      y: target.y - 120,
      media: {
        url: asset.url || asset.thumbnailUrl,
        name: asset.title || "Asset",
        type: asset.mimeType || (kind === "image" ? "image/png" : "")
      }
    });
  };
  const resolveAssetUrl = ({ title = "", url = "" } = {}) => {
    if (url && !String(url).startsWith("blob:")) return url;
    const normalizedTitle = normalizeAssetLookupTitle(title);
    if (!normalizedTitle) return "";
    const assets = Array.isArray(appState.assets) ? appState.assets : [];
    const match = assets.find((asset) => {
      const assetTitle = normalizeAssetLookupTitle(asset.title || asset.name || "");
      const assetUrl = asset.url || asset.thumbnailUrl || asset.thumbnail || "";
      return assetTitle === normalizedTitle && assetUrl && !String(assetUrl).startsWith("blob:");
    });
    return match?.url || match?.thumbnailUrl || match?.thumbnail || "";
  };
  const ensureAssetsReady = () => {
    if (assetRuntime?.syncAllRemoteAssets) return assetRuntime.syncAllRemoteAssets();
    if (assetRuntime?.syncRemoteAssets) return assetRuntime.syncRemoteAssets();
    return Promise.resolve(false);
  };
  const {
    setAICoreAgentEnabled,
    positionAgentBubble,
    positionCanvasSuggestionBubble,
    setAICoreState,
    isPointInAICore,
    updateAICoreDragState
  } = createWorkspaceAICoreControllerCompositionRuntime({
    elements: workspaceElements,
    timers: {
      getAgentTimer: () => appState.aiCoreAgentTimer,
      getSuggestionTimer: () => appState.aiCoreSuggestionTimer
    },
    setEnabledState: (enabled) => {
      appState.aiCoreAgentEnabled = enabled;
    }
  });

  const projectHomeRuntime = createWorkspaceProjectHomeCompositionBundle({
    document,
    elements: workspaceElements,
    state: {
      getProjects: () => appState.projects,
      setProjects: (value) => {
        appState.projects = value;
      },
      getActiveProjectId: () => appState.activeProjectId,
      setActiveProjectIdInMemory: (value) => {
        appState.activeProjectId = value;
      },
      getLibraryTransitionDirection: () => appState.libraryTransitionDirection,
      setLibraryTransitionDirection: (value) => {
        appState.libraryTransitionDirection = value;
      },
      getLibraryViewMode: () => appState.libraryViewMode,
      getSelectedNodes: () => appState.selectedNodes,
      getSelectedNode: () => appState.selectedNode,
      setSelectedNode: (value) => {
        appState.selectedNode = value;
      },
      getAssets: () => appState.assets,
      getHomeImageFiles: () => appState.homeImageFiles,
      setHomeImageFiles: (files) => {
        appState.homeImageFiles = files;
      },
      setPendingHomeGenerationFocus: (value) => {
        appState.pendingHomeGenerationFocus = value;
      },
      setChatImageFiles: (files) => {
        appState.chatImageFiles = files;
      },
      getChatImageFiles: () => appState.chatImageFiles
    },
    canvas: {
      get addNode() { return addNode; },
      get canvasSelectionRuntime() { return canvasSelectionRuntime; },
      get canvasSurfaceRuntime() { return canvasSurfaceRuntime; },
      get canvasGenerationRuntime() { return canvasGenerationRuntime; }
    },
    services: {
      applyViewState: projectDeps.applyViewState,
      markGeneratedNodeContext,
      escapeHtml: libDeps.escapeHtmlText,
      resolveAssetUrl,
      ensureAssetsReady,
      waitFor: projectDeps.waitFor
    },
    actions: {
      recordCanvasEvent,
      get setChatCollapsed() { return setChatCollapsed; }
    }
  });

  const {
    directorActions,
    directorViewCount,
    imageEditBuildOutput
  } = createWorkspaceCompositionDefaults();

  ({
    assetRuntime,
    chatRuntime
  } = createWorkspaceChatAssetsCompositionRuntime({
    eventBus,
    elements: workspaceElements,
    state: {
      assets: appState.assets,
      getAssets: () => appState.assets,
      setAssets: (value) => {
        appState.assets = value;
      },
      getActiveProjectId: () => appState.activeProjectId,
      getProjects: () => appState.projects
    },
    services: {
      escapeHtml: libDeps.escapeHtmlText,
      insertAssetToCanvas,
      openProject: (...args) => projectHomeRuntime.openProject?.(...args),
      saveCurrentProject: (...args) => projectHomeRuntime.saveCurrentProject?.(...args)
    }
  }));

  const { runDirectorAction } = createWorkspaceDirectorActionCompositionRuntime({
    elements: workspaceElements,
    canvasWorld,
    canvas: {
      get addNode() { return addNode; },
      get renderStackTray() { return renderStackTray; },
      get stackNode() { return stackNode; },
      get getNodeBounds() { return getNodeBounds; },
      get canvasGenerationRuntime() { return canvasGenerationRuntime; }
    },
    chatRuntime,
    services: {
      findCanvasNodeById: canvasDeps.findCanvasNodeById,
      getNodeTitle: canvasDeps.getNodeTitle,
      postJsonRequest: libDeps.postJsonRequest,
      readImageSourceAsDataUrl: aiDeps.readImageSourceAsDataUrl,
      buildChatImagePayload: aiDeps.buildChatImagePayload,
      saveCurrentProjectAfterGeneration: (...args) => projectHomeRuntime.saveCurrentProjectAfterGeneration?.(...args),
      escapeHtml: libDeps.escapeHtmlText
    }
  });

  setChatCollapsed = chatRuntime.setChatCollapsed;
  ({
    canvasGenerationRuntime,
    canvasInteractionRuntime,
    canvasOperationsRuntime,
    canvasSelectionRuntime,
    canvasSurfaceRuntime,
    makeDraggable,
    renderStackTray,
    stackNode,
    ensureResizeHandles,
    ensureNodeControls,
    getNodeBounds,
    addNode,
    applyTransform,
    centerViewOnNode,
    returnViewToContent,
    recordUndoAction,
    undoLastCanvasAction,
    redoLastCanvasAction
  } = createWorkspaceCanvasCompositionBundle({
    document,
    elements: workspaceElements,
    canvasWorld,
    appRoot,
    textFormatToolbar,
    state: {
      getPan: () => appState.pan,
      setPan: (value) => {
        appState.pan = value;
      },
      getZoom: () => appState.zoom,
      setZoom: (value) => {
        appState.zoom = value;
      },
      getDefaultPan: () => ({ ...canvasDeps.DEFAULT_CANVAS_PAN }),
      getSelectedNode: () => appState.selectedNode,
      setSelectedNode: (value) => {
        appState.selectedNode = value;
      },
      getSelectedNodes: () => appState.selectedNodes,
      getCroppingImageNode: () => appState.croppingImageNode,
      setCroppingImageNode: (value) => {
        appState.croppingImageNode = value;
      },
      getCanvasDrawing: () => appState.canvasDrawing,
      setCanvasDrawing: (value) => {
        appState.canvasDrawing = value;
      },
      getSelectionDrag: () => appState.selectionDrag,
      setSelectionDrag: (value) => {
        appState.selectionDrag = value;
      },
      getActiveCanvasTool: () => appState.activeCanvasTool,
      setActiveCanvasTool: (tool) => {
        appState.activeCanvasTool = tool;
      },
      setPendingUploadPoint: (point) => {
        appState.pendingUploadPoint = point;
      },
      getNextCanvasNodeId: () => {
        appState.nodeIdSeed += 1;
        return `node-${appState.nodeIdSeed}`;
      },
      getNextGeneratedCount: () => {
        appState.generatedCount += 1;
        return appState.generatedCount;
      },
      getChatImageFiles: () => appState.chatImageFiles,
      setChatImageFiles: (files) => {
        appState.chatImageFiles = files;
      },
      setUploadDragDepth: (value) => {
        appState.uploadDragDepth = value;
      },
      setChatDragDepth: (value) => {
        appState.chatDragDepth = value;
      }
    },
    defaults: {
      directorActions,
      directorViewCount,
      imageEditBuildOutput
    },
    services: {
      ...canvasDeps,
      ...aiDeps,
      ...libDeps,
      ...uiDeps,
      renderImageTextInputs: canvasDeps.renderImageTextInputList,
      readImageSourceAsDataUrl: aiDeps.readImageSourceAsDataUrl,
      runImageEditCommand: (...args) => runImageEditCommand(...args),
      getImageEditModel: () => workspaceElements.imageEditModel?.dataset?.selectedModelId
        || workspaceElements.imageEditModel?.value,
      centerViewOnNode: (...args) => centerViewOnNode(...args),
      ensureImageLightbox: canvasDeps.ensureImageLightboxElement,
      getShapeTextTools: () => canvasDeps.SHAPE_TEXT_TOOLS,
      markGeneratedNodeContext,
      escapeHtml: libDeps.escapeHtmlText,
      addChat: (...args) => chatRuntime.addChat(...args),
      saveCurrentProject: (...args) => projectHomeRuntime.saveCurrentProject?.(...args),
      saveCurrentProjectAfterGeneration: (...args) => projectHomeRuntime.saveCurrentProjectAfterGeneration?.(...args),
      registerUploadedAsset: (...args) => assetRuntime.uploadAssetFile?.(...args),
      registerGeneratedAsset: (...args) => assetRuntime.registerGeneratedAsset?.(...args),
      registerImageAsset: (payload = {}) => assetRuntime.registerGeneratedAsset?.({
        ...payload,
        source: payload.source || "favorite",
        type: payload.type || "image",
        libraryVisible: true
      }),
      removeImageAsset: (assetId) => assetRuntime.removeAsset?.(assetId),
      getAssetCollections: () => assetRuntime.getCollections?.() || [],
      createAssetCollection: (name) => assetRuntime.createCollection?.(name)
    },
    actions: {
      recordCanvasEvent,
      runDirectorAction,
      positionAgentBubble,
      positionCanvasSuggestionBubble,
      setAICoreState,
      updateAICoreDragState
    }
  }));

  const canvasCompositionRuntime = {
    canvasGenerationRuntime,
    canvasInteractionRuntime,
    getNodeBounds,
    renderStackTray
  };
  const aiCoreWorkspaceRuntime = createWorkspaceAICoreWorkspaceBundle({
    elements: workspaceElements,
    defaults: {
      directorActions
    },
    canvasWorld,
    canvas: canvasCompositionRuntime,
    chatRuntime,
    actions: {
      setAICoreState,
      runDirectorAction
    },
    services: {
      inferDirectorProductProfile: aiDeps.inferDirectorProductProfile,
      getNodeTitle: canvasDeps.getNodeTitle,
      readImageSourceAsDataUrl: aiDeps.readImageSourceAsDataUrl,
      readFileAsDataUrl: aiDeps.readFileAsDataUrl,
      normalizeAnalysis: aiDeps.normalizeCoreAnalysis,
      postJsonRequest: libDeps.postJsonRequest,
      getChatModel: () => workspaceElements.chatModelSelect?.dataset?.selectedModelId
        || workspaceElements.chatModelSelect?.value,
      findCanvasNodeById: canvasDeps.findCanvasNodeById,
      escapeHtml: libDeps.escapeHtmlText,
      ensureCanvasNodeId: canvasDeps.ensureCanvasNodeId,
      positionBubbleAtAgent: aiDeps.positionBubbleAtAgent
    }
  });
  runImageEditCommand = createWorkspaceImageEditCompositionBundle({
    elements: workspaceElements,
    canvas: canvasCompositionRuntime,
    chatRuntime,
    services: {
      readImageSourceAsDataUrl: aiDeps.readImageSourceAsDataUrl,
      saveCurrentProjectAfterGeneration: (...args) => projectHomeRuntime.saveCurrentProjectAfterGeneration?.(...args)
    }
  });

  return launchWorkspaceAppComposition({
    workspaceAppScope,
    workspaceElements,
    constants: {
      DEFAULT_CANVAS_PAN: canvasDeps.DEFAULT_CANVAS_PAN,
      directorActions
    },
    runtimes: {
      aiCoreWorkspaceRuntime,
      assetRuntime,
      canvasGenerationRuntime,
      canvasInteractionRuntime,
      canvasOperationsRuntime,
      canvasSelectionRuntime,
      canvasSurfaceRuntime,
      chatRuntime,
      projectHomeRuntime
    },
    actions: {
      setChatCollapsed,
      applyTransform,
      returnViewToContent,
      recordUndoAction,
      undoLastCanvasAction,
      redoLastCanvasAction,
      setAICoreState,
      isPointInAICore,
      updateAICoreDragState,
      runImageEditCommand,
      runDirectorAction,
      recordCanvasEvent,
      setAICoreAgentEnabled,
      positionCanvasSuggestionBubble,
      positionAgentBubble
    },
    services: {
      positionFloatingMenu: uiDeps.positionFloatingMenu,
      setActiveRailPanelButton: canvasDeps.setActiveRailPanelButton,
      panForZoomAroundWorldPoint: canvasDeps.panForZoomAroundWorldPoint,
      fitWorldBoundsInViewport: canvasDeps.fitWorldBoundsInViewport,
      clampCanvasZoom: canvasDeps.clampCanvasZoom,
      getVisibleCanvasNodes: canvasDeps.getVisibleCanvasNodes,
      getNodeBounds,
      addNode,
      closeMenuWhenOutside: uiDeps.closeMenuWhenOutside,
      toggleToolRailCollapsed: canvasDeps.toggleToolRailCollapsed,
      setLibraryViewMode: projectDeps.setLibraryViewMode,
      postJsonRequest: libDeps.postJsonRequest,
      buildChatImagePayload: aiDeps.buildChatImagePayload,
      readFileAsDataUrl: aiDeps.readFileAsDataUrl,
      detectGenerationKind: aiDeps.detectGenerationKind,
      getPendingHomeGenerationFocus: () => appState.pendingHomeGenerationFocus,
      setPendingHomeGenerationFocus: (value) => {
        appState.pendingHomeGenerationFocus = value;
      },
      centerViewOnNode: (...args) => centerViewOnNode(...args),
      closeOpenImageToolbarMenus: canvasDeps.closeOpenImageToolbarMenus
    },
    bindings: {
      bindTaskBarInteractions: uiDeps.bindTaskBarInteractions,
      bindHomeLibraryInteractions: uiDeps.bindHomeLibraryInteractions,
      bindCanvasMenuActions: canvasDeps.bindCanvasMenuActions,
      bindFooterEvents: uiDeps.bindFooterEvents,
      bindCanvasRuntimeInfrastructure: canvasDeps.bindCanvasRuntimeInfrastructure,
      bindPromptSubmit: uiDeps.bindPromptSubmit,
      bindPromptShortcuts: uiDeps.bindPromptShortcuts
    }
  });
}

function normalizeAssetLookupTitle(value = "") {
  return String(value || "")
    .replace(/^[^\w\u4e00-\u9fff]+/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

