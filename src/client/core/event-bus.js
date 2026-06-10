const listeners = new Map();

export function on(eventName, handler) {
  if (!listeners.has(eventName)) listeners.set(eventName, new Set());
  listeners.get(eventName).add(handler);
  return () => off(eventName, handler);
}

export function off(eventName, handler) {
  listeners.get(eventName)?.delete(handler);
}

export function emit(eventName, payload = {}) {
  const event = { type: eventName, payload, time: Date.now() };
  listeners.get(eventName)?.forEach((handler) => handler(event));
  listeners.get("*")?.forEach((handler) => handler(event));
  return event;
}

export const eventBus = { on, off, emit };
