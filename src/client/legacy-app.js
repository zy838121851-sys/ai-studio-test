import { postJson as postJsonRequest } from "./ai/api-client.js";
import {
  executeImageEditAction,
  positionImageEditPopover as positionImageEditPopoverElement
} from "./ai/image-edit-actions.js";
import {
  buildImageTextEditPrompt,
  createImageTextPanel,
  getImageTextEdits,
  positionImageTextPanel as positionImageTextPanelElement,
  renderImageTextInputs as renderImageTextInputList
} from "./canvas/image-text-panel.js";
import {
  createImageCropControls,
  getCropBoxForNode,
  removeImageCropOverlay,
  setCropBoxForNode,
  updateCropRestoreButtonForNode
} from "./canvas/image-crop.js";
import {
  closeOpenImageToolbarMenus,
  createImageToolbar
} from "./canvas/image-toolbar.js";
import {
  ensureImageLightbox as ensureImageLightboxElement,
  hideImageLightboxElement,
  showImageLightbox as showImageLightboxElement
} from "./canvas/image-lightbox.js";
// TODO(architecture): This file is the compatibility layer for existing UI behavior.
// Move remaining feature logic into /canvas, /agent, /ai, /components, or /utils before adding new workflows.
import {
  getElementWorldBounds,
  getNodeScreenRectFromWorld,
  rectsIntersect,
  viewportCenterToWorldPoint,
  viewportPointToWorldPoint
} from "./canvas/canvas-geometry.js";
import {
  getCanvasEventStore,
  recordCanvasEvent as recordCanvasEventToStore
} from "./canvas/canvas-events.js";
import {
  DEFAULT_CANVAS_PAN,
  DEFAULT_CANVAS_ZOOM,
  MAX_CANVAS_ZOOM as CANVAS_MAX_ZOOM,
  MIN_CANVAS_ZOOM as CANVAS_MIN_ZOOM,
  centerPanOnWorldPoint,
  clampCanvasZoom,
  fitWorldBoundsInViewport,
  getCanvasTransformStyle,
  panForZoomAroundWorldPoint,
  syncZoomControls
} from "./canvas/canvas-viewport.js";
import {
  buildLinearSvg,
  buildPointsPath,
  hslToHexColor,
  isFixedStrokeToolName,
  isLinearDrawToolName
} from "./canvas/drawing-tools.js";
import {
  applyTextEditorStyle,
  focusTextEditorAtEnd,
  getTextEditorFromNode,
  hasTextNodeInSet,
  hideTextToolbar,
  positionTextToolbar,
  rgbToHexColor,
  setTextNodeEditingState
} from "./canvas/text-tool.js";
import {
  createDrawingPreviewElement,
  createDrawingState,
  createShapeFormatToolbarElement,
  getActiveShapeNode as getActiveShapeNodeFromSelection,
  getShapeToolbarColorTarget,
  getShapeToolbarNode,
  hasShapeNodeInSet,
  hideShapeToolbar,
  positionShapeToolbar,
  syncShapeSvgStyles,
  updateDrawingPreviewElement
} from "./canvas/shape-tool.js";
import { initModelViewerPreview } from "./canvas/model-viewer.js";
import {
  buildUploadedNodeConfig,
  markUploadedNode
} from "./canvas/upload-nodes.js";
import {
  findCanvasNodeById,
  getNodeThumbnail,
  getNodeTitle,
  getVisibleCanvasNodes
} from "./canvas/node-query.js";
import { ensureCanvasNodeId } from "./canvas/node-identity.js";
import {
  getSelectedNodeDeletePayload,
  removeCanvasNodeDeep
} from "./canvas/node-removal.js";
import {
  applySelectionBoxRect,
  createSelectionBoxElement,
  getWorldSelectionArea,
  getSelectionBoxRect
} from "./canvas/selection-box.js";
import {
  addSelectedNodeElement,
  clearSelectedNodeElements,
  replaceSelectedNodeElements
} from "./canvas/canvas-selection.js";
import { renderToolSvg } from "./canvas/node-icons.js";
import { renderNodeTemplate } from "./canvas/node-template.js";
import {
  createGenerationPreviewNode,
  createWorkspaceNode,
  replacePreviewNodeWithImage
} from "./canvas/node-creation.js";
import { addSourceBadgeElement } from "./canvas/source-badge.js";
import {
  getActiveProjectId,
  getActiveProjectRecord,
  getLibraryViewMode,
  hasDemoProjectsSeeded,
  markDemoProjectsSeeded,
  createProjectRecord,
  formatProjectDate as formatStoredProjectDate,
  makeProjectTitle as createProjectTitleFromPrompt,
  loadProjectsFromStorage,
  patchProjectRecord,
  saveProjectsToStorage,
  setActiveProjectId,
  setLibraryViewMode
} from "./core/project-store.js";
import {
  getLibraryTransitionDirection,
  getProjectDisplayPrompt as getStoredProjectDisplayPrompt,
  getProjectDisplayTitle as getStoredProjectDisplayTitle,
  getProjectPreview as getStoredProjectPreview,
  wrapProjectIndex
} from "./core/project-library-state.js";
import {
  buildDemoProjects,
  makeDemoProjectThumb as makeDemoThumb
} from "./core/demo-projects.js";
import { createProjectRuntime } from "./core/project-runtime.js";
import { createProjectSavePatch } from "./core/project-snapshot.js";
import { applyViewState } from "./core/view-router.js";
import {
  readFileAsDataUrl as readFileAsDataUrl,
  getImageFiles as getImageFilesFromList,
  getUploadKind as resolveUploadKind,
  imageSourceToDataUrl as readImageSourceAsDataUrl
} from "./utils/file.js";
import { wait as waitFor } from "./utils/async.js";
import {
  compactText as compactInlineText,
  escapeHtml as escapeHtmlText
} from "./utils/text.js";
import {
  isPromptBasedNode,
  markGeneratedImageNode
} from "./ai/generation-nodes.js";
import {
  buildChatImagePayload,
  detectGenerationKind,
  getDefaultReferencePrompt
} from "./ai/prompt-builder.js";
import {
  buildPromptGenerationNodeConfig,
  getQwenImageSizeForElement
} from "./ai/image-generator.js";
import {
  applyProjectLibraryClasses,
  renderHomeHistoryContent,
  renderProjectLibraryContent,
  showProjectSaveStatus
} from "./components/project-library.js";
import {
  appendChatImage,
  appendChatMessage,
  appendThinkingMessage,
  updateChatMessage,
  updateThinkingMessage
} from "./components/chat-log.js";
import {
  addImageFilesToPreview,
  renderChatImagePreviewList
} from "./components/chat-image-preview.js";
import {
  createGenerationChoiceOverlay,
  hideGenerationChoiceOverlay,
  showGenerationChoiceOverlay
} from "./components/generation-choice-overlay.js";
import {
  applyHomeFileState,
  renderHomeFilePreview as renderHomeFilePreviewList,
  syncHomeModelPicker as syncHomeModelPickerView
} from "./components/home-composer.js";
import { renderAssetLibrary } from "./components/asset-panel.js";
import { bindHomeLibraryInteractions } from "./components/home-library-interactions.js";
import {
  bindAICoreWorkspaceElement,
  createAICoreWorkspaceElement
} from "./components/ai-core-workspace-panel.js";
import {
  closeMenuWhenOutside,
  positionFloatingMenu
} from "./components/menu-position.js";
import {
  setActiveRailButton,
  setActiveRailPanelButton,
  toggleToolRailCollapsed
} from "./components/canvas-toolbar.js";
import {
  createCanvasStateSnapshot,
  createNodeSnapshot
} from "./agent/canvas-state.js";
import { normalizeAgentEventType } from "./agent/agent-events.js";
import {
  applyAgentEnabledState,
  applyAgentState,
  clearAgentBubbles,
  positionBubbleAtAgent,
  positionBubbleAtNode,
  typeAgentText as runAgentTypewriter
} from "./agent/agent-ui.js";
import {
  compactAnalysisForAgent as compactAgentAnalysis,
  getIndustryActionPreset as getAgentIndustryActionPreset,
  improveRecommendedActions as improveAgentRecommendedActions,
  isWeakAction as isWeakAgentAction,
  normalizeAgentSuggestion
} from "./agent/agent-recommendations.js";
import {
  ensureAgentNodeContext,
  scheduleAgentRun
} from "./agent/agent-scheduler.js";
import {
  buildDirectorPrompt as buildDirectorPromptText,
  buildTextAssetDescription,
  getDirectorActionWindow,
  inferProductProfile as inferDirectorProductProfile
} from "./agent/director-workflow.js";
import {
  getRecentSuggestionEvents as getRecentAgentSuggestionEvents,
  pickCachedActionForSuggestion as pickAgentCachedActionForSuggestion,
  readNodeJson as readAgentNodeJson
} from "./agent/agent-state-utils.js";
import {
  buildAlternativeCoreSuggestions,
  getAllDecisionStyles,
  getFallbackCoreActions,
  normalizeAnalysis as normalizeCoreAnalysis,
  normalizeDecisionStyles,
  renderCoreActionButtons,
  updateCoreWorkspaceCards
} from "./agent/ai-core-workspace.js";

const assets = [
  { id: "landing", type: "2d", title: "AI 发布页", desc: "首屏、卖点、CTA" },
  { id: "dashboard", type: "2d", title: "数据面板", desc: "卡片、图表、导航" },
  { id: "brand", type: "2d", title: "品牌组件", desc: "色板、按钮、字体" },
  { id: "device", type: "3d", title: "玻璃设备", desc: "旋转产品模型" },
  { id: "stage", type: "3d", title: "空间展台", desc: "发布会展示场景" },
  { id: "reel", type: "video", title: "15s 分镜", desc: "镜头、字幕、节奏" },
  { id: "motion", type: "video", title: "动效预览", desc: "关键帧、转场" }
];

assets.length = 0;
assets.push(
  { id: "landing", type: "2d", title: "AI 发布页", desc: "首屏、卖点、CTA" },
  { id: "dashboard", type: "2d", title: "数据面板", desc: "卡片、图表、导航" },
  { id: "brand", type: "2d", title: "品牌组件", desc: "色板、按钮、字体" },
  { id: "device", type: "3d", title: "玻璃设备", desc: "旋转产品模型" },
  { id: "stage", type: "3d", title: "空间展台", desc: "发布会展示场景" },
  { id: "reel", type: "video", title: "15s 分镜", desc: "镜头、字幕、节奏" },
  { id: "motion", type: "video", title: "动效预览", desc: "关键帧、转场" }
);

const homeView = document.querySelector("#homeView");
const projectLibraryView = document.querySelector("#projectLibraryView");
const profileView = document.querySelector("#profileView");
const assetsPageView = document.querySelector("#assetsPageView");
const homePromptForm = document.querySelector("#homePromptForm");
const homePromptInput = document.querySelector("#homePromptInput");
const homeModelSelect = document.querySelector("#homeModelSelect");
const homeUploadButton = document.querySelector("#homeUploadButton");
const homeFileInput = document.querySelector("#homeFileInput");
const homeFilePreview = document.querySelector("#homeFilePreview");
const homeModelPicker = document.querySelector("#homeModelPicker");
const homeModelButton = document.querySelector("#homeModelButton");
const homeModelMenu = document.querySelector("#homeModelMenu");
const homeHistory = document.querySelector("#homeHistory");
const projectGrid = document.querySelector("#projectGrid");
const projectTitle = document.querySelector("#projectTitle");
const projectSaveStatus = document.querySelector("#projectSaveStatus");
const canvasViewport = document.querySelector("#canvasViewport");
const canvasWorld = document.querySelector("#canvasWorld");
const appRoot = document.querySelector(".app");
const emptyState = document.querySelector("#emptyState");
const floatingLibrary = document.querySelector("#floatingLibrary");
const assetList = document.querySelector("#assetList");
const chatLog = document.querySelector("#chatLog");
const chatPanel = document.querySelector("#chatPanel");
const chatFloat = document.querySelector("#chatFloat");
const collapseChat = document.querySelector("#collapseChat");
const promptForm = document.querySelector("#promptForm");
const promptInput = document.querySelector("#promptInput");
const zoomRange = document.querySelector("#zoomRange");
const zoomText = document.querySelector("#zoomText");
const zoomOutButton = document.querySelector("#zoomOutButton");
const zoomInButton = document.querySelector("#zoomInButton");
const returnToContentButton = document.querySelector("#returnToContentButton");
const undoButton = document.querySelector("#undoButton");
const redoButton = document.querySelector("#redoButton");
const projectMenuTrigger = document.querySelector("#projectMenuTrigger");
const projectMenu = document.querySelector("#projectMenu");
const brandMenu = document.querySelector("#brandMenu");
const toolRail = document.querySelector("#toolRail");
const toggleToolRail = document.querySelector("#toggleToolRail");
const uploadAsset = document.querySelector("#uploadAsset");
const assetUploadInput = document.querySelector("#assetUploadInput");
const addNodeMenu = document.querySelector("#addNodeMenu");
const canvasContextMenu = document.querySelector("#canvasContextMenu");
const imageEditPopover = document.querySelector("#imageEditPopover");
const editImageThumb = document.querySelector("#editImageThumb");
const imageEditPrompt = document.querySelector("#imageEditPrompt");
const imageEditModel = document.querySelector("#imageEditModel");
const imageEditCancel = document.querySelector("#imageEditCancel");
const imageEditSubmit = document.querySelector("#imageEditSubmit");
const textFormatToolbar = document.querySelector("#textFormatToolbar");
const textFontFamily = document.querySelector("#textFontFamily");
const textFontWeight = document.querySelector("#textFontWeight");
const textFontSize = document.querySelector("#textFontSize");
const textColorInput = document.querySelector("#textColorInput");
const chatUploadImage = document.querySelector("#chatUploadImage");
const chatImageInput = document.querySelector("#chatImageInput");
const chatImagePreview = document.querySelector("#chatImagePreview");
const chatModelSelect = document.querySelector("#chatModelSelect");
const presetSkill = document.querySelector("#presetSkill");
const aiCore = document.querySelector("#aiCore");
const aiCoreHint = document.querySelector("#aiCoreHint");

let zoom = DEFAULT_CANVAS_ZOOM;
let pan = { ...DEFAULT_CANVAS_PAN };
let isPanning = false;
let panStart = { x: 0, y: 0 };
let generatedCount = 0;
let selectedNode = null;
const selectedNodes = new Set();
let pendingUploadPoint = null;
let addMenuPoint = null;
let contextMenuPoint = null;
let editingImageNode = null;
let textEditingImageNode = null;
let chatImageFiles = [];
let homeImageFiles = [];
let chatDragDepth = 0;
let chatFloatDrag = null;
let selectionDrag = null;
let activeCanvasTool = "";
let canvasDrawing = null;
let eraserDrag = null;
let activeStackTarget = null;
let nodeIdSeed = 0;
let pendingUploadChoice = null;
let generationOverlayState = null;
let uploadDragDepth = 0;
let croppingImageNode = null;
let aiCoreDrag = null;
let aiCoreSuppressClick = false;
let aiCoreAgentEnabled = false;
let aiCoreAgentTimer = null;
let aiCoreAgentReason = "";
let aiCoreAgentTargetId = "";
let aiCoreSuggestionTimer = null;
let libraryWheelLock = false;
let libraryTransitionDirection = 0;
const canvasEvents = getCanvasEventStore();
const SHAPE_TEXT_TOOLS = new Set(["text-rect", "text-circle", "speech", "left-arrow", "right-arrow"]);
let projects = loadProjectsFromStorage();
let activeProjectId = getActiveProjectId();
let libraryViewMode = getLibraryViewMode();
let projectRuntime = null;
ensureDemoProjects();
if (!activeProjectId && projects[0]) {
  activeProjectId = projects[0].id;
  setActiveProjectId(activeProjectId);
}
projectRuntime = createProjectRuntime({
  projects,
  activeProjectId,
  onChange({ projects: nextProjects, activeProjectId: nextActiveProjectId, activeProject }) {
    projects = nextProjects;
    activeProjectId = nextActiveProjectId;
    updateProjectTitle(activeProject);
    renderProjectLibrary();
    renderHomeHistory();
  }
});

document.body.dataset.theme = "light";
localStorage.removeItem("design-ai-theme");
aiCore.classList.add("agent-disabled", "agent-idle");
aiCoreHint.textContent = "点击启用 AI Core";



function ensureDemoProjects() {
  const nextProjects = buildDemoProjects({
    projects,
    escapeHtml: escapeHtmlText,
    hasSeeded: hasDemoProjectsSeeded,
    markSeeded: markDemoProjectsSeeded
  });
  if (nextProjects === projects) return;
  projects = nextProjects;
  saveProjectsToStorage(projects);
}

function createProject({ title = "Untitled Project", prompt = "", thumbnail = "" } = {}) {
  return projectRuntime.create({ title, prompt, thumbnail });
}

function getActiveProject() {
  return projectRuntime.getActive();
}

function updateActiveProject(patch = {}) {
  return projectRuntime.updateActive(patch, { title: "Fresh Ideas" });
}

function updateProjectTitle(project = getActiveProject()) {
  if (projectTitle) projectTitle.textContent = project?.title || "Fresh Ideas";
}

function commitProjectTitleEdit() {
  if (!projectTitle) return;
  const current = getActiveProject();
  const title = projectTitle.textContent.replace(/\s+/g, " ").trim() || current?.title || "Fresh Ideas";
  projectTitle.textContent = title;
  updateActiveProject({ title });
}

function saveCurrentProject() {
  const project = getActiveProject() || createProject({ title: "Fresh Ideas" });
  updateActiveProject(createProjectSavePatch({
    project,
    canvasWorld,
    selectedNode,
    projectTitleElement: projectTitle
  }));
  projectMenu?.classList.remove("open");
  brandMenu?.classList.remove("open");
  showProjectSaveStatus(projectSaveStatus);
}


