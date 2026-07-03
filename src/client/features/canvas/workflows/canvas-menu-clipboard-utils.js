import { cleanText } from "./canvas-menu-text-utils.js";

export function snapshotNodeForClipboard(node, { getNodeKind } = {}) {
  const image = node.querySelector(".image-frame img");
  const title = cleanText(
    node.querySelector("h3, .node-title, [data-node-title]")?.textContent
      || image?.alt
      || node.dataset.title
      || node.textContent
      || "Copied node"
  );
  const desc = cleanText(
    node.querySelector("p, .node-desc, [data-node-desc]")?.textContent
      || node.dataset.desc
      || ""
  );
  return {
    kind: getNodeKind(node),
    title,
    desc,
    media: image ? {
      url: image.currentSrc || image.src,
      name: title,
      type: image.dataset.mimeType || "image/png"
    } : undefined,
    width: node.style.width || "",
    minHeight: node.style.minHeight || ""
  };
}

export function pasteNodeFromClipboard({ snapshot, point, addNode, selectNode }) {
  if (!snapshot) return null;
  const pasted = addNode({
    kind: snapshot.kind || "2d",
    title: snapshot.title || "Copied node",
    desc: snapshot.desc || "",
    x: point.x + 24,
    y: point.y + 24,
    media: snapshot.media
  });
  if (!pasted) return null;
  if (snapshot.width) pasted.style.width = snapshot.width;
  if (snapshot.minHeight && !pasted.classList.contains("node-image")) pasted.style.minHeight = snapshot.minHeight;
  pasted.dataset.locked = "false";
  pasted.classList.remove("node-locked", "selected");
  selectNode(pasted);
  return pasted;
}
