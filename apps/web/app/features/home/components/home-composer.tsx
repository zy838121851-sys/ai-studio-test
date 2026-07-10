import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { ModelCatalogEntryDto } from "@ai-studio/contracts";

import { ModelPicker } from "./model-picker.js";

export interface HomeAttachment {
  id: string;
  file: File;
  previewUrl: string;
}

interface HomeComposerProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  models: ModelCatalogEntryDto[];
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  attachments: HomeAttachment[];
  onAttachmentsChange: (attachments: HomeAttachment[]) => void;
  submitting: boolean;
  onSubmit: () => void;
}

export function HomeComposer({
  prompt,
  onPromptChange,
  models,
  selectedModelId,
  onModelChange,
  attachments,
  onAttachmentsChange,
  submitting,
  onSubmit
}: HomeComposerProps) {
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [automatic, setAutomatic] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const attachmentsRef = useRef(attachments);
  const selectedModel = models.find((model) => model.id === selectedModelId);

  useEffect(() => {
    if (!modelPickerOpen) return;
    const close = (event: PointerEvent) => {
      if (!composerRef.current?.contains(event.target as Node)) setModelPickerOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [modelPickerOpen]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(
    () => () => {
      attachmentsRef.current.forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl));
    },
    []
  );

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/")
    );
    if (files.length === 0) return;
    const next = files.slice(0, Math.max(0, 8 - attachments.length)).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    onAttachmentsChange([...attachments, ...next]);
    event.target.value = "";
  };

  const removeAttachment = (id: string) => {
    const target = attachments.find((attachment) => attachment.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onAttachmentsChange(attachments.filter((attachment) => attachment.id !== id));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (prompt.trim() && !submitting) onSubmit();
  };

  return (
    <div className="composer-shell" ref={composerRef}>
      <form className="home-composer" onSubmit={submit}>
        {attachments.length > 0 ? (
          <div className="attachment-strip" aria-label="参考图片">
            {attachments.map((attachment) => (
              <figure key={attachment.id} className="attachment-preview">
                <img src={attachment.previewUrl} alt={attachment.file.name} />
                <button
                  type="button"
                  title="移除参考图"
                  onClick={() => removeAttachment(attachment.id)}
                >
                  ×
                </button>
              </figure>
            ))}
          </div>
        ) : null}
        <textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="描述你的创意，或添加参考图片"
          rows={3}
          maxLength={8_000}
          aria-label="创作描述"
        />
        <div className="composer-actions">
          <div className="composer-actions__left">
            <input
              ref={fileInputRef}
              type="file"
              aria-label="添加参考图片"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              onChange={addFiles}
            />
            <button
              className="icon-command"
              type="button"
              title="添加参考图片"
              onClick={() => fileInputRef.current?.click()}
            >
              +
            </button>
            <button
              className="model-trigger"
              type="button"
              aria-expanded={modelPickerOpen}
              onClick={() => setModelPickerOpen((value) => !value)}
            >
              <span>{selectedModel?.label ?? "选择模型"}</span>
              <span aria-hidden="true">⌄</span>
            </button>
          </div>
          <div className="composer-actions__right">
            <button
              className="submit-generation"
              type="submit"
              disabled={!prompt.trim() || submitting || selectedModel?.modality !== "image"}
              title="开始生成"
            >
              {submitting ? "…" : `⚡ ${selectedModel?.creditCost ?? 0}`}
            </button>
          </div>
        </div>
      </form>
      <ModelPicker
        open={modelPickerOpen}
        models={models}
        selectedModelId={selectedModelId}
        automatic={automatic}
        onAutomaticChange={setAutomatic}
        onSelect={onModelChange}
        onClose={() => setModelPickerOpen(false)}
      />
    </div>
  );
}
