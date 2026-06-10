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
  getActiveShapeNode as getActiveShapeNodeFromSelection,
  getShapeToolbarColorTarget,
  getShapeToolbarNode,
  hasShapeNodeInSet,
  hideShapeToolbar,
  positionShapeToolbar,
  syncShapeSvgStyles,
  updateDrawingPreviewElement
} from "./canvas/shape-tool.js";
import {
  MAX_ASCII_MODEL_BYTES as MODEL_MAX_ASCII_BYTES,
  MAX_PARSE_FACES as MODEL_MAX_PARSE_FACES,
  MAX_PREVIEW_MODEL_BYTES as MODEL_MAX_PREVIEW_BYTES,
  MAX_RENDER_FACES as MODEL_MAX_RENDER_FACES,
  MAX_VERTEX_COUNT as MODEL_MAX_VERTEX_COUNT,
  createCubeGeometry,
  normalizeModelGeometry,
  parseGlbGeometry,
  parseModelGeometryFile,
  parseObjGeometry,
  parseStlGeometry,
  sampleModelFaces
} from "./canvas/model-parser.js";
import { initModelViewerPreview } from "./canvas/model-viewer.js";
import {
  applyNodePreviewSize,
  buildGenerationPreviewConfig,
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
  getSelectionBoxRect
} from "./canvas/selection-box.js";
import {
  addSelectedNodeElement,
  clearSelectedNodeElements,
  replaceSelectedNodeElements
} from "./canvas/canvas-selection.js";
import { createCanvasNodeElement } from "./canvas/node-factory.js";
import { renderToolSvg } from "./canvas/node-icons.js";
import { renderNodeTemplate } from "./canvas/node-template.js";
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
  buildDemoProjects,
  makeDemoProjectThumb as makeDemoThumb
} from "./core/demo-projects.js";
import { createProjectRuntime } from "./core/project-runtime.js";
import { createProjectSavePatch } from "./core/project-snapshot.js";
import { applyViewState } from "./core/view-router.js";
import {
  fileToDataUrl as readFileAsDataUrl,
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
  applyProjectLibraryClasses,
  renderHomeHistoryContent,
  renderProjectLibraryContent
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
  buildAlternativeCoreSuggestions as buildCoreAlternativeSuggestions,
  getAllDecisionStyles as getCoreDecisionStyles,
  getFallbackCoreActions as getCoreFallbackActions,
  normalizeAnalysis as normalizeCoreAnalysis,
  normalizeDecisionStyles as normalizeCoreDecisionStyles,
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
let projects = loadProjects();
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

function loadProjects() {
  return loadProjectsFromStorage();
}

function saveProjects() {
  saveProjectsToStorage(projects);
}

function makeDemoProjectThumb(title, index) {
  return makeDemoThumb(title, index, escapeHtml);

  // TODO(architecture): Remove legacy inline demo thumbnail generator after
  // project initialization fully lives in /core.
  const palettes = [
    ["#f8fbff", "#dde8ff", "#4d9cff"],
    ["#fff7ed", "#fed7aa", "#f97316"],
    ["#f8fafc", "#c7d2fe", "#111827"],
    ["#fdf2f8", "#fbcfe8", "#db2777"],
    ["#ecfeff", "#bae6fd", "#0284c7"],
    ["#f7fee7", "#d9f99d", "#65a30d"],
    ["#faf5ff", "#e9d5ff", "#7c3aed"],
    ["#fff1f2", "#fecdd3", "#e11d48"],
    ["#f0fdf4", "#bbf7d0", "#16a34a"],
    ["#f9fafb", "#d1d5db", "#374151"]
  ];
  const [a, b, c] = palettes[index % palettes.length];
  const safeTitle = escapeHtml(title);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${a}"/>
          <stop offset="1" stop-color="${b}"/>
        </linearGradient>
      </defs>
      <rect width="960" height="540" rx="28" fill="url(#g)"/>
      <rect x="54" y="52" width="852" height="72" rx="20" fill="rgba(255,255,255,.74)"/>
      <rect x="86" y="164" width="372" height="260" rx="28" fill="rgba(255,255,255,.78)"/>
      <rect x="500" y="164" width="320" height="52" rx="18" fill="${c}" opacity=".9"/>
      <rect x="500" y="242" width="250" height="24" rx="12" fill="#17202c" opacity=".2"/>
      <rect x="500" y="292" width="300" height="24" rx="12" fill="#17202c" opacity=".14"/>
      <circle cx="272" cy="294" r="86" fill="${c}" opacity=".18"/>
      <text x="82" y="97" fill="#17202c" font-family="Arial, sans-serif" font-size="28" font-weight="800">${safeTitle}</text>
      <text x="500" y="396" fill="#17202c" font-family="Arial, sans-serif" font-size="22" opacity=".58">AI Studio Board ${index + 1}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function ensureDemoProjects() {
  const nextProjects = buildDemoProjects({
    projects,
    escapeHtml,
    hasSeeded: hasDemoProjectsSeeded,
    markSeeded: markDemoProjectsSeeded
  });
  if (nextProjects === projects) return;
  projects = nextProjects;
  saveProjects();
  return;

  // TODO(architecture): Remove legacy inline demo seeding after validation.
  const titles = [
    "潮玩公仔 3D 转化",
    "蕾丝连衣裙主图",
    "智能插座场景",
    "香水海报视觉",
    "咖啡杯产品页",
    "运动鞋广告片",
    "耳机光影海报",
    "美妆套装详情",
    "家具空间渲染",
    "食品包装提案"
  ];
  const existingDemoIds = new Set(projects.filter((project) => project.isDemo).map((project) => project.id));
  const missingTitles = titles
    .map((title, index) => ({ title, index }))
    .filter((item) => !existingDemoIds.has(`demo-project-${item.index + 1}`));
  if (!missingTitles.length && hasDemoProjectsSeeded()) return;
  const now = Date.now();
  const demos = missingTitles.map(({ title, index }) => ({
    id: `demo-project-${index + 1}`,
    title,
    prompt: `${title} 的历史画板`,
    thumbnail: makeDemoProjectThumb(title, index),
    createdAt: now - (index + 1) * 86400000,
    updatedAt: now - index * 4860000,
    itemCount: 1,
    isDemo: true
  }));
  projects = [...demos, ...projects];
  markDemoProjectsSeeded();
  saveProjects();
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
  if (projectSaveStatus) {
    projectSaveStatus.textContent = "已保存到云端";
    projectSaveStatus.classList.add("show");
    window.clearTimeout(projectSaveStatus._saveTimer);
    projectSaveStatus._saveTimer = window.setTimeout(() => {
      projectSaveStatus.classList.remove("show");
      projectSaveStatus.textContent = "";
    }, 1600);
  }
}

function formatProjectDate(time) {
  return formatStoredProjectDate(time);
  if (!time) return "刚刚";
  const date = new Date(time);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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

function wait(ms) {
  return waitFor(ms);
}

function renderProjectLibraryLegacy() {
  if (!projectGrid) return;
  projectGrid.classList.toggle("mode-grid", libraryViewMode === "grid");
  projectGrid.classList.toggle("mode-stack", libraryViewMode !== "grid");
  projectGrid.classList.toggle("switch-next", libraryTransitionDirection > 0);
  projectGrid.classList.toggle("switch-prev", libraryTransitionDirection < 0);
  if (!projects.length) {
    projectGrid.innerHTML = `
      <button class="project-empty" type="button" data-new-project>
        <span>＋</span>
        <strong>创建第一个项目</strong>
        <small>从一句描述开始生成图片</small>
      </button>
    `;
    return;
  }

  const activeIndex = Math.max(0, projects.findIndex((project) => project.id === activeProjectId));
  const timelineLimit = 4;
  const timelineStart = Math.max(0, Math.min(activeIndex - 1, projects.length - timelineLimit));
  const timelineProjects = projects.slice(timelineStart, timelineStart + timelineLimit);
  const viewSwitch = `
    <div class="library-bottom-tools" aria-label="项目库视图切换">
      <div class="library-view-switch">
        <button class="${libraryViewMode === "stack" ? "active" : ""}" type="button" data-library-mode="stack"><i></i>堆叠</button>
        <button class="${libraryViewMode === "grid" ? "active" : ""}" type="button" data-library-mode="grid">卡片</button>
      </div>
      <div class="library-count-pill">☆ ${projects.length}</div>
    </div>
  `;

  if (libraryViewMode === "grid") {
    projectGrid.innerHTML = `
      <section class="project-card-board" aria-label="项目卡片">
        <button class="library-new-card" type="button" data-new-project>
          <span>＋</span>
          <strong>新建项目</strong>
        </button>
        ${projects.map((project) => `
          <article class="library-small-card" data-project-id="${escapeHtml(project.id)}">
            <button type="button" data-open-project="${escapeHtml(project.id)}">
              <div>
                ${project.thumbnail
                  ? `<img src="${escapeHtml(project.thumbnail)}" alt="${escapeHtml(project.title)}" />`
                  : `<span>✦</span>`}
              </div>
              <strong>${escapeHtml(project.title || "未命名")}</strong>
              <small>更新于 ${formatProjectDate(project.updatedAt)}</small>
            </button>
          </article>
        `).join("")}
      </section>
      ${viewSwitch}
    `;
    return;
  }

  const timeline = timelineProjects.map((project) => {
    const index = projects.indexOf(project);
    return `
    <button class="timeline-item${index === activeIndex ? " active" : ""}" type="button" data-library-index="${index}">
      <span>${String(projects.length - index).padStart(2, "0")}</span>
      <strong>${formatProjectDate(project.updatedAt)}</strong>
    </button>
  `;
  }).join("");

  const boards = projects.map((project, index) => {
    const rawDepth = (index - activeIndex + projects.length) % projects.length;
    const depth = Math.min(rawDepth, 3);
    return `
    <article class="project-stack-card${index === activeIndex ? " active" : ""}${rawDepth > 3 ? " distant" : ""}" style="--stack-index:${index}; --stack-depth:${depth}" data-project-id="${escapeHtml(project.id)}">
      <button class="project-board-preview" type="button" data-open-project="${escapeHtml(project.id)}">
        ${project.thumbnail
          ? `<img src="${escapeHtml(project.thumbnail)}" alt="${escapeHtml(project.title)}" />`
          : `<span>✦</span>`}
      </button>
      <div class="project-board-meta">
        <span>${index + 1} / ${projects.length}</span>
        <strong>${escapeHtml(project.title)}</strong>
        <p>${escapeHtml(project.prompt || "空白画布项目")}</p>
      </div>
    </article>
  `;
  }).join("");

  projectGrid.innerHTML = `
    <aside class="project-timeline" aria-label="历史时间轴">
      <small>Timeline</small>
      <div>${timeline}</div>
    </aside>
    <section class="project-stack" aria-label="历史画板">
      <button class="stack-nav stack-nav-up" type="button" data-library-step="-1" aria-label="上一张"></button>
      ${boards}
      <button class="stack-nav stack-nav-down" type="button" data-library-step="1" aria-label="下一张"></button>
    </section>
    <aside class="project-count">
      <strong>${projects.length}</strong>
      <span>boards</span>
    </aside>
    ${viewSwitch}
  `;
}

function renderHomeHistoryLegacy() {
  if (!homeHistory) return;
  if (!projects.length) {
    homeHistory.innerHTML = "";
    return;
  }
  const previewProjects = projects.slice(0, 3);
  homeHistory.innerHTML = `
    <button class="home-history-trigger" type="button" data-nav-view="library" aria-label="展开项目库">
      <span class="home-history-stack">
        ${previewProjects.map((project, index) => `
          <i style="--home-stack-index:${index}">
            ${project.thumbnail
              ? `<img src="${escapeHtml(project.thumbnail)}" alt="${escapeHtml(project.title)}" />`
              : `<b>✦</b>`}
          </i>
        `).join("")}
      </span>
      <span class="home-history-open">向上展开项目库</span>
    </button>
  `;
}

const demoProjectTitles = [
  "潮玩公仔 3D 转化",
  "蕾丝连衣裙主图",
  "智能插座场景",
  "香水海报视觉",
  "咖啡杯产品页",
  "运动鞋广告片",
  "耳机光影海报",
  "美妆套装详情",
  "家具空间渲染",
  "食品包装提案"
];

function getProjectDisplayTitle(project, index = 0) {
  if (project?.isDemo) {
    const idIndex = Number(String(project.id || "").match(/(\d+)$/)?.[1] || 0) - 1;
    return demoProjectTitles[idIndex >= 0 ? idIndex : index] || project.title || "Fresh Ideas";
  }
  return project?.title || "Fresh Ideas";
}

function getProjectDisplayPrompt(project) {
  if (project?.isDemo) return "示例画板项目";
  return project?.prompt || "空白画布项目";
}

function getProjectPreview(project, index = 0) {
  if (project?.isDemo) return makeDemoProjectThumb(getProjectDisplayTitle(project, index), index);
  return project?.thumbnail || "";
}

function renderProjectLibraryBroken() {
  if (!projectGrid) return;
  projectGrid.classList.toggle("mode-grid", libraryViewMode === "grid");
  projectGrid.classList.toggle("mode-stack", libraryViewMode !== "grid");
  projectGrid.classList.toggle("switch-next", libraryTransitionDirection > 0);
  projectGrid.classList.toggle("switch-prev", libraryTransitionDirection < 0);

  if (!projects.length) {
    projectGrid.innerHTML = `
      <button class="project-empty" type="button" data-new-project>
        <span>+</span>
        <strong>创建第一个项目</strong>
        <small>从一句描述开始生成图片</small>
      </button>
    `;
    return;
  }

  const activeIndex = Math.max(0, projects.findIndex((project) => project.id === activeProjectId));
  const timelineLimit = 4;
  const timelineStart = Math.max(0, Math.min(activeIndex - 1, projects.length - timelineLimit));
  const timelineProjects = projects.slice(timelineStart, timelineStart + timelineLimit);
  const viewSwitch = `
    <div class="library-bottom-tools" aria-label="项目库视图切换">
      <div class="library-view-switch">
        <button class="${libraryViewMode === "stack" ? "active" : ""}" type="button" data-library-mode="stack"><i></i>堆叠</button>
        <button class="${libraryViewMode === "grid" ? "active" : ""}" type="button" data-library-mode="grid">卡片</button>
      </div>
      <div class="library-count-pill">☆ ${projects.length}</div>
    </div>
  `;

  if (libraryViewMode === "grid") {
    projectGrid.innerHTML = `
      <section class="project-card-board" aria-label="项目卡片">
        <button class="library-new-card" type="button" data-new-project>
          <span>+</span>
          <strong>新建项目</strong>
        </button>
        ${projects.map((project, index) => {
          const preview = getProjectPreview(project, index);
          return `
            <article class="library-small-card" data-project-id="${escapeHtml(project.id)}">
              <button type="button" data-open-project="${escapeHtml(project.id)}">
                <div>
                  ${preview
                    ? `<img src="${escapeHtml(preview)}" alt="${escapeHtml(getProjectDisplayTitle(project, index))}" />`
                    : `<span>D</span>`}
                </div>
                <strong>${escapeHtml(getProjectDisplayTitle(project, index))}</strong>
                <small>更新于 ${formatProjectDate(project.updatedAt)}</small>
              </button>
            </article>
          `;
        }).join("")}
      </section>
      ${viewSwitch}
    `;
    return;
  }

  const timeline = timelineProjects.map((project) => {
    const index = projects.indexOf(project);
    return `
      <button class="timeline-item${index === activeIndex ? " active" : ""}" type="button" data-library-index="${index}">
        <span>${String(projects.length - index).padStart(2, "0")}</span>
        <strong>${formatProjectDate(project.updatedAt)}</strong>
      </button>
    `;
  }).join("");

  const boards = projects.map((project, index) => {
    const rawDepth = (index - activeIndex + projects.length) % projects.length;
    const depth = Math.min(rawDepth, 3);
    const preview = getProjectPreview(project, index);
    return `
      <article class="project-stack-card${index === activeIndex ? " active" : ""}${rawDepth > 3 ? " distant" : ""}" style="--stack-index:${index}; --stack-depth:${depth}" data-project-id="${escapeHtml(project.id)}">
        <button class="project-board-preview" type="button" data-open-project="${escapeHtml(project.id)}">
          ${preview
            ? `<img src="${escapeHtml(preview)}" alt="${escapeHtml(getProjectDisplayTitle(project, index))}" />`
            : `<span>D</span>`}
        </button>
        <div class="project-board-meta">
          <span>${index + 1} / ${projects.length}</span>
          <strong>${escapeHtml(getProjectDisplayTitle(project, index))}</strong>
          <p>${escapeHtml(getProjectDisplayPrompt(project))}</p>
        </div>
      </article>
    `;
  }).join("");

  projectGrid.innerHTML = `
    <aside class="project-timeline" aria-label="历史时间轴">
      <small>Timeline</small>
      <div>${timeline}</div>
    </aside>
    <section class="project-stack" aria-label="历史画板">
      <button class="stack-nav stack-nav-up" type="button" data-library-step="-1" aria-label="上一张"></button>
      ${boards}
      <button class="stack-nav stack-nav-down" type="button" data-library-step="1" aria-label="下一张"></button>
    </section>
    <aside class="project-count">
      <strong>${projects.length}</strong>
      <span>boards</span>
    </aside>
    ${viewSwitch}
  `;
}

function renderHomeHistoryBroken() {
  if (!homeHistory) return;
  if (!projects.length) {
    homeHistory.innerHTML = "";
    return;
  }
  const previewProjects = projects.slice(0, 3);
  homeHistory.innerHTML = `
    <button class="home-history-trigger" type="button" data-nav-view="library" aria-label="展开项目库">
      <span class="home-history-stack" aria-hidden="true">
        ${previewProjects.map((project, index) => `
          <i style="--home-stack-index:${index}">
            ${project.thumbnail
              ? `<img src="${escapeHtml(project.thumbnail)}" alt="" />`
              : `<b>D</b>`}
          </i>
        `).join("")}
      </span>
      <span class="home-history-open" aria-hidden="true"></span>
    </button>
  `;
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
    formatProjectDate
  });
  return;
  // TODO: remove legacy inline project-library renderer after visual verification.
  projectGrid.classList.toggle("mode-grid", libraryViewMode === "grid");
  projectGrid.classList.toggle("mode-stack", libraryViewMode !== "grid");
  projectGrid.classList.toggle("switch-next", libraryTransitionDirection > 0);
  projectGrid.classList.toggle("switch-prev", libraryTransitionDirection < 0);

  if (!projects.length) {
    projectGrid.innerHTML = `
      <button class="project-empty" type="button" data-new-project>
        <span>+</span>
        <strong>创建第一个项目</strong>
        <small>从一句描述开始生成图片</small>
      </button>
    `;
    return;
  }

  const activeIndex = Math.max(0, projects.findIndex((project) => project.id === activeProjectId));
  const timelineLimit = 4;
  const timelineStart = Math.max(0, Math.min(activeIndex - 1, projects.length - timelineLimit));
  const timelineProjects = projects.slice(timelineStart, timelineStart + timelineLimit);
  const viewSwitch = `
    <div class="library-bottom-tools" aria-label="项目库视图切换">
      <div class="library-view-switch">
        <button class="${libraryViewMode === "stack" ? "active" : ""}" type="button" data-library-mode="stack"><i></i>堆叠</button>
        <button class="${libraryViewMode === "grid" ? "active" : ""}" type="button" data-library-mode="grid">卡片</button>
      </div>
      <div class="library-count-pill">☆ ${projects.length}</div>
    </div>
  `;

  if (libraryViewMode === "grid") {
    projectGrid.innerHTML = `
      <section class="project-card-board" aria-label="项目卡片">
        <button class="library-new-card" type="button" data-new-project>
          <span>+</span>
          <strong>新建项目</strong>
        </button>
        ${projects.map((project, index) => {
          const preview = getProjectPreview(project, index);
          return `
            <article class="library-small-card" data-project-id="${escapeHtml(project.id)}">
              <button type="button" data-open-project="${escapeHtml(project.id)}">
                <div>
                  ${preview
                    ? `<img src="${escapeHtml(preview)}" alt="${escapeHtml(getProjectDisplayTitle(project, index))}" />`
                    : `<span>D</span>`}
                </div>
                <strong>${escapeHtml(getProjectDisplayTitle(project, index))}</strong>
                <small>更新于 ${formatProjectDate(project.updatedAt)}</small>
              </button>
            </article>
          `;
        }).join("")}
      </section>
      ${viewSwitch}
    `;
    return;
  }

  const timeline = timelineProjects.map((project) => {
    const index = projects.indexOf(project);
    return `
      <button class="timeline-item${index === activeIndex ? " active" : ""}" type="button" data-library-index="${index}">
        <span>${String(projects.length - index).padStart(2, "0")}</span>
        <strong>${formatProjectDate(project.updatedAt)}</strong>
      </button>
    `;
  }).join("");

  const boards = projects.map((project, index) => {
    const rawDepth = (index - activeIndex + projects.length) % projects.length;
    const depth = Math.min(rawDepth, 3);
    const preview = getProjectPreview(project, index);
    return `
      <article class="project-stack-card${index === activeIndex ? " active" : ""}${rawDepth > 3 ? " distant" : ""}" style="--stack-index:${index}; --stack-depth:${depth}" data-project-id="${escapeHtml(project.id)}">
        <button class="project-board-preview" type="button" data-open-project="${escapeHtml(project.id)}">
          ${preview
            ? `<img src="${escapeHtml(preview)}" alt="${escapeHtml(getProjectDisplayTitle(project, index))}" />`
            : `<span>D</span>`}
        </button>
        <div class="project-board-meta">
          <span>${index + 1} / ${projects.length}</span>
          <strong>${escapeHtml(getProjectDisplayTitle(project, index))}</strong>
          <p>${escapeHtml(getProjectDisplayPrompt(project))}</p>
        </div>
      </article>
    `;
  }).join("");

  projectGrid.innerHTML = `
    <aside class="project-timeline" aria-label="历史时间轴">
      <small>Timeline</small>
      <div>${timeline}</div>
    </aside>
    <section class="project-stack" aria-label="历史画板">
      <button class="stack-nav stack-nav-up" type="button" data-library-step="-1" aria-label="上一张"></button>
      ${boards}
      <button class="stack-nav stack-nav-down" type="button" data-library-step="1" aria-label="下一张"></button>
    </section>
    <aside class="project-count">
      <strong>${projects.length}</strong>
      <span>boards</span>
    </aside>
    ${viewSwitch}
  `;
}

function renderHomeHistoryMojibake() {
  if (!homeHistory) return;
  if (!projects.length) {
    homeHistory.innerHTML = `
      <button class="home-history-trigger" type="button" data-nav-view="library" aria-label="展开项目库">
        <span class="home-history-stack" aria-hidden="true">
          <i style="--home-stack-index:0"><b>D</b></i>
          <i style="--home-stack-index:1"><b>D</b></i>
          <i style="--home-stack-index:2"><b>D</b></i>
        </span>
        <span class="home-history-open" aria-hidden="true"></span>
      </button>
    `;
    return;
  }
  const previewProjects = projects.slice(0, 3);
  homeHistory.innerHTML = `
    <button class="home-history-trigger" type="button" data-nav-view="library" aria-label="展开项目库">
      <span class="home-history-stack" aria-hidden="true">
        ${previewProjects.map((project, index) => {
          const preview = getProjectPreview(project, index);
          return `
            <i style="--home-stack-index:${index}">
              ${preview
                ? `<img src="${escapeHtml(preview)}" alt="" />`
                : `<b>D</b>`}
            </i>
          `;
        }).join("")}
      </span>
      <span class="home-history-open" aria-hidden="true"></span>
    </button>
  `;
}

function renderHomeHistory() {
  if (!homeHistory) return;
  homeHistory.innerHTML = renderHomeHistoryContent({
    projects,
    getProjectPreview
  });
  return;
  // TODO: remove legacy inline home-history renderer after visual verification.
  const previewProjects = projects.length ? projects.slice(0, 3) : [];
  const cards = (previewProjects.length ? previewProjects : [{ title: "Fresh Ideas" }, { title: "Fresh Ideas" }, { title: "Fresh Ideas" }])
    .map((project, index) => {
      const preview = project.id ? getProjectPreview(project, index) : "";
      return `
        <i style="--home-stack-index:${index}">
          ${preview ? `<img src="${escapeHtml(preview)}" alt="" />` : `<b>D</b>`}
        </i>
      `;
    }).join("");

  homeHistory.innerHTML = `
    <button class="home-history-trigger" type="button" data-nav-view="library" aria-label="展开项目库">
      <span class="home-history-stack" aria-hidden="true">${cards}</span>
      <span class="home-history-open" aria-hidden="true"></span>
    </button>
  `;
}

function selectLibraryProject(index) {
  if (!projects.length) return;
  const nextIndex = (index + projects.length) % projects.length;
  const currentIndex = Math.max(0, projects.findIndex((project) => project.id === activeProjectId));
  libraryTransitionDirection = nextIndex === currentIndex ? 0 : (nextIndex > currentIndex ? 1 : -1);
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
  await wait(260);
  resetCanvasForProject();
  showView("canvas");
  document.body.classList.remove("home-transitioning");
  document.body.classList.add("canvas-entering");
  window.setTimeout(() => document.body.classList.remove("canvas-entering"), 620);
  setChatCollapsed(false);
  if (model && chatModelSelect) chatModelSelect.value = model;
  chatImageFiles = getImageFiles(files);
  renderChatImagePreview();
  promptInput.value = prompt || (chatImageFiles.length ? "参考上传图片生成一张高质量视觉方案" : "");
  promptForm.requestSubmit();
  updateActiveProject({ itemCount: 1 });
  return project;
}

const modelExtensions = [".glb", ".gltf", ".obj", ".fbx", ".stl", ".usdz"];
const MAX_RENDER_FACES = MODEL_MAX_RENDER_FACES;
const MAX_PARSE_FACES = MODEL_MAX_PARSE_FACES;
const MAX_VERTEX_COUNT = MODEL_MAX_VERTEX_COUNT;
const MAX_ASCII_MODEL_BYTES = MODEL_MAX_ASCII_BYTES;
const MAX_PREVIEW_MODEL_BYTES = MODEL_MAX_PREVIEW_BYTES;
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

function escapeHtml(value) {
  return escapeHtmlText(value);
}

function renderAssets() {
  assetList.innerHTML = assets.map((asset) => `
    <article class="asset-item" draggable="true" data-id="${asset.id}" data-type="${asset.type}">
      <div class="asset-thumb">${asset.type.toUpperCase()}</div>
      <div>
        <strong>${asset.title}</strong>
        <span>${asset.desc}</span>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".asset-item").forEach((item) => {
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", item.dataset.id);
    });
  });
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

function getSelectedTextEditor() {
  return getTextEditorFromNode(selectedNode);
}

function hideTextFormatToolbar() {
  hideTextToolbar(textFormatToolbar);
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
  let toolbar = document.querySelector("#shapeFormatToolbar");
  if (toolbar) return toolbar;
  toolbar = document.createElement("div");
  toolbar.id = "shapeFormatToolbar";
  toolbar.className = "shape-format-toolbar";
  toolbar.innerHTML = `
    <button type="button" class="shape-color-trigger" data-color-target="fill" title="填充颜色">
      <span class="shape-swatch fill-swatch"></span>
    </button>
    <button type="button" class="shape-color-trigger" data-color-target="stroke" title="描边颜色">
      <span class="shape-swatch stroke-swatch"></span>
    </button>
    <label class="stroke-width-control" title="描边宽度">
      <span>描边</span>
      <input type="range" data-shape-style="strokeWidth" min="1" max="12" value="3" />
    </label>
    <div class="shape-color-popover">
      <div class="shape-color-spectrum" data-shape-spectrum><i></i></div>
      <button type="button" data-shape-color="transparent" class="color-none">无颜色</button>
      <button type="button" data-shape-color="#ffffff" style="--color:#ffffff"></button>
      <button type="button" data-shape-color="#1f2933" style="--color:#1f2933"></button>
      <button type="button" data-shape-color="#b98f8f" style="--color:#b98f8f"></button>
      <button type="button" data-shape-color="#4f6f9f" style="--color:#4f6f9f"></button>
      <button type="button" data-shape-color="#4f7d5a" style="--color:#4f7d5a"></button>
      <button type="button" data-shape-color="#d89a3d" style="--color:#d89a3d"></button>
      <button type="button" data-shape-color="#8b5cf6" style="--color:#8b5cf6"></button>
      <button type="button" data-shape-color="#ef4444" style="--color:#ef4444"></button>
    </div>
  `;
  toolbar.dataset.colorTarget = "fill";
  toolbar.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    if (event.target.closest("[data-shape-spectrum], [data-shape-color]")) {
      applyShapeToolbarColor(event, toolbar);
    }
  });
  toolbar.addEventListener("input", (event) => {
    const input = event.target.closest("[data-shape-style]");
    const shapeNode = getActiveShapeNode();
    if (!input || !shapeNode) return;
    if (input.dataset.shapeStyle === "strokeWidth") {
      shapeNode.style.setProperty("--shape-stroke-width", input.value);
      syncShapeNodeStyles(shapeNode);
    }
  });
  toolbar.addEventListener("click", handleShapeToolbarClick);
  window.addEventListener("pointermove", handleShapeColorDragMove);
  window.addEventListener("pointerup", handleShapeColorDragEnd);
  document.body.appendChild(toolbar);
  return toolbar;
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
  setShapeNodeColor(shapeNode, getShapeToolbarTarget(toolbar), hslToHex(x * 360, 82, 88 - y * 76));
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
    const color = hslToHex(x * 360, 82, 88 - y * 76);
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
  if (isFixedStrokeTool(selectedNode.dataset.tool)) {
    hideShapeFormatToolbar();
    return;
  }
  const rect = getCanvasNodeScreenRect(selectedNode);
  if (!rect) return;
  positionShapeToolbar({
    toolbar,
    node: selectedNode,
    nodeRect: rect,
    isLinear: isLinearDrawTool(selectedNode.dataset.tool)
  });
}

function hslToHex(h, s, l) {
  return hslToHexColor(h, s, l);
  // TODO: remove legacy inline color conversion after drawing-tool verification.
  const saturation = s / 100;
  const lightness = l / 100;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = lightness - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
      : h < 180 ? [0, c, x]
        : h < 240 ? [0, x, c]
          : h < 300 ? [x, 0, c]
            : [c, 0, x];
  return `#${[r, g, b].map((value) => Math.round((value + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

function setSelectedShapeColor(target, color) {
  const shapeNode = getActiveShapeNode();
  if (!shapeNode) return;
  setShapeNodeColor(shapeNode, target, color);
}

function setShapeNodeColor(node, target, color) {
  node.style.setProperty(target === "stroke" ? "--shape-stroke" : "--shape-fill", color);
  syncShapeNodeStyles(node);
  positionShapeFormatToolbar();
}

function syncShapeNodeStyles(node) {
  syncShapeSvgStyles(node);
}

function isLinearDrawTool(tool) {
  return isLinearDrawToolName(tool);
}

function isFixedStrokeTool(tool) {
  return isFixedStrokeToolName(tool);
}

function pointsToPath(points, offsetX = 0, offsetY = 0) {
  return buildPointsPath(points, offsetX, offsetY);
  // TODO: remove legacy inline path builder after drawing-tool verification.
  if (!points.length) return "";
  if (points.length === 1) return `M${points[0].x - offsetX} ${points[0].y - offsetY}`;
  return points.map((point, index) => `${index ? "L" : "M"}${point.x - offsetX} ${point.y - offsetY}`).join(" ");
}

function linearSvg(tool, width, height, start, end) {
  return buildLinearSvg(tool, width, height, start, end);
  // TODO: remove legacy inline linear SVG builder after drawing-tool verification.
  const sx = start.x;
  const sy = start.y;
  const ex = end.x;
  const ey = end.y;
  if (tool === "line") {
    return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path d="M${sx} ${sy}L${ex} ${ey}" /></svg>`;
  }
  const angle = Math.atan2(ey - sy, ex - sx);
  const head = Math.min(28, Math.max(14, Math.hypot(ex - sx, ey - sy) * 0.18));
  const a1 = angle - Math.PI / 7;
  const a2 = angle + Math.PI / 7;
  const hx1 = ex - Math.cos(a1) * head;
  const hy1 = ey - Math.sin(a1) * head;
  const hx2 = ex - Math.cos(a2) * head;
  const hy2 = ey - Math.sin(a2) * head;
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path d="M${sx} ${sy}L${ex} ${ey}" /><path d="M${hx1} ${hy1}L${ex} ${ey}L${hx2} ${hy2}" /></svg>`;
}

function positionTextFormatToolbar() {
  if (!textFormatToolbar) return;
  const editor = getSelectedTextEditor();
  if (!editor) {
    hideTextFormatToolbar();
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
  const editor = getSelectedTextEditor();
  if (!applyTextEditorStyle(editor, style)) return;
  positionTextFormatToolbar();
}

function rgbToHex(color) {
  return rgbToHexColor(color);
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

function detectKind(prompt) {
  return detectGenerationKind(prompt);
}

function drawToolSvg(tool) {
  return renderToolSvg(tool);
}

function nodeTemplateBroken(kind, title, desc, media = {}) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(desc);

  if (kind === "loading-image") {
    return `
      <div class="image-file-name">▧ ${safeTitle}</div>
      <figure class="image-frame generation-frame">
        <div class="generation-content">
          <div class="generation-spinner"></div>
          <strong>正在生成图片</strong>
          <span>${safeDesc}</span>
        </div>
      </figure>
    `;
  }

  if (kind === "image") {
    return `
      <div class="image-file-name">▧ ${safeTitle}</div>
      <figure class="image-frame">
        <img src="${media.url}" alt="${safeTitle}" draggable="false" />
      </figure>
    `;
  }

  if (kind === "model") {
    return `
      <div class="image-file-name model-file-name">◌ ${safeTitle}</div>
      <div class="model-viewer">
        <canvas data-model-viewer aria-label="${safeTitle} 3D 预览"></canvas>
        <div class="model-loading">左键拖动 · 右键旋转 · 滚轮缩放</div>
      </div>
    `;
  }

  if (kind === "director") {
    const start = Number(media.suggestionStart || 0);
    const visibleActions = Array.from({ length: directorViewCount }, (_, index) => {
      return directorActions[(start + index) % directorActions.length];
    });
    return `
      <div class="director-head">
        <span>✧ AI Suggestions</span>
        <button type="button" class="director-refresh" data-director-action="refresh" title="换一组">↻</button>
      </div>
      <div class="director-actions">
        ${visibleActions.map((action, index) => `
          <button type="button" class="director-tile" data-director-action="${action.type}">
            <small>${String(index + 1).padStart(2, "0")}</small>
            <span>${escapeHtml(action.title)}</span>
          </button>
        `).join("")}
        <button class="director-tile director-generate-all" type="button" data-director-action="all">
          <small>04</small>
          <span>生成全部</span>
          <b>✦</b>
        </button>
      </div>
    `;
  }

  if (kind === "draw") {
    const tool = media.tool || "rect";
    const label = media.label || safeTitle;
    if (tool === "text") {
      return `
        <div class="draw-node draw-text">
          <div class="canvas-text-editor" contenteditable="false" spellcheck="false">${escapeHtml(label)}</div>
        </div>
      `;
    }
    if (SHAPE_TEXT_TOOLS.has(tool)) {
      return `
        <div class="draw-node draw-${escapeHtml(tool)}">
          <div class="draw-shape" aria-hidden="true">
            ${drawToolSvg(tool)}
          </div>
          <div class="canvas-text-editor shape-text-editor" contenteditable="false" spellcheck="false">${escapeHtml(label)}</div>
        </div>
      `;
    }
    return `
      <div class="draw-node draw-${escapeHtml(tool)}">
        <div class="draw-shape" aria-hidden="true">
          ${drawToolSvg(tool)}
        </div>
      </div>
    `;
  }

  if (kind === "3d") {
    return `
      <div class="node-label">3D 预览</div>
      <div class="cube-scene">
        <div class="cube">
          <span class="face front"></span>
          <span class="face back"></span>
          <span class="face right"></span>
          <span class="face left"></span>
          <span class="face top"></span>
          <span class="face bottom"></span>
        </div>
      </div>
      <p>${desc}</p>
    `;
  }

  if (kind === "video" && media.url) {
    return `
      <div class="node-label">视频</div>
      <video class="media-preview video-file-preview" src="${media.url}" controls></video>
      <h3>${safeTitle}</h3>
      <p>${safeDesc}</p>
    `;
  }

  if (kind === "video") {
    return `
      <div class="node-label">视频预览</div>
      <div class="video-preview">
        <span class="play">▶</span>
        <i></i>
      </div>
      <p>${desc}</p>
    `;
  }

  return `
    <div class="node-label">2D 页面</div>
    <h3>${safeTitle}</h3>
    <p>${safeDesc}</p>
  `;
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

  // TODO: remove this legacy fallback after node-template.js is verified in production.
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(desc);

  if (kind === "loading-image") {
    return `
      <div class="image-file-name">▧ ${safeTitle}</div>
      <figure class="image-frame generation-frame">
        <div class="generation-content">
          <div class="generation-spinner"></div>
          <strong>正在生成图片</strong>
          <span>${safeDesc}</span>
        </div>
      </figure>
    `;
  }

  if (kind === "image") {
    return `
      <div class="image-file-name">▧ ${safeTitle}</div>
      <figure class="image-frame">
        <img src="${media.url}" alt="${safeTitle}" draggable="false" />
      </figure>
    `;
  }

  if (kind === "model") {
    return `
      <div class="image-file-name model-file-name">◌ ${safeTitle}</div>
      <div class="model-viewer">
        <canvas data-model-viewer aria-label="${safeTitle} 3D 预览"></canvas>
        <div class="model-loading">左键拖动 · 右键旋转 · 滚轮缩放</div>
      </div>
    `;
  }

  if (kind === "director") {
    const start = Number(media.suggestionStart || 0);
    const visibleActions = Array.from({ length: directorViewCount }, (_, index) => {
      return directorActions[(start + index) % directorActions.length];
    });
    return `
      <div class="director-head">
        <span>✦ AI 建议</span>
        <button type="button" class="director-refresh" data-director-action="refresh" title="换一组">↻</button>
      </div>
      <div class="director-actions">
        ${visibleActions.map((action, index) => `
          <button type="button" class="director-tile" data-director-action="${action.type}">
            <small>${String(index + 1).padStart(2, "0")}</small>
            <span>${escapeHtml(action.title)}</span>
          </button>
        `).join("")}
        <button class="director-tile director-generate-all" type="button" data-director-action="all">
          <small>04</small>
          <span>生成全部</span>
          <b>✦</b>
        </button>
      </div>
    `;
  }

  if (kind === "3d") {
    return `
      <div class="node-label">3D 预览</div>
      <div class="cube-scene">
        <div class="cube">
          <span class="face front"></span>
          <span class="face back"></span>
          <span class="face right"></span>
          <span class="face left"></span>
          <span class="face top"></span>
          <span class="face bottom"></span>
        </div>
      </div>
      <p>${safeDesc}</p>
    `;
  }

  if (kind === "video" && media.url) {
    return `
      <div class="node-label">视频</div>
      <video class="media-preview video-file-preview" src="${media.url}" controls></video>
      <h3>${safeTitle}</h3>
      <p>${safeDesc}</p>
    `;
  }

  if (kind === "video") {
    return `
      <div class="node-label">视频预览</div>
      <div class="video-preview">
        <span class="play">▶</span>
        <i></i>
      </div>
      <p>${safeDesc}</p>
    `;
  }

  return `
    <div class="node-label">2D 页面</div>
    <h3>${safeTitle}</h3>
    <p>${safeDesc}</p>
  `;
}

function clearSelection() {
  selectedNode = clearSelectedNodeElements(selectedNodes);
  hideTextFormatToolbar();
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
    const result = await postJson("/api/extract-image-text", { image });
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
      showImageLightbox(img.src, getStackTitle(node));
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
      link.download = getStackTitle(node).replace(/^▧\s*/, "") || "image.png";
      link.click();
    }
  });
  node.appendChild(managedToolbar);
  return;

  // TODO(architecture): Remove legacy inline toolbar creation when this
  // compatibility layer is retired.
  const toolbar = document.createElement("div");
  toolbar.className = "image-node-toolbar";
  toolbar.innerHTML = `
    <button type="button" title="裁剪" aria-label="裁剪" data-toolbar-action="crop">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M2 6h14a2 2 0 0 1 2 2v14" /></svg>
    </button>
    <button type="button" title="放大" aria-label="放大" data-toolbar-action="zoom">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /><path d="M10.5 7.5v6" /><path d="M7.5 10.5h6" /></svg>
    </button>
    <button type="button" title="移除背景" aria-label="移除背景" data-toolbar-action="remove-bg">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /><path d="M7 3l14 14" /><path d="M3 7l14 14" /></svg>
    </button>
    <button type="button" title="扩展" aria-label="扩展" data-toolbar-action="expand-image">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5" /><path d="M16 3h5v5" /><path d="M21 16v5h-5" /><path d="M8 21H3v-5" /><path d="M3 3l6 6" /><path d="M21 3l-6 6" /><path d="M21 21l-6-6" /><path d="M3 21l6-6" /></svg>
    </button>
    <button type="button" title="编辑文字" aria-label="编辑文字" data-toolbar-action="edit-text">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14" /><path d="M12 5v14" /><path d="M8 19h8" /><path d="M4 9V5h16v4" /></svg>
    </button>
    <span class="toolbar-separator"></span>
    <button type="button" title="加入资产" aria-label="加入资产">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h6l2 3h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" /><path d="M16 13v5" /><path d="M13.5 15.5h5" /></svg>
    </button>
    <button type="button" class="toolbar-strong" title="下载" aria-label="下载" data-toolbar-action="download">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" /></svg>
    </button>
    <div class="image-toolbar-menu" role="menu">
      <button type="button" data-toolbar-action="expand-image"><span>▣</span>扩图</button>
      <button type="button"><span>◇</span>擦除</button>
      <button type="button"><span>⌁</span>标注</button>
      <button type="button"><span>HD</span>增强</button>
      <button type="button"><span>↔</span>调整像素</button>
      <button type="button"><span>▧</span>抠图</button>
      <button type="button"><span>▦</span>快速切分 <small>2×2　3×3　4×4</small></button>
      <button type="button"><span>♢</span>Seedance 2.0 合规验证</button>
    </div>
  `;
  toolbar.addEventListener("pointerdown", (event) => event.stopPropagation());
  toolbar.addEventListener("dblclick", (event) => event.stopPropagation());
  toolbar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-toolbar-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const img = node.querySelector(".image-frame img");
    if (!img) return;
    const action = button.dataset.toolbarAction;
    if (action === "more") {
      toolbar.classList.toggle("menu-open");
      return;
    }
    toolbar.classList.remove("menu-open");
    if (action === "crop") {
      startImageCrop(node);
      return;
    }
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
      link.download = getStackTitle(node).replace(/^▧\s*/, "") || "image.png";
      link.click();
    }
  });
  node.appendChild(toolbar);
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
  node.style.setProperty("--shape-fill", isLinearDrawTool(tool) || isFixedStrokeTool(tool) ? "transparent" : "#ffffff");
  node.style.setProperty("--shape-stroke", isFixedStrokeTool(tool) ? "#050505" : "#1f2933");
  node.style.setProperty("--shape-stroke-width", isFixedStrokeTool(tool) ? "4" : "3");
  node.dataset.kind = "draw";
  node.dataset.tool = tool;
  ensureNodeId(node);
  if (tool === "text") {
    node.innerHTML = `
      <div class="canvas-text-editor" contenteditable="false" spellcheck="false" data-placeholder="输入文字"></div>
    `;
  } else if (SHAPE_TEXT_TOOLS.has(tool)) {
    node.innerHTML = `
      <div class="draw-shape" aria-hidden="true">${drawToolSvg(tool)}</div>
      <div class="canvas-text-editor shape-text-editor" contenteditable="false" spellcheck="false" data-placeholder="输入文字"></div>
    `;
  } else {
    node.innerHTML = `<div class="draw-shape" aria-hidden="true">${options.svgMarkup || drawToolSvg(tool)}</div>`;
  }
  node.classList.toggle("node-text-tool", tool === "text");
  node.classList.toggle("node-shape-text", SHAPE_TEXT_TOOLS.has(tool));
  node.dataset.manualSize = "true";
  emptyState.classList.add("hidden");
  makeDraggable(node);
  node.querySelector(".node-expand")?.remove();
  canvasWorld.appendChild(node);
  syncShapeNodeStyles(node);
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
    renderSvg: drawToolSvg,
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
    const path = pointsToPath(worldPoints, minX - pad, minY - pad);
    addCanvasToolNode("pen", {
      x: minX - pad,
      y: minY - pad,
      size: { width: nodeWidth, height: nodeHeight },
      svgMarkup: `<svg viewBox="0 0 ${nodeWidth} ${nodeHeight}" preserveAspectRatio="none"><path d="${path}" /></svg>`
    });
    return;
  }
  if (isLinearDrawTool(tool)) {
    const pad = 12;
    const nodeWidth = Math.max(18, width + pad * 2);
    const nodeHeight = Math.max(18, height + pad * 2);
    const startRel = { x: start.x <= end.x ? pad : nodeWidth - pad, y: start.y <= end.y ? pad : nodeHeight - pad };
    const endRel = { x: start.x <= end.x ? nodeWidth - pad : pad, y: start.y <= end.y ? nodeHeight - pad : pad };
    addCanvasToolNode(tool, {
      x: x - pad,
      y: y - pad,
      size: { width: nodeWidth, height: nodeHeight },
      svgMarkup: linearSvg(tool, nodeWidth, nodeHeight, startRel, endRel)
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
  eraserDrag.stroke.querySelector("path")?.setAttribute("d", pointsToPath(eraserDrag.points));
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

function ensureNodeId(node) {
  return ensureCanvasNodeId(node, {
    nextId: () => {
      nodeIdSeed += 1;
      return `node-${nodeIdSeed}`;
    }
  });
}

function getNodeBounds(node) {
  return getElementWorldBounds(node);
}

function getVisibleNodes() {
  return getVisibleCanvasNodes(canvasWorld);
}

function intersects(a, b) {
  return rectsIntersect(a, b);
}

function createSelectionBox() {
  const box = document.createElement("div");
  box.className = "selection-box";
  canvasViewport.appendChild(box);
  return box;
}

function updateSelectionBox() {
  if (!selectionDrag) return;
  applySelectionBoxRect(selectionDrag.box, getSelectionBoxRect(selectionDrag));
}

function finishSelectionBox() {
  if (!selectionDrag) return;
  const start = viewportPointToWorld(selectionDrag.startClientX, selectionDrag.startClientY);
  const end = viewportPointToWorld(selectionDrag.currentClientX, selectionDrag.currentClientY);
  const area = {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  };
  const selected = area.width < 4 && area.height < 4
    ? []
    : getVisibleNodes().filter((node) => intersects(getNodeBounds(node), area));
  selectNodes(selected);
  selectionDrag.box.remove();
  selectionDrag = null;
  canvasViewport.classList.remove("selecting");
}

function getStackTitle(node) {
  return getNodeTitle(node);
}

function getStackThumb(node) {
  return getNodeThumbnail(node);
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
    ensureNodeId(child);
    const thumb = getStackThumb(child);
    const title = escapeHtml(getStackTitle(child));
    const tag = escapeHtml(child.querySelector(".node-label")?.textContent.trim() || child.dataset.kind || "模块");
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
  getVisibleNodes().forEach((node) => {
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
  ensureNodeId(target);
  ensureNodeId(child);
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
      if (node.classList.contains("canvas-text")) hideTextFormatToolbar();
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
    if (hasMovingText(node)) hideTextFormatToolbar();
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
  emptyState.classList.add("hidden");

  const node = createCanvasNodeElement({
    kind,
    title,
    x,
    y,
    media,
    html: nodeTemplate(kind, title, desc, media)
  });
  ensureNodeId(node);
  makeDraggable(node);
  if (kind === "image") {
    const image = node.querySelector(".image-frame img");
    image.addEventListener("load", () => {
      const frame = node.querySelector(".image-frame");
      if (!node.dataset.manualSize) {
        frame.style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`;
        const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
        node.style.width = `${Math.min(560, Math.max(260, 320 * ratio))}px`;
      }
      if (editingImageNode === node && imageEditPopover.classList.contains("open")) positionImageEditPopover();
    }, { once: true });

    node.addEventListener("dblclick", (event) => {
      if (event.button !== 0 || event.target.closest(".resize-handle")) return;
      event.preventDefault();
      event.stopPropagation();
      hideCanvasContextMenu();
      hideAddNodeMenu();
      selectNode(node);
      showImageEditPopover(node);
    });
  }
  canvasWorld.appendChild(node);
  if (kind === "model" && media?.file) initModelViewer(node, media.file);
  selectNode(node);
  return node;
}

function addGenerationPreview({ title, desc, x, y, width, aspectRatio }) {
  const node = addNode(buildGenerationPreviewConfig({ title, desc, x, y }));
  applyNodePreviewSize(node, { width, aspectRatio });
  if (!aspectRatio) node.dataset.manualSize = "true";
  return node;
}

function replacePreviewWithImage(previewNode, { title, desc, url, width, aspectRatio, prompt = "", sourceNode = null, actionType = "", model = "" }) {
  const x = parseFloat(previewNode.style.left || "0");
  const y = parseFloat(previewNode.style.top || "0");
  previewNode.remove();
  const node = addNode({
    kind: "image",
    title,
    desc,
    x,
    y,
    media: {
      url,
      name: title,
      type: "image/png"
    }
  });
  applyNodePreviewSize(node, { width, aspectRatio });
  markGeneratedNodeContext(node, { prompt, sourceNode, actionType, model });
  recordCanvasEvent("generation_created", {
    nodeId: node.dataset.nodeId,
    sourceId: sourceNode?.dataset?.nodeId || "",
    actionType,
    model
  });
  return node;
}

function addSourceBadge(node, sourceNode, label = "来源：原图") {
  if (!node || !sourceNode || node.querySelector(".source-badge")) return;
  const badge = document.createElement("button");
  badge.type = "button";
  badge.className = "source-badge";
  badge.textContent = label;
  badge.addEventListener("pointerdown", (event) => event.stopPropagation());
  badge.addEventListener("click", (event) => {
    event.stopPropagation();
    selectNode(sourceNode);
    sourceNode.classList.add("source-pulse");
    window.setTimeout(() => sourceNode.classList.remove("source-pulse"), 900);
  });
  node.appendChild(badge);
}

function inferProductProfile(file) {
  return inferDirectorProductProfile(file);

  // TODO(architecture): Remove legacy inline product profile inference after Director module validation.
  const name = (file?.name || "").toLowerCase();
  if (/bath|shower|toilet|handle|hinge|hardware|浴|卫浴|拉手|门|五金/.test(name)) {
    return { type: "卫浴五金产品", name: file?.name?.replace(/\.[^.]+$/, "") || "卫浴五金产品" };
  }
  if (/appliance|kettle|heater|plug|socket|小家电|电器|插座/.test(name)) {
    return { type: "小家电产品", name: file?.name?.replace(/\.[^.]+$/, "") || "小家电产品" };
  }
  if (/door|window|cabinet|门|窗|柜/.test(name)) {
    return { type: "家居建材产品", name: file?.name?.replace(/\.[^.]+$/, "") || "家居建材产品" };
  }
  return { type: "工业产品", name: file?.name?.replace(/\.[^.]+$/, "") || "产品" };
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
      <span>${escapeHtml(action.title)}</span>
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

  // TODO(architecture): Remove legacy inline director prompt after Director module validation.
  const productType = productNode.dataset.productType || "产品";
  const productName = productNode.dataset.productName || getStackTitle(productNode);
  return `${action.prompt}\n产品类型：${productType}\n产品名称：${productName}\n请保持产品核心结构可信，输出适合商业展示的高质量结果。`;
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
    body.innerHTML = `<img src="${url}" alt="${escapeHtml(action.title)}" /><span>${escapeHtml(action.title)}</span>`;
    return;
  }
  body.innerHTML = `<span>${escapeHtml(action.title)}</span><p>AI 正在生成结果...</p>`;
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
    const result = await postJson("/api/chat", buildChatImagePayload({
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
  return appendThinkingMessage({ chatPanel, chatLog, title, steps, escapeHtml });
}

function updateThinking(message, activeIndex, done = false) {
  updateThinkingMessage(message, activeIndex, done);
}

function addChatImage(role, imageUrl, caption) {
  return appendChatImage({ chatLog, role, imageUrl, caption, escapeHtml });
}

async function imageSourceToDataUrl(src) {
  return readImageSourceAsDataUrl(src);
}

function roundToMultiple(value, multiple = 16) {
  return Math.round(value / multiple) * multiple;
}

function getQwenSizeForImage(img) {
  const naturalWidth = img?.naturalWidth || 1024;
  const naturalHeight = img?.naturalHeight || 1024;
  const ratio = naturalWidth / Math.max(1, naturalHeight);
  let width;
  let height;

  if (ratio >= 1) {
    width = 2048;
    height = width / ratio;
  } else {
    height = 2048;
    width = height * ratio;
  }

  width = Math.max(512, Math.min(2048, roundToMultiple(width)));
  height = Math.max(512, Math.min(2048, roundToMultiple(height)));
  return `${width}*${height}`;
}

function generateFromPrompt(prompt, point) {
  generatedCount += 1;
  const kind = detectKind(prompt);
  const titles = {
    "2d": "AI 画面方案",
    "3d": "AI 3D 资产",
    video: "AI 视频镜头"
  };
  const target = point || {
    x: -260 + (generatedCount % 3) * 310,
    y: 40 + Math.floor(generatedCount / 3) * 220
  };

  addNode({
    kind,
    title: `${titles[kind]} ${generatedCount}`,
    desc: prompt.length > 72 ? `${prompt.slice(0, 72)}...` : prompt,
    x: target.x,
    y: target.y
  });

  addChat("assistant", `已在画布中生成 ${titles[kind]}。你可以继续描述风格、镜头或组件，我会扩展到同一块无限画布上。`);
}

function getUploadKind(file) {
  return resolveUploadKind(file);
  // TODO: remove legacy inline upload kind resolver after upload flow verification.
  const name = file.name.toLowerCase();
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (modelExtensions.some((extension) => name.endsWith(extension))) return "model";
  return null;
}

function cubeGeometry() {
  return createCubeGeometry();
  // TODO: remove legacy inline cube geometry after model parser verification.
  return {
    vertices: [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ],
    faces: [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [3, 2, 6], [3, 6, 7], [1, 5, 6], [1, 6, 2], [0, 3, 7], [0, 7, 4]]
  };
}

function normalizeGeometry(geometry) {
  return normalizeModelGeometry(geometry);
  // TODO: remove legacy inline geometry normalization after model parser verification.
  if (!geometry.vertices.length || !geometry.faces.length) return cubeGeometry();
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  geometry.vertices.forEach((vertex) => {
    for (let i = 0; i < 3; i += 1) {
      min[i] = Math.min(min[i], vertex[i]);
      max[i] = Math.max(max[i], vertex[i]);
    }
  });
  const center = min.map((value, index) => (value + max[index]) / 2);
  const span = Math.max(...max.map((value, index) => value - min[index])) || 1;
  return {
    vertices: geometry.vertices.map((vertex) => vertex.map((value, index) => (value - center[index]) / span * 2.8)),
    faces: sampleFaces(geometry.faces, MAX_RENDER_FACES)
  };
}

function sampleFaces(faces, limit) {
  return sampleModelFaces(faces, limit);
  // TODO: remove legacy inline face sampler after model parser verification.
  if (faces.length <= limit) return faces;
  const step = faces.length / limit;
  const sampled = [];
  for (let i = 0; i < limit; i += 1) {
    sampled.push(faces[Math.floor(i * step)]);
  }
  return sampled;
}

function parseObj(text) {
  return parseObjGeometry(text);
  // TODO: remove legacy inline OBJ parser after model parser verification.
  const vertices = [];
  const faces = [];
  text.split(/\r?\n/).forEach((line) => {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "v") {
      if (vertices.length >= MAX_VERTEX_COUNT) return;
      vertices.push(parts.slice(1, 4).map(Number));
    }
    if (parts[0] === "f") {
      if (faces.length >= MAX_PARSE_FACES) return;
      const indices = parts.slice(1).map((part) => {
        const raw = Number(part.split("/")[0]);
        return raw < 0 ? vertices.length + raw : raw - 1;
      }).filter((index) => index >= 0 && index < vertices.length);
      for (let i = 1; i < indices.length - 1; i += 1) {
        if (faces.length >= MAX_PARSE_FACES) break;
        faces.push([indices[0], indices[i], indices[i + 1]]);
      }
    }
  });
  return normalizeGeometry({ vertices, faces });
}

function parseStl(buffer) {
  return parseStlGeometry(buffer);
  // TODO: remove legacy inline STL parser after model parser verification.
  const text = new TextDecoder().decode(buffer.slice(0, Math.min(buffer.byteLength, 600)));
  if (/solid[\s\S]*facet/i.test(text)) {
    if (buffer.byteLength > MAX_ASCII_MODEL_BYTES) return cubeGeometry();
    const fullText = new TextDecoder().decode(buffer);
    const vertices = [];
    const faces = [];
    const matches = fullText.matchAll(/vertex\s+([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)/gi);
    for (const match of matches) {
      if (vertices.length >= MAX_PARSE_FACES * 3) break;
      vertices.push([Number(match[1]), Number(match[2]), Number(match[3])]);
    }
    for (let i = 0; i + 2 < vertices.length; i += 3) faces.push([i, i + 1, i + 2]);
    return normalizeGeometry({ vertices, faces });
  }

  const view = new DataView(buffer);
  const triangleCount = view.getUint32(80, true);
  const vertices = [];
  const faces = [];
  const step = Math.max(1, Math.floor(triangleCount / MAX_PARSE_FACES));
  for (let tri = 0; tri < triangleCount && faces.length < MAX_PARSE_FACES; tri += step) {
    let offset = 84 + tri * 50;
    if (offset + 50 > buffer.byteLength) break;
    offset += 12;
    const face = [];
    for (let i = 0; i < 3; i += 1) {
      vertices.push([view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)]);
      face.push(vertices.length - 1);
      offset += 12;
    }
    faces.push(face);
  }
  return normalizeGeometry({ vertices, faces });
}

function parseGlb(buffer) {
  return parseGlbGeometry(buffer);
  // TODO: remove legacy inline GLB parser after model parser verification.
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67) return cubeGeometry();
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset + 8 <= buffer.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    offset += 8;
    const chunk = buffer.slice(offset, offset + length);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk));
    if (type === 0x004e4942) bin = chunk;
    offset += length;
  }
  if (!json || !bin) return cubeGeometry();
  const primitive = json.meshes?.[0]?.primitives?.[0];
  const positionAccessor = json.accessors?.[primitive?.attributes?.POSITION];
  const indexAccessor = json.accessors?.[primitive?.indices];
  const readAccessor = (accessor) => {
    const bufferView = json.bufferViews[accessor.bufferView];
    const start = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
    return { accessor, bufferView, start };
  };
  if (!positionAccessor || positionAccessor.componentType !== 5126) return cubeGeometry();
  const position = readAccessor(positionAccessor);
  const vertices = [];
  const vertexCount = Math.min(positionAccessor.count, MAX_VERTEX_COUNT);
  const vertexStride = position.bufferView.byteStride || 12;
  const posView = new DataView(bin);
  for (let i = 0; i < vertexCount; i += 1) {
    const offset = position.start + i * vertexStride;
    if (offset + 12 > bin.byteLength) break;
    vertices.push([posView.getFloat32(offset, true), posView.getFloat32(offset + 4, true), posView.getFloat32(offset + 8, true)]);
  }
  const faces = [];
  if (indexAccessor) {
    const index = readAccessor(indexAccessor);
    const indexView = new DataView(bin, index.start);
    const size = indexAccessor.componentType === 5125 ? 4 : indexAccessor.componentType === 5123 ? 2 : 1;
    const readIndex = (i) => size === 4 ? indexView.getUint32(i * size, true) : size === 2 ? indexView.getUint16(i * size, true) : indexView.getUint8(i);
    const triangleCount = Math.floor(indexAccessor.count / 3);
    const step = Math.max(1, Math.floor(triangleCount / MAX_PARSE_FACES));
    for (let triangle = 0; triangle < triangleCount && faces.length < MAX_PARSE_FACES; triangle += step) {
      const i = triangle * 3;
      const face = [readIndex(i), readIndex(i + 1), readIndex(i + 2)];
      if (face.every((indexValue) => indexValue < vertices.length)) faces.push(face);
    }
  } else {
    for (let i = 0; i + 2 < vertices.length && faces.length < MAX_PARSE_FACES; i += 3) faces.push([i, i + 1, i + 2]);
  }
  return normalizeGeometry({ vertices, faces });
}

function parseModelGeometry(file, buffer) {
  return parseModelGeometryFile(file, buffer);
  // TODO: remove legacy inline model parser after model parser verification.
  if (buffer.byteLength > MAX_PREVIEW_MODEL_BYTES) return cubeGeometry();
  const name = file.name.toLowerCase();
  if ((name.endsWith(".obj") || name.endsWith(".gltf")) && buffer.byteLength > MAX_ASCII_MODEL_BYTES) return cubeGeometry();
  if (name.endsWith(".obj")) return parseObj(new TextDecoder().decode(buffer));
  if (name.endsWith(".stl")) return parseStl(buffer);
  if (name.endsWith(".glb")) return parseGlb(buffer);
  return cubeGeometry();
}

function initModelViewer(node, file) {
  return initModelViewerPreview(node, file, {
    hideAddNodeMenu,
    selectNode
  });

  // TODO(architecture): Remove legacy inline WebGL model viewer after module validation.
  const canvas = node.querySelector("[data-model-viewer]");
  const loading = node.querySelector(".model-loading");
  if (!canvas || !file) return;

  const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
  if (!gl) {
    loading.textContent = "当前浏览器不支持 WebGL 预览";
    return;
  }

  const state = { geometry: cubeGeometry(), rx: -0.45, ry: 0.75, zoom: 1, dragging: false, startX: 0, startY: 0 };
  const vertexShaderSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform float uRx;
    uniform float uRy;
    uniform float uZoom;
    uniform float uAspect;
    varying vec3 vNormal;
    varying float vDepth;

    vec3 rotatePoint(vec3 p) {
      float cx = cos(uRx);
      float sx = sin(uRx);
      float cy = cos(uRy);
      float sy = sin(uRy);
      vec3 yRot = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
      return vec3(yRot.x, yRot.y * cx - yRot.z * sx, yRot.y * sx + yRot.z * cx);
    }

    void main() {
      vec3 rotated = rotatePoint(aPosition);
      vec3 normal = normalize(rotatePoint(aNormal));
      float z = rotated.z + 5.0;
      vec2 projected = rotated.xy * 0.82 * uZoom / z;
      gl_Position = vec4(projected.x / uAspect, projected.y, (z - 1.0) / 8.0, 1.0);
      vNormal = normal;
      vDepth = z;
    }
  `;
  const fragmentShaderSource = `
    precision mediump float;
    varying vec3 vNormal;
    varying float vDepth;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 keyLight = normalize(vec3(-0.35, 0.62, 0.72));
      vec3 fillLight = normalize(vec3(0.55, -0.25, 0.35));
      float key = abs(dot(normal, keyLight));
      float fill = abs(dot(normal, fillLight)) * 0.18;
      float rim = pow(1.0 - abs(normal.z), 2.0) * 0.12;
      float shade = 0.62 + key * 0.34 + fill + rim;
      shade *= mix(0.82, 1.04, smoothstep(8.4, 2.1, vDepth));
      vec3 clay = vec3(0.72, 0.72, 0.70) * shade;
      gl_FragColor = vec4(clay, 1.0);
    }
  `;

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  };

  const createProgram = () => {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexShaderSource));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
    return program;
  };

  let program;
  try {
    program = createProgram();
  } catch {
    loading.textContent = "WebGL 预览初始化失败";
    return;
  }

  const positionBuffer = gl.createBuffer();
  const normalBuffer = gl.createBuffer();
  const locations = {
    position: gl.getAttribLocation(program, "aPosition"),
    normal: gl.getAttribLocation(program, "aNormal"),
    rx: gl.getUniformLocation(program, "uRx"),
    ry: gl.getUniformLocation(program, "uRy"),
    zoom: gl.getUniformLocation(program, "uZoom"),
    aspect: gl.getUniformLocation(program, "uAspect")
  };
  let vertexCount = 0;

  const getNormal = (a, b, c) => {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    return [nx / length, ny / length, nz / length];
  };

  const uploadGeometry = () => {
    const positions = [];
    const normals = [];
    const vertexNormals = state.geometry.vertices.map(() => [0, 0, 0]);

    state.geometry.faces.forEach((face) => {
      const a = state.geometry.vertices[face[0]];
      const b = state.geometry.vertices[face[1]];
      const c = state.geometry.vertices[face[2]];
      if (!a || !b || !c) return;
      const normal = getNormal(a, b, c);
      face.forEach((vertexIndex) => {
        const target = vertexNormals[vertexIndex];
        if (!target) return;
        target[0] += normal[0];
        target[1] += normal[1];
        target[2] += normal[2];
      });
    });

    vertexNormals.forEach((normal, index) => {
      const length = Math.hypot(normal[0], normal[1], normal[2]);
      if (length > 0.0001) {
        vertexNormals[index] = [normal[0] / length, normal[1] / length, normal[2] / length];
      } else {
        vertexNormals[index] = [0, 0, 1];
      }
    });

    state.geometry.faces.forEach((face) => {
      const a = state.geometry.vertices[face[0]];
      const b = state.geometry.vertices[face[1]];
      const c = state.geometry.vertices[face[2]];
      if (!a || !b || !c) return;
      [a, b, c].forEach((vertex) => {
        positions.push(vertex[0], vertex[1], vertex[2]);
      });
      face.forEach((vertexIndex) => {
        const vertex = state.geometry.vertices[vertexIndex] || [0, 0, 1];
        const radialLength = Math.hypot(vertex[0], vertex[1], vertex[2]) || 1;
        const radial = [vertex[0] / radialLength, vertex[1] / radialLength, vertex[2] / radialLength];
        const normal = vertexNormals[vertexIndex] || radial;
        const aligned = normal[0] * radial[0] + normal[1] * radial[1] + normal[2] * radial[2] < 0
          ? [-normal[0], -normal[1], -normal[2]]
          : normal;
        normals.push(aligned[0], aligned[1], aligned[2]);
      });
    });

    vertexCount = positions.length / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  };

  const resizeCanvas = () => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width * devicePixelRatio));
    const height = Math.max(1, Math.round(rect.height * devicePixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const render = () => {
    resizeCanvas();
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.enableVertexAttribArray(locations.normal);
    gl.vertexAttribPointer(locations.normal, 3, gl.FLOAT, false, 0, 0);

    gl.uniform1f(locations.rx, state.rx);
    gl.uniform1f(locations.ry, state.ry);
    gl.uniform1f(locations.zoom, state.zoom);
    gl.uniform1f(locations.aspect, canvas.width / canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  };

  uploadGeometry();
  render();

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 2) return;
    event.preventDefault();
    event.stopPropagation();
    hideAddNodeMenu();
    selectNode(node);
    state.dragging = true;
    state.startX = event.clientX;
    state.startY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    state.ry += (event.clientX - state.startX) * 0.012;
    state.rx += (event.clientY - state.startY) * 0.012;
    state.startX = event.clientX;
    state.startY = event.clientY;
    render();
  });

  canvas.addEventListener("pointerup", () => {
    state.dragging = false;
  });

  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    state.zoom = Math.min(5, Math.max(0.35, state.zoom * factor));
    render();
  }, { passive: false });

  canvas.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    state.zoom = 1;
    render();
  });

  file.arrayBuffer()
    .then((buffer) => {
      loading.textContent = buffer.byteLength > MAX_PREVIEW_MODEL_BYTES
        ? "模型较大，显示轻量预览"
        : "正在生成轻量预览";

      setTimeout(() => {
        state.geometry = parseModelGeometry(file, buffer);
        uploadGeometry();
        loading.textContent = buffer.byteLength > MAX_PREVIEW_MODEL_BYTES
          ? "文件过大，显示轻量预览"
          : "左键拖动 · 右键旋转 · 滚轮缩放";
        render();
      }, 0);
    })
    .catch(() => {
      loading.textContent = "模型解析失败，显示占位预览";
      render();
    });
}

