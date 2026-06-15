export function bindAICoreInteractions({
  aiCore,
  getDragState,
  setDragState,
  getSuppressClick,
  setSuppressClick,
  getEnabled,
  setEnabled,
  positionCanvasSuggestionBubble,
  positionAgentBubble
} = {}) {
  if (!aiCore) return;

  aiCore.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const rect = aiCore.getBoundingClientRect();
    setDragState({
      x: event.clientX,
      y: event.clientY,
      left: rect.left,
      top: rect.top,
      moved: false
    });
    aiCore.setPointerCapture(event.pointerId);
  });

  aiCore.addEventListener("pointermove", (event) => {
    const drag = getDragState();
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;

    const left = Math.max(18, Math.min(window.innerWidth - aiCore.offsetWidth - 18, drag.left + dx));
    const top = Math.max(18, Math.min(window.innerHeight - aiCore.offsetHeight - 18, drag.top + dy));
    aiCore.style.left = `${left}px`;
    aiCore.style.top = `${top}px`;
    aiCore.style.right = "auto";
    aiCore.style.bottom = "auto";

    const bubble = window.currentAICoreBubble;
    if (bubble?._sourceNode) positionCanvasSuggestionBubble?.(bubble._sourceNode, bubble);
    if (bubble?.classList.contains("agent-suggestion")) positionAgentBubble?.(bubble);
  });

  aiCore.addEventListener("pointerup", () => {
    const drag = getDragState();
    if (!drag) return;
    const moved = drag.moved;
    setDragState(null);
    setSuppressClick(moved);
    if (moved) {
      window.setTimeout(() => {
        setSuppressClick(false);
      }, 160);
    }
  });

  aiCore.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (getSuppressClick()) return;
    setEnabled(!getEnabled());
  });
}

