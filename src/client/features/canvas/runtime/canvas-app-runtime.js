import { createCanvasGenerationBootstrap } from "./canvas-generation-bootstrap.js";
import { createCanvasInteractionBootstrap } from "./canvas-interaction-bootstrap.js";
import { createCanvasNodeDragBootstrap } from "./canvas-node-drag-bootstrap.js";
import { createCanvasOperationsBootstrap } from "./canvas-operations-bootstrap.js";
import { createCanvasSelectionBootstrap } from "./canvas-selection-bootstrap.js";
import { createCanvasSurfaceBootstrap } from "./canvas-surface-bootstrap.js";

export function createWorkspaceCanvasInteractionRuntime(options = {}) {
  return createCanvasInteractionBootstrap(options);
}

export function createWorkspaceCanvasSelectionRuntime(options = {}) {
  return createCanvasSelectionBootstrap(options);
}

export function createWorkspaceCanvasSurfaceRuntime(options = {}) {
  return createCanvasSurfaceBootstrap(options);
}

export function createWorkspaceCanvasOperationsRuntime(options = {}) {
  return createCanvasOperationsBootstrap(options);
}

export function createWorkspaceCanvasGenerationRuntime(options = {}) {
  return createCanvasGenerationBootstrap(options);
}

export function createWorkspaceCanvasNodeDragRuntime(options = {}) {
  return createCanvasNodeDragBootstrap(options);
}
