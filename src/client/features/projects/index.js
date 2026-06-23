export {
  PROJECTS_KEY,
  PROJECTS_DEMO_KEY,
  ACTIVE_PROJECT_KEY,
  LIBRARY_VIEW_KEY,
  loadProjectsFromStorage,
  saveProjectsToStorage,
  getActiveProjectId,
  setActiveProjectId,
  clearProjectsStorage,
  getLibraryViewMode,
  setLibraryViewMode,
  createProjectRecord,
  getActiveProjectRecord,
  patchProjectRecord,
  makeProjectTitle,
  hasDemoProjectsSeeded,
  markDemoProjectsSeeded,
  formatProjectDate
} from "./store.js";
export {
  getProjectDisplayTitle,
  getProjectDisplayPrompt,
  getProjectPreview,
  getLibraryTransitionDirection,
  wrapProjectIndex
} from "./library-state.js";
export {
  getProjectDisplayTitle as getCoreProjectDisplayTitle,
  getProjectDisplayPrompt as getCoreProjectDisplayPrompt,
  getProjectPreview as getCoreProjectPreview
} from "./display.js";
export { createProjectSavePatch } from "./snapshot.js";
export { makeDemoProjectThumb, buildDemoProjects } from "./demo-projects.js";
export { createProjectWorkflow } from "./workflows/project-workflow.js";
export {
  applyProjectLibraryClasses,
  renderHomeHistoryContent,
  renderProjectLibraryContent,
  showProjectSaveStatus
} from "./components/project-library.js";
