export const AGENT_EVENT_TYPES = Object.freeze({
  IMAGE_UPLOADED: "image_uploaded",
  IMAGE_SELECTED: "image_selected",
  IMAGE_MOVED: "image_moved",
  IMAGE_DELETED: "image_deleted",
  PROMPT_SUBMITTED: "prompt_submitted",
  GENERATION_CREATED: "generation_created",
  GENERATION_DELETED: "generation_deleted",
  ASSET_FAVORITED: "asset_favorited",
  CANVAS_IDLE: "canvas_idle",
  ASSETS_GROUPED: "assets_grouped"
});

export function isAgentEventType(type) {
  return Object.values(AGENT_EVENT_TYPES).includes(type);
}