function showView(view) {
  applyViewState({
    view,
    appRoot,
    homeView,
    projectLibraryView,
    profileView,
    assetsPageView
  });
  if (view !== "canvas") {
    setChatCollapsed(true);
    projectMenu?.classList.remove("open");
  }
  brandMenu?.classList.remove("open");
  if (view === "library") renderProjectLibrary();
}


function getProjectDisplayTitle(project, index = 0) {
  return getStoredProjectDisplayTitle(project, index);
}

function getProjectDisplayPrompt(project) {
  if (project?.isDemo) return "示例画板项目";
  return getStoredProjectDisplayPrompt(project);
}

function getProjectPreview(project, index = 0) {
  if (project?.isDemo) return makeDemoThumb(getProjectDisplayTitle(project, index), index, escapeHtmlText);
  return getStoredProjectPreview(project, index);
}

function renderProjectLibrary() {
  if (!projectGrid) return;
  applyProjectLibraryClasses(projectGrid, {
    mode: libraryViewMode,
    transitionDirection: libraryTransitionDirection
  });
  projectGrid.innerHTML = renderProjectLibraryContent({
    projects,
    activeProjectId,
    mode: libraryViewMode,
    getProjectPreview,
    getProjectDisplayTitle,
    getProjectDisplayPrompt,
    formatProjectDate: formatStoredProjectDate
  });
}

function renderHomeHistory() {
  if (!homeHistory) return;
  homeHistory.innerHTML = renderHomeHistoryContent({
    projects,
    getProjectPreview
  });
}

function selectLibraryProject(index) {
  if (!projects.length) return;
  const nextIndex = wrapProjectIndex(index, projects.length);
  const currentIndex = Math.max(0, projects.findIndex((project) => project.id === activeProjectId));
  libraryTransitionDirection = getLibraryTransitionDirection({ currentIndex, nextIndex });
  activeProjectId = projects[nextIndex].id;
  setActiveProjectId(activeProjectId);
  renderProjectLibrary();
  window.setTimeout(() => {
    libraryTransitionDirection = 0;
    projectGrid?.classList.remove("switch-next", "switch-prev");
  }, 1500);
}

function stepLibraryProject(direction) {
  const currentIndex = Math.max(0, projects.findIndex((project) => project.id === activeProjectId));
  selectLibraryProject(currentIndex + direction);
}

function resetCanvasForProject() {
  selectedNodes.clear();
  selectedNode = null;
  canvasWorld.querySelectorAll(".node-card").forEach((node) => removeNodeDeep(node));
  document.querySelectorAll(".canvas-ai-suggestions").forEach((item) => item.remove());
  emptyState.classList.remove("hidden");
}

function openProject(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;
  projectRuntime.setActive(project.id);
  resetCanvasForProject();
  showView("canvas");
  if (project.thumbnail) {
    const node = addNode({
      kind: "image",
      title: `${project.title}.png`,
      desc: project.prompt || "项目生成图片",
      x: -160,
      y: -120,
      media: {
        url: project.thumbnail,
        name: `${project.title}.png`,
        type: "image/png"
      }
    });
    markGeneratedNodeContext(node, {
      prompt: project.prompt,
      actionType: "project_restore"
    });
  }
}

function newBlankProject() {
  const project = createProject({ title: "Fresh Ideas", prompt: "" });
  resetCanvasForProject();
  openProject(project.id);
}

function makeProjectTitle(prompt) {
  return createProjectTitleFromPrompt(prompt);
}

async function generateHomeProject(prompt, model, files = []) {
  const project = createProject({ title: makeProjectTitle(prompt), prompt });
  document.body.classList.add("home-transitioning");
  await waitFor(260);
  resetCanvasForProject();
  showView("canvas");
  document.body.classList.remove("home-transitioning");
  document.body.classList.add("canvas-entering");
  window.setTimeout(() => document.body.classList.remove("canvas-entering"), 620);
  setChatCollapsed(false);
  if (model && chatModelSelect) chatModelSelect.value = model;
  chatImageFiles = getImageFilesFromList(files);
  renderChatImagePreview();
  promptInput.value = prompt || (chatImageFiles.length ? "参考上传图片生成一张高质量视觉方案" : "");
  promptForm.requestSubmit();
  updateActiveProject({ itemCount: 1 });
  return project;
}

const modelExtensions = [".glb", ".gltf", ".obj", ".fbx", ".stl", ".usdz"];
const IMAGE_EDIT_MIN_WIDTH = 420;
const IMAGE_EDIT_MAX_WIDTH = 1680;
const IMAGE_EDIT_MIN_HEIGHT = 210;
const IMAGE_EDIT_MAX_HEIGHT = 700;
const MIN_CANVAS_ZOOM = CANVAS_MIN_ZOOM;
const MAX_CANVAS_ZOOM = CANVAS_MAX_ZOOM;
const directorActions = [
  {
    type: "scene",
    title: "高端浴室场景图",
    kind: "image",
    prompt: "以参考产品为主体，生成一张高端现代浴室空间场景效果图。强调产品安装后的真实环境、干净材质、柔和自然光、商业摄影质感，不要改变产品核心形态。"
  },
  {
    type: "poster",
    title: "电商宣传海报",
    kind: "image",
    prompt: "基于参考产品生成一张电商主图宣传海报，构图简洁，高级产品摄影，突出产品质感和核心卖点，背景干净，适合电商首屏展示。"
  },
  {
    type: "detail",
    title: "产品详情页",
    kind: "image",
    prompt: "围绕参考产品生成一张电商详情页视觉方案，包含产品主视觉、细节区域、卖点展示区、材质说明区，版式清晰高级，适合中文电商页面。"
  },
  {
    type: "closeup",
    title: "细节特写图",
    kind: "image",
    prompt: "生成参考产品的细节特写商业摄影图，强调材质、边缘、工艺、安装结构和表面质感，微距镜头，高级光影。"
  },
  {
    type: "copy",
    title: "卖点文案",
    kind: "copy",
    prompt: "生成一组适合电商和宣传页使用的产品卖点文案。"
  },
  {
    type: "script",
    title: "视频脚本",
    kind: "script",
    prompt: "生成一支15秒产品短视频脚本，包含镜头节奏、画面、字幕和卖点。"
  },
  {
    type: "render3d",
    title: "3D渲染图",
    kind: "image",
    prompt: "将参考图主体转化为高质量3D渲染效果图，保留核心造型、比例和识别特征，使用真实材质、棚拍灯光和产品级渲染质感。"
  },
  {
    type: "productPhoto",
    title: "实拍质感图",
    kind: "image",
    prompt: "将参考图主体转化为真实摄影质感的产品图，保留主体特征，使用自然光、真实材质、合理景深和商业摄影构图。"
  },
  {
    type: "plush",
    title: "毛绒设计",
    kind: "image",
    prompt: "将参考图主体转化为毛绒玩具设计稿，保留角色识别点，表现绒毛材质、缝线、填充结构、可量产玩具比例和温暖可爱的触感。"
  },
  {
    type: "model",
    title: "模型设定",
    kind: "image",
    prompt: "基于参考图生成3D模型制作设定图，包含正面、侧面、背面视角，清晰表达体块、比例、结构、材质分区和建模参考信息。"
  },
  {
    type: "packaging",
    title: "包装设计",
    kind: "image",
    prompt: "围绕参考图主体生成适合该行业的包装设计效果图，包含盒型、开窗、吊牌或展示陈列，突出品牌感和货架吸引力。"
  },
  {
    type: "characterSheet",
    title: "角色设定",
    kind: "image",
    prompt: "将参考图主体整理为角色设定图，包含关键表情、动作姿态、配色、材质和角色识别点，适合IP开发和衍生品设计。"
  },
  {
    type: "mockup",
    title: "应用样机",
    kind: "image",
    prompt: "基于参考图生成行业应用样机，把主体放入真实使用或展示载体中，体现落地场景、比例关系和商业可用性。"
  }
];
const directorViewCount = 3;

function nextCanvasNodeId() {
  nodeIdSeed += 1;
  return `node-${nodeIdSeed}`;
}

function renderAssets() {
  renderAssetLibrary({ assetList, assets, escapeHtml: escapeHtmlText });
}

function applyTransform() {
  canvasWorld.style.transform = getCanvasTransformStyle(pan, zoom);
  syncZoomControls({ zoom, zoomText, zoomRange });
  if (imageEditPopover.classList.contains("open")) positionImageEditPopover();
  if (document.querySelector("#imageTextPanel")?.classList.contains("open")) positionImageTextPanel();
  positionTextFormatToolbar();
  positionShapeFormatToolbar();
  positionAgentBubble();
}

function getCanvasNodeScreenRect(node) {
  if (!node) return null;
  return getNodeScreenRectFromWorld({
    node,
    viewportRect: canvasViewport.getBoundingClientRect(),
    pan,
    zoom
  });
}



function setTextNodeEditing(node, editing) {
  const editor = setTextNodeEditingState(node, editing);
  if (!editor) return;
  if (editing) {
    selectNode(node);
    window.setTimeout(() => {
      focusTextEditorAtEnd(editor);
      positionTextFormatToolbar();
    }, 0);
  } else if (document.activeElement === editor) {
    editor.blur();
  }
}

function ensureShapeFormatToolbar() {
  return createShapeFormatToolbarElement({
    onPointerDown: (event) => {
      event.stopPropagation();
      if (event.target.closest("[data-shape-spectrum], [data-shape-color]")) {
        applyShapeToolbarColor(event, event.currentTarget);
      }
    },
    onInput: (event) => {
      const input = event.target.closest("[data-shape-style]");
      const shapeNode = getActiveShapeNode();
      if (!input || !shapeNode) return;
      if (input.dataset.shapeStyle === "strokeWidth") {
        shapeNode.style.setProperty("--shape-stroke-width", input.value);
        syncShapeSvgStyles(shapeNode);
      }
    },
    onClick: handleShapeToolbarClick,
    onPointerMove: handleShapeColorDragMove,
    onPointerUp: handleShapeColorDragEnd
  });
}
function getActiveShapeNode() {
  return getActiveShapeNodeFromSelection(selectedNode);
}

function getShapeNodeForToolbar(toolbar) {
  return getShapeToolbarNode(toolbar, getActiveShapeNode());
}

function getShapeToolbarTarget(toolbar) {
  return getShapeToolbarColorTarget(toolbar);
}

let shapeColorDrag = null;

function setShapeColorFromSpectrum(event, toolbar, spectrum) {
  const shapeNode = getShapeNodeForToolbar(toolbar);
  if (!shapeNode) return false;
  const rect = spectrum.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  const marker = spectrum.querySelector("i");
  if (marker) {
    marker.style.left = `${x * 100}%`;
    marker.style.top = `${y * 100}%`;
  }
  setShapeNodeColor(shapeNode, getShapeToolbarTarget(toolbar), hslToHexColor(x * 360, 82, 88 - y * 76));
  return true;
}

function applyShapeToolbarColor(event, toolbar) {
  const shapeNode = getShapeNodeForToolbar(toolbar);
  if (!shapeNode) return false;
  const spectrum = event.target.closest("[data-shape-spectrum]");
  if (spectrum) {
    event.preventDefault();
    event.stopPropagation();
    shapeColorDrag = { toolbar, spectrum, pointerId: event.pointerId };
    spectrum.setPointerCapture?.(event.pointerId);
    setShapeColorFromSpectrum(event, toolbar, spectrum);
    return true;
  }
  const colorButton = event.target.closest("[data-shape-color]");
  if (colorButton) {
    event.preventDefault();
    event.stopPropagation();
    setShapeNodeColor(shapeNode, getShapeToolbarTarget(toolbar), colorButton.dataset.shapeColor);
    toolbar.classList.remove("picker-open");
    return true;
  }
  return false;
}

function handleShapeColorDragMove(event) {
  if (!shapeColorDrag || event.pointerId !== shapeColorDrag.pointerId) return;
  event.preventDefault();
  setShapeColorFromSpectrum(event, shapeColorDrag.toolbar, shapeColorDrag.spectrum);
}

function handleShapeColorDragEnd(event) {
  if (!shapeColorDrag || event.pointerId !== shapeColorDrag.pointerId) return;
  shapeColorDrag.spectrum.releasePointerCapture?.(event.pointerId);
  shapeColorDrag = null;
}

function handleShapeToolbarPointer(event) {
  if (event.target.closest('[data-shape-style="strokeWidth"]')) return;
  const toolbar = event.currentTarget;
  const shapeNode = getShapeNodeForToolbar(toolbar);
  const trigger = event.target.closest("[data-color-target]");
  if (trigger) {
    event.preventDefault();
    event.stopPropagation();
    toolbar.dataset.colorTarget = trigger.dataset.colorTarget;
    toolbar.classList.toggle("picker-open");
    return;
  }
  const spectrum = event.target.closest("[data-shape-spectrum]");
  if (spectrum && shapeNode) {
    event.preventDefault();
    event.stopPropagation();
    const rect = spectrum.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    const color = hslToHexColor(x * 360, 82, 88 - y * 76);
    setShapeNodeColor(shapeNode, toolbar.dataset.colorTarget === "stroke" ? "stroke" : "fill", color);
    toolbar.classList.remove("picker-open");
    positionShapeFormatToolbar();
    return;
  }
  const colorButton = event.target.closest("[data-shape-color]");
  if (colorButton && shapeNode) {
    event.preventDefault();
    event.stopPropagation();
    setShapeNodeColor(
      shapeNode,
      toolbar.dataset.colorTarget === "stroke" ? "stroke" : "fill",
      colorButton.dataset.shapeColor
    );
    toolbar.classList.remove("picker-open");
    positionShapeFormatToolbar();
    return;
  }
}

/*
  Kept for non-pointer synthetic clicks, but pointerdown above is the primary path.
*/
function handleShapeToolbarClick(event) {
    const trigger = event.target.closest("[data-color-target]");
    if (trigger) {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.dataset.colorTarget = trigger.dataset.colorTarget;
      event.currentTarget.classList.toggle("picker-open");
      return;
    }
    applyShapeToolbarColor(event, event.currentTarget);
}

function hideShapeFormatToolbar() {
  hideShapeToolbar();
}

function hasMovingShape(node) {
  return hasShapeNodeInSet(node, selectedNodes);
}

function hasMovingText(node) {
  return hasTextNodeInSet(node, selectedNodes);
}

function positionShapeFormatToolbar() {
  const toolbar = ensureShapeFormatToolbar();
  if (!selectedNode?.classList.contains("canvas-shape")) {
    hideShapeFormatToolbar();
    return;
  }
  if (isFixedStrokeToolName(selectedNode.dataset.tool)) {
    hideShapeFormatToolbar();
    return;
  }
  const rect = getCanvasNodeScreenRect(selectedNode);
  if (!rect) return;
  positionShapeToolbar({
    toolbar,
    node: selectedNode,
    nodeRect: rect,
    isLinear: isLinearDrawToolName(selectedNode.dataset.tool)
  });
}


function setSelectedShapeColor(target, color) {
  const shapeNode = getActiveShapeNode();
  if (!shapeNode) return;
  setShapeNodeColor(shapeNode, target, color);
}

function setShapeNodeColor(node, target, color) {
  node.style.setProperty(target === "stroke" ? "--shape-stroke" : "--shape-fill", color);
  syncShapeSvgStyles(node);
  positionShapeFormatToolbar();
}






function positionTextFormatToolbar() {
  if (!textFormatToolbar) return;
  const editor = getTextEditorFromNode(selectedNode);
  if (!editor) {
    hideTextToolbar(textFormatToolbar);
    return;
  }
  const rect = getCanvasNodeScreenRect(selectedNode);
  if (!rect) return;
  positionTextToolbar({
    toolbar: textFormatToolbar,
    editor,
    nodeRect: rect,
    colorInput: textColorInput,
    fontSizeInput: textFontSize
  });
}

function applyTextStyle(style) {
  const editor = getTextEditorFromNode(selectedNode);
  if (!applyTextEditorStyle(editor, style)) return;
  positionTextFormatToolbar();
}


function viewportPointToWorld(clientX, clientY) {
  return viewportPointToWorldPoint({
    clientX,
    clientY,
    viewportRect: canvasViewport.getBoundingClientRect(),
    pan,
    zoom
  });
}

function viewportCenterPoint() {
  return viewportCenterToWorldPoint({
    viewportRect: canvasViewport.getBoundingClientRect(),
    pan,
    zoom
  });
}


function nodeTemplate(kind, title, desc, media = {}) {
  return renderNodeTemplate({
    kind,
    title,
    desc,
    media,
    directorActions,
    directorViewCount
  });
}

function clearSelection() {
  selectedNode = clearSelectedNodeElements(selectedNodes);
  hideTextToolbar(textFormatToolbar);
  hideShapeFormatToolbar();
}

function selectNode(node, additive = false) {
  if (!node) {
    clearSelection();
    return;
  }
  selectedNode = addSelectedNodeElement(selectedNodes, node, additive);
  positionTextFormatToolbar();
  positionShapeFormatToolbar();
  recordCanvasEvent("select", { nodeId: node.dataset.nodeId });
  scheduleAICoreAgent("selection_pause", node, 5000);
}

function selectNodes(nodes) {
  selectedNode = replaceSelectedNodeElements(selectedNodes, nodes);
  positionTextFormatToolbar();
  positionShapeFormatToolbar();
}

function removeNodeDeep(node) {
  removeCanvasNodeDeep(node, {
    removeSuggestionForNode: (nodeId) => {
      document.querySelector(`.canvas-ai-suggestions[data-node-id="${nodeId}"]`)?.remove();
    }
  });
}

function deleteSelectedNode() {
  if (!selectedNodes.size) return;
  const { nodes, eventPayload } = getSelectedNodeDeletePayload(selectedNodes);
  recordCanvasEvent("delete", eventPayload);
  clearSelection();
  nodes.forEach(removeNodeDeep);
}

function hideAddNodeMenu() {
  addNodeMenu.classList.remove("open");
}

