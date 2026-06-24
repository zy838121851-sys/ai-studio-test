import { initApp } from "./core/app-init.js?v=20260624-external-image-paste-1";

initApp().catch((error) => {
  console.error("AI Studio failed to initialize", error);
});
