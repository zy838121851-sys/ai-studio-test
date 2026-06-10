import { CANVAS_EVENT_TYPES, recordCanvasEvent } from "./canvas-events.js";
import { getCanvasSnapshot } from "./canvas-renderer.js";

export function initCanvasController({ eventBus, root = document } = {}) {
  const controller = {
    getState() {
      return getCanvasSnapshot(root);
    },
    record(type, payload = {}, options = {}) {
      const event = recordCanvasEvent(type, payload, options);
      eventBus?.emit?.("canvas:event", event);
      return event;
    }
  };

  // Compatibility bridge: future migrated UI code can dispatch these events.
  root.addEventListener("ai-canvas-event", (event) => {
    if (!event.detail?.type) return;
    if (event.detail.event?.id) {
      eventBus?.emit?.("canvas:event", event.detail.event);
      return;
    }
    controller.record(event.detail.type, event.detail.payload || {}, {
      originalType: event.detail.originalType,
      dispatch: false
    });
  });

  return controller;
}

export { CANVAS_EVENT_TYPES };
