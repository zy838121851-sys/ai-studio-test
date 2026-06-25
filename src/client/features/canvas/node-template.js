import { renderToolSvg } from "./node-icons.js";

export const SHAPE_TEXT_TOOLS = new Set(["text-rect", "text-circle", "speech", "left-arrow", "right-arrow"]);

export function renderNodeTemplate({
  kind,
  title,
  desc,
  media = {},
  directorActions = [],
  directorViewCount = 3
}) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(desc);

  if (kind === "loading-image") {
    return `
      <div class="image-file-name">▧ ${safeTitle}</div>
      <figure class="image-frame generation-frame">
        <div class="generation-content">
          <div class="generation-spinner"></div>
          <strong>正在生成图片</strong>
          <span>${safeDesc}</span>
        </div>
      </figure>
    `;
  }

  if (kind === "image") {
    return `
      <div class="image-file-name">▧ ${safeTitle}</div>
      <figure class="image-frame">
        <img src="${media.url}" alt="${safeTitle}" draggable="false" />
      </figure>
    `;
  }

  if (kind === "image-generator") {
    return `
      <div class="image-generator-head">
        <span class="image-generator-title-icon">▣</span>
        <strong>${safeTitle || "图像生成器"}</strong>
        <span class="image-generator-size">1024 × 1024</span>
      </div>
      <div class="image-generator-stage">
        <figure class="image-generator-frame" data-generator-dropzone>
          <div class="image-generator-placeholder" data-generator-placeholder>
            <svg viewBox="0 0 96 96" aria-hidden="true">
              <path d="M18 72l22-32 16 22 9-12 13 22H18z" />
              <circle cx="67" cy="31" r="8" />
            </svg>
          </div>
          <img class="image-generator-result" alt="生成结果" draggable="false" hidden />
          <div class="image-generator-loading" hidden>
            <div class="generation-spinner"></div>
            <span>正在生成图片</span>
          </div>
        </figure>
      </div>
    `;
  }

  if (kind === "model") {
    return `
      <div class="model-viewer">
        <canvas data-model-viewer aria-label="${safeTitle} 3D 预览"></canvas>
        <div class="model-loading">左键拖动 · 右键旋转 · 滚轮缩放</div>
      </div>
    `;
  }

  if (kind === "director") {
    const start = Number(media.suggestionStart || 0);
    const visibleActions = Array.from({ length: directorViewCount }, (_, index) => {
      return directorActions[(start + index) % directorActions.length];
    }).filter(Boolean);
    return `
      <div class="director-head">
        <span>✧ AI 建议</span>
        <button type="button" class="director-refresh" data-director-action="refresh" title="换一组">↻</button>
      </div>
      <div class="director-actions">
        ${visibleActions.map((action, index) => `
          <button type="button" class="director-tile" data-director-action="${escapeHtml(action.type)}">
            <small>${String(index + 1).padStart(2, "0")}</small>
            <span>${escapeHtml(action.title)}</span>
          </button>
        `).join("")}
        <button class="director-tile director-generate-all" type="button" data-director-action="all">
          <small>04</small>
          <span>生成全部</span>
          <b>✓</b>
        </button>
      </div>
    `;
  }

  if (kind === "draw") {
    return renderDrawTemplate(media, safeTitle);
  }

  if (kind === "3d") {
    return `
      <div class="node-label">3D 预览</div>
      <div class="cube-scene">
        <div class="cube">
          <span class="face front"></span>
          <span class="face back"></span>
          <span class="face right"></span>
          <span class="face left"></span>
          <span class="face top"></span>
          <span class="face bottom"></span>
        </div>
      </div>
      <p>${safeDesc}</p>
    `;
  }

  if (kind === "video" && media.url) {
    return `
      <div class="node-label">视频</div>
      <video class="media-preview video-file-preview" src="${media.url}" controls></video>
      <h3>${safeTitle}</h3>
      <p>${safeDesc}</p>
    `;
  }

  if (kind === "video") {
    return `
      <div class="node-label">视频预览</div>
      <div class="video-preview">
        <span class="play">▶</span>
        <i></i>
      </div>
      <p>${safeDesc}</p>
    `;
  }

  return `
    <div class="node-label">2D 页面</div>
    <h3>${safeTitle}</h3>
    <p>${safeDesc}</p>
  `;
}

function renderDrawTemplate(media, safeTitle) {
  const tool = media.tool || "rect";
  const safeTool = escapeHtml(tool);
  const label = escapeHtml(media.label || safeTitle);
  if (tool === "text") {
    return `
      <div class="draw-node draw-text">
        <div class="canvas-text-editor" contenteditable="false" spellcheck="false">${label}</div>
      </div>
    `;
  }
  if (SHAPE_TEXT_TOOLS.has(tool)) {
    return `
      <div class="draw-node draw-${safeTool}">
        <div class="draw-shape" aria-hidden="true">
          ${renderToolSvg(tool)}
        </div>
        <div class="canvas-text-editor shape-text-editor" contenteditable="false" spellcheck="false">${label}</div>
      </div>
    `;
  }
  return `
    <div class="draw-node draw-${safeTool}">
      <div class="draw-shape" aria-hidden="true">
        ${renderToolSvg(tool)}
      </div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
