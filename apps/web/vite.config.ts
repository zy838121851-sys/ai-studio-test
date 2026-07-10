import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  plugins: mode === "test" ? [] : [reactRouter()],
  build: {
    outDir: "build"
  },
  server: {
    port: 4174,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:4100"
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./app/test/setup.ts"],
    exclude: ["e2e/**", "node_modules/**", "build/**"]
  }
}));
