import { useEffect, useMemo, useState } from "react";
import type { ModelCatalogEntryDto, ModelModality } from "@ai-studio/contracts";
import { Check } from "lucide-react";

interface ModelPickerProps {
  open: boolean;
  models: ModelCatalogEntryDto[];
  selectedModelId: string;
  automatic: boolean;
  onAutomaticChange: (value: boolean) => void;
  onSelect: (modelId: string) => void;
  onClose: () => void;
}

const TABS: { id: ModelModality; label: string }[] = [
  { id: "image", label: "图像" },
  { id: "video", label: "视频" },
  { id: "3d", label: "3D" }
];

export function ModelPicker({
  open,
  models,
  selectedModelId,
  automatic,
  onAutomaticChange,
  onSelect,
  onClose
}: ModelPickerProps) {
  const selected = models.find((model) => model.id === selectedModelId);
  const [tab, setTab] = useState<ModelModality>(selected?.modality ?? "image");
  const filteredModels = useMemo(
    () => models.filter((model) => model.modality === tab),
    [models, tab]
  );

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <section className="model-picker" role="dialog" aria-label="模型偏好">
      <div className="model-picker__header">
        <h2>模型偏好</h2>
        <label className="switch-control">
          <span>自动</span>
          <input
            type="checkbox"
            checked={automatic}
            onChange={(event) => onAutomaticChange(event.target.checked)}
          />
          <span className="switch-control__track" aria-hidden="true" />
        </label>
      </div>
      <div className="model-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "is-active" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="model-picker__list">
        <p className="model-group-label">{filteredModels[0]?.group ?? "模型"}</p>
        {filteredModels.map((model) => {
          const selectedModel = model.id === selectedModelId;
          const availableInSlice = model.modality === "image";
          return (
            <button
              key={model.id}
              className={`model-option${selectedModel ? " is-selected" : ""}`}
              type="button"
              disabled={!model.enabled || !availableInSlice}
              onClick={() => {
                onAutomaticChange(false);
                onSelect(model.id);
                onClose();
              }}
            >
              <span className="model-option__radio" aria-hidden="true" />
              <span className="model-option__content">
                <span className="model-option__title">
                  <strong>{model.label}</strong>
                  {model.isDefault ? <small>默认模型</small> : null}
                </span>
                <span className="model-option__description">{model.description}</span>
                <span className="model-option__badges">
                  <small>{model.estimatedSeconds}s</small>
                  <small>{model.creditCost}积分</small>
                  {model.capabilities.slice(0, 3).map((capability) => (
                    <small key={capability}>{capability}</small>
                  ))}
                </span>
              </span>
              <span className="model-option__check" aria-hidden="true">
                {selectedModel ? (
                  <Check className="ui-icon" size={16} strokeWidth={2} aria-hidden="true" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
