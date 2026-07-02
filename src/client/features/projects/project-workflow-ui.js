import {
  applyProjectLibraryClasses,
  renderHomeHistoryContent,
  renderProjectLibraryContent,
  showProjectSaveStatus
} from "./components/project-library.js?v=20260627-library-bulk-select-1";

export function createProjectWorkflowUi({ ui = {} } = {}) {
  return {
    applyProjectLibraryClasses,
    renderProjectLibraryContent,
    renderHomeHistoryContent,
    showProjectSaveStatus,
    applyViewState: ui.applyViewState,
    addNode: ui.addNode,
    markGeneratedNodeContext: ui.markGeneratedNodeContext,
    removeNodeDeep: ui.removeNodeDeep,
    applyTransform: ui.applyTransform,
    setChatCollapsed: ui.setChatCollapsed,
    updateProjectTitleView: ui.updateProjectTitleView
  };
}
