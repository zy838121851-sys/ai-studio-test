import { openImageCompareModal } from "./image-compare-modal.js";

export function getComparableImageNodes(selectedNodes = new Set()) {
  return Array.from(selectedNodes || [])
    .filter((node) => node?.classList?.contains("node-image"))
    .filter((node) => node.querySelector?.(".image-frame img"));
}

function getComparableImageNodesFromDom(root = document) {
  const documentRef = root?.nodeType === 9 ? root : root?.ownerDocument || document;
  return Array.from(documentRef?.querySelectorAll?.(".node-card.selected.node-image") || [])
    .filter((node) => node.querySelector?.(".image-frame img"));
}

export function buildImageCompareItems(nodes = [], getNodeTitle = () => "") {
  return nodes.slice(0, 2).map((node, index) => {
    const image = node.querySelector(".image-frame img");
    return {
      node,
      src: image?.currentSrc || image?.src || "",
      title: getNodeTitle(node)?.replace(/^\s+/, "") || (index === 0 ? "\u539f\u56fe" : "\u4fee\u6539\u540e")
    };
  }).filter((item) => item.src);
}

export function openImageCompareFromSelection({
  selectedNodes = new Set(),
  getNodeTitle = () => "",
  notify = (message) => window.alert(message),
  root = document
} = {}) {
  const stateImageNodes = getComparableImageNodes(selectedNodes);
  const imageNodes = stateImageNodes.length === 2 ? stateImageNodes : getComparableImageNodesFromDom(root);
  if (imageNodes.length !== 2) {
    notify("\u8bf7\u9009\u62e9\u4e24\u5f20\u56fe\u7247\u8fdb\u884c\u5bf9\u6bd4");
    return null;
  }
  const items = buildImageCompareItems(imageNodes, getNodeTitle);
  if (items.length !== 2) {
    notify("\u8bf7\u9009\u62e9\u4e24\u5f20\u56fe\u7247\u8fdb\u884c\u5bf9\u6bd4");
    return null;
  }
  return openImageCompareModal({
    before: items[0],
    after: items[1]
  });
}
