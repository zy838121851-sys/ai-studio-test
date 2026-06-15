export function hslToHexColor(h, s, l) {
  const saturation = s / 100;
  const lightness = l / 100;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = lightness - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
      : h < 180 ? [0, c, x]
        : h < 240 ? [0, x, c]
          : h < 300 ? [x, 0, c]
            : [c, 0, x];
  return `#${[r, g, b].map((value) => Math.round((value + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

export function isLinearDrawToolName(tool) {
  return tool === "line" || tool === "arrow";
}

export function isFixedStrokeToolName(tool) {
  return tool === "pen";
}

export function buildPointsPath(points, offsetX = 0, offsetY = 0) {
  if (!points.length) return "";
  if (points.length === 1) return `M${points[0].x - offsetX} ${points[0].y - offsetY}`;
  return points.map((point, index) => `${index ? "L" : "M"}${point.x - offsetX} ${point.y - offsetY}`).join(" ");
}

export function buildLinearSvg(tool, width, height, start, end) {
  const sx = start.x;
  const sy = start.y;
  const ex = end.x;
  const ey = end.y;
  if (tool === "line") {
    return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path d="M${sx} ${sy}L${ex} ${ey}" /></svg>`;
  }
  const angle = Math.atan2(ey - sy, ex - sx);
  const head = Math.min(28, Math.max(14, Math.hypot(ex - sx, ey - sy) * 0.18));
  const a1 = angle - Math.PI / 7;
  const a2 = angle + Math.PI / 7;
  const hx1 = ex - Math.cos(a1) * head;
  const hy1 = ey - Math.sin(a1) * head;
  const hx2 = ex - Math.cos(a2) * head;
  const hy2 = ey - Math.sin(a2) * head;
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path d="M${sx} ${sy}L${ex} ${ey}" /><path d="M${hx1} ${hy1}L${ex} ${ey}L${hx2} ${hy2}" /></svg>`;
}
