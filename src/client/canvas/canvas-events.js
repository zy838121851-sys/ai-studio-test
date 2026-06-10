import { createId } from "../utils/id.js";

export const CANVAS_EVENT_TYPES = Object.freeze({
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

const canvasEvents = [];

export function recordCanvasEvent(type, payload = {}, options = {}) {
  const canonicalType = options.canonicalType || type;
  const event = {
    id: createId("canvas-event"),
    type: canonicalType,
    originalType: options.originalType || type,
    payload,
    time: Date.now()
  };
  canvasEvents.push(event);
  while (canvasEvents.length > (options.maxEvents || 200)) canvasEvents.shift();
  if (options.dispatch !== false && typeof document !== "undefined") {
    document.dispatchEvent(new CustomEvent("ai-canvas-event", {
      detail: {
        type: canonicalType,
        originalType: event.originalType,
        payload,
        event
      }
    }));
  }
  return event;
}

export function getCanvasEventStore() {
  return canvasEvents;
}

export function getRecentCanvasEvents(limit = 20) {
  return canvasEvents.slice(-limit);
}

export function clearCanvasEvents() {
  canvasEvents.length = 0;
}
