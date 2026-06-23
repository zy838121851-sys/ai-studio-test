import {
  DEFAULT_CANVAS_PAN,
  DEFAULT_CANVAS_ZOOM
} from "../../canvas/runtime/index.js";
import { createAppInitialState } from "./state/app-initial-state.js";

export function createWorkspaceAppState({ getLibraryViewMode }) {
  return {
    assets: [],
    ...createAppInitialState({
      defaultCanvasZoom: DEFAULT_CANVAS_ZOOM,
      defaultCanvasPan: DEFAULT_CANVAS_PAN,
      getLibraryViewMode
    })
  };
}
