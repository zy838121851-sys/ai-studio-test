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

export function normalizeAgentEventType(type, payload = {}, { getNodeKind = () => "" } = {}) {
  if (type === "upload") return payload.kind === "image" ? AGENT_EVENT_TYPES.IMAGE_UPLOADED : AGENT_EVENT_TYPES.GENERATION_CREATED;
  if (type === "select") {
    return getNodeKind(payload.nodeId) === "image" ? AGENT_EVENT_TYPES.IMAGE_SELECTED : AGENT_EVENT_TYPES.CANVAS_IDLE;
  }
  if (type === "delete" || type === "erase") return AGENT_EVENT_TYPES.IMAGE_DELETED;
  if (type === "mock_generate") return AGENT_EVENT_TYPES.GENERATION_CREATED;
  if (type === "ai_suggestion") return AGENT_EVENT_TYPES.CANVAS_IDLE;
  if (type === "undo" || type === "redo") return AGENT_EVENT_TYPES.CANVAS_IDLE;
  return type;
}