function hideCanvasContextMenu() {
  canvasContextMenu.classList.remove("open");
}

function hideImageEditPopover() {
  imageEditPopover.classList.remove("open");
  editingImageNode = null;
}

function ensureImageTextPanel() {
  let panel = document.querySelector("#imageTextPanel");
  if (panel) return panel;
  panel = createImageTextPanel({
    onRefresh: async () => {
      const node = textEditingImageNode;
      if (node) await showImageTextEditor(node);
    },
    onClose: () => {
      hideImageTextPanel();
    },
    onApply: async () => {
      await applyImageTextEdits();
    }
  });
  canvasWorld.appendChild(panel);
  return panel;
}

function hideImageTextPanel() {
  document.querySelector("#imageTextPanel")?.classList.remove("open", "loading");
  textEditingImageNode = null;
}

function positionImageTextPanel() {
  const panel = document.querySelector("#imageTextPanel");
  positionImageTextPanelElement({ panel, node: textEditingImageNode });
}

function renderImageTextInputs(panel, texts = []) {
  renderImageTextInputList(panel, texts);
}

async function showImageTextEditor(node) {
  const img = node.querySelector(".image-frame img");
  if (!img?.src) return;
  hideImageEditPopover();
  hideCanvasContextMenu();
  hideAddNodeMenu();
  selectNode(node);
  textEditingImageNode = node;
  const panel = ensureImageTextPanel();
  panel.classList.add("open", "loading");
  panel.querySelector("[data-text-edit-status]").textContent = "正在调用视觉模型识别文字...";
  panel.querySelector("[data-text-edit-list]").innerHTML = "";
  positionImageTextPanel();
  try {
    const image = await imageSourceToDataUrl(img.src);
    const result = await postJsonRequest("/api/extract-image-text", { image });
    renderImageTextInputs(panel, result.texts || result.analysis?.texts || []);
  } catch (error) {
    panel.querySelector("[data-text-edit-status]").textContent = `识别失败：${error.message}。你可以手动填写要替换的文字。`;
    renderImageTextInputs(panel, []);
  } finally {
    panel.classList.remove("loading");
  }
}

async function applyImageTextEdits() {
  const panel = document.querySelector("#imageTextPanel");
  const sourceNode = textEditingImageNode;
  if (!panel || !sourceNode) return;
  const edits = getImageTextEdits(panel);
  if (!edits.length) {
    panel.querySelector("[data-text-edit-status]").textContent = "请先修改至少一处文字。";
    return;
  }
  const prompt = buildImageTextEditPrompt(edits);
  panel.classList.add("loading");
  panel.querySelector("[data-text-edit-status]").textContent = "正在调用图片编辑模型应用文字修改...";
  await runImageEditCommand(sourceNode, prompt, "AI文字编辑");
  hideImageTextPanel();
}

function showAddNodeMenu(clientX, clientY) {
  addMenuPoint = viewportPointToWorld(clientX, clientY);
  const viewportRect = canvasViewport.getBoundingClientRect();
  const menuWidth = 360;
  const menuHeight = 520;
  const left = Math.min(clientX - viewportRect.left, viewportRect.width - menuWidth - 18);
  const top = Math.min(clientY - viewportRect.top, viewportRect.height - menuHeight - 18);
  addNodeMenu.style.left = `${Math.max(18, left)}px`;
  addNodeMenu.style.top = `${Math.max(18, top)}px`;
  addNodeMenu.classList.add("open");
}

function showCanvasContextMenu(clientX, clientY) {
  contextMenuPoint = viewportPointToWorld(clientX, clientY);
  hideAddNodeMenu();
  hideImageEditPopover();
  const viewportRect = canvasViewport.getBoundingClientRect();
  const menuWidth = 300;
  const menuHeight = 445;
  const left = Math.min(clientX - viewportRect.left, viewportRect.width - menuWidth - 18);
  const top = Math.min(clientY - viewportRect.top, viewportRect.height - menuHeight - 18);
  canvasContextMenu.style.left = `${Math.max(18, left)}px`;
  canvasContextMenu.style.top = `${Math.max(18, top)}px`;
  canvasContextMenu.classList.add("open");
}

function showImageEditPopover(node, presetPrompt = "") {
  const img = node.querySelector(".image-frame img");
  if (!img) return;
  editingImageNode = node;
  editImageThumb.src = img.src;
  imageEditPrompt.value = presetPrompt;
  if (imageEditPopover.parentElement !== canvasWorld) {
    canvasWorld.appendChild(imageEditPopover);
  }
  positionImageEditPopover();
  imageEditPopover.classList.add("open");
  imageEditPrompt.focus();
  if (presetPrompt) imageEditPrompt.setSelectionRange(presetPrompt.length, presetPrompt.length);
}

function positionImageEditPopover() {
  positionImageEditPopoverElement({
    node: editingImageNode,
    popover: imageEditPopover,
    zoom,
    minWidth: IMAGE_EDIT_MIN_WIDTH,
    maxWidth: IMAGE_EDIT_MAX_WIDTH,
    minHeight: IMAGE_EDIT_MIN_HEIGHT,
    maxHeight: IMAGE_EDIT_MAX_HEIGHT
  });
}

function stopNativeDrag(node) {
  node.draggable = false;
  node.addEventListener("dragstart", (event) => event.preventDefault());
}

function ensureResizeHandles(node) {
  if (node.querySelector(".resize-handle")) return;
  ["nw", "ne", "sw", "se"].forEach((corner) => {
    const handle = document.createElement("span");
    handle.className = `resize-handle resize-${corner}`;
    handle.dataset.resize = corner;
    node.appendChild(handle);
  });
}

