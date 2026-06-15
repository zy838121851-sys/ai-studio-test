import {
  DIRECTOR_ACTIONS,
  DIRECTOR_VIEW_COUNT,
  IMAGE_EDIT_BUILD_DEFAULTS
} from "../../canvas/runtime/index.js";

export function createWorkspaceAppDefaults() {
  return {
    directorActions: DIRECTOR_ACTIONS,
    directorViewCount: DIRECTOR_VIEW_COUNT,
    imageEditBuildOutput: {
      minWidth: IMAGE_EDIT_BUILD_DEFAULTS.minWidth,
      maxWidth: IMAGE_EDIT_BUILD_DEFAULTS.maxWidth,
      minHeight: IMAGE_EDIT_BUILD_DEFAULTS.minHeight,
      maxHeight: IMAGE_EDIT_BUILD_DEFAULTS.maxHeight
    }
  };
}
