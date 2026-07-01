export { mountWorkspaceApp } from "./workflows/workspace-app-mount.js?v=20260628-boot-inline-1";
export { startWorkspaceApp } from "./workflows/workspace-app-composition.js?v=20260628-boot-inline-1";
export { applyViewState } from "./routing/view-router.js";
export { initAssetPanel, renderAssetLibrary } from "./asset-library/asset-panel.js?v=20260628-boot-inline-1";
export { createChatCollapseController } from "./chat/chat-collapse.js";
export {
  appendChatBlocks,
  appendChatImage,
  appendChatMessage,
  appendThinkingMessage,
  updateChatMessage,
  updateThinkingMessage
} from "./chat/components/chat-log.js?v=20260628-boot-inline-1";
export { addImageFilesToPreview, renderChatImagePreviewList } from "./chat/components/chat-image-preview.js?v=20260627-chat-agent-2";
export { createChatWorkflow } from "./chat/workflows/chat-workflow.js?v=20260628-boot-inline-1";
export { bindPromptShortcuts, bindPromptSubmit } from "./chat/workflows/prompt-workflow.js?v=20260628-boot-inline-1";
export { applyHomeFileState, renderHomeFilePreview, syncHomeModelPicker } from "./home/components/home-composer.js";
export { bindHomeLibraryInteractions } from "./home/home-library-interactions.js?v=20260628-boot-inline-1";
export { createHomeWorkflow } from "./home/workflows/home-workflow.js";
export { initAppInteractions } from "./interactions/app-interactions.js";
export { bindFooterEvents } from "./interactions/footer-events.js";
export { bindGlobalInteractions } from "./interactions/global-interactions.js";
export { initTaskBar } from "./taskbar/task-bar.js";
