import { getImageFiles as getImageFilesFromList } from "../../../../lib/file.js";
import { createHomeWorkflowRuntime } from "./home-workflow-bootstrap.js";

export function createHomeFeatureRuntime({
  elements = {},
  state = {},
  actions = {}
} = {}) {
  return createHomeWorkflowRuntime({
    elements,
    state,
    services: {
      getImageFilesFromList
    },
    actions
  });
}
