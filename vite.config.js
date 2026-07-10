import { defineConfig } from "vite";

function removeProductionImportMap() {
  return {
    name: "remove-production-import-map",
    transformIndexHtml(html) {
      const importMap = /\s*<script\s+type=["']importmap["']>[\s\S]*?<\/script>/i;
      if (!importMap.test(html)) {
        throw new Error("Production build expected the development import map");
      }
      return html.replace(importMap, "");
    }
  };
}

export default defineConfig(({ command }) => ({
  appType: "mpa",
  plugins: command === "build" ? [removeProductionImportMap()] : [],
  build: {
    manifest: false,
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "assets",
    rollupOptions: {
      input: "index.html"
    }
  }
}));
