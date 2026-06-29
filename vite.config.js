import { defineConfig } from "vite";

export default defineConfig({
  appType: "mpa",
  build: {
    manifest: false,
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "assets",
    rollupOptions: {
      input: "index.html"
    }
  }
});
