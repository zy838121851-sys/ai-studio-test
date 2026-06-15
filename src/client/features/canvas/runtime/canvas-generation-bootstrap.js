import { createDirectorCardWorkflow } from "../../agent/workflows/director-card-workflow.js";
import { createPromptGenerationWorkflow } from "../../ai/workflows/prompt-generation-workflow.js";
import { createGenerationNodeWorkflow } from "../workflows/generation-node-workflow.js";
import { createGenerationUploadWorkflow } from "../workflows/generation-upload-workflow.js";
import { createModelViewerWorkflow } from "../workflows/model-viewer-workflow.js";

export function createCanvasGenerationBootstrap({
  elements = {},
  state = {},
  services = {},
  defaults = {}
} = {}) {
  const generationNodeWorkflow = createGenerationNodeWorkflow({
    services: {
      createGenerationPreviewNode: services.createGenerationPreviewNode,
      addNode: services.addNode,
      replacePreviewNodeWithImage: services.replacePreviewNodeWithImage,
      markGeneratedNodeContext: services.markGeneratedNodeContext,
      recordCanvasEvent: services.recordCanvasEvent,
      addSourceBadgeElement: services.addSourceBadgeElement,
      selectNode: services.selectNode
    }
  });

  const modelViewerWorkflow = createModelViewerWorkflow({
    services: {
      initModelViewerPreview: services.initModelViewerPreview,
      hideAddNodeMenu: services.hideAddNodeMenu,
      selectNode: services.selectNode
    }
  });

  const directorCardWorkflow = createDirectorCardWorkflow({
    services: {
      canvasWorld: elements.canvasWorld,
      getNodeBounds: services.getNodeBounds,
      addNode: services.addNode,
      inferDirectorProductProfile: services.inferDirectorProductProfile,
      directorActions: defaults.directorActions,
      directorViewCount: defaults.directorViewCount,
      escapeHtml: services.escapeHtml
    }
  });

  const promptGenerationWorkflow = createPromptGenerationWorkflow({
    services: {
      getNextGeneratedCount: state.getNextGeneratedCount,
      addNode: services.addNode,
      addChat: services.addChat,
      buildPromptGenerationNodeConfig: services.buildPromptGenerationNodeConfig,
      detectGenerationKind: services.detectGenerationKind
    }
  });

  const generationUploadWorkflow = createGenerationUploadWorkflow({
    elements: {
      appRoot: elements.appRoot,
      chatImagePreview: elements.chatImagePreview,
      promptForm: elements.promptForm,
      promptInput: elements.promptInput,
      canvasViewport: elements.canvasViewport
    },
    services: {
      getChatImageFiles: state.getChatImageFiles,
      setChatImageFiles: state.setChatImageFiles,
      addChat: services.addChat,
      resolveUploadKind: services.resolveUploadKind,
      addNode: services.addNode,
      viewportPointToWorld: services.viewportPointToWorld,
      scheduleAICoreAgent: services.scheduleAICoreAgent,
      recordCanvasEvent: services.recordCanvasEvent,
      getImageFilesFromList: services.getImageFilesFromList,
      runDirectorAction: services.runDirectorAction,
      inferDirectorProductProfile: services.inferDirectorProductProfile,
      directorActions: defaults.directorActions,
      createDirectorCard: directorCardWorkflow.createDirectorCard,
      setUploadChoiceHover: services.setUploadChoiceHover,
      syncCanvasTransform: services.syncCanvasTransform,
      setUploadDragDepth: state.setUploadDragDepth,
      setChatDragDepth: state.setChatDragDepth,
      escapeHtml: services.escapeHtml
    }
  });

  return {
    ...generationNodeWorkflow,
    ...modelViewerWorkflow,
    ...directorCardWorkflow,
    ...promptGenerationWorkflow,
    ...generationUploadWorkflow
  };
}
