const UPLOAD_LABELS = {
  image: "上传图片",
  video: "上传视频",
  model: "上传3D模型"
};

export function buildUploadedNodeConfig(file, {
  kind,
  index = 0,
  basePoint,
  url = ""
} = {}) {
  if (!file || !kind || !basePoint) return null;
  return {
    kind,
    title: file.name,
    desc: `${UPLOAD_LABELS[kind] || "上传素材"} · ${Math.max(1, Math.round(file.size / 1024))} KB`,
    x: basePoint.x + index * 34,
    y: basePoint.y + index * 34,
    media: { url, name: file.name, type: file.type, file }
  };
}

export function markUploadedNode(node, kind) {
  if (!node || kind !== "image") return;
  node.dataset.sourceMode = "uploaded";
  node.dataset.aiCoreAnalysisStatus = "idle";
}

export function buildGenerationPreviewConfig({ title, desc, x, y }) {
  return {
    kind: "loading-image",
    title,
    desc,
    x,
    y
  };
}

export function applyNodePreviewSize(node, { width, aspectRatio } = {}) {
  if (!node) return;
  if (width) node.style.width = `${width}px`;
  if (aspectRatio) {
    const frame = node.querySelector(".image-frame");
    if (frame) frame.style.aspectRatio = aspectRatio;
    node.dataset.manualSize = "true";
  }
}

export function readAspectRatioValue(value = "") {
  const text = String(value || "").trim();
  if (!text) return 0;
  if (text.includes("/")) {
    const [rawWidth, rawHeight] = text.split("/").map((item) => Number.parseFloat(item.trim()));
    return rawWidth > 0 && rawHeight > 0 ? rawWidth / rawHeight : 0;
  }
  const numeric = Number.parseFloat(text);
  return numeric > 0 ? numeric : 0;
}

export function formatAspectRatio(width, height) {
  const nextWidth = Number(width || 0);
  const nextHeight = Number(height || 0);
  if (nextWidth <= 0 || nextHeight <= 0) return "";
  return `${Math.round(nextWidth)} / ${Math.round(nextHeight)}`;
}

export function getNaturalPreviewWidth(width, height, {
  minWidth = 260,
  maxWidth = 560,
  baseWidth = 320
} = {}) {
  const ratio = Number(width || 0) / Math.max(1, Number(height || 0));
  if (!Number.isFinite(ratio) || ratio <= 0) return baseWidth;
  return Math.min(maxWidth, Math.max(minWidth, Math.round(baseWidth * ratio)));
}

export function getPreviewHeight(width, aspectRatio, fallback = width) {
  const ratio = readAspectRatioValue(aspectRatio);
  return ratio > 0 ? width / ratio : fallback;
}

export function getImageNodePreviewMetrics(node, {
  fallbackWidth = 320,
  minWidth = 120,
  maxWidth = Infinity
} = {}) {
  const frame = node?.querySelector?.(".image-frame");
  const image = frame?.querySelector?.("img");
  const naturalWidth = image?.naturalWidth || Number(node?.dataset?.imageNaturalWidth || 0);
  const naturalHeight = image?.naturalHeight || Number(node?.dataset?.imageNaturalHeight || 0);
  const naturalAspect = formatAspectRatio(naturalWidth, naturalHeight);
  const frameAspect = frame?.style?.aspectRatio || node?.style?.aspectRatio || "";
  const aspectRatio = naturalAspect || frameAspect || "";
  const rawWidth = node?.offsetWidth || frame?.offsetWidth || Number.parseFloat(node?.style?.width || "") || fallbackWidth;
  const width = Math.min(maxWidth, Math.max(minWidth, Math.round(rawWidth || fallbackWidth)));
  const rawHeight = frame?.offsetHeight || node?.offsetHeight || getPreviewHeight(width, aspectRatio, width);
  return {
    width,
    height: Math.round(getPreviewHeight(width, aspectRatio, rawHeight || width)),
    aspectRatio,
    naturalWidth,
    naturalHeight,
    image
  };
}

export function readImageFilePreviewMetrics(file) {
  if (
    !file
    || typeof Image !== "function"
    || typeof URL === "undefined"
    || typeof URL.createObjectURL !== "function"
  ) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    const finish = (value) => {
      URL.revokeObjectURL(objectUrl);
      resolve(value);
    };
    image.onload = () => {
      const aspectRatio = formatAspectRatio(image.naturalWidth, image.naturalHeight);
      const width = getNaturalPreviewWidth(image.naturalWidth, image.naturalHeight);
      finish({
        width,
        height: Math.round(getPreviewHeight(width, aspectRatio, width)),
        aspectRatio,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight
      });
    };
    image.onerror = () => finish(null);
    image.src = objectUrl;
  });
}
