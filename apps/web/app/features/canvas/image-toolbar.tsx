import { useState } from "react";
import { Box, Columns2, Crop, Expand, ImageMinus, Sparkles, Type } from "lucide-react";

export type ImageToolbarAction =
  "crop" | "upscale" | "remove-background" | "expand" | "edit-text" | "compare" | "generate-3d";

export interface ImageToolbarCommand {
  action: ImageToolbarAction;
  nodeId: string;
  upscaleSize?: "2k" | "4k";
}

export function ImageToolbar({
  nodeId,
  position,
  onCommand
}: {
  nodeId: string;
  position: { x: number; y: number };
  onCommand?: (command: ImageToolbarCommand) => void;
}) {
  const [showUpscale, setShowUpscale] = useState(false);
  const [upscaleSize, setUpscaleSize] = useState<"2k" | "4k">("2k");
  const command = (action: ImageToolbarAction) =>
    onCommand?.({ action, nodeId, ...(action === "upscale" ? { upscaleSize } : {}) });
  const tools = [
    ["crop", "裁剪", Crop],
    ["upscale", "高清", Sparkles],
    ["remove-background", "抠图", ImageMinus],
    ["expand", "扩图", Expand],
    ["edit-text", "改字", Type],
    ["compare", "对比图", Columns2],
    ["generate-3d", "3D", Box]
  ] as const;

  return (
    <div
      className="canvas-image-toolbar"
      style={{ left: position.x, top: position.y }}
      role="toolbar"
      aria-label="图片工具"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="canvas-image-toolbar__main">
        {tools.map(([action, label, Icon]) => (
          <button
            key={action}
            type="button"
            aria-label={label}
            title={label}
            onClick={() => {
              if (action === "upscale") setShowUpscale((value) => !value);
              else command(action);
            }}
          >
            <Icon size={16} strokeWidth={2} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      {showUpscale ? (
        <div className="canvas-image-toolbar__upscale" role="group" aria-label="高清尺寸">
          {(["2k", "4k"] as const).map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={upscaleSize === size}
              onClick={() => setUpscaleSize(size)}
            >
              {size.toUpperCase()}
            </button>
          ))}
          <button type="button" onClick={() => command("upscale")}>
            生成
          </button>
        </div>
      ) : null}
    </div>
  );
}