function ensureNodeControls(node) {
  if (node.querySelector(".node-expand")) return;
  if (node.classList.contains("node-image")) ensureImageToolbar(node);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "node-expand";
  button.title = "全屏查看";
  button.setAttribute("aria-label", "全屏查看图片");
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 3h6v6" />
      <path d="M21 3l-7 7" />
      <path d="M9 21H3v-6" />
      <path d="M3 21l7-7" />
    </svg>
  `;
  button.addEventListener("pointerdown", (event) => event.stopPropagation());
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const img = node.querySelector(".image-frame img");
    if (img) {
      showImageLightbox(img.src, getNodeTitle(node));
      return;
    }
    node.classList.toggle("node-zoomed");
    if (editingImageNode === node && imageEditPopover.classList.contains("open")) positionImageEditPopover();
  });
  node.appendChild(button);
}

function ensureImageToolbar(node) {
  if (node.querySelector(".image-node-toolbar")) return;
  const managedToolbar = createImageToolbar((action, currentToolbar) => {
    const img = node.querySelector(".image-frame img");
    if (!img) return;
    if (action === "more") {
      currentToolbar.classList.toggle("menu-open");
      return;
    }
    currentToolbar.classList.remove("menu-open");
    if (action === "crop") return startImageCrop(node);
    if (action === "zoom") {
      node.classList.toggle("node-zoomed");
      if (editingImageNode === node && imageEditPopover.classList.contains("open")) positionImageEditPopover();
      positionTextFormatToolbar();
      return;
    }
    if (action === "remove-bg") {
      runImageEditCommand(node, "移除图片背景，保留主体完整边缘和真实细节，输出透明或纯净浅色背景，主体不要变形。", "移除背景");
      return;
    }
    if (action === "expand-image") {
      runImageEditCommand(node, "在保持主体不变的前提下向四周自然扩展画面，补全合理背景和光影，保持原图风格一致。", "扩展画面");
      return;
    }
    if (action === "edit-text") {
      selectNode(node);
      showImageTextEditor(node);
      return;
    }
    if (action === "download") {
      const link = document.createElement("a");
      link.href = img.src;
      link.download = getNodeTitle(node).replace(/^▧\s*/, "") || "image.png";
      link.click();
    }
  });
  node.appendChild(managedToolbar);
  return;

}

function ensureImageLightbox() {
  return ensureImageLightboxElement({ onClose: hideImageLightbox });
}

function showImageLightbox(src, title = "图片预览") {
  if (!src) return;
  showImageLightboxElement(ensureImageLightbox(), { src, title });
}

function hideImageLightbox() {
  hideImageLightboxElement();
}

function centerViewOnNode(node, targetZoom = 1.18) {
  const x = parseFloat(node.style.left || "0") + node.offsetWidth / 2;
  const y = parseFloat(node.style.top || "0") + node.offsetHeight / 2;
  zoom = clampCanvasZoom(targetZoom);
  pan = centerPanOnWorldPoint({ x, y }, zoom);
  applyTransform();
}

function returnViewToContent() {
  const nodes = Array.from(canvasWorld.querySelectorAll(".node-card"))
    .filter((node) => !node.classList.contains("stack-member-hidden"));
  if (!nodes.length) {
    pan = { ...DEFAULT_CANVAS_PAN };
    zoom = 1;
    applyTransform();
    return;
  }

  const bounds = nodes.reduce((box, node) => {
    const x = parseFloat(node.style.left || "0");
    const y = parseFloat(node.style.top || "0");
    const width = node.offsetWidth || 0;
    const height = node.offsetHeight || 0;
    return {
      minX: Math.min(box.minX, x),
      minY: Math.min(box.minY, y),
      maxX: Math.max(box.maxX, x + width),
      maxY: Math.max(box.maxY, y + height)
    };
  }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

  const nextView = fitWorldBoundsInViewport({
    bounds,
    viewportRect: canvasViewport.getBoundingClientRect()
  });
  zoom = nextView.zoom;
  pan = nextView.pan;
  applyTransform();
}

function addCanvasToolNode(tool, options = {}) {
  const point = options.point || viewportCenterPoint();
  const names = {
    rect: "矩形",
    circle: "圆形",
    triangle: "三角形",
    star: "星形",
    arrow: "箭头",
    line: "线段",
    pen: "画笔",
    text: "文字",
    "text-rect": "文字",
    "text-circle": "文字",
    speech: "文字",
    "left-arrow": "文字",
    "right-arrow": "文字"
  };
  const sizes = {
    rect: { width: 220, height: 140 },
    circle: { width: 170, height: 170 },
    triangle: { width: 180, height: 170 },
    star: { width: 180, height: 170 },
    arrow: { width: 260, height: 110 },
    line: { width: 260, height: 80 },
    pen: { width: 260, height: 120 },
    text: { width: 260, height: 96 },
    "text-rect": { width: 220, height: 140 },
    "text-circle": { width: 170, height: 170 },
    speech: { width: 240, height: 150 },
    "left-arrow": { width: 260, height: 140 },
    "right-arrow": { width: 260, height: 140 }
  };
  const size = options.size || sizes[tool] || sizes.rect;
  if (["circle", "diamond", "star"].includes(tool)) {
    const side = Math.min(size.width, size.height);
    size.width = side;
    size.height = side;
  }
  const label = tool === "text" || SHAPE_TEXT_TOOLS.has(tool) ? "" : names[tool];
  const node = document.createElement("article");
  node.className = `node-card node-draw canvas-object canvas-${tool === "text" ? "text" : "shape"} canvas-tool-${tool}`;
  node.style.left = `${options.x ?? (point.x - size.width / 2)}px`;
  node.style.top = `${options.y ?? (point.y - size.height / 2)}px`;
  node.style.width = `${size.width}px`;
  node.style.minHeight = `${size.height}px`;
  node.style.setProperty("--shape-fill", isLinearDrawToolName(tool) || isFixedStrokeToolName(tool) ? "transparent" : "#ffffff");
  node.style.setProperty("--shape-stroke", isFixedStrokeToolName(tool) ? "#050505" : "#1f2933");
  node.style.setProperty("--shape-stroke-width", isFixedStrokeToolName(tool) ? "4" : "3");
  node.dataset.kind = "draw";
  node.dataset.tool = tool;
  ensureCanvasNodeId(node, { nextId: nextCanvasNodeId });
  if (tool === "text") {
    node.innerHTML = `
      <div class="canvas-text-editor" contenteditable="false" spellcheck="false" data-placeholder="输入文字"></div>
    `;
  } else if (SHAPE_TEXT_TOOLS.has(tool)) {
    node.innerHTML = `
      <div class="draw-shape" aria-hidden="true">${renderToolSvg(tool)}</div>
      <div class="canvas-text-editor shape-text-editor" contenteditable="false" spellcheck="false" data-placeholder="输入文字"></div>
    `;
  } else {
    node.innerHTML = `<div class="draw-shape" aria-hidden="true">${options.svgMarkup || renderToolSvg(tool)}</div>`;
  }
  node.classList.toggle("node-text-tool", tool === "text");
  node.classList.toggle("node-shape-text", SHAPE_TEXT_TOOLS.has(tool));
  node.dataset.manualSize = "true";
  emptyState.classList.add("hidden");
  makeDraggable(node);
  node.querySelector(".node-expand")?.remove();
  canvasWorld.appendChild(node);
  syncShapeSvgStyles(node);
  selectNode(node);
  if (tool === "text" || SHAPE_TEXT_TOOLS.has(tool)) {
    const editable = node.querySelector(".canvas-text-editor");
    editable?.addEventListener("blur", () => setTextNodeEditing(node, false));
    window.setTimeout(() => {
      setTextNodeEditing(node, true);
    }, 0);
  }
  if (tool === "text") resetCanvasTool();
  return node;
}

function resetCanvasTool() {
  activeCanvasTool = "";
  canvasViewport.classList.remove("tool-draw", "tool-text", "tool-eraser");
  setActiveRailButton("select");
}

function runCanvasTool(tool) {
  if (tool === "select") {
    resetCanvasTool();
    return;
  }
  if (tool === "shape") {
    setShapeTool("rect");
    return;
  }
  if (tool === "image") {
    pendingUploadPoint = viewportCenterPoint();
    assetUploadInput.click();
    return;
  }
  if (tool === "eraser") {
    activeCanvasTool = "eraser";
    canvasViewport.classList.remove("tool-draw", "tool-text");
    canvasViewport.classList.add("tool-eraser");
    return;
  }
  activeCanvasTool = tool;
  canvasViewport.classList.toggle("tool-text", tool === "text");
  canvasViewport.classList.toggle("tool-draw", tool !== "text");
  canvasViewport.classList.remove("tool-eraser");
}

function setShapeTool(tool) {
  activeCanvasTool = tool;
  canvasViewport.classList.add("tool-draw");
  canvasViewport.classList.remove("tool-text", "tool-eraser");
  setActiveRailButton("shape");
}

function createDrawingPreview(startClientX, startClientY, tool) {
  const rect = canvasViewport.getBoundingClientRect();
  const preview = createDrawingPreviewElement({
    viewportRect: rect,
    tool,
    renderSvg: renderToolSvg,
    buildPenSvg: (viewportRect) => `<svg viewBox="0 0 ${viewportRect.width} ${viewportRect.height}" preserveAspectRatio="none"><path /></svg>`
  });
  canvasViewport.appendChild(preview);
  canvasDrawing = createDrawingState({
    tool,
    preview,
    startClientX,
    startClientY,
    viewportRect: rect
  });
  canvasViewport.classList.add("drawing");
  updateDrawingPreview();
}

function updateDrawingPreview() {
  updateDrawingPreviewElement(canvasDrawing, pointsToPath);
}

function finishCanvasDrawing() {
  if (!canvasDrawing) return;
  const drawing = canvasDrawing;
  const viewportRect = canvasViewport.getBoundingClientRect();
  const start = viewportPointToWorld(drawing.startClientX, drawing.startClientY);
  const end = viewportPointToWorld(drawing.currentClientX, drawing.currentClientY);
  const width = Math.max(18, Math.abs(end.x - start.x));
  const height = Math.max(18, Math.abs(end.y - start.y));
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const moved = Math.abs(drawing.currentClientX - drawing.startClientX) > 4
    || Math.abs(drawing.currentClientY - drawing.startClientY) > 4;
  const tool = drawing.tool;
  drawing.preview.remove();
  canvasDrawing = null;
  canvasViewport.classList.remove("drawing");
  if (!moved) return;
  if (tool === "pen") {
    const worldPoints = drawing.points.map((point) => viewportPointToWorld(viewportRect.left + point.x, viewportRect.top + point.y));
    const minX = Math.min(...worldPoints.map((point) => point.x));
    const minY = Math.min(...worldPoints.map((point) => point.y));
    const maxX = Math.max(...worldPoints.map((point) => point.x));
    const maxY = Math.max(...worldPoints.map((point) => point.y));
    const pad = 10;
    const nodeWidth = Math.max(18, maxX - minX + pad * 2);
    const nodeHeight = Math.max(18, maxY - minY + pad * 2);
    const path = buildPointsPath(worldPoints, minX - pad, minY - pad);
    addCanvasToolNode("pen", {
      x: minX - pad,
      y: minY - pad,
      size: { width: nodeWidth, height: nodeHeight },
      svgMarkup: `<svg viewBox="0 0 ${nodeWidth} ${nodeHeight}" preserveAspectRatio="none"><path d="${path}" /></svg>`
    });
    return;
  }
  if (isLinearDrawToolName(tool)) {
    const pad = 12;
    const nodeWidth = Math.max(18, width + pad * 2);
    const nodeHeight = Math.max(18, height + pad * 2);
    const startRel = { x: start.x <= end.x ? pad : nodeWidth - pad, y: start.y <= end.y ? pad : nodeHeight - pad };
    const endRel = { x: start.x <= end.x ? nodeWidth - pad : pad, y: start.y <= end.y ? nodeHeight - pad : pad };
    addCanvasToolNode(tool, {
      x: x - pad,
      y: y - pad,
      size: { width: nodeWidth, height: nodeHeight },
      svgMarkup: buildLinearSvg(tool, nodeWidth, nodeHeight, startRel, endRel)
    });
    return;
  }
  addCanvasToolNode(tool, {
    x,
    y,
    size: {
      width,
      height: tool === "line" || tool === "arrow" ? Math.max(28, height) : height
    }
  });
}

function createEraserStroke() {
  const rect = canvasViewport.getBoundingClientRect();
  const stroke = document.createElement("div");
  stroke.className = "canvas-eraser-stroke";
  stroke.innerHTML = `<svg viewBox="0 0 ${rect.width} ${rect.height}" preserveAspectRatio="none"><path /></svg>`;
  canvasViewport.appendChild(stroke);
  return stroke;
}

function startEraserDrag(event) {
  const rect = canvasViewport.getBoundingClientRect();
  const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  eraserDrag = {
    stroke: createEraserStroke(),
    points: [point],
    marked: new Set()
  };
  canvasViewport.classList.add("erasing");
  updateEraserDrag(event);
}

function updateEraserDrag(event) {
  if (!eraserDrag) return;
  const rect = canvasViewport.getBoundingClientRect();
  const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  const last = eraserDrag.points[eraserDrag.points.length - 1];
  if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 4) eraserDrag.points.push(point);
  eraserDrag.stroke.querySelector("path")?.setAttribute("d", buildPointsPath(eraserDrag.points));
  const brush = 18;
  canvasWorld.querySelectorAll(".node-card").forEach((node) => {
    if (eraserDrag.marked.has(node)) return;
    const nodeRect = getCanvasNodeScreenRect(node);
    if (!nodeRect) return;
    const hit = event.clientX >= nodeRect.left - brush
      && event.clientX <= nodeRect.left + nodeRect.width + brush
      && event.clientY >= nodeRect.top - brush
      && event.clientY <= nodeRect.top + nodeRect.height + brush;
    if (hit) {
      eraserDrag.marked.add(node);
      node.classList.add("eraser-marked");
    }
  });
}

function finishEraserDrag() {
  if (!eraserDrag) return;
  const marked = Array.from(eraserDrag.marked);
  const stroke = eraserDrag.stroke;
  stroke.classList.add("fade-out");
  window.setTimeout(() => stroke.remove(), 180);
  eraserDrag = null;
  canvasViewport.classList.remove("erasing");
  if (!marked.length) return;
  marked.forEach((node) => node.classList.remove("eraser-marked"));
  clearSelection();
  marked.forEach(removeNodeDeep);
  recordCanvasEvent("erase", { count: marked.length, nodeIds: marked.map((node) => node.dataset.nodeId) });
}

function ensureImageCropControls(node) {
  const controls = createImageCropControls({
    node,
    onPointerDown: handleCropPointerDown,
    onAction: (action) => {
      if (action === "cancel") hideImageCropOverlay();
      if (action === "reset") restoreOriginalImageCrop();
      if (action === "confirm") confirmImageCrop();
    }
  });
  updateCropRestoreButton(node);
  return controls;
}

function startImageCrop(node) {
  const img = node.querySelector(".image-frame img");
  if (!img) return;
  hideImageCropOverlay();
  hideImageEditPopover();
  hideCanvasContextMenu();
  hideAddNodeMenu();
  selectNode(node);
  centerViewOnNode(node, 1.26);
  window.setTimeout(() => {
    croppingImageNode = node;
    node.classList.add("cropping");
    const { frame } = ensureImageCropControls(node);
    const insetX = frame.offsetWidth * 0.08;
    const insetY = frame.offsetHeight * 0.08;
    setCropBox({ x: insetX, y: insetY, width: frame.offsetWidth - insetX * 2, height: frame.offsetHeight - insetY * 2 }, node);
  }, 180);
}

function setCropBox(box, node = croppingImageNode) {
  setCropBoxForNode({ node, box, ensureControls: ensureImageCropControls });
}

function getCropBox(node = croppingImageNode) {
  return getCropBoxForNode({ node, ensureControls: ensureImageCropControls });
}

function handleCropPointerDown(event) {
  const cropBox = event.target.closest(".crop-box");
  const handle = event.target.closest(".crop-corner, .crop-edge");
  if (!cropBox && !handle) return;
  event.preventDefault();
  event.stopPropagation();
  const node = event.currentTarget.closest(".node-card");
  const stage = node.querySelector(".image-frame");
  const start = { x: event.clientX, y: event.clientY };
  const original = getCropBox(node);
  const mode = handle ? Array.from(handle.classList).find((name) => /^crop-[nsew]{1,2}$/.test(name)).replace("crop-", "") : "move";
  const onMove = (moveEvent) => {
    const dx = (moveEvent.clientX - start.x) / zoom;
    const dy = (moveEvent.clientY - start.y) / zoom;
    const next = { ...original };
    if (mode === "move") {
      next.x += dx;
      next.y += dy;
    } else {
      if (mode.includes("e")) next.width += dx;
      if (mode.includes("s")) next.height += dy;
      if (mode.includes("w")) {
        next.x += dx;
        next.width -= dx;
      }
      if (mode.includes("n")) {
        next.y += dy;
        next.height -= dy;
      }
    }
    const stageWidth = stage.offsetWidth;
    const stageHeight = stage.offsetHeight;
    next.x = Math.max(0, Math.min(next.x, stageWidth - 80));
    next.y = Math.max(0, Math.min(next.y, stageHeight - 80));
    setCropBox(next, node);
  };
  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function confirmImageCrop() {
  const sourceNode = croppingImageNode;
  const sourceImg = sourceNode?.querySelector(".image-frame img");
  if (!sourceImg?.complete) return;
  const stage = sourceNode.querySelector(".image-frame");
  const box = getCropBox(sourceNode);
  if (!sourceNode.dataset.cropOriginalSrc) {
    sourceNode.dataset.cropOriginalSrc = sourceImg.src;
    sourceNode.dataset.cropOriginalAspect = stage.style.aspectRatio || `${sourceImg.naturalWidth || 1} / ${sourceImg.naturalHeight || 1}`;
    sourceNode.dataset.cropOriginalWidth = sourceNode.style.width || "";
    sourceNode.dataset.cropOriginalManualSize = sourceNode.dataset.manualSize || "";
  }
  const scaleX = sourceImg.naturalWidth / stage.offsetWidth;
  const scaleY = sourceImg.naturalHeight / stage.offsetHeight;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(box.width * scaleX));
  canvas.height = Math.max(1, Math.round(box.height * scaleY));
  const context = canvas.getContext("2d");
  context.drawImage(
    sourceImg,
    box.x * scaleX,
    box.y * scaleY,
    box.width * scaleX,
    box.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );
  sourceImg.src = canvas.toDataURL("image/png");
  const frame = sourceNode.querySelector(".image-frame");
  frame.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
  sourceNode.dataset.manualSize = "true";
  hideImageCropOverlay();
}

function updateCropRestoreButton(node = croppingImageNode) {
  updateCropRestoreButtonForNode(node);
}

function restoreOriginalImageCrop() {
  const node = croppingImageNode;
  if (!node) return;
  if (!node.dataset.cropOriginalSrc) {
    updateCropRestoreButton(node);
    return;
  }
  const img = node.querySelector(".image-frame img");
  const frame = node.querySelector(".image-frame");
  if (!img || !frame) return;
  const restoreBox = () => {
    setCropBox({ x: 0, y: 0, width: frame.offsetWidth, height: frame.offsetHeight }, node);
    centerViewOnNode(node, 1.26);
  };
  img.addEventListener("load", restoreBox, { once: true });
  img.src = node.dataset.cropOriginalSrc;
  frame.style.aspectRatio = node.dataset.cropOriginalAspect || `${img.naturalWidth || 1} / ${img.naturalHeight || 1}`;
  if (node.dataset.cropOriginalWidth) node.style.width = node.dataset.cropOriginalWidth;
  if (node.dataset.cropOriginalManualSize) {
    node.dataset.manualSize = node.dataset.cropOriginalManualSize;
  } else {
    delete node.dataset.manualSize;
  }
  delete node.dataset.cropOriginalSrc;
  delete node.dataset.cropOriginalAspect;
  delete node.dataset.cropOriginalWidth;
  delete node.dataset.cropOriginalManualSize;
  updateCropRestoreButton(node);
  if (img.complete) restoreBox();
}

function hideImageCropOverlay() {
  if (croppingImageNode) {
    removeImageCropOverlay(croppingImageNode);
  }
  croppingImageNode = null;
}

function getNodeBounds(node) {
  return getElementWorldBounds(node);
}

function createSelectionBox() {
  return createSelectionBoxElement(canvasViewport);
}

function updateSelectionBox() {
  if (!selectionDrag) return;
  applySelectionBoxRect(selectionDrag.box, getSelectionBoxRect(selectionDrag));
}

function finishSelectionBox() {
  if (!selectionDrag) return;
  const area = getWorldSelectionArea(selectionDrag, viewportPointToWorld);
  const selected = area.width < 4 && area.height < 4
    ? []
    : getVisibleCanvasNodes(canvasWorld).filter((node) => rectsIntersect(getNodeBounds(node), area));
  selectNodes(selected);
  selectionDrag.box.remove();
  selectionDrag = null;
  canvasViewport.classList.remove("selecting");
}

function ensureStackControls(node) {
  let button = node.querySelector(":scope > .stack-toggle");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "stack-toggle";
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      node.classList.toggle("stack-expanded");
      renderStackTray(node);
    });
    node.appendChild(button);
  }

  let tray = node.querySelector(":scope > .stack-tray");
  if (!tray) {
    tray = document.createElement("div");
    tray.className = "stack-tray";
    tray.addEventListener("pointerdown", (event) => event.stopPropagation());
    tray.addEventListener("click", (event) => {
      const row = event.target.closest(".stack-row");
      if (!row) return;
      event.stopPropagation();
      const child = (node._stackChildren || []).find((item) => item.dataset.nodeId === row.dataset.childId);
      if (child) releaseStackChild(node, child);
    });
    node.appendChild(tray);
  }
  return { button, tray };
}

function renderStackTray(node) {
  const children = node._stackChildren || [];
  const { button, tray } = ensureStackControls(node);
  button.textContent = `+${children.length}`;
  tray.innerHTML = children.map((child) => {
    ensureCanvasNodeId(child, { nextId: nextCanvasNodeId });
    const thumb = getNodeThumbnail(child);
    const title = escapeHtmlText(getNodeTitle(child));
    const tag = escapeHtmlText(child.querySelector(".node-label")?.textContent.trim() || child.dataset.kind || "模块");
    return `
      <button class="stack-row" type="button" data-child-id="${child.dataset.nodeId}" title="展开到画布">
        <span class="stack-thumb">${thumb ? `<img src="${thumb}" alt="${title}" />` : ""}</span>
        <strong>${title}</strong>
        <small>${tag}</small>
      </button>
    `;
  }).join("");
}

function findStackTarget(dragged) {
  const draggedBounds = getNodeBounds(dragged);
  const draggedCenterX = draggedBounds.x + draggedBounds.width / 2;
  let best = null;
  let bestScore = Infinity;
  getVisibleCanvasNodes(canvasWorld).forEach((node) => {
    if (node === dragged || selectedNodes.has(node)) return false;
    const bounds = getNodeBounds(node);
    const inX = draggedCenterX >= bounds.x - 90 && draggedCenterX <= bounds.x + bounds.width + 90;
    const draggedTop = draggedBounds.y;
    const draggedBottom = draggedBounds.y + draggedBounds.height;
    const dropTop = bounds.y + bounds.height - 72;
    const dropBottom = bounds.y + bounds.height + 180;
    const nearBottom = draggedBottom >= dropTop && draggedTop <= dropBottom;
    if (!inX || !nearBottom) return;
    const targetX = bounds.x + bounds.width / 2;
    const targetY = bounds.y + bounds.height + 48;
    const score = Math.abs(draggedCenterX - targetX) + Math.abs(draggedBottom - targetY);
    if (score < bestScore) {
      bestScore = score;
      best = node;
    }
  });
  return best;
}

function setActiveStackTarget(node) {
  if (activeStackTarget === node) return;
  if (activeStackTarget) activeStackTarget.classList.remove("stack-drop-target");
  activeStackTarget = node;
  if (activeStackTarget) activeStackTarget.classList.add("stack-drop-target");
}

function releaseStackChild(parent, child) {
  parent._stackChildren = (parent._stackChildren || []).filter((item) => item !== child);
  child.classList.remove("stack-member-hidden");
  delete child.dataset.stackParent;
  const parentBounds = getNodeBounds(parent);
  child.style.left = `${parentBounds.x + parentBounds.width + 36}px`;
  child.style.top = `${parentBounds.y + Math.max(0, parent._stackChildren.length * 28)}px`;
  if (parent._stackChildren.length) {
    renderStackTray(parent);
  } else {
    parent.classList.remove("has-stack", "stack-expanded");
    parent.querySelector(":scope > .stack-toggle")?.remove();
    parent.querySelector(":scope > .stack-tray")?.remove();
  }
  selectNode(child);
}

function stackNode(target, child) {
  if (!target || !child || target === child) return false;
  ensureCanvasNodeId(target, { nextId: nextCanvasNodeId });
  ensureCanvasNodeId(child, { nextId: nextCanvasNodeId });
  if (!target._stackChildren) target._stackChildren = [];
  if (target._stackChildren.includes(child)) return false;
  target._stackChildren.push(child);
  child.dataset.stackParent = target.dataset.nodeId;
  child.classList.add("stack-member-hidden");
  child.classList.remove("selected");
  target.classList.add("has-stack");
  renderStackTray(target);
  selectNode(target);
  return true;
}

function makeDraggable(node) {
  stopNativeDrag(node);
  ensureResizeHandles(node);
  ensureNodeControls(node);
  let dragging = false;
  let resizing = false;
  let start = { x: 0, y: 0 };
  let original = { x: 0, y: 0 };
  let groupOriginals = [];
  let originalSize = { width: 0, height: 0 };
  let resizeCorner = "";

  node.addEventListener("pointerdown", (event) => {
    if (activeCanvasTool === "eraser" && event.button === 0) {
      event.preventDefault();
      event.stopPropagation();
      startEraserDrag(event);
      updateEraserDrag(event);
      canvasViewport.setPointerCapture(event.pointerId);
      return;
    }
    if (event.target.isContentEditable && node.classList.contains("text-editing")) {
      if (!selectedNodes.has(node)) selectNode(node);
      event.stopPropagation();
      return;
    }
    const resizeHandle = event.target.closest(".resize-handle");
    if (resizeHandle) {
      event.stopPropagation();
      hideAddNodeMenu();
      selectNode(node);
      resizing = true;
      if (node.classList.contains("canvas-shape")) hideShapeFormatToolbar();
      if (node.classList.contains("canvas-text")) hideTextToolbar(textFormatToolbar);
      resizeCorner = resizeHandle.dataset.resize;
      node.setPointerCapture(event.pointerId);
      start = { x: event.clientX, y: event.clientY };
      original = {
        x: parseFloat(node.style.left || "0"),
        y: parseFloat(node.style.top || "0")
      };
      originalSize = {
        width: node.offsetWidth,
        height: node.offsetHeight
      };
      return;
    }

    if (event.button !== 0) return;
    event.stopPropagation();
    hideAddNodeMenu();
    if (!selectedNodes.has(node)) selectNode(node);
    dragging = true;
    if (hasMovingShape(node)) hideShapeFormatToolbar();
    if (hasMovingText(node)) hideTextToolbar(textFormatToolbar);
    node.setPointerCapture(event.pointerId);
    start = { x: event.clientX, y: event.clientY };
    original = {
      x: parseFloat(node.style.left || "0"),
      y: parseFloat(node.style.top || "0")
    };
    groupOriginals = Array.from(selectedNodes).map((item) => ({
      node: item,
      x: parseFloat(item.style.left || "0"),
      y: parseFloat(item.style.top || "0")
    }));
  });

  node.addEventListener("pointermove", (event) => {
    if (resizing) {
      const deltaX = (event.clientX - start.x) / zoom;
      const deltaY = (event.clientY - start.y) / zoom;
      const fromLeft = resizeCorner.includes("w");
      const fromTop = resizeCorner.includes("n");
      const minWidth = node.classList.contains("canvas-object") ? 24 : 160;
      const minHeight = node.classList.contains("canvas-object") ? 24 : 120;
      const width = Math.max(minWidth, originalSize.width + (fromLeft ? -deltaX : deltaX));
      const height = Math.max(minHeight, originalSize.height + (fromTop ? -deltaY : deltaY));
      node.dataset.manualSize = "true";
      node.style.width = `${width}px`;
      if (!node.classList.contains("node-image") && !node.classList.contains("node-model")) {
        node.style.minHeight = `${height}px`;
      }
      if (fromLeft) node.style.left = `${original.x + originalSize.width - width}px`;
      if (fromTop) node.style.top = `${original.y + originalSize.height - height}px`;
      if (editingImageNode === node && imageEditPopover.classList.contains("open")) positionImageEditPopover();
      if (textEditingImageNode === node && document.querySelector("#imageTextPanel")?.classList.contains("open")) positionImageTextPanel();
      return;
    }

    if (!dragging) return;
    const deltaX = (event.clientX - start.x) / zoom;
    const deltaY = (event.clientY - start.y) / zoom;
    groupOriginals.forEach((item) => {
      item.node.style.left = `${item.x + deltaX}px`;
      item.node.style.top = `${item.y + deltaY}px`;
      if (!item.node.classList.contains("node-director")) positionDirectorCard(item.node);
      if (item.node.classList.contains("node-image")) positionCanvasSuggestionBubble(item.node);
      if (window.currentAICoreBubble?.classList.contains("agent-suggestion")) positionAgentBubble();
    });
    if (node.classList.contains("node-director")) {
      const productNode = getNodeById(node.dataset.productNodeId);
      if (productNode) {
        const productBounds = getNodeBounds(productNode);
        node.dataset.offsetX = parseFloat(node.style.left || "0") - productBounds.x - productBounds.width;
        node.dataset.offsetY = parseFloat(node.style.top || "0") - productBounds.y;
      }
    }
    setActiveStackTarget(findStackTarget(node));
    if (node.classList.contains("node-image") || node.classList.contains("node-model")) {
      updateAICoreDragState(event.clientX, event.clientY);
    }
    if (editingImageNode === node && imageEditPopover.classList.contains("open")) positionImageEditPopover();
    if (textEditingImageNode === node && document.querySelector("#imageTextPanel")?.classList.contains("open")) positionImageTextPanel();
  });

  node.addEventListener("pointerup", (event) => {
    if (dragging) {
      const stackTarget = activeStackTarget || findStackTarget(node);
      if (stackTarget) {
        Array.from(selectedNodes)
          .filter((item) => item !== stackTarget)
          .forEach((item) => stackNode(stackTarget, item));
      }
    }
    setActiveStackTarget(null);
    appRoot.classList.remove("ai-core-awake");
    setAICoreState("idle");
    const shouldRestoreShapeToolbar = dragging || resizing;
    const shouldRestoreTextToolbar = dragging || resizing;
    dragging = false;
    resizing = false;
    if (shouldRestoreShapeToolbar && selectedNode?.classList.contains("canvas-shape")) {
      positionShapeFormatToolbar();
    }
    if (shouldRestoreTextToolbar && selectedNode?.classList.contains("canvas-text")) {
      positionTextFormatToolbar();
    }
  });

  node.addEventListener("dblclick", (event) => {
    if (!node.classList.contains("canvas-text")) return;
    if (event.button !== 0 || event.target.closest(".resize-handle")) return;
    event.preventDefault();
    event.stopPropagation();
    hideAddNodeMenu();
    hideCanvasContextMenu();
    setTextNodeEditing(node, true);
  });
}

function addNode({ kind, title, desc, x, y, media }) {
  return createWorkspaceNode({
    config: { kind, title, desc, x, y, media },
    renderTemplate: nodeTemplate,
    emptyState,
    canvasWorld,
    ensureNodeId,
    makeDraggable,
    selectNode,
    initModelViewer,
    onImageLoaded: (node, image) => {
      const frame = node.querySelector(".image-frame");
      if (!node.dataset.manualSize) {
        frame.style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`;
        const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
        node.style.width = `${Math.min(560, Math.max(260, 320 * ratio))}px`;
      }
      if (editingImageNode === node && imageEditPopover.classList.contains("open")) positionImageEditPopover();
    },
    onImageDoubleClick: (event, node) => {
      if (event.button !== 0 || event.target.closest(".resize-handle")) return;
      event.preventDefault();
      event.stopPropagation();
      hideCanvasContextMenu();
      hideAddNodeMenu();
      selectNode(node);
      showImageEditPopover(node);
    }
  });
}

