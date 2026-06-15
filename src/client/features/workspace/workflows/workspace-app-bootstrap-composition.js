import { createWorkspaceAppDefaults } from "../runtime/workspace-app-defaults.js";
import { createWorkspaceAppElements } from "../runtime/workspace-app-elements.js";

export function createWorkspaceCompositionElements(document) {
  return createWorkspaceAppElements(document);
}

export function createWorkspaceCompositionDefaults() {
  return createWorkspaceAppDefaults();
}
