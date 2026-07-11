import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent
} from "react";
import type { ModelCatalogEntryDto } from "@ai-studio/contracts";
import { ImagePlus, LoaderCircle, Send, X } from "lucide-react";

import type { CanvasImageReference } from "./canvas-reference.js";

interface UploadedChatAttachment {
  kind: "upload";
  id: string;
  file: File;
  previewUrl: string;
}

interface CanvasChatAttachment extends CanvasImageReference {
  kind: "canvas";
  id: string;
  previewUrl: string;
}

export type ChatAttachment = UploadedChatAttachment | CanvasChatAttachment;

export function CanvasChatComposer({
  models,
  submitting,
  onSubmit,
  canvasReferences
}: {
  models: ModelCatalogEntryDto[];
  submitting: boolean;
  onSubmit: (input: {
    prompt: string;
    modelId: string;
    attachments: ChatAttachment[];
  }) => Promise<void>;
  canvasReferences: CanvasImageReference[];
}) {
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<UploadedChatAttachment[]>([]);
  const [modelId, setModelId] = useState("");
  const [error, setError] = useState("");
  const [dismissedCanvasReferenceIds, setDismissedCanvasReferenceIds] = useState<Set<string>>(
    new Set()
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<UploadedChatAttachment[]>([]);
  const generationModels = models.filter(
    (model) => (model.modality === "image" || model.modality === "video") && model.enabled
  );
  const selectedModel = generationModels.find((model) => model.id === modelId) ?? generationModels[0];
  const visibleCanvasReferences = canvasReferences
    .filter((reference) => !dismissedCanvasReferenceIds.has(reference.nodeId))
    .map<CanvasChatAttachment>((reference) => ({
      ...reference,
      id: `canvas:${reference.nodeId}`,
      kind: "canvas",
      previewUrl: reference.sourceUrl
    }));
  const visibleAttachments = [...visibleCanvasReferences, ...attachments];

  useEffect(() => {
    if (!modelId && selectedModel) setModelId(selectedModel.id);
  }, [modelId, selectedModel]);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);
  useEffect(() => {
    setDismissedCanvasReferenceIds((current) => {
      const currentCanvasIds = new Set(canvasReferences.map((reference) => reference.nodeId));
      const next = new Set([...current].filter((nodeId) => currentCanvasIds.has(nodeId)));
      return next.size === current.size ? current : next;
    });
  }, [canvasReferences]);
  useEffect(
    () => () =>
      attachmentsRef.current.forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl)),
    []
  );

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const accepted = Array.from(event.target.files ?? [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, Math.max(0, 8 - attachments.length))
      .map((file) => ({
        kind: "upload" as const,
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file)
      }));
    if (accepted.length) setAttachments((current) => [...current, ...accepted]);
    event.target.value = "";
  };
  const remove = (attachment: ChatAttachment) => {
    if (attachment.kind === "canvas") {
      setDismissedCanvasReferenceIds((current) => new Set(current).add(attachment.nodeId));
      return;
    }
    setAttachments((current) => {
      const target = current.find((candidate) => candidate.id === attachment.id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((candidate) => candidate.id !== attachment.id);
    });
  };
  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!prompt.trim() || !selectedModel || submitting) return;
    setError("");
    try {
      await onSubmit({
        prompt: prompt.trim(),
        modelId: selectedModel.id,
        attachments: visibleAttachments
      });
      attachments.forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl));
      setPrompt("");
      setAttachments([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed");
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") void submit();
  };

  return (
    <form className="canvas-chat-composer" onSubmit={submit} aria-label="Chat composer">
      {visibleAttachments.length ? (
        <div className="canvas-chat-composer__attachments" aria-label="Reference images">
          {visibleAttachments.map((attachment) => (
            <figure key={attachment.id}>
              <img src={attachment.previewUrl} alt={attachmentName(attachment)} />
              <button
                type="button"
                title="Remove reference"
                aria-label={`Remove ${attachmentName(attachment)}`}
                onClick={() => remove(attachment)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </figure>
          ))}
        </div>
      ) : null}
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={onKeyDown}
        rows={3}
        maxLength={8_000}
        placeholder="Describe your idea or add a reference"
        aria-label="Prompt"
      />
      <div className="canvas-chat-composer__actions">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          hidden
          onChange={addFiles}
        />
        <button
          type="button"
          className="canvas-chat-composer__icon"
          title="Add reference"
          aria-label="Add reference"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus size={18} aria-hidden="true" />
        </button>
        <select
          value={selectedModel?.id ?? ""}
          aria-label="Generation model"
          onChange={(event) => setModelId(event.target.value)}
        >
          {generationModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="canvas-chat-composer__submit"
          title="Send"
          aria-label="Send"
          disabled={!prompt.trim() || !selectedModel || submitting}
        >
          {submitting ? (
            <LoaderCircle className="is-spinning" size={18} aria-hidden="true" />
          ) : (
            <Send size={18} aria-hidden="true" />
          )}
          <span>{selectedModel?.creditCost ?? 0}</span>
        </button>
      </div>
      {error ? (
        <p className="canvas-chat-composer__error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function attachmentName(attachment: ChatAttachment) {
  return attachment.kind === "upload" ? attachment.file.name : attachment.name;
}