function addUploadedFile(file, index = 0, point) {
  const kind = getUploadKind(file);
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
      const kind = getUploadKind(item.file);
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
    escapeHtml,
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
    getImageFiles,
    render: renderChatImagePreview,
    promptForm,
    promptInput,
    resetDragDepth: () => {
      chatDragDepth = 0;
    }
  });
}

function getImageFiles(files) {
  return getImageFilesFromList(files);
}

function showUploadModeBubbles(files, point, clientX, clientY) {
  const images = getImageFiles(files);
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
  const [file] = getImageFiles(files);
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
  const fileName = getStackTitle(node);
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
  const canonicalType = getCanonicalCanvasEventType(type, payload);
  recordCanvasEventToStore(canonicalType, payload, {
    originalType: type,
    maxEvents: 80
  });
}

function getCanonicalCanvasEventType(type, payload = {}) {
  if (type === "upload") return payload.kind === "image" ? "image_uploaded" : "generation_created";
  if (type === "select") {
    const node = getNodeById(payload.nodeId);
    return node?.dataset?.kind === "image" ? "image_selected" : "canvas_idle";
  }
  if (type === "delete" || type === "erase") return "image_deleted";
  if (type === "mock_generate") return "generation_created";
  if (type === "ai_suggestion") return "canvas_idle";
  if (type === "undo" || type === "redo") return "canvas_idle";
  return type;
}