function addGenerationPreview({ title, desc, x, y, width, aspectRatio }) {
  return createGenerationPreviewNode({
    addNode,
    title,
    desc,
    x,
    y,
    width,
    aspectRatio
  });
}

function replacePreviewWithImage(previewNode, { title, desc, url, width, aspectRatio, prompt = "", sourceNode = null, actionType = "", model = "" }) {
  return replacePreviewNodeWithImage({
    previewNode,
    addNode,
    applyGeneratedContext: markGeneratedNodeContext,
    recordGenerationCreated: (node, eventData) => {
      recordCanvasEvent("generation_created", {
        nodeId: node.dataset.nodeId,
        sourceId: eventData.sourceNode?.dataset?.nodeId || "",
        actionType: eventData.actionType,
        model: eventData.model
      });
    },
    title,
    desc,
    url,
    width,
    aspectRatio,
    prompt,
    sourceNode,
    actionType,
    model
  });
}

function addSourceBadge(node, sourceNode, label = "?????") {
  addSourceBadgeElement(node, sourceNode, {
    label,
    onSelectSource: selectNode
  });
}

function inferProductProfile(file) {
  return inferDirectorProductProfile(file);

}

function createDirectorCard(productNode, file, index = 0) {
  const profile = inferProductProfile(file);
  const bounds = getNodeBounds(productNode);
  const director = addNode({
    kind: "director",
    title: profile.name,
    desc: profile.type,
    x: bounds.x + bounds.width + 48,
    y: bounds.y + index * 28,
    media: {
      productType: profile.type,
      productName: profile.name
    }
  });
  director.dataset.productNodeId = productNode.dataset.nodeId;
  director.dataset.productType = profile.type;
  director.dataset.productName = profile.name;
  director.dataset.suggestionStart = "0";
  director.dataset.offsetX = "44";
  director.dataset.offsetY = `${index * 28}`;
  productNode.dataset.productType = profile.type;
  productNode.dataset.productName = profile.name;
  return director;
}

function getNodeById(id) {
  return findCanvasNodeById(canvasWorld, id);
}

function getDirectorNodeForProduct(productNode) {
  return Array.from(canvasWorld.querySelectorAll(".node-director")).find((node) => {
    return node.dataset.productNodeId === productNode.dataset.nodeId;
  });
}

function positionDirectorCard(productNode) {
  const director = getDirectorNodeForProduct(productNode);
  if (!director) return;
  const bounds = getNodeBounds(productNode);
  const offsetX = Number(director.dataset.offsetX || 44);
  const offsetY = Number(director.dataset.offsetY || 0);
  director.style.left = `${bounds.x + bounds.width + offsetX}px`;
  director.style.top = `${bounds.y + offsetY}px`;
}

function refreshDirectorOptions(directorNode) {
  const start = (Number(directorNode.dataset.suggestionStart || 0) + directorViewCount) % directorActions.length;
  directorNode.dataset.suggestionStart = start;
  const actions = getDirectorActionWindow({ actions: directorActions, start, count: directorViewCount });
  const actionsWrap = directorNode.querySelector(".director-actions");
  if (!actionsWrap) return;
  actionsWrap.innerHTML = `${actions.map((action, index) => `
    <button type="button" class="director-tile" data-director-action="${action.type}">
      <small>${String(index + 1).padStart(2, "0")}</small>
      <span>${escapeHtmlText(action.title)}</span>
    </button>
  `).join("")}
    <button class="director-tile director-generate-all" type="button" data-director-action="all">
      <small>04</small>
      <span>生成全部</span>
      <b>✦</b>
    </button>
  `;
}

function buildDirectorPrompt(productNode, action) {
  return buildDirectorPromptText({ productNode, action, getTitle: getStackTitle });

}

function createTextAssetNode(productNode, action) {
  const bounds = getNodeBounds(productNode);
  const desc = buildTextAssetDescription({ productNode, action, getTitle: getStackTitle });
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
  addChat("assistant", `已生成「${action.title}」，并加入产品资产组。`);
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
  card.querySelector("strong").textContent = state === "done" ? action.title : `${action.title} · 生成中`;
  const body = card.querySelector("div");
  if (state === "done" && url) {
    body.innerHTML = `<img src="${url}" alt="${escapeHtmlText(action.title)}" /><span>${escapeHtmlText(action.title)}</span>`;
    return;
  }
  body.innerHTML = `<span>${escapeHtmlText(action.title)}</span><p>AI 正在生成结果...</p>`;
}

function rememberCoreGeneratedNode(workspace, node) {
  if (!workspace || !node) return;
  workspace._generatedNodes = workspace._generatedNodes || [];
  if (!workspace._generatedNodes.includes(node)) workspace._generatedNodes.push(node);
}

async function runDirectorAction(directorNode, action, options = {}) {
  const productNode = getNodeById(directorNode.dataset.productNodeId);
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
    desc: "AI 导演正在生成产品资产",
    x: bounds.x + bounds.width + 420,
    y: bounds.y + (productNode._stackChildren?.length || 0) * 34,
    width: Math.max(280, Math.min(420, productNode.offsetWidth || 320)),
    aspectRatio: "1 / 1"
  });
  updateCorePreviewCard(options.coreWorkspace, options.coreIndex || 0, action, "loading");
  const progress = addChat("assistant", `正在生成「${action.title}」...`);
  progress.classList.add("loading");

  try {
    const productImage = productNode.querySelector(".image-frame img");
    const images = productImage ? [await imageSourceToDataUrl(productImage.src)] : [];
    const modelPrompt = buildDirectorPrompt(productNode, action);
    const result = await postJsonRequest("/api/chat", buildChatImagePayload({
      model: chatModelSelect.value,
      prompt: modelPrompt,
      images
    }));
    if (result.imageUrl) {
      const imageNode = replacePreviewWithImage(previewNode, {
        title: `${action.title}.png`,
        desc: `围绕${productNode.dataset.productName || "产品"}生成`,
        url: result.imageUrl,
        width: previewNode.offsetWidth,
        aspectRatio: previewNode.querySelector(".image-frame")?.style.aspectRatio || "1 / 1",
        prompt: modelPrompt,
        sourceNode: productNode,
        actionType: action.type,
        model: chatModelSelect.value
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
      previewNode.querySelector(".generation-frame span").textContent = "生成失败，请查看右侧信息";
    }
    updateChat(progress, result.message || `已生成「${action.title}」。`);
  } catch (error) {
    previewNode.classList.add("generation-failed");
    previewNode.querySelector(".generation-frame span").textContent = "生成失败，请查看右侧错误信息";
    updateChat(progress, `生成「${action.title}」失败：${error.message}`);
  }
  return null;
}

function addChat(role, text) {
  return appendChatMessage({ chatPanel, chatLog, role, text });
}

function updateChat(message, text) {
  updateChatMessage({ chatLog, message, text });
}

function addThinking(title, steps = []) {
  return appendThinkingMessage({ chatPanel, chatLog, title, steps, escapeHtml: escapeHtmlText });
}

function updateThinking(message, activeIndex, done = false) {
  updateThinkingMessage(message, activeIndex, done);
}

function addChatImage(role, imageUrl, caption) {
  return appendChatImage({ chatLog, role, imageUrl, caption, escapeHtml: escapeHtmlText });
}

async function imageSourceToDataUrl(src) {
  return readImageSourceAsDataUrl(src);
}


function generateFromPrompt(prompt, point) {
  generatedCount += 1;
  const nodeConfig = buildPromptGenerationNodeConfig({
    prompt,
    point,
    count: generatedCount,
    detectKind: detectGenerationKind
  });
  addNode(nodeConfig);

  addChat("assistant", `已在画布中生成 ${nodeConfig.label}。你可以继续描述风格、镜头或组件，我会扩展到同一块无限画布上。`);
}

function initModelViewer(node, file) {
  return initModelViewerPreview(node, file, {
    hideAddNodeMenu,
    selectNode
  });
}

function addUploadedFile(file, index = 0, point) {
  const kind = resolveUploadKind(file);
  if (!kind) return false;

  const url = URL.createObjectURL(file);
  const basePoint = point || viewportPointToWorld(
    canvasViewport.getBoundingClientRect().left + canvasViewport.clientWidth / 2,
    canvasViewport.getBoundingClientRect().top + canvasViewport.clientHeight / 2
  );

  const node = addNode(buildUploadedNodeConfig(file, { kind, index, basePoint, url }));
  markUploadedNode(node, kind);

  return node;
}

function addUploadedFiles(files, point, options = {}) {
  const createDirector = options.createDirector === true;
  const accepted = Array.from(files)
    .map((file, index) => ({ file, node: addUploadedFile(file, index, point) }))
    .filter((item) => item.node);
  if (accepted.length) {
    addChat("assistant", `已上传 ${accepted.length} 个素材到画布。选中模块后按 Delete 可以删除。`);
    accepted.forEach((item, index) => {
      const kind = resolveUploadKind(item.file);
      if (createDirector && (kind === "image" || kind === "model")) createDirectorCard(item.node, item.file, index);
      recordCanvasEvent("upload", {
        nodeId: item.node.dataset.nodeId,
        kind,
        name: item.file.name
      });
      if (kind === "image") scheduleAICoreAgent("upload_pause", item.node, 5000);
    });
  }
  return accepted;
}

function renderChatImagePreview() {
  renderChatImagePreviewList({
    container: chatImagePreview,
    files: chatImageFiles,
    escapeHtml: escapeHtmlText,
    onRemove: (index) => {
      chatImageFiles.splice(index, 1);
      renderChatImagePreview();
    }
  });
}

function addChatImageFiles(files) {
  return addImageFilesToPreview({
    incomingFiles: files,
    currentFiles: chatImageFiles,
    getImageFiles: getImageFilesFromList,
    render: renderChatImagePreview,
    promptForm,
    promptInput,
    resetDragDepth: () => {
      chatDragDepth = 0;
    }
  });
}

function showUploadModeBubbles(files, point, clientX, clientY) {
  const images = getImageFilesFromList(files);
  if (files.length && !images.length) {
    addUploadedFiles(files, point);
    return;
  }
  pendingUploadChoice = { files: Array.from(files), point };
  let bubbles = document.querySelector(".upload-choice-bubbles");
  if (!bubbles) {
    bubbles = document.createElement("div");
    bubbles.className = "upload-choice-bubbles";
    bubbles.innerHTML = `
      <button type="button" data-upload-mode="reference">
        <strong>参考图</strong>
        <span>仅放到画布</span>
      </button>
      <button type="button" data-upload-mode="generate">
        <strong>做生成</strong>
        <span>让 AI 继续创作</span>
      </button>
    `;
    appRoot.appendChild(bubbles);
  }
  const x = clientX ?? window.innerWidth / 2;
  const y = clientY ?? window.innerHeight / 2;
  const centered = clientX == null || clientY == null;
  bubbles.classList.toggle("centered", centered);
  if (!centered) {
    bubbles.style.left = `${Math.min(window.innerWidth - 620, Math.max(24, x - 300))}px`;
    bubbles.style.top = `${Math.min(window.innerHeight - 260, Math.max(24, y + 28))}px`;
  } else {
    bubbles.style.left = "";
    bubbles.style.top = "";
  }
  appRoot.classList.add("upload-choosing");
  bubbles.classList.add("open");
}

function hideUploadModeBubbles() {
  document.querySelector(".upload-choice-bubbles")?.classList.remove("open");
  appRoot.classList.remove("upload-choosing");
  uploadDragDepth = 0;
}

function setUploadModeHover(mode) {
  document.querySelectorAll("[data-upload-mode]").forEach((button) => {
    button.classList.toggle("drop-hover", button.dataset.uploadMode === mode);
  });
}

function chooseUploadMode(mode) {
  if (!pendingUploadChoice) return;
  const { files, point } = pendingUploadChoice;
  pendingUploadChoice = null;
  hideUploadModeBubbles();
  setUploadModeHover(null);
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
    escapeHtml: escapeHtmlText,
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
  const profile = inferProductProfile(state.file);
  accepted.node.dataset.productType = profile.type;
  accepted.node.dataset.productName = profile.name;
  hideGenerationOverlay();
  await runDirectorAction({ dataset: { productNodeId: accepted.node.dataset.nodeId } }, action);
}

function setAICoreState(state = "idle") {
  aiCore.classList.toggle("active", false);
  aiCore.classList.toggle("over", false);
  aiCore.classList.toggle("processing", false);
  const copy = {
    idle: "AI Core 在画布中感知",
    active: "AI Core 在画布中感知",
    over: "AI Core 在画布中感知",
    processing: "AI Core 在画布中感知"
  };
  aiCoreHint.textContent = copy[state] || copy.idle;
}

function isPointInAICore(clientX, clientY) {
  const { rect, distance } = getAICoreDistance(clientX, clientY);
  const radius = Math.max(rect.width, rect.height) * (aiCore.classList.contains("active") ? 0.72 : 0.56);
  return distance <= radius;
}

function getAICoreDistance(clientX, clientY) {
  const rect = aiCore.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return {
    rect,
    distance: Math.hypot(clientX - centerX, clientY - centerY),
  };
}

function isPointNearAICore(clientX, clientY) {
  const { rect, distance } = getAICoreDistance(clientX, clientY);
  const radius = Math.max(rect.width, rect.height) * 2.35;
  return distance <= radius;
}

function updateAICoreDragState(clientX, clientY) {
  setAICoreState("idle");
}

function uploadAsReference(files, point) {
  return addUploadedFiles(files, point, { createDirector: false });
}

function uploadIntoAICore(files, point) {
  setAICoreState("processing");
  const accepted = addUploadedFiles(files, point, { createDirector: false });
  if (accepted.length) {
    addChat("assistant", "AI Core 已在后台感知素材，并会在画布上给出轻量建议。");
  }
  return accepted;
}

function sendExistingNodeToAICore(node) {
  if (!node || node.classList.contains("node-director")) return false;
  if (!node.classList.contains("node-image") && !node.classList.contains("node-model")) return false;
  const fileName = getNodeTitle(node);
  const pseudoFile = { name: fileName, type: node.classList.contains("node-image") ? "image/png" : "model/3d" };
  const profile = inferProductProfile(pseudoFile);
  node.dataset.productType = profile.type;
  node.dataset.productName = profile.name;
  setAICoreState("processing");
  startCanvasAICoreInsight(node, pseudoFile);
  addChat("assistant", "AI Core 已在后台感知画布素材。");
  return true;
}

function pulseAICoreOrb() {
  setAICoreState("idle");
}

function setAICoreAgentEnabled(enabled) {
  aiCoreAgentEnabled = enabled;
  applyAgentEnabledState(aiCore, aiCoreHint, enabled);
  if (!enabled) {
    window.clearTimeout(aiCoreAgentTimer);
    window.clearTimeout(aiCoreSuggestionTimer);
    aiCoreAgentTimer = null;
    aiCoreSuggestionTimer = null;
    clearAgentBubbles();
    setAICoreState("idle");
  } else {
    setAICoreAgentState("idle");
  }
}

function setAICoreAgentState(state) {
  applyAgentState(aiCore, state);
}

function recordCanvasEvent(type, payload = {}) {
  const canonicalType = normalizeAgentEventType(type, payload, {
    getNodeKind: (nodeId) => getNodeById(nodeId)?.dataset?.kind || ""
  });
  recordCanvasEventToStore(canonicalType, payload, {
    originalType: type,
    maxEvents: 80
  });
}







function getRecentSuggestionEvents(nodeId = "") {
  return getRecentAgentSuggestionEvents(canvasEvents, nodeId);
}

function pickCachedActionForSuggestion(canvasState, suggestion = {}) {
  return pickAgentCachedActionForSuggestion({
    canvasState,
    suggestion,
    recentEvents: getRecentSuggestionEvents(canvasState?.target?.id || "")
  });
}

function normalizeAICoreAgentSuggestion(canvasState, suggestion = {}) {
  return normalizeAgentSuggestion({
    canvasState,
    suggestion,
    pickCachedAction: pickCachedActionForSuggestion
  });
}

function writeAICoreAnalysisCache(node, analysis, source = "vision") {
  if (!node || !analysis) return;
  const data = normalizeAnalysis(analysis, inferProductProfile({ name: getNodeTitle(node) }));
  data.recommendedActions = improveAgentRecommendedActions(data);
  node.dataset.aiCoreAnalysis = JSON.stringify(data);
  node.dataset.aiCoreAnalysisStatus = "ready";
  node.dataset.aiCoreAnalysisSource = source;
  if (!shouldUsePromptContext(node)) node.dataset.sourceMode = "uploaded";
  node.dataset.productName = data.productName;
  node.dataset.productType = data.category;
}

function markGeneratedNodeContext(node, { prompt = "", sourceNode = null, actionType = "", model = "" } = {}) {
  markGeneratedImageNode(node, {
    prompt,
    sourceNode,
    actionType,
    model,
    getSourceTitle: getStackTitle,
    readSourceAnalysis: (target) => readAgentNodeJson(target, "aiCoreAnalysis")
  });
}

function shouldUsePromptContext(node) {
  return isPromptBasedNode(node);
}

function scheduleAICoreAgent(reason, targetNode, delay) {
  const scheduled = scheduleAgentRun({
    enabled: aiCoreAgentEnabled,
    reason,
    targetNode,
    selectedNode,
    delay,
    previousTimer: aiCoreAgentTimer,
    setState: setAICoreAgentState,
    run: runAICoreAgent
  });
  aiCoreAgentTimer = scheduled.timer;
  aiCoreAgentReason = scheduled.reason;
  aiCoreAgentTargetId = scheduled.targetId;
  return;
}

async function ensureAICoreNodeContext(node, reason) {
  return ensureAgentNodeContext({
    node,
    reason,
    shouldUsePromptContext,
    readAnalysis: (target) => readAgentNodeJson(target, "aiCoreAnalysis"),
    inferProfile: inferProductProfile,
    getTitle: getStackTitle,
    getImageData: getAICoreImageData,
    analyzeImage: (payload) => postJsonRequest("/api/analyze-image", payload),
    normalizeAnalysis,
    writeCache: writeAICoreAnalysisCache
  });
}

function getNodeSnapshot(node) {
  return createNodeSnapshot(node, {
    getTitle: getStackTitle,
    readJson: readNodeJson,
    compactAnalysis: compactAnalysisForAgent,
    compactText,
    isSelected: (item) => selectedNodes.has(item)
  });
}

function buildCanvasState(reason, targetId) {
  return createCanvasStateSnapshot({
    reason,
    targetId,
    canvasWorld,
    selectedNode,
    selectedNodes,
    canvasEvents,
    getNodeById,
    createNodeSnapshot: getNodeSnapshot
  });
}

async function runAICoreAgent(reason, targetId) {
  if (!aiCoreAgentEnabled) return;
  const targetNode = getNodeById(targetId) || selectedNode;
  const initialState = buildCanvasState(reason, targetId);
  setAICoreAgentState("thinking");
  if (reason !== "suggestion_timeout") showAICoreAgentThinking(initialState);
  const fallbackTimer = window.setTimeout(() => {
    const bubble = window.currentAICoreBubble;
    if (reason === "suggestion_timeout") return;
    if (!bubble?.classList.contains("agent-thinking")) return;
    showAICoreAgentSuggestion(buildCanvasState(reason, targetId), {
      text: "我暂时没想好，你可以直接告诉我想做什么。",
      actionLabel: "告诉我",
      actionType: "ask"
    });
  }, 6500);
  try {
    await ensureAICoreNodeContext(targetNode, reason);
    const canvasState = buildCanvasState(reason, targetId);
    const result = await postJsonRequest("/api/canvas-agent", { canvasState });
    window.clearTimeout(fallbackTimer);
    const suggestion = normalizeAICoreAgentSuggestion(canvasState, result.suggestion || {
      text: "我暂时没想好，你可以直接告诉我想做什么。",
      actionLabel: "告诉我",
      actionType: "ask"
    });
    showAICoreAgentSuggestion(canvasState, suggestion);
  } catch {
    window.clearTimeout(fallbackTimer);
    showAICoreAgentSuggestion(buildCanvasState(reason, targetId), {
      text: "我暂时没想好，你可以直接告诉我想做什么。",
      actionLabel: "告诉我",
      actionType: "ask"
    });
  }
}

function showAICoreAgentThinking(canvasState) {
  clearAgentBubbles();
  const bubble = document.createElement("div");
  bubble.className = "canvas-ai-suggestions agent-thinking";
  bubble._canvasState = canvasState;
  bubble._targetId = canvasState.target?.id || "";
  bubble.innerHTML = `
    <div class="canvas-ai-window-title" data-typewriter></div>
    <div class="canvas-ai-actions">
      <button type="button" disabled><span>思考中</span></button>
    </div>
  `;
  bubble.addEventListener("pointerdown", (event) => event.stopPropagation());
  appRoot.appendChild(bubble);
  window.currentAICoreBubble = bubble;
  positionAgentBubble(bubble);
  typeAgentText(bubble.querySelector("[data-typewriter]"), "我在看这个素材...");
}

function showAICoreAgentSuggestion(canvasState, suggestion) {
  window.clearTimeout(aiCoreSuggestionTimer);
  clearAgentBubbles();
  const bubble = document.createElement("div");
  bubble.className = "canvas-ai-suggestions agent-suggestion";
  bubble._suggestion = suggestion;
  bubble._canvasState = canvasState;
  bubble._targetId = canvasState.target?.id || "";
  bubble.innerHTML = `
    <div class="canvas-ai-window-title" data-typewriter></div>
    <div class="canvas-ai-actions">
      <button type="button" data-agent-suggestion-action>
        <span>${escapeHtmlText(String(suggestion.actionLabel || "生成").slice(0, 6))}</span>
      </button>
    </div>
  `;
  bubble.addEventListener("pointerdown", (event) => event.stopPropagation());
  bubble.addEventListener("click", (event) => {
    const button = event.target.closest("[data-agent-suggestion-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    window.clearTimeout(aiCoreSuggestionTimer);
    aiCoreSuggestionTimer = null;
    runAICoreMockAction(bubble);
  });
  appRoot.appendChild(bubble);
  window.currentAICoreBubble = bubble;
  positionAgentBubble(bubble);
  setAICoreAgentState("suggested");
  recordCanvasEvent("ai_suggestion", {
    nodeId: bubble._targetId || "",
    text: suggestion.text || "",
    actionLabel: suggestion.actionLabel || "",
    actionType: suggestion.actionType || ""
  });
  typeAgentText(bubble.querySelector("[data-typewriter]"), suggestion.text || "要不要试试下一步？");
  aiCoreSuggestionTimer = window.setTimeout(() => {
    if (!aiCoreAgentEnabled || !document.body.contains(bubble)) return;
    runAICoreAgent("suggestion_timeout", bubble._targetId || aiCoreAgentTargetId);
  }, 5000);
}

function positionAgentBubble(bubble = window.currentAICoreBubble) {
  if (!bubble) return;
  const targetNode = getNodeById(bubble._targetId || bubble._canvasState?.target?.id) || selectedNode;
  positionBubbleAtNode(bubble, targetNode, getNodeScreenRect, aiCore);
}

function getNodeScreenRect(node) {
  return node.getBoundingClientRect();
}

function typeAgentText(target, text) {
  runAgentTypewriter(target, text);
}

function runAICoreMockAction(bubble) {
  window.clearTimeout(aiCoreSuggestionTimer);
  aiCoreSuggestionTimer = null;
  const suggestion = bubble._suggestion || {};
  const state = bubble._canvasState || buildCanvasState("manual", aiCoreAgentTargetId);
  const targetNode = getNodeById(state.target?.id) || selectedNode;
  const bounds = targetNode ? getNodeBounds(targetNode) : viewportPointToWorld(window.innerWidth / 2, window.innerHeight / 2);
  setAICoreAgentState("generating");
  const result = addNode({
    kind: "2d",
    title: suggestion.actionLabel || "AI 建议结果",
    desc: suggestion.mockResult || suggestion.text || "AI Core 已根据当前画布状态生成一个结果草稿。",
    x: targetNode ? bounds.x + bounds.width + 36 : bounds.x,
    y: targetNode ? bounds.y : bounds.y,
    media: null
  });
  result.dataset.createdBy = "ai-core-agent";
  recordCanvasEvent("mock_generate", {
    nodeId: result.dataset.nodeId,
    sourceId: targetNode?.dataset?.nodeId || "",
    actionType: suggestion.actionType || "mock"
  });
  setAICoreAgentState("completed");
  window.setTimeout(() => setAICoreAgentState("idle"), 1600);
}

function ensureCanvasSuggestionBubble(node) {
  ensureCanvasNodeId(node, { nextId: nextCanvasNodeId });
  const existing = document.querySelector(`.canvas-ai-suggestions[data-node-id="${node.dataset.nodeId}"]`);
  if (existing) {
    existing._sourceNode = node;
    return existing;
  }
  clearAgentBubbles();
  const bubble = document.createElement("div");
  bubble.className = "canvas-ai-suggestions loading";
  bubble.dataset.nodeId = node.dataset.nodeId;
  bubble._sourceNode = node;
  bubble.innerHTML = `
    <div class="canvas-ai-window-title">接下来想做什么？</div>
    <div class="canvas-ai-actions">
      <button type="button" disabled><span>识别中</span></button>
    </div>
  `;
  bubble.addEventListener("pointerdown", (event) => event.stopPropagation());
  bubble.addEventListener("dblclick", (event) => event.stopPropagation());
  bubble.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-canvas-ai-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const action = bubble._actions?.[Number(button.dataset.canvasAiAction)];
    if (!action) return;
    button.classList.add("running");
    button.disabled = true;
    try {
      await runCanvasInsightAction(node, bubble, action);
    } finally {
      button.classList.remove("running");
      button.disabled = false;
    }
  });
  appRoot.appendChild(bubble);
  positionCanvasSuggestionBubble(node, bubble);
  return bubble;
}

