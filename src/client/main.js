import { initApp } from "./core/app-init.js?v=20260624-image-align-gallery-2";

initApp().catch((error) => {
  console.error("AI Studio failed to initialize", error);
});
