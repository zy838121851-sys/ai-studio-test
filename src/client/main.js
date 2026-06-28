import { initApp } from "./core/app-init.js?v=20260628-boot-inline-1";

initApp().catch((error) => {
  console.error("AI Studio failed to initialize", error);
});
