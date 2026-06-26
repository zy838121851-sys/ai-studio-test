import { initApp } from "./core/app-init.js?v=20260626-midjourney-4up-1";

initApp().catch((error) => {
  console.error("AI Studio failed to initialize", error);
});
