export function createCanvasNodeElement({ kind, title = "", x = 0, y = 0, media = {}, html = "" }) {
  const node = document.createElement("article");
  node.className = `node-card node-${kind}`;
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  node.dataset.kind = kind;
  node.dataset.title = title || "";
  if (media?.url) node.dataset.objectUrl = media.url;
  if (media?.file) node._sourceFile = media.file;
  node.innerHTML = html;
  return node;
}
