import { createProjectRuntime } from "./runtime.js";
import { createProjectRuntimeBootstrap } from "./runtime-bootstrap.js";
import { bindProjectAuthSync } from "./project-auth-sync.js";
import { createProjectWorkflowRuntime } from "./project-workflow-bootstrap.js?v=20260627-library-bulk-select-1";
import {
  createProjectWorkflowServices,
  isRemoteProjectPersistenceEnabled
} from "./project-workflow-services.js";
import {
  clearProjectsStorage,
  getActiveProjectId,
  loadProjectsFromStorage,
  setActiveProjectId
} from "./store.js";
import { createProjectWorkflowState } from "./project-workflow-state.js";
import { createProjectWorkflowUi } from "./project-workflow-ui.js";

export function createProjectFeatureRuntime({
  elements = {},
  state = {},
  ui = {},
  chat = {},
  services = {}
} = {}) {
  const remoteProjectsEnabled = isRemoteProjectPersistenceEnabled();
  if (remoteProjectsEnabled) clearProjectsStorage();

  const runtimeBootstrap = createProjectRuntimeBootstrap({
    loadProjectsFromStorage,
    getActiveProjectId,
    setActiveProjectId,
    createProjectRuntime,
    useStorage: !remoteProjectsEnabled,
    persistLocal: !remoteProjectsEnabled,
    onChange({ projects: nextProjects, activeProjectId: nextActiveProjectId, activeProject }) {
      state.setProjects?.(nextProjects);
      state.setActiveProjectIdInMemory?.(nextActiveProjectId);
      ui.updateProjectTitle?.(activeProject);
      ui.renderProjectLibrary?.();
      ui.renderHomeHistory?.();
    }
  });

  state.setProjects?.(runtimeBootstrap.projects);
  state.setActiveProjectIdInMemory?.(runtimeBootstrap.activeProjectId);

  const workflowRuntime = createProjectWorkflowRuntime({
    state: createProjectWorkflowState({ state, elements, remoteProjectsEnabled }),
    services: createProjectWorkflowServices({ remoteProjectsEnabled, services }),
    projectRuntime: runtimeBootstrap.projectRuntime,
    elements,
    ui: createProjectWorkflowUi({ ui }),
    chat
  });

  const ready = Promise.resolve(workflowRuntime.syncRemoteProjects?.()).catch((error) => {
    console.warn("Initial project sync failed", error);
    return false;
  });
  bindProjectAuthSync({
    workflowRuntime,
    runtimeBootstrap,
    state
  });

  return {
    runtimeBootstrap,
    projectRuntime: runtimeBootstrap.projectRuntime,
    ready,
    ...workflowRuntime
  };
}