function readNodeJson(node, key, fallback = null) {
  return readAgentNodeJson(node, key, fallback);

  // TODO(architecture): Remove legacy inline JSON reader after Agent state module validation.
  if (!node?.dataset?.[key]) return fallback;
  try {
    return JSON.parse(node.dataset[key]);
  } catch {
    return fallback;
  }
}

function compactText(value, max = 520) {
  return compactInlineText(value, max);
}

function getIndustryActionPreset(analysis = {}) {
  return getAgentIndustryActionPreset(analysis);

  // TODO(architecture): Remove legacy inline recommendation rules after Agent module validation.
  const haystack = [
    analysis.productName,
    analysis.category,
    analysis.industry,
    analysis.workflowIntent,
    analysis.style,
    ...(Array.isArray(analysis.sellingPoints) ? analysis.sellingPoints : [])
  ].join(" ");

  if (/服装|女装|男装|裙|连衣裙|衬衫|外套|鞋|包|配饰|穿搭|Lolita|洛丽塔|面料|蕾丝|棉麻|衣/i.test(haystack)) {
    return [
      { type: "productPhoto", title: "上身图", description: "生成模特穿着效果，判断版型气质" },
      { type: "scene", title: "街拍图", description: "放入真实穿搭场景，增强种草感" },
      { type: "closeup", title: "面料特写", description: "突出蕾丝、纹理和做工细节" },
      { type: "poster", title: "Lookbook", description: "整理成系列穿搭视觉物料" },
      { type: "detail", title: "详情页", description: "组织版型、面料和卖点模块" }
    ];
  }

  if (/潮玩|公仔|手办|玩具|IP|角色|娃娃|盲盒|插画|卡通|毛绒|模型/i.test(haystack)) {
    return [
      { type: "render3d", title: "3D渲染", description: "转成立体产品表现，适合开发" },
      { type: "productPhoto", title: "实拍图", description: "生成真实棚拍质感，便于展示" },
      { type: "plush", title: "毛绒稿", description: "转成可量产毛绒玩具方向" },
      { type: "model", title: "模型设定", description: "补齐三视图和结构参考" },
      { type: "packaging", title: "盲盒包装", description: "生成适合潮玩售卖的包装" }
    ];
  }

  if (/美妆|香水|护肤|口红|粉底|面霜|精华|个护/i.test(haystack)) {
    return [
      { type: "productPhoto", title: "产品摄影", description: "生成干净高级的商业主图" },
      { type: "closeup", title: "质地特写", description: "展示膏体、液体或包装细节" },
      { type: "detail", title: "功效图", description: "组织成分、功效和使用理由" },
      { type: "packaging", title: "礼盒包装", description: "延展成节日礼盒视觉" },
      { type: "poster", title: "社媒图", description: "生成适合投放的社媒主视觉" }
    ];
  }

  if (/食品|饮料|餐|咖啡|茶|酒|甜品|零食|包装食品/i.test(haystack)) {
    return [
      { type: "productPhoto", title: "食欲图", description: "强化真实质感和食欲表现" },
      { type: "packaging", title: "包装设计", description: "延展货架可识别包装方案" },
      { type: "scene", title: "货架陈列", description: "放入售卖场景看陈列效果" },
      { type: "poster", title: "菜单海报", description: "生成门店或外卖宣传视觉" },
      { type: "script", title: "短视频", description: "拆成适合传播的镜头脚本" }
    ];
  }

  if (/3C|电器|小家电|工具|插座|耳机|音箱|相机|手机|电脑|设备/i.test(haystack)) {
    return [
      { type: "detail", title: "功能拆解", description: "提炼结构和功能卖点" },
      { type: "scene", title: "使用场景", description: "放入真实环境说明用途" },
      { type: "closeup", title: "结构特写", description: "突出接口、按键和材质细节" },
      { type: "poster", title: "参数图", description: "整理核心参数和购买理由" },
      { type: "script", title: "演示分镜", description: "生成可拍摄的功能演示脚本" }
    ];
  }

  return [
    { type: "productPhoto", title: "实拍图", description: "生成真实产品展示图" },
    { type: "scene", title: "场景图", description: "放入适合行业的使用环境" },
    { type: "closeup", title: "细节图", description: "突出材质、结构和识别点" },
    { type: "poster", title: "宣传图", description: "整理成适合投放的主视觉" },
    { type: "detail", title: "详情页", description: "组织卖点和购买理由" }
  ];
}

