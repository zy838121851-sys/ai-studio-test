import { initApp } from "./core/app-init.js?v=20260627-generator-job-recovery-2";

initApp().catch((error) => {
  console.error("AI Studio failed to initialize", error);
});
