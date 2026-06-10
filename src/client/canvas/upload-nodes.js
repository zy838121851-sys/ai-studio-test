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