function positionCanvasSuggestionBubble(node, bubble = null) {
  const target = bubble || document.querySelector(`.canvas-ai-suggestions[data-node-id="${node.dataset.nodeId}"]`);
  if (!target) return;
  positionBubbleAtAgent(target, aiCore);
}

function renderCanvasSuggestionBubble(bubble, analysis, loading = false) {
  const data = normalizeAnalysis(analysis);
  const actions = data.recommendedActions.length ? data.recommendedActions.slice(0, 4) : getFallbackCoreActions(data).slice(0, 4);
  bubble._analysis = data;
  bubble._actions = actions.map((action) => {
    const base = directorActions.find((item) => item.type === action.type) || directorActions.find((item) => item.type === "poster");
    return {
      ...base,
      type: action.type,
      title: action.title,
      description: action.description,
      prompt: action.prompt || "",
      decisionStyles: action.decisionStyles,
      prepared: Boolean(action.prompt),
      kind: base.kind
    };
  });
  window.currentAICoreBubble = bubble;
  bubble.classList.toggle("loading", loading);
  bubble.querySelector(".canvas-ai-actions").innerHTML = bubble._actions.map((action, index) => `
    <button type="button" data-canvas-ai-action="${index}">
      <span>${escapeHtmlText(String(action.title || "生成").slice(0, 4))}</span>
    </button>
  `).join("");
}

function getQuickCanvasSuggestions(file) {
  const profile = inferProductProfile(file);
  return normalizeAnalysis({
    productName: profile.name,
    category: profile.type,
    industry: profile.type,
    workflowIntent: "生成行业工作流物料",
    style: "待识别",
    recommendedActions: [
      { type: "productPhoto", title: "实拍质感", description: "先生成真实产品质感图" },
      { type: "render3d", title: "3D渲染", description: "转成更立体的产品表现" },
      { type: "scene", title: "场景应用", description: "放入适合行业的使用环境" }
    ]
  }, profile);
}

async function startCanvasAICoreInsight(node, file) {
  if (!node?.classList.contains("node-image")) return;
  pulseAICoreOrb();
  const bubble = ensureCanvasSuggestionBubble(node);
  const fallback = getQuickCanvasSuggestions(file);
  const quickTimer = window.setTimeout(() => {
    if (!bubble._analysis) renderCanvasSuggestionBubble(bubble, fallback, true);
  }, 3000);
  try {
    const image = await getAICoreImageData(node, file);
    if (!image) {
      renderCanvasSuggestionBubble(bubble, fallback, false);
      return;
    }
    const result = await postJsonRequest("/api/analyze-image", {
      image,
      title: getNodeTitle(node)
    });
    const analysis = normalizeAnalysis(result.analysis, fallback);
    node.dataset.productName = analysis.productName;
    node.dataset.productType = analysis.category;
    renderCanvasSuggestionBubble(bubble, analysis, false);
  } catch (error) {
    renderCanvasSuggestionBubble(bubble, fallback, false);
    addChat("assistant", `AI Core 后台识别暂时失败，已先给出轻量建议：${error.message}`);
  } finally {
    window.clearTimeout(quickTimer);
    setAICoreState("idle");
  }
}

async function runCanvasInsightAction(productNode, bubble, action) {
  const analysis = bubble._analysis || normalizeAnalysis(null, inferProductProfile({ name: getNodeTitle(productNode) }));
  if (!action.prepared && !action.prompt) {
    try {
      const result = await postJsonRequest("/api/prepare-action", {
        analysis,
        action: {
          type: action.type,
          title: action.title,
          description: action.description
        }
      });
      const prepared = result.action || {};
      action.prompt = prepared.prompt || action.prompt;
      action.decisionStyles = normalizeDecisionStyles(prepared.decisionStyles);
      action.prepared = Boolean(action.prompt);
    } catch (error) {
      addChat("assistant", `补全「${action.title}」失败，已用基础提示继续生成：${error.message}`);
    }
  }
  const basePrompt = directorActions.find((item) => item.type === action.type)?.prompt || action.prompt || "";
  await runDirectorAction(
    { dataset: { productNodeId: productNode.dataset.nodeId } },
    { ...action, prompt: action.prompt || basePrompt }
  );
  bubble.classList.add("has-generated");
}

function bindAICoreWorkspaceEvents(workspace) {
  bindAICoreWorkspaceElement(workspace, {
    onClose: hideAICoreWorkspace,
    onRefresh: () => {
      if (workspace.classList.contains("analyzing")) return;
      workspace.dataset.refreshCount = String((Number(workspace.dataset.refreshCount || "0") || 0) + 1);
      refreshAICoreSuggestions(workspace);
    },
    onAction: async (button) => {
      const productNode = getNodeById(workspace.dataset.productNodeId);
      if (!productNode) return;
      const actionType = button.dataset.coreAction;
      button.classList.add("running");
      button.disabled = true;
      try {
        await prepareCoreAction(workspace, actionType);
      } finally {
        button.classList.remove("running");
        button.disabled = false;
      }
      showAIDecisionPanel(workspace, actionType);
    },
    onDecisionStyle: (option) => {
      workspace.querySelectorAll("[data-decision-style]").forEach((item) => item.classList.remove("selected"));
      option.classList.add("selected");
      workspace.dataset.decisionStyle = option.dataset.decisionStyle;
    },
    onGenerate: () => runWorkspaceDecision(workspace)
  });
}

function ensureAICoreWorkspace() {
  let workspace = document.querySelector(".ai-core-workspace");
  if (workspace) return workspace;
  workspace = createAICoreWorkspaceElement();
  appRoot.appendChild(workspace);
  bindAICoreWorkspaceEvents(workspace);
  return workspace;

}

function showAIDecisionPanel(workspace, actionType) {
  const panel = workspace.querySelector(".ai-decision-panel");
  const action = actionType === "all"
    ? { title: "一键生成全部", decisionStyles: getAllDecisionStyles(workspace) }
    : (workspace._coreActions || directorActions).find((item) => item.type === actionType);
  if (!action || !panel) return;
  workspace.dataset.pendingAction = actionType;
  workspace.dataset.decisionStyle = "";
  const options = panel.querySelector(".ai-decision-options");
  const decisionStyles = normalizeDecisionStyles(action.decisionStyles);
  options.innerHTML = decisionStyles.map((item) => `
    <button type="button" data-decision-style="${escapeHtmlText(item.prompt)}">${escapeHtmlText(item.label)}</button>
  `).join("");
  panel.querySelector("[data-decision-title]").textContent = `生成「${action.title}」前，我想确认一下`;
  panel.querySelector("[data-decision-question]").textContent = "你希望这次更偏向哪种方向？也可以直接生成。";
  panel.hidden = false;
  panel.classList.add("open");
}

async function prepareCoreAction(workspace, actionType) {
  if (actionType === "all") return null;
  const action = (workspace._coreActions || []).find((item) => item.type === actionType);
  if (!action || action.prepared || action.prompt) return action;
  if (!workspace._coreAnalysis) return action;
  try {
    const result = await postJsonRequest("/api/prepare-action", {
      analysis: workspace._coreAnalysis,
      action: {
        type: action.type,
        title: action.title,
        description: action.description
      }
    });
    const prepared = result.action || {};
    action.prompt = prepared.prompt || action.prompt;
    action.decisionStyles = normalizeDecisionStyles(prepared.decisionStyles);
    action.prepared = Boolean(action.prompt);
    workspace._analysisPrompts = workspace._analysisPrompts || {};
    if (action.prompt) workspace._analysisPrompts[action.type] = action.prompt;
    return action;
  } catch (error) {
    addChat("assistant", `补全「${action.title}」失败：${error.message}`);
    return action;
  }
}

