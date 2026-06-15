export const IMAGE_EDIT_BUILD_DEFAULTS = Object.freeze({
  minWidth: 540,
  maxWidth: 660,
  minHeight: 220,
  maxHeight: 330
});

export const DIRECTOR_ACTIONS = [
  {
    type: "scene",
    title: "Lifestyle Scene",
    kind: "image",
    prompt: "Generate a premium lifestyle scene with the target product in a realistic environment. Keep shape and proportions stable."
  },
  {
    type: "poster",
    title: "Promo Poster",
    kind: "image",
    prompt: "Create a clean product poster for e-commerce style campaigns with clear hero composition and premium tone."
  },
  {
    type: "detail",
    title: "Detail Shot",
    kind: "image",
    prompt: "Create close-up detail visuals emphasizing material, edges, and texture with studio-grade clarity."
  },
  {
    type: "closeup",
    title: "Closeup Product",
    kind: "image",
    prompt: "Generate a focused close-up product image for marketplace use with balanced light and realistic materials."
  },
  {
    type: "copy",
    title: "Selling Points Copy",
    kind: "copy",
    prompt: "Generate concise Chinese and English selling-point copy for commerce and social use."
  },
  {
    type: "script",
    title: "Video Script",
    kind: "script",
    prompt: "Generate a 15-second product short-video script with scene plan, voice-over, subtitles, and scene transitions."
  },
  {
    type: "render3d",
    title: "3D Render",
    kind: "image",
    prompt: "Render a 3D product image with realistic materials, lighting and composition while preserving the original structure."
  },
  {
    type: "productPhoto",
    title: "Catalog Photo",
    kind: "image",
    prompt: "Create a commercial photography style product image with natural lighting and clean composition."
  },
  {
    type: "plush",
    title: "Plush Design",
    kind: "image",
    prompt: "Transform the product style into a plush/fabric mockup while preserving the core shape."
  },
  {
    type: "model",
    title: "3D Model",
    kind: "image",
    prompt: "Generate a refined 3D-ready render asset concept with realistic materials and production-friendly geometry cues."
  },
  {
    type: "packaging",
    title: "Packaging Concept",
    kind: "image",
    prompt: "Create a premium packaging scene concept and layout proposal suitable for online and offline brand sales channels."
  },
  {
    type: "characterSheet",
    title: "Character Sheet",
    kind: "image",
    prompt: "Generate a character-sheet style visual showing multiple view directions and clear model consistency."
  },
  {
    type: "mockup",
    title: "Mockup",
    kind: "image",
    prompt: "Create a practical mockup preview with realistic shadows, context and presentation-ready composition."
  }
];

export const DIRECTOR_VIEW_COUNT = 3;

export const SHAPE_TEXT_TOOLS = new Set(["text-rect", "text-circle", "speech", "left-arrow", "right-arrow"]);