function isWeakAction(action = {}) {
  return isWeakAgentAction(action);

  // TODO(architecture): Remove legacy inline weak-action rule after Agent module validation.
  const title = String(action.title || "");
  const desc = String(action.description || "");
  return !title
    || title.length > 8
    || /优化|提升|高级|创意|风格|美化|主图优化|电商转化/.test(title)
    || /优化|高级|电商转化|不明确/.test(desc);
}

function improveRecommendedActions(analysis = {}) {
  return improveAgentRecommendedActions(analysis);

  // TODO(architecture): Remove legacy inline recommendation merger after Agent module validation.
  const preset = getIndustryActionPreset(analysis);
  const actions = Array.isArray(analysis.recommendedActions) ? analysis.recommendedActions : [];
  const strong = actions
    .filter((action) => action?.type && action?.title && !isWeakAction(action))
    .map((action) => ({
      type: action.type,
      title: String(action.title).slice(0, 6),
      description: action.description || preset.find((item) => item.type === action.type)?.description || "基于当前素材生成工作流物料"
    }));

  const merged = [...strong];
  preset.forEach((action) => {
    if (!merged.some((item) => item.type === action.type || item.title === action.title)) merged.push(action);
  });
  return merged.slice(0, 5);
}

function compactAnalysisForAgent(analysis) {
  return compactAgentAnalysis(analysis);

  // TODO(architecture): Remove legacy inline compact analysis after Agent module validation.
  if (!analysis) return null;
  return {
    productName: analysis.productName || "",
    category: analysis.category || "",
    industry: analysis.industry || "",
    workflowIntent: analysis.workflowIntent || "",
    materials: Array.isArray(analysis.materials) ? analysis.materials.slice(0, 4) : [],
    colors: Array.isArray(analysis.colors) ? analysis.colors.slice(0, 4) : [],
    style: analysis.style || "",
    sellingPoints: Array.isArray(analysis.sellingPoints) ? analysis.sellingPoints.slice(0, 4) : [],
    targetAudience: analysis.targetAudience || "",
    recommendedActions: improveRecommendedActions(analysis)
  };
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

  // TODO(architecture): Remove legacy inline suggestion normalization after Agent module validation.
  const target = canvasState?.target || {};
  if (target.analysisStatus === "loading") {
    return {
      text: "先等识别完成",
      actionLabel: "稍等",
      actionType: "explore",
      mockResult: "图片识别完成后再推荐更准确的物料。"
    };
  }

  const isUploadedLike = target.sourceMode === "uploaded" || (target.kind === "image" && !target.generationPrompt);
  if (isUploadedLike && target.analysis?.recommendedActions?.length) {
    const action = pickCachedActionForSuggestion(canvasState, suggestion);
    return {
      text: `${action.title}？`,
      actionLabel: action.title,
      actionType: action.type,
      mockResult: action.description || `基于当前素材生成${action.title}。`
    };
  }

  return {
    text: String(suggestion.text || "试试下一步？").slice(0, 18),
    actionLabel: String(suggestion.actionLabel || "生成").slice(0, 6),
    actionType: suggestion.actionType || "explore",
    mockResult: suggestion.mockResult || suggestion.text || "AI Core 已根据当前素材生成一个结果草稿。"
  };
}

