const AI_CORE_HINT_COPY = {
  idle: "AI Core 鍦ㄧ敾甯冧腑鎰熺煡",
  active: "AI Core 鍦ㄧ敾甯冧腑鎰熺煡",
  over: "AI Core 鍦ㄧ敾甯冧腑鎰熺煡",
  processing: "AI Core 鍦ㄧ敾甯冧腑鎰熺煡"
};

export function setAICoreOrbState({ aiCore, aiCoreHint, state = "idle" }) {
  aiCore?.classList.toggle("active", false);
  aiCore?.classList.toggle("over", false);
  aiCore?.classList.toggle("processing", false);
  if (aiCoreHint) aiCoreHint.textContent = AI_CORE_HINT_COPY[state] || AI_CORE_HINT_COPY.idle;
}

export function getAICoreOrbDistance({ aiCore, clientX, clientY }) {
  const rect = aiCore.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return {
    rect,
    distance: Math.hypot(clientX - centerX, clientY - centerY)
  };
}

export function isPointInsideAICoreOrb({ aiCore, clientX, clientY }) {
  const { rect, distance } = getAICoreOrbDistance({ aiCore, clientX, clientY });
  const radius = Math.max(rect.width, rect.height) * (aiCore.classList.contains("active") ? 0.72 : 0.56);
  return distance <= radius;
}

export function isPointNearAICoreOrb({ aiCore, clientX, clientY }) {
  const { rect, distance } = getAICoreOrbDistance({ aiCore, clientX, clientY });
  const radius = Math.max(rect.width, rect.height) * 2.35;
  return distance <= radius;
}
