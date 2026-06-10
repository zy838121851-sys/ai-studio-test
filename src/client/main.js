import { initApp } from "./core/app-init.js";

initApp().catch((error) => {
  console.error("AI Studio failed to initialize", error);
});
