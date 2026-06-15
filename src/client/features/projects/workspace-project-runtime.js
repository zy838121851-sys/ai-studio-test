import { createProjectFeatureRuntime } from "./project-feature-runtime.js";

export function createWorkspaceProjectRuntime(options = {}) {
  return createProjectFeatureRuntime(options);
}
