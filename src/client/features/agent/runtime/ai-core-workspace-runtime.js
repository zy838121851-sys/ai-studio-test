import { createAICoreInputController } from "./ai-core-input-controller.js";
import { createAICoreWorkspaceController } from "./ai-core-workspace-controller.js";

export function createAICoreWorkspaceRuntime({
  elements = {},
  defaults = {},
  services = {}
} = {}) {
  let runCanvasInsightAction = async () => {};
  let startCanvasAICoreInsight = () => {};

  const inputController = createAICoreInputController({
    setAICoreState: services.setAICoreState,
    addChat: services.addChat,
    inferDirectorProductProfile: services.inferDirectorProductProfile,
    getNodeTitle: services.getNodeTitle,
    startCanvasAICoreInsight: (...args) => startCanvasAICoreInsight(...args),
    addUploadedFiles: services.addUploadedFiles,
    readImageSourceAsDataUrl: services.readImageSourceAsDataUrl,
    readFileAsDataUrl: services.readFileAsDataUrl
  });

  const workspaceController = createAICoreWorkspaceController({
    createAICoreWorkspaceElement: services.createAICoreWorkspaceElement,
    bindAICoreWorkspaceElement: services.bindAICoreWorkspaceElement,
    directorActions: defaults.directorActions,
    runDirectorAction: services.runDirectorAction,
    setAICoreState: services.setAICoreState,
    normalizeAnalysis: services.normalizeAnalysis,
    addChat: services.addChat,
    inferDirectorProductProfile: services.inferDirectorProductProfile,
    getNodeTitle: services.getNodeTitle,
    postJsonRequest: services.postJsonRequest,
    getChatModel: services.getChatModel,
    getNodeBounds: services.getNodeBounds,
    findCanvasNodeById: services.findCanvasNodeById,
    findCanvasNodeByIdUnsafe: services.findCanvasNodeByIdUnsafe,
    renderStackTray: services.renderStackTray,
    appRoot: elements.appRoot,
    escapeHtml: services.escapeHtml,
    writeAICoreAnalysisCache: services.writeAICoreAnalysisCache,
    getAICoreImageData: inputController.getAICoreImageData,
    ensureCanvasSuggestionBubble: (node) => services.ensureCanvasSuggestionBubble?.(
      node,
      (productNode, bubble, action) => runCanvasInsightAction(productNode, bubble, action)
    ),
    renderCanvasSuggestionBubble: services.renderCanvasSuggestionBubble
  });

  startCanvasAICoreInsight = workspaceController.startCanvasAICoreInsight;
  runCanvasInsightAction = workspaceController.runCanvasInsightAction;

  return {
    ...inputController,
    ...workspaceController
  };
}
