import { createImageEditCommandRuntime } from "./image-edit-command-runtime.js";

export function createWorkspaceImageEditRuntime({
  elements = {},
  services = {}
} = {}) {
  return createImageEditCommandRuntime({
    state: {
      getImageEditModel: () => elements.imageEditModel?.dataset?.selectedModelId
        || elements.imageEditModel?.value,
      getImageEditSize: () => elements.imageEditSize?.value,
      getImageEditCount: () => Number.parseInt(elements.imageEditCount?.value || "1", 10)
    },
    services
  });
}
