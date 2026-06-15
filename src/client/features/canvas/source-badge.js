export function addSourceBadgeElement(node, sourceNode, {
  label = "来源：原图",
  onSelectSource = () => {}
} = {}) {
  if (!node || !sourceNode || node.querySelector(".source-badge")) return;
  const badge = document.createElement("button");
  badge.type = "button";
  badge.className = "source-badge";
  badge.textContent = label;
  badge.addEventListener("pointerdown", (event) => event.stopPropagation());
  badge.addEventListener("click", (event) => {
    event.stopPropagation();
    onSelectSource(sourceNode);
    sourceNode.classList.add("source-pulse");
    window.setTimeout(() => sourceNode.classList.remove("source-pulse"), 900);
  });
  node.appendChild(badge);
}
