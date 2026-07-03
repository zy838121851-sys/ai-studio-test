import { createProjectRuntime } from "./runtime.js";
import { createProjectRuntimeBootstrap } from "./runtime-bootstrap.js";
import {
  bindProjectAuthSync,
  createProjectInitialSyncReady
} from "./project-auth-sync.js";
import {
  hydrateProjectRuntimeState,
  syncProjectRuntimeChange
} from "./project-runtime-sync.js";
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
      syncProjectRuntimeChange({
        state,
        ui,
        projects: nextProjects,
        activeProjectId: nextActiveProjectId,
        activeProject
      });
    }
  });

  hydrateProjectRuntimeState({ state, runtimeBootstrap });

  const workflowRuntime = createProjectWorkflowRuntime({
    state: createProjectWorkflowState({ state, elements, remoteProjectsEnabled }),
    services: createProjectWorkflowServices({ remoteProjectsEnabled, services }),
    projectRuntime: runtimeBootstrap.projectRuntime,
    elements,
    ui: createProjectWorkflowUi({ ui }),
    chat
  });

  const ready = createProjectInitialSyncReady({ workflowRuntime });
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
