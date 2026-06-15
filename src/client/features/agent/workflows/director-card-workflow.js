import { getDirectorActionWindow } from "../director-workflow.js";

export function createDirectorCardWorkflow({
  services = {}
} = {}) {
  const {
    canvasWorld = null,
    getNodeBounds = () => ({ x: 0, y: 0, width: 0 }),
    addNode = () => null,
    inferDirectorProductProfile = () => ({ type: "", name: "" }),
    escapeHtml = (value = "") => String(value),
    directorActions = [],
    directorViewCount = 3
  } = services;

  function createDirectorCard(productNode, file, index = 0) {
    const profile = inferDirectorProductProfile(file);
    const bounds = getNodeBounds(productNode);
    const director = addNode({
      kind: "director",
      title: profile.name,
      desc: profile.type,
      x: bounds.x + bounds.width + 48,
      y: bounds.y + index * 28,
      media: {
        productType: profile.type,
        productName: profile.name
      }
    });
    director.dataset.productNodeId = productNode.dataset.nodeId;
    director.dataset.productType = profile.type;
    director.dataset.productName = profile.name;
    director.dataset.suggestionStart = "0";
    director.dataset.offsetX = "44";
    director.dataset.offsetY = `${index * 28}`;
    productNode.dataset.productType = profile.type;
    productNode.dataset.productName = profile.name;
    return director;
  }

  function getDirectorNodeForProduct(productNode) {
    if (!canvasWorld) return null;
    return Array.from(canvasWorld.querySelectorAll(".node-director")).find((node) => {
      return node.dataset.productNodeId === productNode.dataset.nodeId;
    });
  }

  function positionDirectorCard(productNode) {
    const director = getDirectorNodeForProduct(productNode);
    if (!director) return;
    const bounds = getNodeBounds(productNode);
    const offsetX = Number(director.dataset.offsetX || 44);
    const offsetY = Number(director.dataset.offsetY || 0);
    director.style.left = `${bounds.x + bounds.width + offsetX}px`;
    director.style.top = `${bounds.y + offsetY}px`;
  }

  function refreshDirectorOptions(directorNode) {
    const start = (Number(directorNode.dataset.suggestionStart || 0) + directorViewCount) % directorActions.length;
    directorNode.dataset.suggestionStart = start;
    const actions = getDirectorActionWindow({ actions: directorActions, start, count: directorViewCount });
    const actionsWrap = directorNode.querySelector(".director-actions");
    if (!actionsWrap) return;
    actionsWrap.innerHTML = `${actions.map((action, index) => `
      <button type="button" class="director-tile" data-director-action="${action.type}">
        <small>${String(index + 1).padStart(2, "0")}</small>
        <span>${escapeHtml(action.title)}</span>
      </button>
    `).join("")}
      <button class="director-tile director-generate-all" type="button" data-director-action="all">
        <small>04</small>
        <span>Generate All</span>
        <b>Generate</b>
      </button>
    `;
  }

  return {
    createDirectorCard,
    positionDirectorCard,
    refreshDirectorOptions
  };
}
