import { createWorkspaceAppScope } from "../runtime/workspace-app-scope.js";
import { createWorkspaceAppState } from "../runtime/workspace-app-state.js";

export function createWorkspaceCompositionState(options) {
  return createWorkspaceAppState(options);
}

export function createWorkspaceCompositionScope(accessors) {
  return createWorkspaceAppScope(accessors);
}

export function createWorkspaceCompositionStateBundle(options) {
  const state = createWorkspaceCompositionState(options);
  return {
    state,
    workspaceAppScope: createWorkspaceCompositionScope({
      assets: state.assets,
      get zoom() { return state.zoom; },
      set zoom(value) { state.zoom = value; },
      get pan() { return state.pan; },
      set pan(value) { state.pan = value; },
      get isPanning() { return state.isPanning; },
      set isPanning(value) { state.isPanning = value; },
      get panStart() { return state.panStart; },
      set panStart(value) { state.panStart = value; },
      get pendingUploadPoint() { return state.pendingUploadPoint; },
      set pendingUploadPoint(value) { state.pendingUploadPoint = value; },
      get chatImageFiles() { return state.chatImageFiles; },
      set chatImageFiles(value) { state.chatImageFiles = value; },
      get homeImageFiles() { return state.homeImageFiles; },
      set homeImageFiles(value) { state.homeImageFiles = value; },
      get chatDragDepth() { return state.chatDragDepth; },
      set chatDragDepth(value) { state.chatDragDepth = value; },
      get activeCanvasTool() { return state.activeCanvasTool; },
      set activeCanvasTool(value) { state.activeCanvasTool = value; },
      get uploadDragDepth() { return state.uploadDragDepth; },
      set uploadDragDepth(value) { state.uploadDragDepth = value; },
      get aiCoreDrag() { return state.aiCoreDrag; },
      set aiCoreDrag(value) { state.aiCoreDrag = value; },
      get aiCoreSuppressClick() { return state.aiCoreSuppressClick; },
      set aiCoreSuppressClick(value) { state.aiCoreSuppressClick = value; },
      get aiCoreAgentEnabled() { return state.aiCoreAgentEnabled; },
      set aiCoreAgentEnabled(value) { state.aiCoreAgentEnabled = value; },
      get libraryWheelLock() { return state.libraryWheelLock; },
      set libraryWheelLock(value) { state.libraryWheelLock = value; },
      get libraryTransitionDirection() { return state.libraryTransitionDirection; },
      set libraryTransitionDirection(value) { state.libraryTransitionDirection = value; },
      get projects() { return state.projects; },
      set projects(value) { state.projects = value; },
      get activeProjectId() { return state.activeProjectId; },
      set activeProjectId(value) { state.activeProjectId = value; },
      get libraryViewMode() { return state.libraryViewMode; },
      set libraryViewMode(value) { state.libraryViewMode = value; }
    })
  };
}
