import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export function ImageEditDialog({
  open,
  submitting,
  onClose,
  onSubmit
}: {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);
  if (!open) return null;

  return (
    <div
      className="canvas-image-edit-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Edit image"
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!prompt.trim() || submitting) return;
          setError("");
          try {
            await onSubmit(prompt.trim());
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Unable to edit the image.");
          }
        }}
      >
        <header>
          <strong>Edit image</strong>
          <button type="button" title="Close" aria-label="Close" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          maxLength={8_000}
          placeholder="Describe the change"
          aria-label="Edit prompt"
        />
        <footer>
          <button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" disabled={!prompt.trim() || submitting}>
            Apply
          </button>
        </footer>
        {error ? (
          <p className="canvas-image-edit-dialog__error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
