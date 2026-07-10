import { normalizeCanvasDocument, type CanvasDocument } from "@ai-studio/canvas-engine";
import { create } from "zustand";

interface CanvasReceiverState {
  document: CanvasDocument | null;
  hydrate: (value: unknown, projectId: string) => void;
  clear: () => void;
}

export const useCanvasReceiverStore = create<CanvasReceiverState>((set) => ({
  document: null,
  hydrate: (value, projectId) => set({ document: normalizeCanvasDocument(value, projectId) }),
  clear: () => set({ document: null })
}));
