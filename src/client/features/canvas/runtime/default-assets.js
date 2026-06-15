export const DEFAULT_CANVAS_ASSETS = [
  { id: "landing", type: "2d", title: "AI Landing", desc: "Hero layout, selling points, CTA" },
  { id: "dashboard", type: "2d", title: "Dashboard", desc: "Charts and analytics cards for KPI reporting" },
  { id: "brand", type: "2d", title: "Brand Kit", desc: "Logo set, color palette and marketing copy" },
  { id: "device", type: "3d", title: "Digital Twin", desc: "Product scene composition with realistic props" },
  { id: "stage", type: "3d", title: "Stage Design", desc: "Exhibition scene and stage-light composition" },
  { id: "reel", type: "video", title: "15s Promo", desc: "Video transitions with subtitle timing and effects" },
  { id: "motion", type: "video", title: "Motion Draft", desc: "Key frames with controlled timing presets" }
];

export function getDefaultCanvasAssets() {
  return DEFAULT_CANVAS_ASSETS;
}