function writeAICoreAnalysisCache(node, analysis, source = "vision") {
  if (!node || !analysis) return;
  const data = normalizeAnalysis(analysis, inferProductProfile({ name: getStackTitle(node) }));
  data.recommendedActions = improveRecommendedActions(data);
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
    readSourceAnalysis: (target) => readNodeJson(target, "aiCoreAnalysis")
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

  // TODO(architecture): Remove legacy inline Agent scheduler after module validation.
  if (!aiCoreAgentEnabled) return;
  aiCoreAgentReason = reason;
  aiCoreAgentTargetId = targetNode?.dataset?.nodeId || selectedNode?.dataset?.nodeId || "";
  setAICoreAgentState("sensing");
  window.clearTimeout(aiCoreAgentTimer);
  aiCoreAgentTimer = window.setTimeout(() => {
    runAICoreAgent(reason, aiCoreAgentTargetId);
  }, delay);
}

async function ensureAICoreNodeContext(node, reason) {
  return ensureAgentNodeContext({
    node,
    reason,
    shouldUsePromptContext,
    readAnalysis: (target) => readNodeJson(target, "aiCoreAnalysis"),
    inferProfile: inferProductProfile,
    getTitle: getStackTitle,
    getImageData: getAICoreImageData,
    analyzeImage: (payload) => postJson("/api/analyze-image", payload),
    normalizeAnalysis,
    writeCache: writeAICoreAnalysisCache
  });

  // TODO(architecture): Remove legacy inline image analysis context loader after module validation.
  if (!node || node.dataset.kind !== "image") return;
  if (reason === "suggestion_timeout") return;
  if (shouldUsePromptContext(node)) return;
  if (readNodeJson(node, "aiCoreAnalysis")) return;
  if (node._aiCoreAnalysisPromise) return node._aiCoreAnalysisPromise;

  node.dataset.aiCoreAnalysisStatus = "loading";
  const profile = inferProductProfile(node._sourceFile || { name: getStackTitle(node) });
  node._aiCoreAnalysisPromise = (async () => {
    try {
      const image = await getAICoreImageData(node, node._sourceFile);
      if (!image) throw new Error("当前素材无法读取图片内容");
      const result = await postJson("/api/analyze-image", {
        image,
        title: getStackTitle(node),
        refreshCount: 0
      });
      writeAICoreAnalysisCache(node, normalizeAnalysis(result.analysis, profile), "vision");
    } catch (error) {
      const fallback = normalizeAnalysis({
        ...profile,
        productName: profile.name,
        category: profile.type,
        industry: profile.type,
        workflowIntent: "基于文件信息推荐可用物料",
        sellingPoints: ["视觉模型暂时不可用，先使用本地信息推断。"]
      }, profile);
      writeAICoreAnalysisCache(node, fallback, "fallback");
      node.dataset.aiCoreAnalysisStatus = "fallback";
      node.dataset.aiCoreAnalysisError = error.message || "识别失败";
    } finally {
      node._aiCoreAnalysisPromise = null;
    }
  })();
  return node._aiCoreAnalysisPromise;
}