async function runWorkspaceDecision(workspace) {
  const productNode = getNodeById(workspace.dataset.productNodeId);
  if (!productNode) return;
  const actionType = workspace.dataset.pendingAction;
  const style = workspace.dataset.decisionStyle;
  const coreActions = workspace._coreActions?.length ? workspace._coreActions : directorActions.slice(0, 4);
  const actions = actionType === "all"
    ? coreActions
    : coreActions.filter((action) => action.type === actionType);
  const button = workspace.querySelector(".ai-generate-now");
  button.classList.add("running");
  button.disabled = true;
  workspace.classList.add("has-results");
  try {
    for (const action of actions) {
      const index = actions.indexOf(action);
      await prepareCoreAction(workspace, action.type);
      const basePrompt = directorActions.find((item) => item.type === action.type)?.prompt || action.prompt || "";
      const modelPrompt = workspace._analysisPrompts?.[action.type] || action.prompt || basePrompt;
      const enriched = style
        ? { ...action, prompt: `${modelPrompt}\n用户选择方向：${style}` }
        : { ...action, prompt: modelPrompt };
      await runDirectorAction(
        { dataset: { productNodeId: productNode.dataset.nodeId } },
        enriched,
        { coreWorkspace: workspace, coreIndex: index }
      );
    }
    workspace.classList.add("has-results");
    workspace.querySelector(".ai-decision-panel")?.classList.remove("open");
  } finally {
    button.classList.remove("running");
    button.disabled = false;
  }
}

function normalizeAnalysis(analysis, fallback = {}) {
  return normalizeCoreAnalysis(analysis, fallback, { directorActions });
}


async function refreshAICoreSuggestions(workspace) {
  const analysis = workspace._coreAnalysis;
  if (!analysis) return;
  const refreshButton = workspace.querySelector("[data-core-refresh]");
  refreshButton?.classList.add("running");
  refreshButton && (refreshButton.disabled = true);
  try {
    const result = buildAlternativeCoreSuggestions(analysis, Number(workspace.dataset.refreshCount || "1") || 1);
    const next = normalizeAnalysis({
      ...analysis,
      recommendedActions: result.recommendedActions || [],
      generationPrompts: {
        ...(analysis.generationPrompts || {}),
        ...(result.generationPrompts || {})
      }
    });
    workspace._coreAnalysis = next;
    workspace._analysisPrompts = next.generationPrompts || {};
    renderCoreActionButtons({ workspace, data: next, loading: false, directorActions, escapeHtml: escapeHtmlText });
    updateCoreWorkspaceCards({ workspace, data: next, loading: false, escapeHtml: escapeHtmlText });
  } catch (error) {
    addChat("assistant", `换一组建议失败：${error.message}`);
  } finally {
    refreshButton?.classList.remove("running");
    refreshButton && (refreshButton.disabled = false);
  }
}

function refreshFloatingAICoreSuggestions() {
  const bubble = window.currentAICoreBubble;
  if (!bubble?._analysis) return;
  const count = (Number(bubble.dataset.refreshCount || "0") || 0) + 1;
  bubble.dataset.refreshCount = String(count);
  const next = normalizeAnalysis({
    ...bubble._analysis,
    ...buildAlternativeCoreSuggestions(bubble._analysis, count)
  });
  renderCanvasSuggestionBubble(bubble, next, false);
}

function renderAICoreAnalysis(workspace, analysis, loading = false) {
  const summary = workspace.querySelector("[data-core-analysis]");
  const status = workspace.querySelector("[data-core-status-copy]");
  const product = workspace.querySelector("[data-core-product]");
  const stateLabel = workspace.querySelector("[data-core-state-label]");
  if (!summary) return;

  const data = normalizeAnalysis(analysis);
  product.textContent = data.productName;
  stateLabel.textContent = loading ? "识别中" : "已识别";
  status.textContent = loading ? "正在调用视觉模型 API..." : `${data.category} · ${data.style}`;
  workspace.classList.toggle("analyzing", loading);
  workspace.classList.toggle("analyzed", !loading);
  renderCoreActionButtons({ workspace, data: data, loading: loading, directorActions, escapeHtml: escapeHtmlText });
  summary.innerHTML = "";

  updateCoreWorkspaceCards({ workspace, data: data, loading: loading, escapeHtml: escapeHtmlText });
}


async function getAICoreImageData(productNode, file) {
  const img = productNode.querySelector(".image-frame img");
  if (img?.src) return imageSourceToDataUrl(img.src);
  if (file instanceof Blob && file.type?.startsWith("image/")) return readFileAsDataUrl(file);
  return null;
}

async function analyzeImageForAICore(productNode, file, workspace) {
  const profile = inferProductProfile(file);
  const fallback = normalizeAnalysis(null, profile);
  renderAICoreAnalysis(workspace, fallback, true);
  setAICoreState("processing");

  try {
    const image = await getAICoreImageData(productNode, file);
    if (!image) {
      renderAICoreAnalysis(workspace, {
        ...fallback,
        sellingPoints: ["当前素材不是图片，已使用文件名和类型做基础判断。"]
      });
      return;
    }

    workspace.querySelector("[data-core-status-copy]").textContent = "正在调用视觉模型 API...";
    const result = await postJsonRequest("/api/analyze-image", {
      image,
      title: getNodeTitle(productNode),
      refreshCount: Number(workspace.dataset.refreshCount || "0") || 0
    });
    const analysis = normalizeAnalysis(result.analysis, profile);
    workspace._coreAnalysis = analysis;
    workspace._analysisPrompts = analysis.generationPrompts || {};
    writeAICoreAnalysisCache(productNode, analysis, "vision");
    renderAICoreAnalysis(workspace, analysis);
    addChat("assistant", `AI Core 已识别：${analysis.productName}。我整理了材质、颜色、卖点和可生成方向。`);
  } catch (error) {
    renderAICoreAnalysis(workspace, {
      ...fallback,
      sellingPoints: ["视觉模型暂时不可用，已保留本地推断结果。", error.message]
    });
    addChat("assistant", `AI Core 识别未完成：${error.message}`);
  } finally {
    setAICoreState("idle");
  }
}

function showAICoreWorkspace(productNode, file) {
  const workspace = ensureAICoreWorkspace();
  const img = productNode.querySelector(".image-frame img");
  const coreImg = workspace.querySelector(".ai-core-big img");
  const profile = inferProductProfile(file);
  workspace.dataset.productNodeId = productNode.dataset.nodeId;
  workspace.querySelector("[data-core-product]").textContent = profile.name || "产品";
  workspace._analysisPrompts = {};
  workspace._coreActions = [];
  workspace._coreAnalysis = null;
  workspace._generatedNodes = [];
  workspace.dataset.refreshCount = "0";
  workspace.classList.remove("has-results", "analyzed");
  workspace.classList.add("analyzing");
  if (img?.src) {
    coreImg.src = img.src;
    coreImg.classList.remove("empty");
  } else {
    coreImg.removeAttribute("src");
    coreImg.classList.add("empty");
  }
  workspace.classList.add("open");
  appRoot.classList.add("ai-core-workspace-open");
  analyzeImageForAICore(productNode, file, workspace);
}

function hideAICoreWorkspace() {
  const workspace = document.querySelector(".ai-core-workspace");
  arrangeAICoreGeneratedNodes(workspace);
  workspace?.classList.remove("open");
  appRoot.classList.remove("ai-core-workspace-open");
}

function arrangeAICoreGeneratedNodes(workspace) {
  if (!workspace?._generatedNodes?.length) return;
  const productNode = getNodeById(workspace.dataset.productNodeId);
  if (!productNode) return;
  const bounds = getNodeBounds(productNode);
  const nodes = workspace._generatedNodes.filter((node) => node?.isConnected);
  const cardWidth = Math.max(260, Math.min(360, productNode.offsetWidth || 320));
  nodes.forEach((node, index) => {
    productNode._stackChildren = (productNode._stackChildren || []).filter((child) => child !== node);
    node.classList.remove("stack-member-hidden");
    delete node.dataset.stackParent;
    node.style.left = `${bounds.x + bounds.width + 56 + (index % 2) * (cardWidth + 28)}px`;
    node.style.top = `${bounds.y + Math.floor(index / 2) * 330}px`;
    node.style.width = `${cardWidth}px`;
  });
  if (productNode._stackChildren?.length) {
    renderStackTray(productNode);
  } else {
    productNode.classList.remove("has-stack", "stack-expanded");
    productNode.querySelector(":scope > .stack-toggle")?.remove();
    productNode.querySelector(":scope > .stack-tray")?.remove();
  }
  workspace._generatedNodes = [];
}



async function runImageEditCommand(sourceNode, prompt, label = "图片编辑") {
  return executeImageEditAction({
    sourceNode,
    prompt,
    label,
    model: imageEditModel.value,
    readImageSourceAsDataUrl: imageSourceToDataUrl,
    getOutputSize: getQwenImageSizeForElement,
    createPreview: addGenerationPreview,
    replacePreview: replacePreviewWithImage,
    addSourceBadge,
    addChat,
    addThinking,
    updateThinking,
    updateChat,
    addChatImage
  });

}

function setChatCollapsed(collapsed) {
  appRoot.classList.toggle("chat-collapsed", collapsed);
  chatPanel.classList.toggle("collapsed", collapsed);
  chatFloat.classList.toggle("collapsed", collapsed);
}

function snapChatFloat() {
  const rect = chatFloat.getBoundingClientRect();
  const left = rect.left + rect.width / 2 < window.innerWidth / 2 ? 16 : window.innerWidth - rect.width - 16;
  const top = Math.max(16, Math.min(window.innerHeight - rect.height - 16, rect.top));
  chatFloat.style.left = `${left}px`;
  chatFloat.style.top = `${top}px`;
  chatFloat.style.right = "auto";
  chatFloat.style.bottom = "auto";
}

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

chatFloat.addEventListener("pointerup", () => {
  if (!chatFloatDrag) return;
  const moved = chatFloatDrag.moved;
  chatFloatDrag = null;
  snapChatFloat();
  if (!moved) setChatCollapsed(false);
});

collapseChat.addEventListener("click", () => {
  setChatCollapsed(true);
});

document.querySelectorAll(".rail-btn[data-tool]").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveRailPanelButton(button);
    runCanvasTool(button.dataset.tool);
  });
});

document.querySelectorAll("[data-shape-tool]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setShapeTool(button.dataset.shapeTool);
  });
});

textFontFamily?.addEventListener("change", () => {
  applyTextStyle({ fontFamily: textFontFamily.value });
});

textFontWeight?.addEventListener("change", () => {
  applyTextStyle({ fontWeight: textFontWeight.value });
});

textFontSize?.addEventListener("change", () => {
  applyTextStyle({ fontSize: `${textFontSize.value}px` });
});

textColorInput?.addEventListener("input", () => {
  textColorInput.closest(".text-color-picker")?.style.setProperty("--text-toolbar-color", textColorInput.value);
  applyTextStyle({ color: textColorInput.value });
});

textFormatToolbar?.querySelectorAll("[data-text-color]").forEach((button) => {
  button.addEventListener("click", () => {
    applyTextStyle({ color: button.dataset.textColor });
  });
});

textFormatToolbar?.querySelectorAll("[data-text-align]").forEach((button) => {
  button.addEventListener("click", () => {
    applyTextStyle({ textAlign: button.dataset.textAlign });
  });
});

toggleToolRail?.addEventListener("click", () => {
  toggleToolRailCollapsed(toolRail, toggleToolRail);
});

document.querySelectorAll("[data-brand-menu]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    positionFloatingMenu({ menu: brandMenu, trigger: button });
    brandMenu?.classList.toggle("open");
    projectMenu?.classList.remove("open");
  });
});

document.querySelectorAll("[data-nav-view]").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.navView;
    showView(view === "library" ? "library" : view);
  });
});

document.querySelectorAll("[data-new-project]").forEach((button) => {
  button.addEventListener("click", () => newBlankProject());
});

document.querySelectorAll("[data-save-project]").forEach((button) => {
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

function syncHomeModelPicker() {
  syncHomeModelPickerView({
    select: homeModelSelect,
    button: homeModelButton,
    menu: homeModelMenu
  });
}

function renderHomeFilePreview() {
  renderHomeFilePreviewList({
    container: homeFilePreview,
    files: homeImageFiles,
    escapeHtml: escapeHtmlText,
    onRemove: (index) => {
      homeImageFiles.splice(index, 1);
      setHomeFiles(homeImageFiles);
      homePromptInput?.focus();
    }
  });
}

function setHomeFiles(files) {
  homeImageFiles = getImageFilesFromList(files || []);
  applyHomeFileState({
    form: homePromptForm,
    uploadButton: homeUploadButton,
    count: homeImageFiles.length
  });
  renderHomeFilePreview();
}

function openHomeFilePicker() {
  if (!homeFileInput) return;
  if (typeof homeFileInput.showPicker === "function") {
    try {
      homeFileInput.showPicker();
      return;
    } catch {
      // Fall through to click; some browsers restrict showPicker.
    }
  }
  homeFileInput.click();
}

bindHomeLibraryInteractions({
  documentRoot: document,
  elements: {
    homeUploadButton: null,
    homeFileInput: null,
    homePromptForm: null,
    homePromptInput: null,
    homeModelButton: null,
    homeModelSelect: null,
    homeModelMenu: null,
    homeModelPicker: null,
    projectGrid,
    homeHistory,
    uploadAsset,
    assetUploadInput,
    chatUploadImage,
    chatImageInput,
    promptForm
  },
  actions: {
    setHomeFiles,
    syncHomeModelPicker,
    getHomeImageFiles: () => homeImageFiles,
    getLibraryViewMode: () => libraryViewMode,
    setLibraryViewModeInMemory: (mode) => { libraryViewMode = mode; },
    renderProjectLibrary,
    newBlankProject,
    saveCurrentProject,
    selectLibraryProject,
    stepLibraryProject,
    openProject,
    setLibraryWheelLock: (value) => { libraryWheelLock = value; },
    getLibraryWheelLock: () => libraryWheelLock,
    showView,
    uploadAsReference,
    addChatImageFiles,
    generateHomeProject,
    recordCanvasEvent,
    getChatDragDepth: () => chatDragDepth,
    setChatDragDepth: (value) => { chatDragDepth = value; },
    setLibraryViewModeStorage: setLibraryViewMode,
    getPendingUploadPoint: () => pendingUploadPoint,
    setPendingUploadPoint: (point) => { pendingUploadPoint = point; }
  }
});

// Safety fallback while the legacy shell is being split: keep home controls
// directly wired so a partial module migration cannot block the first screen.
homeUploadButton?.addEventListener("click", () => {
  openHomeFilePicker();
});

homeFileInput?.addEventListener("change", () => {
  setHomeFiles(homeFileInput.files);
  homeFileInput.value = "";
  homePromptInput?.focus();
});

homeModelButton?.addEventListener("click", (event) => {
  event.preventDefault();
  if (!homeModelPicker) return;
  const open = !homeModelPicker.classList.contains("open");
  homeModelPicker.classList.toggle("open", open);
  homeModelButton.setAttribute("aria-expanded", String(open));
});

homeModelMenu?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-model-value]");
  if (!button || !homeModelSelect) return;
  homeModelSelect.value = button.dataset.modelValue;
  syncHomeModelPicker();
  homeModelPicker?.classList.remove("open");
  homeModelButton?.setAttribute("aria-expanded", "false");
  homePromptInput?.focus();
});

homePromptForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = homePromptInput?.value.trim() || "";
  const files = homeImageFiles.slice();
  if (!prompt && !files.length) return;
  const model = homeModelSelect?.value;
  recordCanvasEvent("prompt_submitted", {
    source: "home",
    hasPrompt: Boolean(prompt),
    imageCount: files.length,
    model
  });
  if (homePromptInput) homePromptInput.value = "";
  setHomeFiles([]);
  await generateHomeProject(prompt, model, files);
});

document.addEventListener("click", (event) => {
  const uploadButton = event.target.closest("#homeUploadButton");
  if (uploadButton) {
    // Let the button's own click handler open the file picker. Stopping the
    // capture phase here can interfere with the browser's file-input gesture.
    return;
  }

  const modelButton = event.target.closest("#homeModelButton");
  if (modelButton) {
    event.preventDefault();
    event.stopPropagation();
    if (!homeModelPicker) return;
    const open = !homeModelPicker.classList.contains("open");
    homeModelPicker.classList.toggle("open", open);
    homeModelButton?.setAttribute("aria-expanded", String(open));
    return;
  }

  const modelOption = event.target.closest("#homeModelMenu [data-model-value]");
  if (modelOption && homeModelSelect) {
    event.preventDefault();
    event.stopPropagation();
    homeModelSelect.value = modelOption.dataset.modelValue;
    syncHomeModelPicker();
    homeModelPicker?.classList.remove("open");
    homeModelButton?.setAttribute("aria-expanded", "false");
    homePromptInput?.focus();
    return;
  }

  const toolButton = event.target.closest(".rail-btn[data-tool]");
  if (toolButton) {
    setActiveRailPanelButton(toolButton);
    runCanvasTool(toolButton.dataset.tool);
    return;
  }

  const shapeButton = event.target.closest("[data-shape-tool]");
  if (shapeButton) {
    event.preventDefault();
    event.stopPropagation();
    setShapeTool(shapeButton.dataset.shapeTool);
  }
}, true);

aiCore.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  const rect = aiCore.getBoundingClientRect();
  aiCoreDrag = {
    x: event.clientX,
    y: event.clientY,
    left: rect.left,
    top: rect.top,
    moved: false
  };
  aiCore.setPointerCapture(event.pointerId);
});

