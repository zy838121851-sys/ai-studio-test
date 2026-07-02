import {
  buildDemoProjects,
  makeDemoProjectThumb as makeDemoThumb
} from "./demo-projects.js";
import {
  getLibraryTransitionDirection,
  getProjectDisplayPrompt,
  getProjectDisplayTitle,
  getProjectPreview,
  wrapProjectIndex
} from "./library-state.js";
import {
  deleteRemoteProject,
  getRemoteProject,
  listRemoteProjects,
  saveRemoteProject,
  saveRemoteProjectCanvas,
  updateRemoteProject
} from "../ai/project-client.js";
import { createProjectSavePatch } from "./snapshot-save-patch.js";
import { restoreCanvasSnapshotJson } from "./snapshot.js";
import {
  formatProjectDate,
  hasDemoProjectsSeeded,
  makeProjectTitle,
  markDemoProjectsSeeded,
  saveProjectsToStorage
} from "./store.js";

export function isRemoteProjectPersistenceEnabled() {
  return typeof listRemoteProjects === "function" && typeof saveRemoteProject === "function";
}

export function createProjectWorkflowServices({
  remoteProjectsEnabled = false,
  services = {}
} = {}) {
  return {
    buildDemoProjects,
    hasDemoProjectsSeeded,
    markDemoProjectsSeeded,
    saveProjectsToStorage: remoteProjectsEnabled ? () => {} : saveProjectsToStorage,
    remoteProjectsEnabled,
    makeProjectTitleFromPrompt: makeProjectTitle,
    createProjectSavePatch,
    restoreCanvasSnapshotJson,
    listRemoteProjects,
    createRemoteProject: saveRemoteProject,
    getRemoteProject,
    updateRemoteProject,
    deleteRemoteProject,
    saveRemoteProjectCanvas,
    getProjectDisplayPrompt,
    getProjectDisplayTitle,
    getProjectPreview,
    getLibraryTransitionDirection,
    makeDemoThumb,
    wrapProjectIndex,
    formatProjectDate,
    resolveAssetUrl: services.resolveAssetUrl,
    ensureAssetsReady: services.ensureAssetsReady,
    escapeHtml: services.escapeHtml
  };
}