function getNodeSnapshot(node) {
  return createNodeSnapshot(node, {
    getTitle: getStackTitle,
    readJson: readNodeJson,
    compactAnalysis: compactAnalysisForAgent,
    compactText,
    isSelected: (item) => selectedNodes.has(item)
  });
  // TODO: remove legacy inline node snapshot after Agent state verification.
  if (!node) return null;
  const analysis = compactAnalysisForAgent(readNodeJson(node, "aiCoreAnalysis"));
  const sourceAnalysis = compactAnalysisForAgent(readNodeJson(node, "aiCoreSourceAnalysis"));
  return {
    id: node.dataset.nodeId,
    kind: node.dataset.kind,
    title: getStackTitle(node),
    productName: node.dataset.productName || "",
    productType: node.dataset.productType || "",
    assetType: node.dataset.assetType || "",
    sourceMode: node.dataset.sourceMode || (node.dataset.createdBy === "ai" ? "generated" : ""),
    createdBy: node.dataset.createdBy || "",
    generationPrompt: compactText(node.dataset.generationPrompt || node.dataset.editPrompt || "", 900),
    generationModel: node.dataset.generationModel || node.dataset.editModel || "",
    analysisStatus: node.dataset.aiCoreAnalysisStatus || "",
    analysisSource: node.dataset.aiCoreAnalysisSource || "",
    analysis,
    sourceAnalysis,
    selected: selectedNodes.has(node),
    stackedChildren: node._stackChildren?.length || 0
  };
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
  // TODO: remove legacy inline canvas state after Agent state verification.
  const nodes = Array.from(canvasWorld.querySelectorAll(".node-card"))
    .filter((node) => !node.classList.contains("stack-member-hidden"))
    .slice(-20);
  const target = getNodeById(targetId) || selectedNode || nodes[nodes.length - 1] || null;
  return {
    reason,
    target: getNodeSnapshot(target),
    selected: Array.from(selectedNodes).map(getNodeSnapshot).filter(Boolean),
    nodes: nodes.map(getNodeSnapshot).filter(Boolean),
    recentEvents: canvasEvents.slice(-12)
  };
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
    const result = await postJson("/api/canvas-agent", { canvasState });
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
        <span>${escapeHtml(String(suggestion.actionLabel || "生成").slice(0, 6))}</span>
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
  ensureNodeId(node);
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
      <span>${escapeHtml(String(action.title || "生成").slice(0, 4))}</span>
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
    const result = await postJson("/api/analyze-image", {
      image,
      title: getStackTitle(node)
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
  const analysis = bubble._analysis || normalizeAnalysis(null, inferProductProfile({ name: getStackTitle(productNode) }));
  if (!action.prepared && !action.prompt) {
    try {
      const result = await postJson("/api/prepare-action", {
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

function ensureAICoreWorkspace() {
  let workspace = document.querySelector(".ai-core-workspace");
  if (workspace) return workspace;
  workspace = document.createElement("div");
  workspace.className = "ai-core-workspace";
  workspace.innerHTML = `
    <button class="ai-core-workspace-close" type="button" title="关闭">×</button>
    <section class="ai-suggestion-panel">
      <div class="ai-panel-head">
        <strong>✧ AI 智能建议</strong>
        <span>基于商品识别</span>
        <button type="button" class="ai-core-refresh" data-core-refresh title="换一组建议" aria-label="换一组建议">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></svg>
        </button>
      </div>
      <div class="ai-panel-actions">
        <button type="button" disabled>
          <span>AI 思考中</span>
          <small>正在理解图片类型，并推测最适合生成的素材。</small>
        </button>
      </div>
      <div class="ai-analysis-summary" data-core-analysis>
        <strong>AI 正在思考图片用途...</strong>
      </div>
    </section>
    <section class="ai-core-stage">
      <div class="ai-core-big">
        <img alt="当前素材" />
        <div class="ai-core-big-copy">
          <strong>AI Core</strong>
          <span>智能创作引擎已就绪</span>
        </div>
      </div>
      <div class="ai-core-status">
        <strong><span data-core-state-label>识别中</span>：<span data-core-product>产品</span></strong>
        <small data-core-status-copy>AI 正在分析图片内容...</small>
      </div>
    </section>
    <section class="ai-result-preview preview-scene">
      <strong>场景图 · 生成中</strong>
      <div></div>
    </section>
    <section class="ai-result-preview preview-poster">
      <strong>宣传海报</strong>
      <div></div>
    </section>
    <section class="ai-result-preview preview-detail">
      <strong>产品详情页</strong>
      <div></div>
    </section>
    <section class="ai-thinking-card">
      <strong>AI 思考中</strong>
      <span>● 识别商品属性</span>
      <span>● 分析风格与卖点</span>
      <span>○ 生成素材方案</span>
      <span>○ 开始生成素材</span>
    </section>
    <section class="ai-decision-panel" hidden>
      <strong data-decision-title>先确认一下方向</strong>
      <p data-decision-question>你希望这次生成更偏向哪种感觉？</p>
      <div class="ai-decision-options">
        <button type="button" data-decision-style="高端极简、干净商业摄影、突出产品质感">高端极简</button>
        <button type="button" data-decision-style="电商转化导向、卖点清晰、画面更有冲击力">电商转化</button>
        <button type="button" data-decision-style="保留原产品结构与颜色，只优化场景和光影">尽量保真</button>
      </div>
      <button class="ai-generate-now" type="button">立即生成</button>
    </section>
  `;
  appRoot.appendChild(workspace);
  workspace.querySelector(".ai-core-workspace-close").addEventListener("click", hideAICoreWorkspace);
  workspace.addEventListener("click", async (event) => {
    const refresh = event.target.closest("[data-core-refresh]");
    if (refresh) {
      if (workspace.classList.contains("analyzing")) return;
      workspace.dataset.refreshCount = String((Number(workspace.dataset.refreshCount || "0") || 0) + 1);
      refreshAICoreSuggestions(workspace);
      return;
    }
    const button = event.target.closest("[data-core-action]");
    if (!button) return;
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
  });
  workspace.querySelector(".ai-decision-options").addEventListener("click", (event) => {
    const option = event.target.closest("[data-decision-style]");
    if (!option) return;
    workspace.querySelectorAll("[data-decision-style]").forEach((item) => item.classList.remove("selected"));
    option.classList.add("selected");
    workspace.dataset.decisionStyle = option.dataset.decisionStyle;
  });
  workspace.querySelector(".ai-generate-now").addEventListener("click", async () => {
    await runWorkspaceDecision(workspace);
  });
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
    <button type="button" data-decision-style="${escapeHtml(item.prompt)}">${escapeHtml(item.label)}</button>
  `).join("");
  panel.querySelector("[data-decision-title]").textContent = `生成「${action.title}」前，我想确认一下`;
  panel.querySelector("[data-decision-question]").textContent = "你希望这次更偏向哪种方向？也可以直接生成。";
  panel.hidden = false;
  panel.classList.add("open");
}

function normalizeDecisionStyles(styles) {
  return normalizeCoreDecisionStyles(styles);
}

function getAllDecisionStyles(workspace) {
  return getCoreDecisionStyles(workspace);
}

async function prepareCoreAction(workspace, actionType) {
  if (actionType === "all") return null;
  const action = (workspace._coreActions || []).find((item) => item.type === actionType);
  if (!action || action.prepared || action.prompt) return action;
  if (!workspace._coreAnalysis) return action;
  try {
    const result = await postJson("/api/prepare-action", {
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

function getFallbackCoreActions(data) {
  return getCoreFallbackActions(data);
}

function renderAICoreActions(workspace, data, loading = false) {
  renderCoreActionButtons({ workspace, data, loading, directorActions, escapeHtml });
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
    renderAICoreActions(workspace, next, false);
    updateAICoreWorkspaceCards(workspace, next, false);
  } catch (error) {
    addChat("assistant", `换一组建议失败：${error.message}`);
  } finally {
    refreshButton?.classList.remove("running");
    refreshButton && (refreshButton.disabled = false);
  }
}

function buildAlternativeCoreSuggestions(analysis, refreshCount = 1) {
  return buildCoreAlternativeSuggestions(analysis, refreshCount);
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
  renderAICoreActions(workspace, data, loading);
  summary.innerHTML = "";

  updateAICoreWorkspaceCards(workspace, data, loading);
}

function updateAICoreWorkspaceCards(workspace, data, loading = false) {
  updateCoreWorkspaceCards({ workspace, data, loading, escapeHtml });
}

async function getAICoreImageData(productNode, file) {
  const img = productNode.querySelector(".image-frame img");
  if (img?.src) return imageSourceToDataUrl(img.src);
  if (file instanceof Blob && file.type?.startsWith("image/")) return fileToDataUrl(file);
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
    const result = await postJson("/api/analyze-image", {
      image,
      title: getStackTitle(productNode),
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

function fileToDataUrl(file) {
  return readFileAsDataUrl(file);
}

async function postJson(path, payload) {
  return postJsonRequest(path, payload);
}

async function runImageEditCommand(sourceNode, prompt, label = "图片编辑") {
  return executeImageEditAction({
    sourceNode,
    prompt,
    label,
    model: imageEditModel.value,
    readImageSourceAsDataUrl: imageSourceToDataUrl,
    getOutputSize: getQwenSizeForImage,
    createPreview: addGenerationPreview,
    replacePreview: replacePreviewWithImage,
    addSourceBadge,
    addChat,
    addThinking,
    updateThinking,
    updateChat,
    addChatImage
  });

  // TODO(architecture): Remove this legacy inline image-edit flow after the
  // compatibility layer is fully retired.
  if (!sourceNode || !prompt) return;
  const fileName = sourceNode.querySelector(".image-file-name")?.textContent.trim() || "图片";
  const img = sourceNode.querySelector(".image-frame img");
  const sourceFrame = sourceNode.querySelector(".image-frame");
  if (!img?.src) return;
  const sourceX = parseFloat(sourceNode.style.left || "0");
  const sourceY = parseFloat(sourceNode.style.top || "0");
  const sourceWidth = sourceNode.offsetWidth;
  const sourceAspect = sourceFrame?.style.aspectRatio || `${img.naturalWidth || 1} / ${img.naturalHeight || 1}`;
  const previewNode = addGenerationPreview({
    title: `${label}中.png`,
    desc: "正在根据当前图片生成结果",
    x: sourceX + sourceWidth + 28,
    y: sourceY,
    width: sourceWidth,
    aspectRatio: sourceAspect
  });
  addChat("user", `${label} ${fileName}`);
  const thinking = addThinking(label, [
    "读取原图",
    "整理编辑指令",
    "调用图片编辑模型",
    "将结果写入画布"
  ]);
  const progress = addChat("assistant", `正在执行${label}...`);
  progress.classList.add("loading");
  sourceNode.dataset.editPrompt = prompt;
  sourceNode.dataset.editModel = imageEditModel.value;

  try {
    updateThinking(thinking, 1);
    const image = await imageSourceToDataUrl(img.src);
    updateThinking(thinking, 2);
    const result = await postJson("/api/image-edit", {
      prompt,
      model: imageEditModel.value,
      image,
      size: getQwenSizeForImage(img)
    });
    const outputUrl = result.imageUrl || (result.imageBase64 ? `data:image/png;base64,${result.imageBase64}` : "");
    updateThinking(thinking, 3);
    if (outputUrl) {
      const imageNode = replacePreviewWithImage(previewNode, {
        title: `${label}结果.png`,
        desc: "由图片编辑模型生成",
        url: outputUrl,
        width: sourceWidth,
        aspectRatio: sourceAspect,
        prompt,
        sourceNode,
        actionType: "image_edit",
        model: imageEditModel.value
      });
      addSourceBadge(imageNode, sourceNode);
      addChatImage("assistant", outputUrl, `${label}已完成，并放在原图右侧`);
    }
    updateThinking(thinking, 4, true);
    updateChat(progress, result.message || `${label}已完成。`);
  } catch (error) {
    previewNode.classList.add("generation-failed");
    previewNode.querySelector(".generation-frame span").textContent = "生成失败，请查看右侧错误信息";
    updateThinking(thinking, 0, true);
    updateChat(progress, `${label}失败：${error.message}`);
  }
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

function positionBrandMenu(trigger) {
  positionFloatingMenu({ menu: brandMenu, trigger });
}

document.querySelectorAll("[data-brand-menu]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    positionBrandMenu(button);
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

function syncHomeModelPickerLegacy() {
  if (!homeModelSelect || !homeModelButton || !homeModelMenu) return;
  const selected = homeModelSelect.options[homeModelSelect.selectedIndex];
  homeModelButton.querySelector("span").textContent = selected?.textContent || "智能模型";
  homeModelMenu.querySelectorAll("[data-model-value]").forEach((button) => {
    button.classList.toggle("active", button.dataset.modelValue === homeModelSelect.value);
  });
}

function setHomeFilesLegacy(files) {
  homeImageFiles = getImageFiles(files || []);
  homePromptForm?.classList.toggle("has-files", homeImageFiles.length > 0);
  if (homeUploadButton) {
    homeUploadButton.title = homeImageFiles.length ? `已选择 ${homeImageFiles.length} 张参考图` : "上传文件";
    homeUploadButton.setAttribute("aria-label", homeUploadButton.title);
  }
}

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
    escapeHtml,
    onRemove: (index) => {
      homeImageFiles.splice(index, 1);
      setHomeFiles(homeImageFiles);
      homePromptInput?.focus();
    }
  });
}

function setHomeFiles(files) {
  homeImageFiles = getImageFiles(files || []);
  applyHomeFileState({
    form: homePromptForm,
    uploadButton: homeUploadButton,
    count: homeImageFiles.length
  });
  renderHomeFilePreview();
}

homeUploadButton?.addEventListener("click", () => {
  homeFileInput?.click();
});

homeFileInput?.addEventListener("change", () => {
  setHomeFiles(homeFileInput.files);
  homeFileInput.value = "";
  homePromptInput?.focus();
});

homeModelButton?.addEventListener("click", (event) => {
  event.preventDefault();
  const open = !homeModelPicker.classList.contains("open");
  homeModelPicker.classList.toggle("open", open);
  homeModelButton.setAttribute("aria-expanded", String(open));
});

homeModelMenu?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-model-value]");
  if (!button || !homeModelSelect) return;
  homeModelSelect.value = button.dataset.modelValue;
  syncHomeModelPicker();
  homeModelPicker.classList.remove("open");
  homeModelButton?.setAttribute("aria-expanded", "false");
  homePromptInput?.focus();
});

document.addEventListener("click", (event) => {
  if (!homeModelPicker?.contains(event.target)) {
    homeModelPicker?.classList.remove("open");
    homeModelButton?.setAttribute("aria-expanded", "false");
  }
});

homePromptForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = homePromptInput.value.trim();
  if (!prompt && !homeImageFiles.length) return;
  const model = homeModelSelect?.value;
  const files = homeImageFiles.slice();
  recordCanvasEvent("prompt_submitted", {
    source: "home",
    hasPrompt: Boolean(prompt),
    imageCount: files.length,
    model
  });
  homePromptInput.value = "";
  setHomeFiles([]);
  await generateHomeProject(prompt, model, files);
});

projectGrid?.addEventListener("click", (event) => {
  const newProject = event.target.closest("[data-new-project]");
  if (newProject) {
    newBlankProject();
    return;
  }
  const saveProject = event.target.closest("[data-save-project]");
  if (saveProject) {
    saveCurrentProject();
    return;
  }
  const modeButton = event.target.closest("[data-library-mode]");
  if (modeButton) {
    libraryViewMode = modeButton.dataset.libraryMode;
    setLibraryViewMode(libraryViewMode);
    renderProjectLibrary();
    return;
  }
  const timelineItem = event.target.closest("[data-library-index]");
  if (timelineItem) {
    selectLibraryProject(Number(timelineItem.dataset.libraryIndex));
    return;
  }
  const stepButton = event.target.closest("[data-library-step]");
  if (stepButton) {
    stepLibraryProject(Number(stepButton.dataset.libraryStep));
    return;
  }
  const open = event.target.closest("[data-open-project]");
  if (open) openProject(open.dataset.openProject);
});

projectGrid?.addEventListener("wheel", (event) => {
  if (
    libraryViewMode !== "stack" ||
    document.body.dataset.view !== "library" ||
    !event.target.closest(".project-stack, .project-timeline")
  ) return;
  event.preventDefault();
  if (libraryWheelLock) return;
  libraryWheelLock = true;
  stepLibraryProject(event.deltaY > 0 ? 1 : -1);
  window.setTimeout(() => {
    libraryWheelLock = false;
  }, 900);
}, { passive: false });

homeHistory?.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-nav-view]");
  if (nav) {
    showView(nav.dataset.navView === "library" ? "library" : nav.dataset.navView);
    return;
  }
  const card = event.target.closest("[data-open-project]");
  if (card) openProject(card.dataset.openProject);
});

uploadAsset.addEventListener("click", () => {
  pendingUploadPoint = null;
  assetUploadInput.click();
});

assetUploadInput.addEventListener("change", () => {
  const point = pendingUploadPoint;
  uploadAsReference(assetUploadInput.files, point);
  pendingUploadPoint = null;
  assetUploadInput.value = "";
});

chatUploadImage.addEventListener("click", () => {
  chatImageInput.click();
});

chatImageInput.addEventListener("change", () => {
  addChatImageFiles(chatImageInput.files);
  chatImageInput.value = "";
});

promptForm.addEventListener("dragenter", (event) => {
  if (!Array.from(event.dataTransfer?.items || []).some((item) => item.kind === "file")) return;
  event.preventDefault();
  chatDragDepth += 1;
  promptForm.classList.add("drag-over");
});

promptForm.addEventListener("dragover", (event) => {
  if (!Array.from(event.dataTransfer?.items || []).some((item) => item.kind === "file")) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  promptForm.classList.add("drag-over");
});

promptForm.addEventListener("dragleave", () => {
  chatDragDepth = Math.max(0, chatDragDepth - 1);
  if (!chatDragDepth) promptForm.classList.remove("drag-over");
});

promptForm.addEventListener("drop", (event) => {
  event.preventDefault();
  addChatImageFiles(event.dataTransfer.files);
  promptForm.classList.remove("drag-over");
  chatDragDepth = 0;
});

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
    getOutputSize: getQwenSizeForImage,
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

  // TODO(architecture): Remove this legacy inline submit flow after the
  // compatibility layer is fully retired.
  const sourceNode = editingImageNode;
  const fileName = sourceNode.querySelector(".image-file-name")?.textContent.trim() || "图片";
  const img = sourceNode.querySelector(".image-frame img");
  const sourceFrame = sourceNode.querySelector(".image-frame");
  const sourceX = parseFloat(sourceNode.style.left || "0");
  const sourceY = parseFloat(sourceNode.style.top || "0");
  const sourceWidth = sourceNode.offsetWidth;
  const sourceAspect = sourceFrame?.style.aspectRatio || `${img?.naturalWidth || 1} / ${img?.naturalHeight || 1}`;
  const previewNode = addGenerationPreview({
    title: "Qwen 编辑中.png",
    desc: "正在根据提示词修改原图",
    x: sourceX + sourceWidth + 28,
    y: sourceY,
    width: sourceWidth,
    aspectRatio: sourceAspect
  });
  addChat("user", `修改 ${fileName}：${prompt}`);
  const thinking = addThinking("图片编辑流程", [
    "读取原图和提示词",
    "计算输出比例",
    "调用 Qwen 图像编辑",
    "将结果写入画布"
  ]);
  const progress = addChat("assistant", "正在调用 Qwen 图像编辑模型...");
  progress.classList.add("loading");
  sourceNode.dataset.editPrompt = prompt;
  sourceNode.dataset.editModel = imageEditModel.value;

  try {
    updateThinking(thinking, 1);
    const image = await imageSourceToDataUrl(img?.src);
    updateThinking(thinking, 2);
    const result = await postJson("/api/image-edit", {
      prompt,
      model: imageEditModel.value,
      image,
      size: getQwenSizeForImage(img)
    });
    const outputUrl = result.imageUrl || (result.imageBase64 ? `data:image/png;base64,${result.imageBase64}` : "");
    updateThinking(thinking, 3);
    if (outputUrl) {
      const imageNode = replacePreviewWithImage(previewNode, {
        title: "Qwen 编辑图片.png",
        desc: "由千问图像模型编辑",
        url: outputUrl,
        width: sourceWidth,
        aspectRatio: sourceAspect,
        prompt,
        sourceNode,
        actionType: "image_edit",
        model: imageEditModel.value
      });
      addSourceBadge(imageNode, sourceNode);
      addChatImage("assistant", outputUrl, "图片已编辑，并放在原图右侧");
    }
    updateThinking(thinking, 4, true);
    updateChat(progress, result.message || "图片已根据提示词更新。");
  } catch (error) {
    previewNode.classList.add("generation-failed");
    previewNode.querySelector(".generation-frame span").textContent = "生成失败，请查看右侧错误信息";
    updateThinking(thinking, 0, true);
    updateChat(progress, `图片编辑失败：${error.message}`);
  }
  hideImageEditPopover();
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
    const images = await Promise.all(files.map(fileToDataUrl));
    updateThinking(thinking, 3);
    const result = await postJson("/api/chat", buildChatImagePayload({ model, prompt, images }));
    updateChat(progress, result.text || result.message || "已收到模型响应。");
    if (result.imageUrl) {
      replacePreviewWithImage(previewNode, {
        title: "Qwen 生成图片.png",
        desc: "由千问图像模型生成",
        url: result.imageUrl,
        width: previewNode.offsetWidth,
        aspectRatio: previewNode.querySelector(".image-frame")?.style.aspectRatio || "1 / 1",
        prompt,
        actionType: detectKind(prompt),
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