aiCore.addEventListener("pointermove", (event) => {
  if (!aiCoreDrag) return;
  const dx = event.clientX - aiCoreDrag.x;
  const dy = event.clientY - aiCoreDrag.y;
  if (Math.hypot(dx, dy) > 4) aiCoreDrag.moved = true;
  const left = Math.max(18, Math.min(window.innerWidth - aiCore.offsetWidth - 18, aiCoreDrag.left + dx));
  const top = Math.max(18, Math.min(window.innerHeight - aiCore.offsetHeight - 18, aiCoreDrag.top + dy));
  aiCore.style.left = `${left}px`;
  aiCore.style.top = `${top}px`;
  aiCore.style.right = "auto";
  aiCore.style.bottom = "auto";
  const bubble = window.currentAICoreBubble;
  if (bubble?._sourceNode) positionCanvasSuggestionBubble(bubble._sourceNode, bubble);
  if (bubble?.classList.contains("agent-suggestion")) positionAgentBubble(bubble);
});

aiCore.addEventListener("pointerup", (event) => {
  if (!aiCoreDrag) return;
  const moved = aiCoreDrag.moved;
  aiCoreDrag = null;
  aiCoreSuppressClick = moved;
  if (moved) {
    window.setTimeout(() => {
      aiCoreSuppressClick = false;
    }, 160);
  }
});

aiCore.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (aiCoreSuppressClick) return;
  setAICoreAgentEnabled(!aiCoreAgentEnabled);
});

appRoot.addEventListener("click", (event) => {
  if (!event.target.closest("#projectMenu") && !event.target.closest("#projectMenuTrigger")) {
    closeMenuWhenOutside({
      event,
      menu: projectMenu,
      menuSelector: "#projectMenu",
      triggerSelector: "#projectMenuTrigger"
    });
  }
  if (!event.target.closest("#brandMenu") && !event.target.closest("[data-brand-menu]")) {
    closeMenuWhenOutside({
      event,
      menu: brandMenu,
      menuSelector: "#brandMenu",
      triggerSelector: "[data-brand-menu]"
    });
  }
  if (!event.target.closest(".image-node-toolbar")) {
    closeOpenImageToolbarMenus(document);
  }
  if (!event.target.closest(".shape-format-toolbar")) {
    document.querySelector("#shapeFormatToolbar")?.classList.remove("picker-open");
  }
  const button = event.target.closest("[data-upload-mode]");
  if (!button) {
    if (pendingUploadChoice && !event.target.closest(".upload-choice-bubbles")) {
      hideUploadModeBubbles();
      pendingUploadChoice = null;
    }
    return;
  }
  if (!pendingUploadChoice) return;
  event.preventDefault();
  event.stopPropagation();
  chooseUploadMode(button.dataset.uploadMode);
});

appRoot.addEventListener("dragover", (event) => {
  if (!event.dataTransfer?.types?.includes("Files")) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  updateAICoreDragState(event.clientX, event.clientY);
});

appRoot.addEventListener("drop", (event) => {
  if (!event.dataTransfer?.files?.length) return;
  event.preventDefault();
  event.stopPropagation();
  const point = viewportPointToWorld(event.clientX, event.clientY);
  uploadAsReference(event.dataTransfer.files, point);
  setAICoreState("idle");
  appRoot.classList.remove("ai-core-awake");
  uploadDragDepth = 0;
});

window.addEventListener("dragend", () => {
  hideUploadModeBubbles();
  pendingUploadChoice = null;
  setUploadModeHover(null);
  appRoot.classList.remove("ai-core-awake");
  setAICoreState("idle");
});

presetSkill.addEventListener("click", () => {
  promptInput.value = "使用预设 Skill：根据当前画布素材生成一组可执行的视觉优化方案。";
  promptInput.focus();
});

canvasWorld.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-director-action]");
  if (!button) return;
  const directorNode = button.closest(".node-director");
  if (!directorNode) return;
  event.preventDefault();
  event.stopPropagation();
  const actionType = button.dataset.directorAction;
  if (actionType === "refresh") {
    refreshDirectorOptions(directorNode);
    return;
  }
  button.classList.add("running");
  button.disabled = true;
  try {
    const actions = actionType === "all"
      ? directorActions
      : directorActions.filter((action) => action.type === actionType);
    for (const action of actions) {
      await runDirectorAction(directorNode, action);
    }
  } finally {
    button.classList.remove("running");
    button.disabled = false;
  }
});

imageEditPopover.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

imageEditPopover.addEventListener("dblclick", (event) => {
  event.stopPropagation();
});

imageEditPopover.addEventListener("wheel", (event) => {
  event.stopPropagation();
}, { passive: true });

addNodeMenu.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

addNodeMenu.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-node]");
  if (!button) return;

  const point = addMenuPoint || viewportPointToWorld(
    canvasViewport.getBoundingClientRect().left + canvasViewport.clientWidth / 2,
    canvasViewport.getBoundingClientRect().top + canvasViewport.clientHeight / 2
  );
  const type = button.dataset.addNode;
  hideAddNodeMenu();

  if (type === "upload" || type === "image" || type === "video" || type === "model") {
    pendingUploadPoint = point;
    assetUploadInput.click();
    return;
  }

  const presets = {
    text: { kind: "2d", title: "文本节点", desc: "脚本、广告词、品牌文案" },
    audio: { kind: "video", title: "音频节点", desc: "音频素材、节奏和可视化参考" },
    playlist: { kind: "video", title: "播放列表", desc: "整理多个镜头、图片或视频片段" }
  };
  addNode({ ...presets[type], x: point.x, y: point.y });
});

canvasContextMenu.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

canvasContextMenu.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-context-action]");
  if (!button) return;
  const action = button.dataset.contextAction;
  const point = contextMenuPoint || viewportPointToWorld(
    canvasViewport.getBoundingClientRect().left + canvasViewport.clientWidth / 2,
    canvasViewport.getBoundingClientRect().top + canvasViewport.clientHeight / 2
  );
  hideCanvasContextMenu();

  if (action === "upload" || action === "asset") {
    pendingUploadPoint = point;
    action === "asset" ? floatingLibrary.classList.add("open") : assetUploadInput.click();
    return;
  }

  if (action === "node") {
    const rect = canvasViewport.getBoundingClientRect();
    showAddNodeMenu(rect.left + rect.width / 2, rect.top + rect.height / 2);
    addMenuPoint = point;
    return;
  }

  if (action === "tool") {
    addNode({ kind: "2d", title: "辅助工具", desc: "用于整理素材、脚本、播放列表或工作流。", x: point.x, y: point.y });
    return;
  }

  if (action === "paste") {
    try {
      const text = await navigator.clipboard.readText();
      if (text) promptInput.value = `${promptInput.value}${promptInput.value ? "\n" : ""}${text}`;
      promptInput.focus();
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

undoButton?.addEventListener("click", () => {
  recordCanvasEvent("undo", { source: "bottom-control" });
});

redoButton?.addEventListener("click", () => {
  recordCanvasEvent("redo", { source: "bottom-control" });
});

imageEditCancel.addEventListener("click", hideImageEditPopover);

imageEditSubmit.addEventListener("click", async () => {
  const prompt = imageEditPrompt.value.trim();
  if (!prompt || !editingImageNode) return;
  await executeImageEditAction({
    sourceNode: editingImageNode,
    prompt,
    label: "Qwen 图片编辑",
    model: imageEditModel.value,
    readImageSourceAsDataUrl: imageSourceToDataUrl,
    getOutputSize: getQwenImageSizeForElement,
    createPreview: addGenerationPreview,
    replacePreview: replacePreviewWithImage,
    addSourceBadge,
    addChat,
    addThinking,
    updateThinking,
    updateChat,
    addChatImage
  });
  hideImageEditPopover();
  return;
});

document.querySelectorAll(".rail-btn[data-panel]").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveRailPanelButton(button);
    floatingLibrary.classList.add("open");
  });
});

document.querySelector("#closeLibrary").addEventListener("click", () => {
  floatingLibrary.classList.remove("open");
});

document.querySelector("#jumpToCenter")?.addEventListener("click", () => {
  pan = { ...DEFAULT_CANVAS_PAN };
  zoom = 1;
  applyTransform();
});

document.querySelector("#fitView")?.addEventListener("click", () => {
  pan = { ...DEFAULT_CANVAS_PAN };
  zoom = 0.9;
  applyTransform();
});

zoomRange.addEventListener("input", () => {
  zoom = clampCanvasZoom(Number(zoomRange.value) / 100);
  applyTransform();
});

zoomOutButton?.addEventListener("click", () => {
  zoom = clampCanvasZoom(zoom - 0.1);
  applyTransform();
});

zoomInButton?.addEventListener("click", () => {
  zoom = clampCanvasZoom(zoom + 0.1);
  applyTransform();
});

returnToContentButton?.addEventListener("click", () => {
  returnViewToContent();
});

canvasViewport.addEventListener("wheel", (event) => {
  if (event.target.closest(".model-viewer")) return;
  event.preventDefault();
  const before = viewportPointToWorld(event.clientX, event.clientY);
  zoom = clampCanvasZoom(zoom * (event.deltaY > 0 ? 0.92 : 1.08));
  const rect = canvasViewport.getBoundingClientRect();
  pan = panForZoomAroundWorldPoint({
    clientX: event.clientX,
    clientY: event.clientY,
    viewportRect: rect,
    worldPoint: before,
    zoom
  });
  applyTransform();
}, { passive: false });

canvasViewport.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 && event.button !== 1) return;
  if (event.button === 0 && activeCanvasTool === "eraser") {
    event.preventDefault();
    event.stopPropagation();
    hideAddNodeMenu();
    hideCanvasContextMenu();
    hideImageEditPopover();
    startEraserDrag(event);
    canvasViewport.setPointerCapture(event.pointerId);
    return;
  }
  if (event.button === 0 && activeCanvasTool && !event.target.closest(".node-card")) {
    event.preventDefault();
    event.stopPropagation();
    hideAddNodeMenu();
    hideCanvasContextMenu();
    hideImageEditPopover();
    selectNode(null);
    if (activeCanvasTool === "text") {
      const point = viewportPointToWorld(event.clientX, event.clientY);
      addCanvasToolNode("text", { x: point.x, y: point.y, size: { width: 240, height: 86 } });
      return;
    }
    createDrawingPreview(event.clientX, event.clientY, activeCanvasTool);
    canvasViewport.setPointerCapture(event.pointerId);
    return;
  }
  if (event.button === 1) event.preventDefault();
  hideAddNodeMenu();
  hideCanvasContextMenu();
  hideImageEditPopover();
  selectNode(null);
  if (event.button === 0) {
    const rect = canvasViewport.getBoundingClientRect();
    selectionDrag = {
      box: createSelectionBox(),
      startX: event.clientX - rect.left,
      startY: event.clientY - rect.top,
      currentX: event.clientX - rect.left,
      currentY: event.clientY - rect.top,
      startClientX: event.clientX,
      startClientY: event.clientY,
      currentClientX: event.clientX,
      currentClientY: event.clientY
    };
    canvasViewport.classList.add("selecting");
    updateSelectionBox();
    canvasViewport.setPointerCapture(event.pointerId);
    return;
  }
  isPanning = true;
  canvasViewport.classList.add("dragging");
  panStart = { x: event.clientX - pan.x, y: event.clientY - pan.y };
  canvasViewport.setPointerCapture(event.pointerId);
});

canvasViewport.addEventListener("pointermove", (event) => {
  if (canvasDrawing) {
    const rect = canvasViewport.getBoundingClientRect();
    canvasDrawing.currentX = event.clientX - rect.left;
    canvasDrawing.currentY = event.clientY - rect.top;
    canvasDrawing.currentClientX = event.clientX;
    canvasDrawing.currentClientY = event.clientY;
    updateDrawingPreview();
    return;
  }
  if (eraserDrag) {
    updateEraserDrag(event);
    return;
  }
  if (selectionDrag) {
    const rect = canvasViewport.getBoundingClientRect();
    selectionDrag.currentX = event.clientX - rect.left;
    selectionDrag.currentY = event.clientY - rect.top;
    selectionDrag.currentClientX = event.clientX;
    selectionDrag.currentClientY = event.clientY;
    updateSelectionBox();
    return;
  }
  if (!isPanning) return;
  pan = { x: event.clientX - panStart.x, y: event.clientY - panStart.y };
  applyTransform();
});

canvasViewport.addEventListener("pointerup", () => {
  if (canvasDrawing) finishCanvasDrawing();
  if (eraserDrag) finishEraserDrag();
  if (selectionDrag) finishSelectionBox();
  isPanning = false;
  canvasViewport.classList.remove("dragging");
});

canvasViewport.addEventListener("dblclick", (event) => {
  if (activeCanvasTool) return;
  if (event.target.closest(".node-card") || event.target.closest(".add-node-menu") || event.target.closest(".canvas-context-menu")) return;
  event.preventDefault();
  showAddNodeMenu(event.clientX, event.clientY);
});

canvasViewport.addEventListener("contextmenu", (event) => {
  if (event.target.closest(".node-card") || event.target.closest(".add-node-menu") || event.target.closest(".image-edit-popover")) return;
  event.preventDefault();
  showCanvasContextMenu(event.clientX, event.clientY);
});

canvasViewport.addEventListener("auxclick", (event) => {
  if (event.button === 1) event.preventDefault();
});

canvasViewport.addEventListener("dragover", (event) => {
  event.preventDefault();
  if (!event.dataTransfer?.types?.includes("Files")) return;
  event.dataTransfer.dropEffect = "copy";
  updateAICoreDragState(event.clientX, event.clientY);
});

canvasViewport.addEventListener("dragenter", (event) => {
  if (!event.dataTransfer?.types?.includes("Files")) return;
  event.preventDefault();
  uploadDragDepth += 1;
  updateAICoreDragState(event.clientX, event.clientY);
});

canvasViewport.addEventListener("dragleave", (event) => {
  if (!event.dataTransfer?.types?.includes("Files")) return;
  uploadDragDepth = Math.max(0, uploadDragDepth - 1);
  const outsideWindow = event.clientX <= 0
    || event.clientY <= 0
    || event.clientX >= window.innerWidth
    || event.clientY >= window.innerHeight;
  if (!uploadDragDepth && outsideWindow) {
    appRoot.classList.remove("ai-core-awake");
    setAICoreState("idle");
  }
});

canvasViewport.addEventListener("drop", (event) => {
  event.preventDefault();
  if (event.target.closest(".node-card")) return;
  if (event.dataTransfer.files.length) {
    event.stopPropagation();
    const point = viewportPointToWorld(event.clientX, event.clientY);
    if (isPointInAICore(event.clientX, event.clientY)) {
      uploadIntoAICore(event.dataTransfer.files, point);
    } else {
      uploadAsReference(event.dataTransfer.files, point);
      setAICoreState("idle");
    }
    appRoot.classList.remove("ai-core-awake");
    uploadDragDepth = 0;
    return;
  }

  const asset = assets.find((item) => item.id === event.dataTransfer.getData("text/plain"));
  if (!asset) return;
  const point = viewportPointToWorld(event.clientX, event.clientY);
  addNode({
    kind: asset.type,
    title: asset.title,
    desc: asset.desc,
    x: point.x,
    y: point.y
  });
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = target.matches("input, textarea") || target.isContentEditable;
  if (isTyping) return;

  if (event.key === "Escape") {
    hideImageLightbox();
    hideImageCropOverlay();
    hideUploadModeBubbles();
    hideGenerationOverlay();
    hideAICoreWorkspace();
    pendingUploadChoice = null;
    setUploadModeHover(null);
    appRoot.classList.remove("ai-core-awake");
    setAICoreState("idle");
    return;
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    deleteSelectedNode();
  }
});

promptForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = promptInput.value.trim();
  if (!prompt && !chatImageFiles.length) return;
  recordCanvasEvent("prompt_submitted", {
    source: "chat-panel",
    hasPrompt: Boolean(prompt),
    imageCount: chatImageFiles.length,
    model: chatModelSelect.value
  });
  setChatCollapsed(false);
  const model = chatModelSelect.value;
  const attachmentText = chatImageFiles.length ? `（附 ${chatImageFiles.length} 张图片）` : "";
  addChat("user", `${prompt || "分析上传图片"} ${attachmentText}`);
  promptInput.value = "";
  const files = chatImageFiles;
  chatImageFiles = [];
  renderChatImagePreview();
  const thinking = addThinking("生成流程", [
    "整理提示词和参考图",
    "创建画布预览模块",
    "调用 Qwen 图像模型",
    "同步结果到右侧和画布"
  ]);
  const progress = addChat("assistant", "正在调用 Qwen 图像模型生成图片...");
  progress.classList.add("loading");
  updateThinking(thinking, 1);
  const target = viewportPointToWorld(
    canvasViewport.getBoundingClientRect().left + canvasViewport.clientWidth / 2,
    canvasViewport.getBoundingClientRect().top + canvasViewport.clientHeight / 2
  );
  const previewNode = addGenerationPreview({
    title: "Qwen 生成中.png",
    desc: prompt || "正在根据输入生成图片",
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
    updateChat(progress, result.text || result.message || "已收到模型响应。");
    if (result.imageUrl) {
      replacePreviewWithImage(previewNode, {
        title: "Qwen 生成图片.png",
        desc: "由千问图像模型生成",
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
      addChatImage("assistant", result.imageUrl, "Qwen 生成图片");
    }
    updateThinking(thinking, 4, true);
  } catch (error) {
    previewNode.classList.add("generation-failed");
    previewNode.querySelector(".generation-frame span").textContent = "生成失败，请查看右侧错误信息";
    updateThinking(thinking, 0, true);
    updateChat(progress, `生成失败：${error.message}`);
  }
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    promptInput.value = button.dataset.prompt;
    promptInput.focus();
  });
});

renderAssets();
renderProjectLibrary();
renderHomeHistory();
syncHomeModelPicker();
updateProjectTitle(getActiveProject());
setChatCollapsed(true);
showView("home");
applyTransform();
