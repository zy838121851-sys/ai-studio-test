import type { CanvasDocument } from "./index.js";

export interface CanvasCommand {
  id: string;
  label: string;
  apply(document: CanvasDocument): CanvasDocument;
  undo(document: CanvasDocument): CanvasDocument;
}

export interface HistoryState {
  past: readonly CanvasCommand[];
  future: readonly CanvasCommand[];
}

export class CanvasHistory {
  private document: CanvasDocument;
  private past: CanvasCommand[] = [];
  private future: CanvasCommand[] = [];

  constructor(document: CanvasDocument, private readonly maxEntries = 100) {
    this.document = document;
  }

  get current(): CanvasDocument { return this.document; }
  get canUndo(): boolean { return this.past.length > 0; }
  get canRedo(): boolean { return this.future.length > 0; }
  get state(): HistoryState { return { past: [...this.past], future: [...this.future] }; }

  execute(command: CanvasCommand): CanvasDocument {
    const next = command.apply(this.document);
    this.assertDocumentIdentity(next);
    this.document = next;
    this.past = [...this.past, command].slice(-Math.max(1, this.maxEntries));
    this.future = [];
    return this.document;
  }

  undo(): CanvasDocument {
    const command = this.past.at(-1);
    if (!command) return this.document;
    const next = command.undo(this.document);
    this.assertDocumentIdentity(next);
    this.document = next;
    this.past = this.past.slice(0, -1);
    this.future = [...this.future, command];
    return this.document;
  }

  redo(): CanvasDocument {
    const command = this.future.at(-1);
    if (!command) return this.document;
    const next = command.apply(this.document);
    this.assertDocumentIdentity(next);
    this.document = next;
    this.future = this.future.slice(0, -1);
    this.past = [...this.past, command].slice(-Math.max(1, this.maxEntries));
    return this.document;
  }

  private assertDocumentIdentity(next: CanvasDocument): void {
    if (next.projectId !== this.document.projectId) {
      throw new Error("Canvas commands must preserve project identity.");
    }
  }
}

export function createDocumentReplaceCommand(
  id: string,
  label: string,
  before: CanvasDocument,
  after: CanvasDocument
): CanvasCommand {
  if (before.projectId !== after.projectId) throw new Error("Canvas command documents must share project identity.");
  return {
    id,
    label,
    apply: () => after,
    undo: () => before
  };
}
