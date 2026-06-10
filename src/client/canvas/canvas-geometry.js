export function viewportPointToWorldPoint({ clientX, clientY, viewportRect, pan, zoom }) {
  return {
    x: (clientX - viewportRect.left - viewportRect.width / 2 - pan.x) / zoom,
    y: (clientY - viewportRect.top - viewportRect.height / 2 - pan.y) / zoom
  };
}

export function viewportCenterToWorldPoint({ viewportRect, pan, zoom }) {
  return viewportPointToWorldPoint({
    clientX: viewportRect.left + viewportRect.width / 2,
    clientY: viewportRect.top + viewportRect.height / 2,
    viewportRect,
    pan,
    zoom
  });
}

export function getElementWorldBounds(node) {
  return {
    x: Number.parseFloat(node.style.left || "0"),
    y: Number.parseFloat(node.style.top || "0"),
    width: node.offsetWidth,
    height: node.offsetHeight
  };
}

export function rectsIntersect(a, b) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

export function getNodeScreenRectFromWorld({ node, viewportRect, pan, zoom }) {
  const x = Number.parseFloat(node.style.left || "0");
  const y = Number.parseFloat(node.style.top || "0");
  return {
    left: viewportRect.left + viewportRect.width / 2 + pan.x + x * zoom,
    top: viewportRect.top + viewportRect.height / 2 + pan.y + y * zoom,
    width: node.offsetWidth * zoom,
    height: node.offsetHeight * zoom
  };
}
