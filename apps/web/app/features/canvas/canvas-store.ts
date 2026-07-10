import { normalizeCanvasDocument, type CanvasDocument } from "@ai-studio/canvas-engine";
import { create } from "zustand";

interface CanvasReceiverState {
  document: CanvasDocument | null;
  setDocument: (document: CanvasDocument) => void;
  hydrate: (value: unknown, projectId: string) => void;
  clear: () => void;
}

export const useCanvasReceiverStore = create<CanvasReceiverState>((set) => ({
  document: null,
  setDocument: (document) => set({ document }),
  hydrate: (value, projectId) => set({ document: normalizeCanvasDocument(value, projectId) }),
  clear: () => set({ document: null })
}));
